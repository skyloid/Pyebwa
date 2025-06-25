import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coordinate } from '../types';
import { FieldMappingService } from './FieldMappingService';

export interface SimplePlantingRecord {
  id: string;
  fieldId: string;
  fieldName: string;
  planterId: string;
  planterName?: string;
  species: string;
  location: Coordinate;
  photoUri: string;
  timestamp: Date;
  status: 'pending' | 'verified' | 'rejected';
  tokens: number;
}

const STORAGE_KEYS = {
  PLANTINGS: 'simple_planting_records',
  PLANTER_ID: 'planter_id',
};

export class SimplePlantingService {
  private static instance: SimplePlantingService;
  private fieldService: FieldMappingService;

  constructor() {
    this.fieldService = FieldMappingService.getInstance();
  }

  static getInstance(): SimplePlantingService {
    if (!SimplePlantingService.instance) {
      SimplePlantingService.instance = new SimplePlantingService();
    }
    return SimplePlantingService.instance;
  }

  // Record new tree plantings
  async recordPlantings(
    fieldId: string,
    species: string,
    photos: Array<{ uri: string; location: Coordinate }>,
    planterName?: string
  ): Promise<SimplePlantingRecord[]> {
    const field = await this.fieldService.getFieldById(fieldId);
    if (!field) {
      throw new Error('Field not found');
    }

    // Check capacity
    const remainingCapacity = field.capacity - field.plantedCount;
    if (photos.length > remainingCapacity) {
      throw new Error(`Field only has ${remainingCapacity} spots remaining`);
    }

    const planterId = await this.getPlanterId();
    const plantingRecords: SimplePlantingRecord[] = [];

    // Create a planting record for each photo
    for (const photo of photos) {
      const record: SimplePlantingRecord = {
        id: `planting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fieldId: field.id,
        fieldName: field.name,
        planterId,
        planterName,
        species,
        location: photo.location,
        photoUri: photo.uri,
        timestamp: new Date(),
        status: 'pending',
        tokens: 20, // 20 tokens per tree
      };
      plantingRecords.push(record);
    }

    // Save planting records
    await this.savePlantingRecords(plantingRecords);

    // Update field planted count
    field.plantedCount += photos.length;
    field.updatedAt = new Date();
    await this.fieldService.updateField(field);

    return plantingRecords;
  }

  // Get all planting records
  async getAllPlantings(): Promise<SimplePlantingRecord[]> {
    try {
      const plantingsJson = await AsyncStorage.getItem(STORAGE_KEYS.PLANTINGS);
      if (!plantingsJson) return [];
      
      const plantings = JSON.parse(plantingsJson);
      // Convert date strings back to Date objects
      return plantings.map((p: any) => ({
        ...p,
        timestamp: new Date(p.timestamp),
      }));
    } catch (error) {
      console.error('Error loading plantings:', error);
      return [];
    }
  }

  // Get plantings for a specific field
  async getFieldPlantings(fieldId: string): Promise<SimplePlantingRecord[]> {
    const allPlantings = await this.getAllPlantings();
    return allPlantings.filter(p => p.fieldId === fieldId);
  }

  // Get plantings by planter
  async getPlanterPlantings(planterId?: string): Promise<SimplePlantingRecord[]> {
    const pid = planterId || await this.getPlanterId();
    const allPlantings = await this.getAllPlantings();
    return allPlantings.filter(p => p.planterId === pid);
  }

  // Get planting statistics
  async getPlantingStats(): Promise<{
    totalTrees: number;
    pendingTrees: number;
    verifiedTrees: number;
    totalTokens: number;
    treesBySpecies: Record<string, number>;
  }> {
    const plantings = await this.getPlanterPlantings();
    
    const stats = {
      totalTrees: plantings.length,
      pendingTrees: plantings.filter(p => p.status === 'pending').length,
      verifiedTrees: plantings.filter(p => p.status === 'verified').length,
      totalTokens: plantings.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.tokens, 0),
      treesBySpecies: {} as Record<string, number>,
    };

    // Count by species
    plantings.forEach(p => {
      stats.treesBySpecies[p.species] = (stats.treesBySpecies[p.species] || 0) + 1;
    });

    return stats;
  }

  // Save planting records
  private async savePlantingRecords(newRecords: SimplePlantingRecord[]): Promise<void> {
    try {
      const existingPlantings = await this.getAllPlantings();
      const allPlantings = [...existingPlantings, ...newRecords];
      await AsyncStorage.setItem(STORAGE_KEYS.PLANTINGS, JSON.stringify(allPlantings));
    } catch (error) {
      console.error('Error saving plantings:', error);
      throw error;
    }
  }

  // Get or create planter ID
  private async getPlanterId(): Promise<string> {
    let planterId = await AsyncStorage.getItem(STORAGE_KEYS.PLANTER_ID);
    if (!planterId) {
      planterId = `planter_${Date.now()}`;
      await AsyncStorage.setItem(STORAGE_KEYS.PLANTER_ID, planterId);
    }
    return planterId;
  }

  // Clear all planting records (for testing)
  async clearAllPlantings(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.PLANTINGS);
  }
}

export const simplePlantingService = new SimplePlantingService();