import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coordinate, PlantingField, MappingSession } from '../types';

const STORAGE_KEYS = {
  FIELDS: 'planting_fields',
  SESSIONS: 'mapping_sessions',
  CURRENT_SESSION: 'current_mapping_session',
};

export class FieldMappingService {
  private static instance: FieldMappingService;
  private locationSubscription: Location.LocationSubscription | null = null;
  private currentSession: MappingSession | null = null;

  static getInstance(): FieldMappingService {
    if (!FieldMappingService.instance) {
      FieldMappingService.instance = new FieldMappingService();
    }
    return FieldMappingService.instance;
  }

  // Start a new mapping session
  async startMapping(onLocationUpdate?: (location: Coordinate) => void): Promise<MappingSession> {
    // Request permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    // Create new session
    this.currentSession = {
      id: `session_${Date.now()}`,
      points: [],
      startTime: new Date(),
      totalDistance: 0,
      isComplete: false,
    };

    // Start high-accuracy location tracking
    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000, // Update every second
        distanceInterval: 1, // Update every meter
      },
      (location) => {
        if (this.currentSession) {
          const newPoint: Coordinate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: new Date(),
            accuracy: location.coords.accuracy || undefined,
          };

          // Add point to session
          this.currentSession.points.push(newPoint);

          // Calculate distance from last point
          if (this.currentSession.points.length > 1) {
            const lastPoint = this.currentSession.points[this.currentSession.points.length - 2];
            const distance = this.calculateDistance(lastPoint, newPoint);
            this.currentSession.totalDistance += distance;
          }

          // Save session
          this.saveCurrentSession();

          // Callback for UI updates
          if (onLocationUpdate) {
            onLocationUpdate(newPoint);
          }
        }
      }
    );

    await this.saveCurrentSession();
    return this.currentSession;
  }

  // Stop mapping and optionally save as field
  async stopMapping(): Promise<MappingSession | null> {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      this.currentSession.isComplete = true;
      await this.saveCurrentSession();
    }

    return this.currentSession;
  }

  // Complete mapping and create field
  async completeFieldMapping(
    name: string,
    capacity: number,
    allowedSpecies: string[],
    description?: string
  ): Promise<PlantingField> {
    if (!this.currentSession || this.currentSession.points.length < 4) {
      throw new Error('Invalid mapping session. Need at least 4 points.');
    }

    // Close polygon if needed
    const points = [...this.currentSession.points];
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    
    if (this.calculateDistance(firstPoint, lastPoint) > 10) {
      // If last point is more than 10m from first, add closing point
      points.push({
        ...firstPoint,
        timestamp: new Date(),
      });
    }

    // Calculate area
    const area = this.calculatePolygonArea(points);

    // Create field
    const field: PlantingField = {
      id: `field_${Date.now()}`,
      validatorId: await this.getValidatorId(),
      name,
      polygon: points,
      area,
      capacity,
      plantedCount: 0,
      allowedSpecies,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      description,
    };

    // Save field
    await this.saveField(field);

    // Clear current session
    this.currentSession = null;
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);

    return field;
  }

  // Calculate distance between two points (meters)
  calculateDistance(point1: Coordinate, point2: Coordinate): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Calculate polygon area using Shoelace formula
  calculatePolygonArea(points: Coordinate[]): number {
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].longitude * points[j].latitude;
      area -= points[j].longitude * points[i].latitude;
    }

    area = Math.abs(area) / 2;
    
    // Convert to square meters (approximate at Haiti's latitude)
    const metersPerDegree = 111000; // approximately
    return area * metersPerDegree * metersPerDegree;
  }

  // Check if a point is inside a polygon
  isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
    let inside = false;
    const x = point.longitude;
    const y = point.latitude;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  }

  // Validate if a location is within any active field
  async validateLocation(location: Coordinate): Promise<{
    isValid: boolean;
    field?: PlantingField;
    distance?: number;
  }> {
    const fields = await this.getAllFields();
    const activeFields = fields.filter(f => f.status === 'active');

    // Check each field
    for (const field of activeFields) {
      if (this.isPointInPolygon(location, field.polygon)) {
        return { isValid: true, field };
      }
    }

    // Find nearest field if not inside any
    let nearestField: PlantingField | null = null;
    let minDistance = Infinity;

    for (const field of activeFields) {
      const distance = this.getDistanceToPolygon(location, field.polygon);
      if (distance < minDistance) {
        minDistance = distance;
        nearestField = field;
      }
    }

    return {
      isValid: false,
      field: nearestField || undefined,
      distance: minDistance,
    };
  }

  // Get distance from point to nearest edge of polygon
  private getDistanceToPolygon(point: Coordinate, polygon: Coordinate[]): number {
    let minDistance = Infinity;

    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const distance = this.getDistanceToLineSegment(
        point,
        polygon[i],
        polygon[j]
      );
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  // Get distance from point to line segment
  private getDistanceToLineSegment(
    point: Coordinate,
    lineStart: Coordinate,
    lineEnd: Coordinate
  ): number {
    const A = point.longitude - lineStart.longitude;
    const B = point.latitude - lineStart.latitude;
    const C = lineEnd.longitude - lineStart.longitude;
    const D = lineEnd.latitude - lineStart.latitude;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.longitude;
      yy = lineStart.latitude;
    } else if (param > 1) {
      xx = lineEnd.longitude;
      yy = lineEnd.latitude;
    } else {
      xx = lineStart.longitude + param * C;
      yy = lineStart.latitude + param * D;
    }

    const dx = point.longitude - xx;
    const dy = point.latitude - yy;

    return Math.sqrt(dx * dx + dy * dy) * 111000; // Convert to meters
  }

  // Storage methods
  private async saveCurrentSession(): Promise<void> {
    if (this.currentSession) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CURRENT_SESSION,
        JSON.stringify(this.currentSession)
      );
    }
  }

  private async saveField(field: PlantingField): Promise<void> {
    const fields = await this.getAllFields();
    fields.push(field);
    await AsyncStorage.setItem(STORAGE_KEYS.FIELDS, JSON.stringify(fields));
  }

  async getAllFields(): Promise<PlantingField[]> {
    try {
      const fieldsJson = await AsyncStorage.getItem(STORAGE_KEYS.FIELDS);
      const fields = fieldsJson ? JSON.parse(fieldsJson) : [];
      
      // If no fields exist, create demo fields for testing
      if (fields.length === 0 && await this.isDemoMode()) {
        const demoFields = this.createDemoFields();
        await AsyncStorage.setItem(STORAGE_KEYS.FIELDS, JSON.stringify(demoFields));
        return demoFields;
      }
      
      return fields;
    } catch (error) {
      console.error('Error loading fields:', error);
      return [];
    }
  }

  async getFieldById(id: string): Promise<PlantingField | null> {
    const fields = await this.getAllFields();
    return fields.find(f => f.id === id) || null;
  }

  async updateField(updatedField: PlantingField): Promise<void> {
    const fields = await this.getAllFields();
    const index = fields.findIndex(f => f.id === updatedField.id);
    
    if (index === -1) {
      throw new Error('Field not found');
    }
    
    fields[index] = updatedField;
    await AsyncStorage.setItem(STORAGE_KEYS.FIELDS, JSON.stringify(fields));
  }

  private async getValidatorId(): Promise<string> {
    // In production, get from authenticated user
    // For now, use device-specific ID
    const validatorId = await AsyncStorage.getItem('validatorId');
    if (validatorId) return validatorId;
    
    const newId = `validator_${Date.now()}`;
    await AsyncStorage.setItem('validatorId', newId);
    return newId;
  }

  // Resume interrupted session
  async resumeSession(): Promise<MappingSession | null> {
    try {
      const sessionJson = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
      if (sessionJson) {
        this.currentSession = JSON.parse(sessionJson);
        return this.currentSession;
      }
    } catch (error) {
      console.error('Error resuming session:', error);
    }
    return null;
  }

  // Check if in demo mode
  private async isDemoMode(): Promise<boolean> {
    const email = await AsyncStorage.getItem('userEmail');
    return email?.includes('@demo.com') || false;
  }

  // Create demo fields for testing
  private createDemoFields(): PlantingField[] {
    const now = new Date();
    return [
      {
        id: 'demo_field_1',
        validatorId: 'validator_demo',
        name: 'North Hill Plantation',
        polygon: [
          { latitude: 18.9712, longitude: -72.2852, timestamp: now },
          { latitude: 18.9715, longitude: -72.2850, timestamp: now },
          { latitude: 18.9713, longitude: -72.2847, timestamp: now },
          { latitude: 18.9710, longitude: -72.2849, timestamp: now },
          { latitude: 18.9712, longitude: -72.2852, timestamp: now },
        ],
        area: 5000, // 0.5 hectares
        capacity: 250,
        plantedCount: 45,
        allowedSpecies: ['mango', 'moringa', 'cedar'],
        createdAt: now,
        updatedAt: now,
        status: 'active',
        description: 'Main planting area on the north hill slope',
      },
      {
        id: 'demo_field_2',
        validatorId: 'validator_demo',
        name: 'River Valley Zone',
        polygon: [
          { latitude: 18.9700, longitude: -72.2840, timestamp: now },
          { latitude: 18.9703, longitude: -72.2838, timestamp: now },
          { latitude: 18.9701, longitude: -72.2835, timestamp: now },
          { latitude: 18.9698, longitude: -72.2837, timestamp: now },
          { latitude: 18.9700, longitude: -72.2840, timestamp: now },
        ],
        area: 3500, // 0.35 hectares
        capacity: 175,
        plantedCount: 120,
        allowedSpecies: ['bamboo', 'moringa'],
        createdAt: now,
        updatedAt: now,
        status: 'active',
        description: 'Fertile valley area near the river',
      },
      {
        id: 'demo_field_3',
        validatorId: 'validator_demo',
        name: 'East Garden',
        polygon: [
          { latitude: 18.9720, longitude: -72.2830, timestamp: now },
          { latitude: 18.9723, longitude: -72.2828, timestamp: now },
          { latitude: 18.9721, longitude: -72.2825, timestamp: now },
          { latitude: 18.9718, longitude: -72.2827, timestamp: now },
          { latitude: 18.9720, longitude: -72.2830, timestamp: now },
        ],
        area: 2000, // 0.2 hectares
        capacity: 100,
        plantedCount: 98,
        allowedSpecies: ['mango', 'cedar'],
        createdAt: now,
        updatedAt: now,
        status: 'active',
        description: 'Small garden area for fruit trees',
      },
    ];
  }
}