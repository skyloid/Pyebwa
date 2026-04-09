// User types
export type UserType = 'family' | 'planter' | 'validator';

// GPS coordinate type
export interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
}

// Planting field type
export interface PlantingField {
  id: string;
  validatorId: string;
  name: string;
  polygon: Coordinate[];
  area: number; // square meters
  capacity: number; // max trees
  plantedCount: number;
  allowedSpecies: string[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'full' | 'inactive';
  description?: string;
}

export interface TreePlanting {
  id: string;
  planterId: string;
  planterEmail?: string;
  planterName?: string;
  fieldId: string;
  species: string;
  location: Coordinate;
  photoUrl?: string;
  photoUri?: string;
  notes?: string;
  status: 'pending' | 'verified' | 'rejected' | 'deleted';
  plantedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  validatorId?: string;
  validatorEmail?: string;
  validatorName?: string;
  validatorNotes?: string;
  validatedAt?: Date;
}

// Field mapping session
export interface MappingSession {
  id: string;
  fieldId?: string;
  points: Coordinate[];
  startTime: Date;
  endTime?: Date;
  totalDistance: number;
  isComplete: boolean;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  fieldId?: string;
  fieldName?: string;
  distance?: number; // distance to nearest field if outside
  message: string;
}
