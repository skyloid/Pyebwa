import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceId } from '../utils/device';
import { compressImage } from '../utils/imageCompression';
import { validateGPSCoordinates } from '../utils/gpsValidator';

interface PlantingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  photos: PlantingPhoto[];
  species: string[];
  totalTrees: number;
  status: 'active' | 'completed' | 'submitted';
  deviceId: string;
  planterId: string;
}

interface PlantingPhoto {
  id: string;
  uri: string;
  location: Location.LocationObject;
  timestamp: Date;
  species: string;
  treeCount: number;
  compressed?: boolean;
  ipfsHash?: string;
}

interface SubmissionResult {
  success: boolean;
  submissionId?: string;
  error?: string;
}

export class PlantingService {
  private currentSession: PlantingSession | null = null;
  private readonly QUEUE_KEY = 'planting_queue';
  private readonly SESSION_KEY = 'current_session';
  private readonly API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.pyebwa.com';

  /**
   * Start a new planting session
   */
  async startSession(planterId: string): Promise<PlantingSession> {
    // Check if there's an active session
    const existingSession = await this.getCurrentSession();
    if (existingSession && existingSession.status === 'active') {
      return existingSession;
    }

    const session: PlantingSession = {
      id: `session_${Date.now()}`,
      startTime: new Date(),
      photos: [],
      species: [],
      totalTrees: 0,
      status: 'active',
      deviceId: await getDeviceId(),
      planterId,
    };

    this.currentSession = session;
    await this.saveSession(session);
    
    return session;
  }

  /**
   * Add photo to current session
   */
  async addPhoto(
    photoUri: string,
    species: string,
    treeCount: number = 1
  ): Promise<PlantingPhoto> {
    if (!this.currentSession || this.currentSession.status !== 'active') {
      throw new Error('No active planting session');
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    // Validate GPS coordinates
    const isValid = await validateGPSCoordinates(
      location.coords.latitude,
      location.coords.longitude
    );

    if (!isValid) {
      throw new Error('Invalid GPS location. Please ensure you are in Haiti.');
    }

    // Compress image
    const compressedUri = await compressImage(photoUri, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8,
    });

    const photo: PlantingPhoto = {
      id: `photo_${Date.now()}`,
      uri: compressedUri,
      location,
      timestamp: new Date(),
      species,
      treeCount,
      compressed: true,
    };

    // Add to session
    this.currentSession.photos.push(photo);
    if (!this.currentSession.species.includes(species)) {
      this.currentSession.species.push(species);
    }
    this.currentSession.totalTrees += treeCount;

    // Save session
    await this.saveSession(this.currentSession);

    // Save photo to media library
    try {
      await MediaLibrary.createAssetAsync(compressedUri);
    } catch (error) {
      console.error('Failed to save to media library:', error);
    }

    return photo;
  }

  /**
   * Complete current session and prepare for submission
   */
  async completeSession(): Promise<PlantingSession> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.endTime = new Date();
    this.currentSession.status = 'completed';
    
    await this.saveSession(this.currentSession);
    
    // Add to submission queue
    await this.addToQueue(this.currentSession);
    
