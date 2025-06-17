import { Pool } from 'pg';
import * as tf from '@tensorflow/tfjs-node';
import axios from 'axios';
import sharp from 'sharp';
import { logger } from '../utils/logger';
import { ipfsService } from './ipfs.service';

interface VerificationResult {
  verified: boolean;
  score: number;
  checks: {
    gps: boolean;
    satellite: boolean;
    photoAnalysis: boolean;
    duplicateCheck: boolean;
    communityAttestation?: boolean;
  };
  details: any;
}

interface PlantingEvidence {
  id: string;
  photos: Array<{
    ipfsHash: string;
    location: { latitude: number; longitude: number };
    timestamp: string;
  }>;
  totalTrees: number;
  species: string[];
  planterId: string;
}

export class VerificationService {
  private pool: Pool;
  private treeDetectionModel: tf.LayersModel | null = null;
  private readonly VERIFICATION_THRESHOLD = 0.75;
  private readonly SATELLITE_API_KEY = process.env.SATELLITE_API_KEY!;
  private readonly GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.loadModel();
  }

  /**
   * Load tree detection ML model
   */
  private async loadModel() {
    try {
      this.treeDetectionModel = await tf.loadLayersModel(
        'file://./models/tree-detection/model.json'
      );
      logger.info('Tree detection model loaded');
    } catch (error) {
      logger.error('Failed to load tree detection model:', error);
    }
  }

  /**
   * Verify planting evidence
   */
  async verifyEvidence(evidenceId: string): Promise<VerificationResult> {
    try {
      // Fetch evidence from database
      const evidence = await this.fetchEvidence(evidenceId);
      
      // Run verification checks in parallel
      const [
        gpsCheck,
        satelliteCheck,
        photoCheck,
        duplicateCheck,
        communityCheck,
      ] = await Promise.all([
        this.verifyGPSCoordinates(evidence),
        this.verifySatelliteImagery(evidence),
        this.verifyPhotoAuthenticity(evidence),
        this.checkForDuplicates(evidence),
        this.checkCommunityAttestation(evidence),
      ]);

      // Calculate overall score
      const checks = {
        gps: gpsCheck.passed,
        satellite: satelliteCheck.passed,
        photoAnalysis: photoCheck.passed,
        duplicateCheck: duplicateCheck.passed,
        communityAttestation: communityCheck?.passed,
      };

      const weights = {
        gps: 0.2,
        satellite: 0.3,
        photoAnalysis: 0.3,
        duplicateCheck: 0.15,
        communityAttestation: 0.05,
      };

      let totalScore = 0;
      let totalWeight = 0;

      for (const [check, passed] of Object.entries(checks)) {
        if (passed !== undefined) {
          totalScore += (passed ? 1 : 0) * weights[check as keyof typeof weights];
          totalWeight += weights[check as keyof typeof weights];
        }
      }

      const finalScore = totalScore / totalWeight;
      const verified = finalScore >= this.VERIFICATION_THRESHOLD;

      // Log verification result
      await this.logVerification(evidenceId, {
        gps: gpsCheck,
        satellite: satelliteCheck,
        photo: photoCheck,
        duplicate: duplicateCheck,
        community: communityCheck,
      }, finalScore, verified);

      return {
        verified,
        score: finalScore,
        checks,
        details: {
          gps: gpsCheck.details,
          satellite: satelliteCheck.details,
          photo: photoCheck.details,
          duplicate: duplicateCheck.details,
          community: communityCheck?.details,
        },
      };
    } catch (error) {
      logger.error('Verification error:', error);
      throw new Error('Failed to verify evidence');
    }
  }

  /**
   * Verify GPS coordinates
   */
  private async verifyGPSCoordinates(
    evidence: PlantingEvidence
  ): Promise<{ passed: boolean; details: any }> {
    try {
      const photos = evidence.photos;
      
      // Check if all coordinates are within Haiti bounds
      const haitiBounds = {
        north: 20.1,
        south: 18.0,
        east: -71.6,
        west: -74.5,
      };

      const allInHaiti = photos.every(photo => {
        const { latitude, longitude } = photo.location;
        return (
          latitude >= haitiBounds.south &&
          latitude <= haitiBounds.north &&
          longitude >= haitiBounds.west &&
          longitude <= haitiBounds.east
        );
      });

      if (!allInHaiti) {
        return {
          passed: false,
          details: { reason: 'Coordinates outside Haiti' },
        };
      }

      // Check GPS accuracy and clustering
      const distances = [];
      for (let i = 0; i < photos.length - 1; i++) {
        const dist = this.calculateDistance(
          photos[i].location,
          photos[i + 1].location
        );
        distances.push(dist);
      }

      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      const maxReasonableDistance = 0.5; // 500 meters

      if (avgDistance > maxReasonableDistance) {
        return {
          passed: false,
          details: { 
            reason: 'Photos too far apart',
            avgDistance: avgDistance,
          },
        };
      }

      // Verify location is in approved planting zone
      const inPlantingZone = await this.checkPlantingZone(
        photos[0].location.latitude,
        photos[0].location.longitude
      );

      return {
        passed: inPlantingZone,
        details: {
          allInHaiti,
          avgDistance,
          inPlantingZone,
        },
      };
    } catch (error) {
      logger.error('GPS verification error:', error);
      return {
        passed: false,
        details: { error: error.message },
      };
    }
  }

  /**
   * Verify with satellite imagery
   */
  private async verifySatelliteImagery(
    evidence: PlantingEvidence
  ): Promise<{ passed: boolean; details: any }> {
    try {
      const centerLocation = this.calculateCenterLocation(evidence.photos);
      
      // Get recent satellite imagery from Planet Labs API
      const beforeDate = new Date(evidence.photos[0].timestamp);
      beforeDate.setDate(beforeDate.getDate() - 30); // 30 days before

      const afterDate = new Date(evidence.photos[0].timestamp);
      afterDate.setDate(afterDate.getDate() + 7); // 7 days after

      const satelliteData = await this.fetchSatelliteImagery(
        centerLocation,
        beforeDate,
        afterDate
      );

      if (!satelliteData.hasImagery) {
        return {
          passed: true, // Pass if no imagery available
          details: { reason: 'No satellite imagery available for verification' },
        };
      }

      // Analyze vegetation change
      const vegetationChange = await this.analyzeVegetationChange(
        satelliteData.beforeImage,
        satelliteData.afterImage
      );

      const expectedTreeArea = evidence.totalTrees * 4; // 4 sq meters per tree
      const detectedChange = vegetationChange.increasedVegetationArea;

      const passed = detectedChange >= expectedTreeArea * 0.7; // 70% threshold

      return {
        passed,
        details: {
          expectedArea: expectedTreeArea,
          detectedChange,
          confidence: vegetationChange.confidence,
        },
      };
    } catch (error) {
      logger.error('Satellite verification error:', error);
      return {
        passed: true, // Don't fail on satellite errors
        details: { error: error.message },
      };
    }
  }

  /**
   * Verify photo authenticity using AI
   */
  private async verifyPhotoAuthenticity(
    evidence: PlantingEvidence
  ): Promise<{ passed: boolean; details: any }> {
    try {
      const results = [];

      for (const photo of evidence.photos) {
        // Download photo from IPFS
        const imageBuffer = await ipfsService.getFile(photo.ipfsHash);
        
        // Resize for model input
        const processedImage = await sharp(imageBuffer)
          .resize(224, 224)
          .toBuffer();

        // Check EXIF data
        const metadata = await sharp(imageBuffer).metadata();
        const hasValidExif = this.validateExifData(metadata);

        // Run tree detection model
        let treeDetectionScore = 0;
        if (this.treeDetectionModel) {
          treeDetectionScore = await this.detectTrees(processedImage);
        }

        // Check for image tampering
        const tamperingScore = await this.detectTampering(imageBuffer);

        results.push({
          photoId: photo.ipfsHash,
          hasValidExif,
          treeDetectionScore,
          tamperingScore,
          passed: hasValidExif && treeDetectionScore > 0.7 && tamperingScore < 0.3,
        });
      }

      const passedCount = results.filter(r => r.passed).length;
      const passed = passedCount >= evidence.photos.length * 0.8; // 80% must pass

      return {
        passed,
        details: {
          totalPhotos: evidence.photos.length,
          passedPhotos: passedCount,
          results,
        },
      };
    } catch (error) {
      logger.error('Photo verification error:', error);
      return {
        passed: false,
        details: { error: error.message },
      };
    }
  }

  /**
   * Check for duplicate submissions
   */
  private async checkForDuplicates(
    evidence: PlantingEvidence
  ): Promise<{ passed: boolean; details: any }> {
    try {
      const hashes = [];
      
      for (const photo of evidence.photos) {
        const imageBuffer = await ipfsService.getFile(photo.ipfsHash);
        const hash = await this.calculatePerceptualHash(imageBuffer);
        hashes.push(hash);
      }

      // Check against database of previous submissions
      const duplicates = await this.findDuplicateHashes(hashes);

      const passed = duplicates.length === 0;

      return {
        passed,
        details: {
          checkedHashes: hashes.length,
          duplicatesFound: duplicates.length,
          duplicates,
        },
      };
    } catch (error) {
      logger.error('Duplicate check error:', error);
      return {
        passed: true, // Don't fail on error
        details: { error: error.message },
      };
    }
  }

  /**
   * Check community attestation
   */
  private async checkCommunityAttestation(
    evidence: PlantingEvidence
  ): Promise<{ passed: boolean; details: any } | null> {
    try {
      const attestation = await this.fetchCommunityAttestation(evidence.id);
      
      if (!attestation) {
        return null; // No attestation required/available
      }

      // Verify coordinator signature
      const validSignature = await this.verifyCoordinatorSignature(
        attestation.coordinatorId,
        attestation.signature,
        evidence.id
      );

      // Check coordinator reputation
      const coordinator = await this.fetchCoordinatorInfo(attestation.coordinatorId);
      const hasGoodReputation = coordinator.reputation >= 80;

      const passed = validSignature && hasGoodReputation;

      return {
        passed,
        details: {
          coordinatorId: attestation.coordinatorId,
          validSignature,
          coordinatorReputation: coordinator.reputation,
        },
      };
    } catch (error) {
      logger.error('Community attestation check error:', error);
      return null;
    }
  }

  /**
   * Helper: Calculate distance between two GPS points
   */
  private calculateDistance(
    loc1: { latitude: number; longitude: number },
    loc2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(loc2.latitude - loc1.latitude);
    const dLon = this.toRad(loc2.longitude - loc1.longitude);
    const lat1 = this.toRad(loc1.latitude);
    const lat2 = this.toRad(loc2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Helper: Calculate center location
   */
  private calculateCenterLocation(
    photos: Array<{ location: { latitude: number; longitude: number } }>
  ): { latitude: number; longitude: number } {
    const avgLat = photos.reduce((sum, p) => sum + p.location.latitude, 0) / photos.length;
    const avgLon = photos.reduce((sum, p) => sum + p.location.longitude, 0) / photos.length;
    
    return { latitude: avgLat, longitude: avgLon };
  }

  /**
   * Helper: Detect trees in image using ML model
   */
  private async detectTrees(imageBuffer: Buffer): Promise<number> {
    if (!this.treeDetectionModel) return 0;

    try {
      // Convert buffer to tensor
      const imageTensor = tf.node
        .decodeImage(imageBuffer)
        .resizeNearestNeighbor([224, 224])
        .expandDims(0)
        .toFloat()
        .div(tf.scalar(255));

      // Run prediction
      const predictions = await this.treeDetectionModel.predict(imageTensor) as tf.Tensor;
      const score = await predictions.data();
      
      imageTensor.dispose();
      predictions.dispose();

      return score[0]; // Assuming binary classification (tree/no tree)
    } catch (error) {
      logger.error('Tree detection error:', error);
      return 0;
    }
  }

  /**
   * Database and external API methods would be implemented here
   */
  private async fetchEvidence(evidenceId: string): Promise<PlantingEvidence> {
    // Implementation would fetch from database
    throw new Error('Method not implemented');
  }

  private async logVerification(
    evidenceId: string,
    checks: any,
    score: number,
    verified: boolean
  ): Promise<void> {
    // Implementation would log to database
  }

  private async checkPlantingZone(lat: number, lon: number): Promise<boolean> {
    // Implementation would check against approved zones
    return true;
  }

  private async fetchSatelliteImagery(
    location: any,
    beforeDate: Date,
    afterDate: Date
  ): Promise<any> {
    // Implementation would use Planet Labs API
    return { hasImagery: false };
  }

  private async analyzeVegetationChange(
    beforeImage: any,
    afterImage: any
  ): Promise<any> {
    // Implementation would analyze NDVI change
    return { increasedVegetationArea: 0, confidence: 0 };
  }

  private validateExifData(metadata: any): boolean {
    // Implementation would validate EXIF
    return true;
  }

  private async detectTampering(imageBuffer: Buffer): Promise<number> {
    // Implementation would use ELA or similar technique
    return 0;
  }

  private async calculatePerceptualHash(imageBuffer: Buffer): Promise<string> {
    // Implementation would calculate pHash
    return '';
  }

  private async findDuplicateHashes(hashes: string[]): Promise<any[]> {
    // Implementation would query database
    return [];
  }

  private async fetchCommunityAttestation(evidenceId: string): Promise<any> {
    // Implementation would fetch from database
    return null;
  }

  private async verifyCoordinatorSignature(
    coordinatorId: string,
    signature: string,
    evidenceId: string
  ): Promise<boolean> {
    // Implementation would verify signature
    return true;
  }

  private async fetchCoordinatorInfo(coordinatorId: string): Promise<any> {
    // Implementation would fetch from database
    return { reputation: 100 };
  }
}

// Export singleton instance
export const verificationService = new VerificationService();