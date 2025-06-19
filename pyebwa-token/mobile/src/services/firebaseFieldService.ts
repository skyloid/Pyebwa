import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PlantingField, Coordinate } from '../types';
import authService from './authService';

class FirebaseFieldService {
  private readonly COLLECTION_NAME = 'fields';

  // Create a new field
  async createField(
    name: string,
    polygon: Coordinate[],
    capacity: number,
    allowedSpecies: string[],
    description?: string
  ): Promise<string> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Calculate area using Shoelace formula
      const area = this.calculatePolygonArea(polygon);

      const fieldData = {
        validatorId: user.uid,
        validatorEmail: user.email,
        name,
        polygon: polygon.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude,
          timestamp: point.timestamp || new Date(),
          accuracy: point.accuracy
        })),
        area,
        capacity,
        plantedCount: 0,
        allowedSpecies,
        description: description || '',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), fieldData);
      return docRef.id;
    } catch (error: any) {
      console.error('Error creating field:', error);
      throw error;
    }
  }

  // Get all fields for the current user
  async getUserFields(): Promise<PlantingField[]> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const userProfile = authService.getUserProfile();
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      let fieldsQuery;
      
      if (userProfile.userType === 'validator') {
        // Validators see their own fields
        fieldsQuery = query(
          collection(db, this.COLLECTION_NAME),
          where('validatorId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      } else {
        // Planters see all active fields
        fieldsQuery = query(
          collection(db, this.COLLECTION_NAME),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(fieldsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as PlantingField[];
    } catch (error: any) {
      console.error('Error getting user fields:', error);
      throw error;
    }
  }

  // Get all active fields (for planters)
  async getActiveFields(): Promise<PlantingField[]> {
    try {
      const fieldsQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(fieldsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as PlantingField[];
    } catch (error: any) {
      console.error('Error getting active fields:', error);
      throw error;
    }
  }

  // Get field by ID
  async getFieldById(fieldId: string): Promise<PlantingField | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, fieldId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as PlantingField;
      }

      return null;
    } catch (error: any) {
      console.error('Error getting field by ID:', error);
      throw error;
    }
  }

  // Update field
  async updateField(fieldId: string, updates: Partial<PlantingField>): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify ownership (only validators can update their own fields)
      const field = await this.getFieldById(fieldId);
      if (!field || field.validatorId !== user.uid) {
        throw new Error('Unauthorized: Cannot update this field');
      }

      const docRef = doc(db, this.COLLECTION_NAME, fieldId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Error updating field:', error);
      throw error;
    }
  }

  // Delete field (soft delete by setting status to 'inactive')
  async deleteField(fieldId: string): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify ownership
      const field = await this.getFieldById(fieldId);
      if (!field || field.validatorId !== user.uid) {
        throw new Error('Unauthorized: Cannot delete this field');
      }

      const docRef = doc(db, this.COLLECTION_NAME, fieldId);
      await updateDoc(docRef, {
        status: 'inactive',
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Error deleting field:', error);
      throw error;
    }
  }

  // Increment planted count
  async incrementPlantedCount(fieldId: string, increment: number = 1): Promise<void> {
    try {
      const field = await this.getFieldById(fieldId);
      if (!field) {
        throw new Error('Field not found');
      }

      const newCount = field.plantedCount + increment;
      if (newCount > field.capacity) {
        throw new Error('Cannot exceed field capacity');
      }

      const docRef = doc(db, this.COLLECTION_NAME, fieldId);
      await updateDoc(docRef, {
        plantedCount: newCount,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Error incrementing planted count:', error);
      throw error;
    }
  }

  // Subscribe to field changes
  subscribeToFields(
    callback: (fields: PlantingField[]) => void,
    userType: 'validator' | 'planter' = 'planter'
  ): () => void {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    let fieldsQuery;
    
    if (userType === 'validator') {
      fieldsQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('validatorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    } else {
      fieldsQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
    }

    return onSnapshot(fieldsQuery, (snapshot: QuerySnapshot<DocumentData>) => {
      const fields = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as PlantingField[];

      callback(fields);
    });
  }

  // Check if location is within any field
  async validateLocation(location: Coordinate): Promise<{
    isValid: boolean;
    field?: PlantingField;
    distance?: number;
  }> {
    try {
      const fields = await this.getActiveFields();
      
      // Check each field
      for (const field of fields) {
        if (this.isPointInPolygon(location, field.polygon)) {
          return { isValid: true, field };
        }
      }

      // Find nearest field if not inside any
      let nearestField: PlantingField | null = null;
      let minDistance = Infinity;

      for (const field of fields) {
        const distance = this.getDistanceToPolygon(location, field.polygon);
        if (distance < minDistance) {
          minDistance = distance;
          nearestField = field;
        }
      }

      return {
        isValid: false,
        field: nearestField || undefined,
        distance: minDistance
      };
    } catch (error: any) {
      console.error('Error validating location:', error);
      throw error;
    }
  }

  // Get nearby fields
  async getNearbyFields(location: Coordinate, radiusMeters: number = 1000): Promise<{
    fieldsInside: PlantingField[];
    fieldsNearby: Array<{ field: PlantingField; distance: number }>;
  }> {
    try {
      const fields = await this.getActiveFields();
      const fieldsInside: PlantingField[] = [];
      const fieldsNearby: Array<{ field: PlantingField; distance: number }> = [];

      for (const field of fields) {
        if (this.isPointInPolygon(location, field.polygon)) {
          fieldsInside.push(field);
        } else {
          const distance = this.getDistanceToPolygon(location, field.polygon);
          if (distance <= radiusMeters) {
            fieldsNearby.push({ field, distance });
          }
        }
      }

      // Sort nearby fields by distance
      fieldsNearby.sort((a, b) => a.distance - b.distance);

      return { fieldsInside, fieldsNearby };
    } catch (error: any) {
      console.error('Error getting nearby fields:', error);
      throw error;
    }
  }

  // Helper methods
  private calculatePolygonArea(points: Coordinate[]): number {
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].longitude * points[j].latitude;
      area -= points[j].longitude * points[i].latitude;
    }

    area = Math.abs(area) / 2;
    
    // Convert to square meters (approximate)
    const metersPerDegree = 111000;
    return area * metersPerDegree * metersPerDegree;
  }

  private isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
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
}

export default new FirebaseFieldService();