    return this.currentSession;
  }

  /**
   * Submit planting evidence
   */
  async submitEvidence(sessionId: string): Promise<SubmissionResult> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Check network connectivity
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) {
        return {
          success: false,
          error: 'No internet connection. Evidence saved for later submission.',
        };
      }

      // Upload photos to IPFS
      const uploadedPhotos = await this.uploadPhotosToIPFS(session.photos);

      // Create evidence bundle
      const evidence = {
        sessionId: session.id,
        planterId: session.planterId,
        deviceId: session.deviceId,
        photos: uploadedPhotos,
        species: session.species,
        totalTrees: session.totalTrees,
        startTime: session.startTime,
        endTime: session.endTime,
        location: this.calculateCenterLocation(session.photos),
      };

      // Submit to API
      const response = await fetch(`${this.API_BASE}/api/planter/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify(evidence),
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Update session status
      session.status = 'submitted';
      await this.saveSession(session);
      
      // Remove from queue
      await this.removeFromQueue(session.id);

      return {
        success: true,
        submissionId: result.submissionId,
      };

    } catch (error: any) {
      console.error('Submission error:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit evidence',
      };
    }
  }

  /**
   * Upload photos to IPFS
   */
  private async uploadPhotosToIPFS(photos: PlantingPhoto[]): Promise<any[]> {
    const uploadedPhotos = [];

    for (const photo of photos) {
      try {
        // Read photo as base64
        const base64 = await FileSystem.readAsStringAsync(photo.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Upload to IPFS via API
        const response = await fetch(`${this.API_BASE}/api/ipfs/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`,
          },
          body: JSON.stringify({
            data: base64,
            filename: `tree_${photo.id}.jpg`,
            metadata: {
              location: photo.location.coords,
              timestamp: photo.timestamp,
              species: photo.species,
              treeCount: photo.treeCount,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to upload photo');
        }

        const result = await response.json();
        
        uploadedPhotos.push({
          ...photo,
          ipfsHash: result.hash,
          uri: undefined, // Don't send local URI
        });

      } catch (error) {
        console.error('Failed to upload photo:', error);
        throw error;
      }
    }

    return uploadedPhotos;
  }

  /**
   * Get queue of pending submissions
   */
  async getQueue(): Promise<PlantingSession[]> {
    try {
      const queueData = await AsyncStorage.getItem(this.QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Failed to get queue:', error);
      return [];
    }
  }

  /**
   * Add session to submission queue
   */
  private async addToQueue(session: PlantingSession): Promise<void> {
    const queue = await this.getQueue();
    queue.push(session);
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
  }

  /**
   * Remove session from queue
   */
  private async removeFromQueue(sessionId: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(s => s.id !== sessionId);
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(filtered));
  }

  /**
   * Process offline queue
   */
  async processQueue(): Promise<void> {
    const queue = await this.getQueue();
    
    for (const session of queue) {
      if (session.status === 'completed') {
        const result = await this.submitEvidence(session.id);
        if (result.success) {
          console.log(`Successfully submitted session ${session.id}`);
        }
      }
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<PlantingSession | null> {
    if (this.currentSession) {
      return this.currentSession;
    }

    try {
      const sessionData = await AsyncStorage.getItem(this.SESSION_KEY);
      if (sessionData) {
        this.currentSession = JSON.parse(sessionData);
        return this.currentSession;
      }
    } catch (error) {
      console.error('Failed to get current session:', error);
    }

    return null;
  }

  /**
   * Save session to storage
   */
  private async saveSession(session: PlantingSession): Promise<void> {
    await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  }

  /**
   * Get session by ID
   */
  private async getSession(sessionId: string): Promise<PlantingSession | null> {
    if (this.currentSession?.id === sessionId) {
      return this.currentSession;
    }

    const queue = await this.getQueue();
    return queue.find(s => s.id === sessionId) || null;
  }

  /**
   * Calculate center location from photos
   */
  private calculateCenterLocation(photos: PlantingPhoto[]): Location.LocationObjectCoords {
    if (photos.length === 0) {
      throw new Error('No photos to calculate location');
    }

    const avgLat = photos.reduce((sum, p) => sum + p.location.coords.latitude, 0) / photos.length;
    const avgLon = photos.reduce((sum, p) => sum + p.location.coords.longitude, 0) / photos.length;

    return {
      latitude: avgLat,
      longitude: avgLon,
      altitude: photos[0].location.coords.altitude,
      accuracy: photos[0].location.coords.accuracy,
      altitudeAccuracy: photos[0].location.coords.altitudeAccuracy,
      heading: photos[0].location.coords.heading,
      speed: photos[0].location.coords.speed,
    };
  }

  /**
   * Get auth token
   */
  private async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Not authenticated');
    }
    return token;
  }

  /**
   * Get planting statistics
   */
  async getStatistics(): Promise<{
    totalSessions: number;
    totalTrees: number;
    totalPhotos: number;
    pendingSubmissions: number;
  }> {
    const queue = await this.getQueue();
    const allSessions = [...queue];
    
    if (this.currentSession) {
      allSessions.push(this.currentSession);
    }

    return {
      totalSessions: allSessions.length,
      totalTrees: allSessions.reduce((sum, s) => sum + s.totalTrees, 0),
      totalPhotos: allSessions.reduce((sum, s) => sum + s.photos.length, 0),
      pendingSubmissions: queue.filter(s => s.status === 'completed').length,
    };
  }
}

// Export singleton instance
export const plantingService = new PlantingService();