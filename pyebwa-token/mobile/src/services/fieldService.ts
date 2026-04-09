import { FieldMappingService } from './FieldMappingService';
import authService from './authService';
import { Coordinate, PlantingField } from '../types';

class FieldService {
  private fieldMappingService = FieldMappingService.getInstance();

  async createField(
    name: string,
    polygon: Coordinate[],
    capacity: number,
    allowedSpecies: string[],
    description?: string
  ): Promise<string> {
    const field = await this.fieldMappingService.createField(
      name,
      polygon,
      capacity,
      allowedSpecies,
      description
    );
    return field.id;
  }

  async getUserFields(): Promise<PlantingField[]> {
    const fields = await this.fieldMappingService.getAllFields();
    const profile = authService.getUserProfile();

    if (!profile || profile.userType !== 'validator') {
      return fields.filter((field) => field.status === 'active');
    }

    return fields.filter((field) => field.validatorId === profile.uid);
  }

  async getActiveFields(): Promise<PlantingField[]> {
    const fields = await this.fieldMappingService.getAllFields();
    return fields.filter((field) => field.status === 'active');
  }

  async getFieldById(fieldId: string): Promise<PlantingField | null> {
    return this.fieldMappingService.getFieldById(fieldId);
  }

  async updateField(fieldId: string, updates: Partial<PlantingField>): Promise<void> {
    const field = await this.fieldMappingService.getFieldById(fieldId);
    if (!field) {
      throw new Error('Field not found');
    }

    await this.fieldMappingService.updateField({
      ...field,
      ...updates,
      updatedAt: new Date(),
    });
  }

  async deleteField(fieldId: string): Promise<void> {
    await this.updateField(fieldId, { status: 'inactive' });
  }

  async incrementPlantedCount(fieldId: string, increment = 1): Promise<void> {
    const field = await this.fieldMappingService.getFieldById(fieldId);
    if (!field) {
      throw new Error('Field not found');
    }

    const nextCount = Math.max(0, Math.min(field.capacity, field.plantedCount + increment));
    await this.fieldMappingService.updateField({
      ...field,
      plantedCount: nextCount,
      updatedAt: new Date(),
    });
  }

  subscribeToFields(
    callback: (fields: PlantingField[]) => void,
    userType: 'validator' | 'planter' = 'planter'
  ): () => void {
    let active = true;

    const emit = async () => {
      const fields = userType === 'validator'
        ? await this.getUserFields()
        : await this.getActiveFields();

      if (active) {
        callback(fields);
      }
    };

    void emit();
    return () => {
      active = false;
    };
  }

  async validateLocation(location: Coordinate) {
    return this.fieldMappingService.validateLocation(location);
  }

  async getNearbyFields(location: Coordinate, radiusMeters = 1000) {
    return this.fieldMappingService.getNearbyFields(location, radiusMeters);
  }
}

export default new FieldService();
