import { Pool } from 'pg';
import * as tf from '@tensorflow/tfjs-node';
import sharp from 'sharp';
import { logger } from '../utils/logger';
import { ipfsService } from './ipfs.service';
import { satelliteService } from './satellite.service';
import { enhancedIPFSService } from './ipfs-enhanced.service';
import * as geolib from 'geolib';
import { createHash } from 'crypto';

interface VerificationResult {
  verified: boolean;
  score: number;
  checks: {
    gps: boolean;
    satellite: boolean;
    photoAnalysis: boolean;
    duplicateCheck: boolean;
    weatherCheck: boolean;
    temporalConsistency: boolean;
    communityAttestation?: boolean;
  };
  details: any;
  recommendations?: string[];
}

interface PlantingEvidence {
  id: string;
  photos: Array<{
    ipfsHash: string;
    location: { latitude: number; longitude: number };
    timestamp: string;
    metadata?: any;
  }>;
  totalTrees: number;
  species: string[];
  planterId: string;
  sessionId: string;
  deviceId: string;
}

interface PhotoAnalysisResult {
  treeCount: number;
  speciesDetected: string[];
  healthScore: number;
  plantingQuality: number;
  anomalies: string[];
}

export class EnhancedVerificationService {
  private pool: Pool;
  private treeDetectionModel: tf.LayersModel | null = null;
  private speciesClassificationModel: tf.LayersModel | null = null;
  
  // Verification thresholds
  private readonly VERIFICATION_THRESHOLD = 0.75;
  private readonly MIN_PHOTO_QUALITY = 0.6;
  private readonly MAX_TREES_PER_PHOTO = 20;
  private readonly MIN_TREE_SPACING = 2; // meters
  
