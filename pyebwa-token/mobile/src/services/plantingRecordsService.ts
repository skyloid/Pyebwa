import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coordinate, TreePlanting } from '../types';
import authService from './authService';
import { simplePlantingService, SimplePlantingRecord } from './SimplePlantingService';

export interface PlantingData {
  fieldId: string;
  species: string;
  location: Coordinate;
  photoUri: string;
  notes?: string;
}

const STORAGE_KEYS = {
  VALIDATION_NOTES: 'planting_validation_notes',
};

class PlantingRecordsService {
  private async loadValidationNotes(): Promise<Record<string, Partial<TreePlanting>>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.VALIDATION_NOTES);
    return raw ? JSON.parse(raw) : {};
  }

  private async saveValidationNotes(notes: Record<string, Partial<TreePlanting>>): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.VALIDATION_NOTES, JSON.stringify(notes));
  }

  private async toTreePlanting(record: SimplePlantingRecord): Promise<TreePlanting> {
    const user = authService.getCurrentUser();
    const notes = await this.loadValidationNotes();
    const extra = notes[record.id] || {};

    return {
      id: record.id,
      planterId: record.planterId,
      planterEmail: user?.email,
      planterName: record.planterName,
      fieldId: record.fieldId,
      species: record.species,
      location: record.location,
      photoUrl: record.photoUri,
      photoUri: record.photoUri,
      notes: extra.notes,
      status: (extra.status as TreePlanting['status']) || record.status,
      plantedAt: record.timestamp,
      createdAt: record.timestamp,
      updatedAt: extra.updatedAt ? new Date(extra.updatedAt) : record.timestamp,
      validatorId: extra.validatorId,
      validatorEmail: extra.validatorEmail,
      validatorName: extra.validatorName,
      validatorNotes: extra.validatorNotes,
      validatedAt: extra.validatedAt ? new Date(extra.validatedAt) : undefined,
    };
  }

  async createPlanting(plantingData: PlantingData): Promise<string> {
    const currentProfile = authService.getUserProfile();
    const planterName = currentProfile?.name;

    const records = await simplePlantingService.recordPlantings(
      plantingData.fieldId,
      plantingData.species,
      [{ uri: plantingData.photoUri, location: plantingData.location }],
      planterName
    );

    return records[0].id;
  }

  async getUserPlantings(): Promise<TreePlanting[]> {
    const profile = authService.getUserProfile();
    const records = profile?.userType === 'validator'
      ? await simplePlantingService.getAllPlantings()
      : await simplePlantingService.getPlanterPlantings();

    return Promise.all(records.map((record) => this.toTreePlanting(record)));
  }

  async getFieldPlantings(fieldId: string): Promise<TreePlanting[]> {
    const records = await simplePlantingService.getFieldPlantings(fieldId);
    return Promise.all(records.map((record) => this.toTreePlanting(record)));
  }

  async getPlantingById(plantingId: string): Promise<TreePlanting | null> {
    const plantings = await simplePlantingService.getAllPlantings();
    const record = plantings.find((item) => item.id === plantingId);
    return record ? this.toTreePlanting(record) : null;
  }

  async updatePlantingStatus(
    plantingId: string,
    status: 'pending' | 'verified' | 'rejected',
    validatorNotes?: string
  ): Promise<void> {
    const profile = authService.getUserProfile();
    const user = authService.getCurrentUser();

    if (!profile || profile.userType !== 'validator' || !user) {
      throw new Error('Unauthorized: Only validators can update planting status');
    }

    const notes = await this.loadValidationNotes();
    notes[plantingId] = {
      ...notes[plantingId],
      status,
      validatorId: user.uid,
      validatorEmail: user.email,
      validatorName: profile.name,
      validatorNotes,
      validatedAt: new Date(),
      updatedAt: new Date(),
    };
    await this.saveValidationNotes(notes);
  }

  async deletePlanting(plantingId: string): Promise<void> {
    const notes = await this.loadValidationNotes();
    notes[plantingId] = {
      ...notes[plantingId],
      status: 'deleted',
      updatedAt: new Date(),
    };
    await this.saveValidationNotes(notes);
  }

  subscribesToPlantings(
    callback: (plantings: TreePlanting[]) => void
  ): () => void {
    let active = true;
    const emit = async () => {
      const plantings = await this.getUserPlantings();
      if (active) {
        callback(plantings);
      }
    };

    void emit();
    return () => {
      active = false;
    };
  }

  async getPlantingStats(fieldId?: string): Promise<{
    total: number;
    pending: number;
    verified: number;
    rejected: number;
    bySpecies: { [species: string]: number };
  }> {
    const records = fieldId
      ? await this.getFieldPlantings(fieldId)
      : await this.getUserPlantings();

    return records.reduce(
      (stats, planting) => {
        if (planting.status === 'deleted') {
          return stats;
        }

        stats.total += 1;
        if (planting.status === 'pending') stats.pending += 1;
        if (planting.status === 'verified') stats.verified += 1;
        if (planting.status === 'rejected') stats.rejected += 1;
        stats.bySpecies[planting.species] = (stats.bySpecies[planting.species] || 0) + 1;
        return stats;
      },
      {
        total: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
        bySpecies: {} as { [species: string]: number },
      }
    );
  }
}

export default new PlantingRecordsService();
