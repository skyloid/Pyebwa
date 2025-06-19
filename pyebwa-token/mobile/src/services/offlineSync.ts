import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { PlantingField, TreePlanting } from '../types';
import firebaseFieldService from './firebaseFieldService';
import firebasePlantingService, { PlantingData } from './firebasePlantingService';

interface PendingUpload {
  id: string;
  type: 'field' | 'planting';
  data: any;
  timestamp: Date;
  retries: number;
}

class OfflineSyncService {
  private readonly STORAGE_KEYS = {
    FIELDS_CACHE: 'offline_fields_cache',
    PLANTINGS_CACHE: 'offline_plantings_cache',
    PENDING_UPLOADS: 'offline_pending_uploads',
    LAST_SYNC: 'offline_last_sync'
  };

  private isOnline = true;
  private syncInProgress = false;

  constructor() {
    this.initializeNetworkListener();
  }

  // Initialize network status listener
  private initializeNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected || false;

      // If we just came back online, attempt to sync
      if (wasOffline && this.isOnline) {
        console.log('Network connection restored, attempting sync...');
        this.syncPendingUploads();
      }
    });
  }

  // Check if device is online
  async isDeviceOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected || false;
  }

  // Cache fields locally
  async cacheFields(fields: PlantingField[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.FIELDS_CACHE,
        JSON.stringify({
          fields,
          timestamp: new Date().toISOString()
        })
      );
    } catch (error) {
      console.error('Error caching fields:', error);
    }
  }

  // Get cached fields
  async getCachedFields(): Promise<PlantingField[]> {
    try {
      const cached = await AsyncStorage.getItem(this.STORAGE_KEYS.FIELDS_CACHE);
      if (cached) {
        const { fields } = JSON.parse(cached);
        return fields.map((field: any) => ({
          ...field,
          createdAt: new Date(field.createdAt),
          updatedAt: new Date(field.updatedAt)
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting cached fields:', error);
      return [];
    }
  }

  // Cache plantings locally
  async cachePlantings(plantings: TreePlanting[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.PLANTINGS_CACHE,
        JSON.stringify({
          plantings,
          timestamp: new Date().toISOString()
        })
      );
    } catch (error) {
      console.error('Error caching plantings:', error);
    }
  }

  // Get cached plantings
  async getCachedPlantings(): Promise<TreePlanting[]> {
    try {
      const cached = await AsyncStorage.getItem(this.STORAGE_KEYS.PLANTINGS_CACHE);
      if (cached) {
        const { plantings } = JSON.parse(cached);
        return plantings.map((planting: any) => ({
          ...planting,
          plantedAt: new Date(planting.plantedAt),
          createdAt: new Date(planting.createdAt),
          updatedAt: new Date(planting.updatedAt)
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting cached plantings:', error);
      return [];
    }
  }

  // Queue field for upload when back online
  async queueFieldUpload(fieldData: any): Promise<string> {
    const pendingUpload: PendingUpload = {
      id: `field_${Date.now()}`,
      type: 'field',
      data: fieldData,
      timestamp: new Date(),
      retries: 0
    };

    await this.addToPendingUploads(pendingUpload);
    return pendingUpload.id;
  }

  // Queue planting for upload when back online
  async queuePlantingUpload(plantingData: PlantingData): Promise<string> {
    const pendingUpload: PendingUpload = {
      id: `planting_${Date.now()}`,
      type: 'planting',
      data: plantingData,
      timestamp: new Date(),
      retries: 0
    };

    await this.addToPendingUploads(pendingUpload);
    return pendingUpload.id;
  }

  // Add to pending uploads queue
  private async addToPendingUploads(upload: PendingUpload): Promise<void> {
    try {
      const pending = await this.getPendingUploads();
      pending.push(upload);
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.PENDING_UPLOADS,
        JSON.stringify(pending)
      );
    } catch (error) {
      console.error('Error adding to pending uploads:', error);
    }
  }

  // Get pending uploads
  private async getPendingUploads(): Promise<PendingUpload[]> {
    try {
      const pending = await AsyncStorage.getItem(this.STORAGE_KEYS.PENDING_UPLOADS);
      if (pending) {
        return JSON.parse(pending).map((upload: any) => ({
          ...upload,
          timestamp: new Date(upload.timestamp)
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting pending uploads:', error);
      return [];
    }
  }

  // Sync pending uploads when online
  async syncPendingUploads(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;

    try {
      const pendingUploads = await this.getPendingUploads();
      const failedUploads: PendingUpload[] = [];

      for (const upload of pendingUploads) {
        try {
          if (upload.type === 'field') {
            await this.uploadField(upload);
          } else if (upload.type === 'planting') {
            await this.uploadPlanting(upload);
          }
          
          console.log(`Successfully uploaded ${upload.type} with ID: ${upload.id}`);
        } catch (error) {
          console.error(`Failed to upload ${upload.type} with ID: ${upload.id}`, error);
          
          upload.retries++;
          if (upload.retries < 3) {
            failedUploads.push(upload);
          } else {
            console.warn(`Giving up on upload ${upload.id} after 3 retries`);
          }
        }
      }

      // Save failed uploads for retry later
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.PENDING_UPLOADS,
        JSON.stringify(failedUploads)
      );

      // Update last sync timestamp
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.LAST_SYNC,
        new Date().toISOString()
      );

    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Upload field to Firebase
  private async uploadField(upload: PendingUpload): Promise<void> {
    const { name, polygon, capacity, allowedSpecies, description } = upload.data;
    await firebaseFieldService.createField(
      name,
      polygon,
      capacity,
      allowedSpecies,
      description
    );
  }

  // Upload planting to Firebase
  private async uploadPlanting(upload: PendingUpload): Promise<void> {
    await firebasePlantingService.createPlanting(upload.data);
  }

  // Get fields (online or cached)
  async getFields(): Promise<PlantingField[]> {
    try {
      if (await this.isDeviceOnline()) {
        const fields = await firebaseFieldService.getUserFields();
        await this.cacheFields(fields);
        return fields;
      } else {
        console.log('Device offline, returning cached fields');
        return await this.getCachedFields();
      }
    } catch (error) {
      console.error('Error getting fields, falling back to cache:', error);
      return await this.getCachedFields();
    }
  }

  // Get plantings (online or cached)
  async getPlantings(): Promise<TreePlanting[]> {
    try {
      if (await this.isDeviceOnline()) {
        const plantings = await firebasePlantingService.getUserPlantings();
        await this.cachePlantings(plantings);
        return plantings;
      } else {
        console.log('Device offline, returning cached plantings');
        return await this.getCachedPlantings();
      }
    } catch (error) {
      console.error('Error getting plantings, falling back to cache:', error);
      return await this.getCachedPlantings();
    }
  }

  // Create field (online or queue for later)
  async createField(
    name: string,
    polygon: any[],
    capacity: number,
    allowedSpecies: string[],
    description?: string
  ): Promise<string> {
    const fieldData = { name, polygon, capacity, allowedSpecies, description };

    if (await this.isDeviceOnline()) {
      try {
        return await firebaseFieldService.createField(
          name,
          polygon,
          capacity,
          allowedSpecies,
          description
        );
      } catch (error) {
        console.error('Online field creation failed, queuing for later:', error);
        return await this.queueFieldUpload(fieldData);
      }
    } else {
      console.log('Device offline, queuing field for upload');
      return await this.queueFieldUpload(fieldData);
    }
  }

  // Create planting (online or queue for later)
  async createPlanting(plantingData: PlantingData): Promise<string> {
    if (await this.isDeviceOnline()) {
      try {
        return await firebasePlantingService.createPlanting(plantingData);
      } catch (error) {
        console.error('Online planting creation failed, queuing for later:', error);
        return await this.queuePlantingUpload(plantingData);
      }
    } else {
      console.log('Device offline, queuing planting for upload');
      return await this.queuePlantingUpload(plantingData);
    }
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    lastSync?: Date;
    pendingUploads: number;
  }> {
    const isOnline = await this.isDeviceOnline();
    const pendingUploads = await this.getPendingUploads();
    
    let lastSync: Date | undefined;
    try {
      const lastSyncStr = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_SYNC);
      if (lastSyncStr) {
        lastSync = new Date(lastSyncStr);
      }
    } catch (error) {
      console.error('Error getting last sync date:', error);
    }

    return {
      isOnline,
      lastSync,
      pendingUploads: pendingUploads.length
    };
  }

  // Force sync (manual trigger)
  async forcSync(): Promise<void> {
    if (await this.isDeviceOnline()) {
      await this.syncPendingUploads();
      
      // Refresh cached data
      try {
        const fields = await firebaseFieldService.getUserFields();
        await this.cacheFields(fields);
        
        const plantings = await firebasePlantingService.getUserPlantings();
        await this.cachePlantings(plantings);
      } catch (error) {
        console.error('Error refreshing cached data:', error);
      }
    } else {
      throw new Error('Device is offline. Cannot sync now.');
    }
  }

  // Clear all cached data
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.FIELDS_CACHE,
        this.STORAGE_KEYS.PLANTINGS_CACHE,
        this.STORAGE_KEYS.PENDING_UPLOADS,
        this.STORAGE_KEYS.LAST_SYNC
      ]);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

export default new OfflineSyncService();