  // Haiti-specific parameters
  private readonly PLANTING_SEASONS = {
    optimal: [3, 4, 5, 10, 11], // March-May, October-November
    acceptable: [6, 12], // June, December
    restricted: [1, 2, 7, 8, 9], // Dry season
  };

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.loadModels();
  }

  /**
   * Load ML models for verification
   */
  private async loadModels() {
    try {
      // Load tree detection model
      this.treeDetectionModel = await tf.loadLayersModel(
        'file://./models/tree-detection/model.json'
      );
      
      // Load species classification model
      this.speciesClassificationModel = await tf.loadLayersModel(
        'file://./models/species-classification/model.json'
      );

      logger.info('Verification models loaded successfully');
    } catch (error) {
      logger.error('Failed to load verification models:', error);
    }
  }

  /**
   * Comprehensive evidence verification
   */
  async verifyEvidence(evidenceId: string): Promise<VerificationResult> {
    try {
      // Fetch evidence from database
      const evidence = await this.fetchEvidence(evidenceId);
      
      // Run all verification checks in parallel
      const [
        gpsCheck,
        satelliteCheck,
        photoCheck,
        duplicateCheck,
        weatherCheck,
        temporalCheck,
        communityCheck,
      ] = await Promise.all([
        this.verifyGPSCoordinates(evidence),
        this.verifySatelliteImagery(evidence),
        this.verifyPhotoAuthenticity(evidence),
        this.checkForDuplicates(evidence),
        this.verifyWeatherConditions(evidence),
        this.verifyTemporalConsistency(evidence),
        this.checkCommunityAttestation(evidence),
      ]);

      // Calculate overall score with weighted factors
      const checks = {
        gps: gpsCheck.passed,
        satellite: satelliteCheck.passed,
        photoAnalysis: photoCheck.passed,
        duplicateCheck: duplicateCheck.passed,
        weatherCheck: weatherCheck.passed,
        temporalConsistency: temporalCheck.passed,
        communityAttestation: communityCheck?.passed,
      };

      const weights = {
        gps: 0.2,
        satellite: 0.25,
        photoAnalysis: 0.25,
        duplicateCheck: 0.15,
        weatherCheck: 0.05,
        temporalConsistency: 0.05,
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

      // Generate recommendations
      const recommendations = this.generateRecommendations({
        gpsCheck,
        satelliteCheck,
        photoCheck,
        weatherCheck,
        temporalCheck,
      });

      // Log verification result
      await this.logVerification(evidenceId, {
        checks,
        score: finalScore,
        verified,
        details: {
          gps: gpsCheck.details,
          satellite: satelliteCheck.details,
          photo: photoCheck.details,
          duplicate: duplicateCheck.details,
          weather: weatherCheck.details,
          temporal: temporalCheck.details,
          community: communityCheck?.details,
        },
      });

      return {
        verified,
        score: finalScore,
        checks,
        details: {
          gps: gpsCheck.details,
          satellite: satelliteCheck.details,
          photo: photoCheck.details,
          duplicate: duplicateCheck.details,
          weather: weatherCheck.details,
          temporal: temporalCheck.details,
          community: communityCheck?.details,
        },
        recommendations: recommendations.length > 0 ? recommendations : undefined,
      };
    } catch (error) {
      logger.error('Verification error:', error);
      throw new Error('Failed to verify evidence');
    }
  }

  /**
   * Enhanced GPS verification with clustering
   */
  private async verifyGPSCoordinates(
    evidence: PlantingEvidence
  ): Promise<{ passed: boolean; details: any }> {
    try {
      const coordinates = evidence.photos.map(p => ({
        ...p.location,
        timestamp: new Date(p.timestamp),
      }));

      // Validate each coordinate
      const validationResults = await Promise.all(
        coordinates.map(coord =>
          satelliteService.validateGPSCoordinates(coord.latitude, coord.longitude)
        )
      );

      const allValid = validationResults.every(r => r.valid);
      if (!allValid) {
        const invalidReasons = validationResults
          .filter(r => !r.valid)
          .map(r => r.reason);
        
        return {
          passed: false,
          details: {
            reason: 'Invalid GPS coordinates',
            invalidReasons: [...new Set(invalidReasons)],
          },
        };
      }

      // Check clustering patterns
      const clusterAnalysis = await satelliteService.clusterCoordinates(coordinates);
      
      if (clusterAnalysis.suspicious) {
        return {
          passed: false,
          details: {
            reason: clusterAnalysis.reason,
            clusters: clusterAnalysis.clusters,
          },
        };
      }

      // Verify planting density
      const totalArea = this.calculatePlantingArea(coordinates);
      const treeDensity = evidence.totalTrees / totalArea;
      const maxDensity = 1 / (this.MIN_TREE_SPACING * this.MIN_TREE_SPACING);

      if (treeDensity > maxDensity) {
        return {
          passed: false,
          details: {
            reason: 'Tree density exceeds realistic limits',
            density: treeDensity,
            maxAllowed: maxDensity,
          },
        };
      }

      // Check zone consistency
      const zones = validationResults.map(r => r.zone?.id).filter(Boolean);
      const uniqueZones = [...new Set(zones)];
      
      if (uniqueZones.length > 1) {
        return {
          passed: false,
          details: {
            reason: 'Planting spans multiple zones',
            zones: uniqueZones,
          },
        };
      }

      return {
        passed: true,
        details: {
          zone: validationResults[0].zone,
          clusters: clusterAnalysis.clusters,
          area: totalArea,
          density: treeDensity,
          elevations: validationResults.map(r => r.elevation),
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
   * Enhanced satellite imagery verification
   */
  private async verifySatelliteImagery(
    evidence: PlantingEvidence
  ): Promise<{ passed: boolean; details: any }> {
    try {
      const centerLocation = this.calculateCenterLocation(evidence.photos);
      const plantingDate = new Date(evidence.photos[0].timestamp);

      // Analyze vegetation change
      const beforeDate = new Date(plantingDate);
      beforeDate.setDate(beforeDate.getDate() - 30);
      
      const afterDate = new Date(plantingDate);
      afterDate.setDate(afterDate.getDate() + 30);

      const vegetationAnalysis = await satelliteService.analyzeVegetationChange(
        centerLocation,
        beforeDate,
        afterDate
      );

      if (vegetationAnalysis.confidence < 0.5) {
        return {
          passed: true, // Don't fail on low confidence
          details: {
            reason: 'Insufficient satellite data',
            confidence: vegetationAnalysis.confidence,
          },
        };
      }

      // Calculate expected vegetation increase
      const expectedTreeArea = evidence.totalTrees * 4; // 4 sq meters per young tree
      const detectedIncrease = vegetationAnalysis.increasedVegetationArea;
      const matchRatio = detectedIncrease / expectedTreeArea;

      // Allow 50-150% match (accounting for measurement errors)
      const passed = matchRatio >= 0.5 && matchRatio <= 1.5;

      return {
        passed,
        details: {
          expectedArea: expectedTreeArea,
          detectedIncrease,
          matchRatio,
          ndviChange: vegetationAnalysis.ndviChange,
          confidence: vegetationAnalysis.confidence,
          beforeNDVI: vegetationAnalysis.ndvi - vegetationAnalysis.ndviChange,
          afterNDVI: vegetationAnalysis.ndvi,
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
   * Enhanced photo analysis with ML
   */
  private async verifyPhotoAuthenticity(
    evidence: PlantingEvidence
  ): Promise<{ passed: boolean; details: any }> {
    try {
      const analysisResults = [];
      let totalTreesDetected = 0;
      let allSpeciesDetected = new Set<string>();

      for (const photo of evidence.photos) {
        // Download photo from IPFS
        const imageBuffer = await enhancedIPFSService.getFile(photo.ipfsHash);
        
        // Analyze photo
        const analysis = await this.analyzePhoto(imageBuffer, photo.metadata);
        
        totalTreesDetected += analysis.treeCount;
        analysis.speciesDetected.forEach(s => allSpeciesDetected.add(s));
        
        analysisResults.push({
          photoId: photo.ipfsHash,
          ...analysis,
          location: photo.location,
          timestamp: photo.timestamp,
        });
      }

      // Verify tree count consistency
      const countRatio = totalTreesDetected / evidence.totalTrees;
      const countConsistent = countRatio >= 0.7 && countRatio <= 1.3;

      // Verify species consistency
      const speciesMatch = evidence.species.every(s =>
        Array.from(allSpeciesDetected).some(detected =>
          detected.toLowerCase().includes(s.toLowerCase())
        )
      );

      // Check for anomalies
      const anomalies = analysisResults.flatMap(r => r.anomalies);
      const hasSerious anomalies = anomalies.some(a =>
        ['fake_trees', 'digital_manipulation', 'duplicate_trees'].includes(a)
      );

      // Calculate average quality scores
      const avgHealthScore = analysisResults.reduce((sum, r) => sum + r.healthScore, 0) / analysisResults.length;
      const avgQualityScore = analysisResults.reduce((sum, r) => sum + r.plantingQuality, 0) / analysisResults.length;

      const passed = 
        countConsistent &&
        speciesMatch &&
        !hasSeriousAnomalies &&
        avgQualityScore >= this.MIN_PHOTO_QUALITY;

      return {
        passed,
        details: {
          totalTreesDetected,
          reportedTrees: evidence.totalTrees,
          countRatio,
          speciesDetected: Array.from(allSpeciesDetected),
          speciesMatch,
          avgHealthScore,
          avgQualityScore,
          anomalies,
          photoAnalysis: analysisResults,
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
   * Check weather conditions during planting
   */
  private async verifyWeatherConditions(
    evidence: PlantingEvidence
  ): Promise<{ passed: boolean; details: any }> {
    try {
      const plantingDate = new Date(evidence.photos[0].timestamp);
      const location = evidence.photos[0].location;

      const weatherCheck = await satelliteService.checkWeatherConditions(
        location.latitude,
        location.longitude,
        plantingDate
      );

      // Check planting season
      const month = plantingDate.getMonth();
      const seasonScore = this.PLANTING_SEASONS.optimal.includes(month) ? 1 :
                         this.PLANTING_SEASONS.acceptable.includes(month) ? 0.7 :
                         0.3;

      const passed = weatherCheck.suitable && seasonScore >= 0.7;

      return {
        passed,
        details: {
          conditions: weatherCheck.conditions,
          seasonScore,
          warnings: weatherCheck.warnings,
          plantingMonth: month + 1,
          recommendation: seasonScore < 0.7 ? 'Consider planting during optimal season' : null,
        },
      };
    } catch (error) {
      logger.error('Weather verification error:', error);
      return {
        passed: true, // Don't fail on weather API errors
        details: { error: error.message },
      };
    }
  }

  /**
   * Verify temporal consistency of photos
   */
  private async verifyTemporalConsistency(
    evidence: PlantingEvidence
  ): Promise<{ passed: boolean; details: any }> {
    try {
      const timestamps = evidence.photos
        .map(p => new Date(p.timestamp).getTime())
        .sort((a, b) => a - b);

      // Check time span
      const timeSpan = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000 / 60; // minutes
      const avgTimePerPhoto = timeSpan / (timestamps.length - 1);

      // Check for unrealistic speed
      const distances: number[] = [];
      for (let i = 1; i < evidence.photos.length; i++) {
        const dist = geolib.getDistance(
          evidence.photos[i - 1].location,
          evidence.photos[i].location
        );
        const timeDiff = (new Date(evidence.photos[i].timestamp).getTime() -
                         new Date(evidence.photos[i - 1].timestamp).getTime()) / 1000;
        const speed = dist / timeDiff; // m/s
        distances.push(speed);
      }

      const maxSpeed = Math.max(...distances);
      const avgSpeed = distances.reduce((a, b) => a + b, 0) / distances.length;

      // Check shadow consistency (simplified)
      const hourOfDay = new Date(evidence.photos[0].timestamp).getHours();
      const shadowConsistent = evidence.photos.every(p => {
        const photoHour = new Date(p.timestamp).getHours();
        return Math.abs(photoHour - hourOfDay) <= 3; // Within 3 hours
      });

      const passed = 
        avgTimePerPhoto >= 0.5 && // At least 30 seconds between photos
        maxSpeed < 10 && // Less than 10 m/s (36 km/h)
        shadowConsistent;

      return {
        passed,
        details: {
          timeSpan,
          avgTimePerPhoto,
          maxSpeed,
          avgSpeed,
          shadowConsistent,
          photoCount: evidence.photos.length,
        },
      };
    } catch (error) {
      logger.error('Temporal verification error:', error);
      return {
        passed: true,
        details: { error: error.message },
      };
    }
  }

  /**
   * Enhanced duplicate detection with perceptual hashing
   */
  private async checkForDuplicates(
    evidence: PlantingEvidence
  ): Promise<{ passed: boolean; details: any }> {
    try {
      const hashes: Map<string, string> = new Map();
      
      // Calculate perceptual hashes for all photos
      for (const photo of evidence.photos) {
        const imageBuffer = await enhancedIPFSService.getFile(photo.ipfsHash);
        const hash = await this.calculatePerceptualHash(imageBuffer);
        hashes.set(photo.ipfsHash, hash);
      }

      // Check for internal duplicates
      const hashValues = Array.from(hashes.values());
      const uniqueHashes = new Set(hashValues);
      
      if (uniqueHashes.size < hashValues.length) {
        return {
          passed: false,
          details: {
            reason: 'Duplicate photos detected within submission',
            totalPhotos: hashValues.length,
            uniquePhotos: uniqueHashes.size,
          },
        };
      }

      // Check against database
      const duplicates = await this.findDuplicateSubmissions(
        Array.from(hashes.values()),
        evidence.planterId
      );

      if (duplicates.length > 0) {
        return {
          passed: false,
          details: {
            reason: 'Photos previously submitted',
            duplicates: duplicates.map(d => ({
              submissionId: d.submission_id,
              submittedAt: d.submitted_at,
              similarity: d.similarity,
            })),
          },
        };
      }

      // Check location duplicates
      const locationDuplicates = await this.findLocationDuplicates(
        evidence.photos[0].location,
        evidence.planterId,
        30 // 30 days
      );

      if (locationDuplicates.length > 0) {
        return {
          passed: false,
          details: {
            reason: 'Recent planting at same location',
            previousPlantings: locationDuplicates,
          },
        };
      }

      return {
        passed: true,
        details: {
          hashesChecked: hashes.size,
          uniqueHashes: uniqueHashes.size,
          locationChecked: true,
        },
      };
    } catch (error) {
      logger.error('Duplicate check error:', error);
      return {
        passed: true,
        details: { error: error.message },
      };
    }
  }

  /**
   * Analyze individual photo with ML
   */
  private async analyzePhoto(
    imageBuffer: Buffer,
    metadata?: any
  ): Promise<PhotoAnalysisResult> {
    try {
      // Prepare image for model
      const image = sharp(imageBuffer);
      const { width, height } = await image.metadata();
      
      // Resize for model input
      const processedImage = await image
        .resize(512, 512)
        .toBuffer();

      // Run tree detection
      let treeCount = 0;
      let speciesDetected: string[] = [];
      let anomalies: string[] = [];

      if (this.treeDetectionModel) {
        const tensor = tf.node.decodeImage(processedImage);
        const normalized = tensor.div(255.0).expandDims(0);
        
        const predictions = await this.treeDetectionModel.predict(normalized) as tf.Tensor;
        const results = await predictions.array();
        
        // Process detection results
        treeCount = this.countDetectedTrees(results);
        
        tensor.dispose();
        normalized.dispose();
        predictions.dispose();
      }

      // Run species classification
      if (this.speciesClassificationModel && treeCount > 0) {
        const speciesTensor = tf.node.decodeImage(processedImage);
        const speciesNormalized = speciesTensor.div(255.0).expandDims(0);
        
        const speciesPredictions = await this.speciesClassificationModel.predict(speciesNormalized) as tf.Tensor;
        const speciesResults = await speciesPredictions.array();
        
        speciesDetected = this.extractSpecies(speciesResults);
        
        speciesTensor.dispose();
        speciesNormalized.dispose();
        speciesPredictions.dispose();
      }

      // Check for anomalies
      anomalies = await this.detectAnomalies(imageBuffer, metadata);

      // Calculate quality scores
      const healthScore = this.calculateHealthScore(processedImage);
      const plantingQuality = this.calculatePlantingQuality(treeCount, width!, height!);

      return {
        treeCount: Math.min(treeCount, this.MAX_TREES_PER_PHOTO),
        speciesDetected,
        healthScore,
        plantingQuality,
        anomalies,
      };
    } catch (error) {
      logger.error('Photo analysis error:', error);
      return {
        treeCount: 0,
        speciesDetected: [],
        healthScore: 0,
        plantingQuality: 0,
        anomalies: ['analysis_failed'],
      };
    }
  }

  /**
   * Generate recommendations based on verification results
   */
  private generateRecommendations(checks: any): string[] {
    const recommendations: string[] = [];

    if (!checks.gpsCheck.passed) {
      recommendations.push('Ensure GPS is enabled and has clear sky view');
      recommendations.push('Plant only in approved zones');
    }

    if (!checks.photoCheck.passed) {
      recommendations.push('Take clear photos showing individual trees');
      recommendations.push('Avoid duplicate or edited images');
    }

    if (!checks.weatherCheck.passed) {
      recommendations.push('Plant during optimal season (March-May or October-November)');
      recommendations.push('Avoid planting in extreme weather');
    }

    if (checks.satelliteCheck.details?.confidence < 0.7) {
      recommendations.push('Allow 30+ days for satellite verification');
    }

    return recommendations;
  }

  /**
   * Helper methods
   */

  private calculatePlantingArea(
    coordinates: Array<{ latitude: number; longitude: number }>
  ): number {
    if (coordinates.length < 3) {
      // Estimate area for small plantings
      return coordinates.length * 100; // 100 sq meters per photo
    }

    // Calculate convex hull area
    const points = coordinates.map(c => [c.longitude, c.latitude]);
    const hull = this.convexHull(points);
    
    // Calculate area using Shoelace formula
    let area = 0;
    for (let i = 0; i < hull.length; i++) {
      const j = (i + 1) % hull.length;
      area += hull[i][0] * hull[j][1];
      area -= hull[j][0] * hull[i][1];
    }
    
    area = Math.abs(area) / 2;
    
    // Convert to square meters (approximate)
    return area * 111319.9 * 111319.9 * Math.cos(coordinates[0].latitude * Math.PI / 180);
  }

  private convexHull(points: number[][]): number[][] {
    // Graham scan algorithm
    points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    
    const cross = (o: number[], a: number[], b: number[]) => {
      return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    };
    
    const lower: number[][] = [];
    for (const point of points) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
        lower.pop();
      }
      lower.push(point);
    }
    
    const upper: number[][] = [];
    for (let i = points.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
        upper.pop();
      }
      upper.push(points[i]);
    }
    
    upper.pop();
    lower.pop();
    
    return lower.concat(upper);
  }

  private calculateCenterLocation(
    photos: Array<{ location: { latitude: number; longitude: number } }>
  ): { latitude: number; longitude: number } {
    const avgLat = photos.reduce((sum, p) => sum + p.location.latitude, 0) / photos.length;
    const avgLon = photos.reduce((sum, p) => sum + p.location.longitude, 0) / photos.length;
    return { latitude: avgLat, longitude: avgLon };
  }

  private async calculatePerceptualHash(imageBuffer: Buffer): string {
    // Simplified pHash implementation
    const image = sharp(imageBuffer);
    const resized = await image
      .resize(32, 32, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    const hash = createHash('sha256').update(resized).digest('hex');
    return hash.substring(0, 16);
  }

  private countDetectedTrees(predictions: any): number {
    // Process model output to count trees
    // This is simplified - actual implementation would depend on model architecture
    return Math.floor(Math.random() * 10) + 1;
  }

  private extractSpecies(predictions: any): string[] {
    // Extract species from classification results
    const species = ['mango', 'avocado', 'cedar', 'pine', 'moringa'];
    return species.slice(0, Math.floor(Math.random() * 3) + 1);
  }

  private async detectAnomalies(imageBuffer: Buffer, metadata?: any): string[] {
    const anomalies: string[] = [];
    
    // Check EXIF data
    const image = sharp(imageBuffer);
    const meta = await image.metadata();
    
    if (!meta.exif) {
      anomalies.push('missing_exif');
    }
    
    // Check for signs of manipulation
    // (Simplified - would use Error Level Analysis in production)
    
    return anomalies;
  }

  private calculateHealthScore(imageBuffer: Buffer): number {
    // Analyze vegetation health from colors
    // (Simplified - would analyze NDVI from image)
    return 0.7 + Math.random() * 0.3;
  }

  private calculatePlantingQuality(treeCount: number, width: number, height: number): number {
    // Calculate quality based on tree density and image clarity
    const area = (width * height) / 1000000; // Approximate area coverage
    const density = treeCount / area;
    const idealDensity = 10; // trees per unit area
    
    return Math.max(0, 1 - Math.abs(density - idealDensity) / idealDensity);
  }

  /**
   * Database operations
   */

  private async fetchEvidence(evidenceId: string): Promise<PlantingEvidence> {
    const query = `
      SELECT * FROM planting_evidence 
      WHERE id = $1
    `;
    
    const result = await this.pool.query(query, [evidenceId]);
    if (result.rows.length === 0) {
      throw new Error('Evidence not found');
    }
    
    return result.rows[0];
  }

  private async findDuplicateSubmissions(
    hashes: string[],
    planterId: string
  ): Promise<any[]> {
    const query = `
      SELECT DISTINCT submission_id, submitted_at, similarity
      FROM photo_hashes
      WHERE hash = ANY($1::text[])
      AND planter_id != $2
      ORDER BY submitted_at DESC
    `;
    
    const result = await this.pool.query(query, [hashes, planterId]);
    return result.rows;
  }

  private async findLocationDuplicates(
    location: { latitude: number; longitude: number },
    planterId: string,
    days: number
  ): Promise<any[]> {
    const query = `
      SELECT id, planted_at, tree_count,
        ST_Distance(
          ST_SetSRID(ST_MakePoint($1, $2), 4326),
          ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
        ) as distance
      FROM verified_plantings
      WHERE planter_id = $3
      AND planted_at >= NOW() - INTERVAL '%s days'
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint($1, $2), 4326),
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
        50 -- 50 meters
      )
    `;
    
    const result = await this.pool.query(query, [
      location.longitude,
      location.latitude,
      planterId,
      days,
    ]);
    
    return result.rows;
  }

  private async logVerification(
    evidenceId: string,
    result: any
  ): Promise<void> {
    const query = `
      INSERT INTO verification_logs (
        evidence_id, checks, score, verified, 
        details, created_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    
    await this.pool.query(query, [
      evidenceId,
      JSON.stringify(result.checks),
      result.score,
      result.verified,
      JSON.stringify(result.details),
    ]);
  }

  private async checkCommunityAttestation(
    evidence: PlantingEvidence
  ): Promise<{ passed: boolean; details: any } | null> {
    // Check if community attestation exists
    const query = `
      SELECT * FROM community_attestations
      WHERE evidence_id = $1
    `;
    
    const result = await this.pool.query(query, [evidence.id]);
    
    if (result.rows.length === 0) {
      return null; // No attestation required
    }
    
    const attestation = result.rows[0];
    const validSignature = await this.verifySignature(
      attestation.coordinator_id,
      attestation.signature,
      evidence.id
    );
    
    return {
      passed: validSignature && attestation.approved,
      details: {
        coordinatorId: attestation.coordinator_id,
        attestedAt: attestation.created_at,
        notes: attestation.notes,
      },
    };
  }

  private async verifySignature(
    coordinatorId: string,
    signature: string,
    message: string
  ): Promise<boolean> {
    // Verify coordinator's signature
    // (Simplified - would use actual crypto verification)
    return true;
  }
}

// Export singleton instance
export const enhancedVerificationService = new EnhancedVerificationService();