import {
  collection,
  doc,
  addDoc,
  updateDoc,
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
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { TreePlanting, Coordinate } from '../types';
import authService from './authService';

export interface PlantingData {
  fieldId: string;
  species: string;
  location: Coordinate;
  photoUri: string;
  notes?: string;
}

class FirebasePlantingService {
  private readonly COLLECTION_NAME = 'plantings';
  private readonly STORAGE_PATH = 'planting-photos';

  // Create a new tree planting record
  async createPlanting(plantingData: PlantingData): Promise<string> {
    try {
      const user = authService.getCurrentUser();
      const userProfile = authService.getUserProfile();
      
      if (!user || !userProfile) {
        throw new Error('User not authenticated');
      }

      // Upload photo first
      const photoUrl = await this.uploadPhoto(plantingData.photoUri);

      // Create planting record
      const planting = {
        planterId: user.uid,
        planterEmail: user.email,
        planterName: userProfile.name,
        fieldId: plantingData.fieldId,
        species: plantingData.species,
        location: {
          latitude: plantingData.location.latitude,
          longitude: plantingData.location.longitude,
          timestamp: plantingData.location.timestamp || new Date(),
          accuracy: plantingData.location.accuracy
        },
        photoUrl,
        notes: plantingData.notes || '',
        status: 'pending', // pending, verified, rejected
        plantedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), planting);
      
      // Update field's planted count
      await this.incrementFieldPlantedCount(plantingData.fieldId);

      return docRef.id;
    } catch (error: any) {
      console.error('Error creating planting:', error);
      throw error;
    }
  }

  // Upload photo to Firebase Storage
  private async uploadPhoto(photoUri: string): Promise<string> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Convert URI to blob
      const response = await fetch(photoUri);
      const blob = await response.blob();

      // Create unique filename
      const filename = `${user.uid}_${Date.now()}.jpg`;
      const photoRef = ref(storage, `${this.STORAGE_PATH}/${filename}`);

      // Upload photo
      const snapshot = await uploadBytes(photoRef, blob);
      
      // Get download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      return downloadUrl;
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  }

  // Get all plantings for current user
  async getUserPlantings(): Promise<TreePlanting[]> {
    try {
      const user = authService.getCurrentUser();
      const userProfile = authService.getUserProfile();
      
      if (!user || !userProfile) {
        throw new Error('User not authenticated');
      }

      let plantingsQuery;

      if (userProfile.userType === 'validator') {
        // Validators see all plantings that need verification
        plantingsQuery = query(
          collection(db, this.COLLECTION_NAME),
          orderBy('createdAt', 'desc')
        );
      } else {
        // Planters see only their own plantings
        plantingsQuery = query(
          collection(db, this.COLLECTION_NAME),
          where('planterId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(plantingsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        plantedAt: doc.data().plantedAt?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as TreePlanting[];
    } catch (error: any) {
      console.error('Error getting user plantings:', error);
      throw error;
    }
  }

  // Get plantings for a specific field
  async getFieldPlantings(fieldId: string): Promise<TreePlanting[]> {
    try {
      const plantingsQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('fieldId', '==', fieldId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(plantingsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        plantedAt: doc.data().plantedAt?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as TreePlanting[];
    } catch (error: any) {
      console.error('Error getting field plantings:', error);
      throw error;
    }
  }

  // Get planting by ID
  async getPlantingById(plantingId: string): Promise<TreePlanting | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, plantingId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          plantedAt: data.plantedAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as TreePlanting;
      }

      return null;
    } catch (error: any) {
      console.error('Error getting planting by ID:', error);
      throw error;
    }
  }

  // Update planting status (for validators)
  async updatePlantingStatus(
    plantingId: string, 
    status: 'pending' | 'verified' | 'rejected',
    validatorNotes?: string
  ): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      const userProfile = authService.getUserProfile();
      
      if (!user || !userProfile || userProfile.userType !== 'validator') {
        throw new Error('Unauthorized: Only validators can update planting status');
      }

      const docRef = doc(db, this.COLLECTION_NAME, plantingId);
      const updateData: any = {
        status,
        validatorId: user.uid,
        validatorEmail: user.email,
        validatorName: userProfile.name,
        validatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (validatorNotes) {
        updateData.validatorNotes = validatorNotes;
      }

      await updateDoc(docRef, updateData);
    } catch (error: any) {
      console.error('Error updating planting status:', error);
      throw error;
    }
  }

  // Delete planting
  async deletePlanting(plantingId: string): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get planting to verify ownership and get photo URL
      const planting = await this.getPlantingById(plantingId);
      if (!planting) {
        throw new Error('Planting not found');
      }

      // Only allow deletion by owner or validator
      const userProfile = authService.getUserProfile();
      const canDelete = planting.planterId === user.uid || 
                       (userProfile?.userType === 'validator');
      
      if (!canDelete) {
        throw new Error('Unauthorized: Cannot delete this planting');
      }

      // Delete photo from storage
      if (planting.photoUrl) {
        try {
          const photoRef = ref(storage, planting.photoUrl);
          await deleteObject(photoRef);
        } catch (photoError) {
          console.warn('Error deleting photo:', photoError);
          // Continue with document deletion even if photo deletion fails
        }
      }

      // Delete document
      const docRef = doc(db, this.COLLECTION_NAME, plantingId);
      await updateDoc(docRef, {
        status: 'deleted',
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Decrement field's planted count if planting was verified
      if (planting.status === 'verified') {
        await this.decrementFieldPlantedCount(planting.fieldId);
      }
    } catch (error: any) {
      console.error('Error deleting planting:', error);
      throw error;
    }
  }

  // Subscribe to plantings changes
  subscribesToPlantings(
    callback: (plantings: TreePlanting[]) => void,
    filters?: { fieldId?: string; planterId?: string; status?: string }
  ): () => void {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    let plantingsQuery = query(collection(db, this.COLLECTION_NAME));

    // Apply filters
    if (filters?.fieldId) {
      plantingsQuery = query(plantingsQuery, where('fieldId', '==', filters.fieldId));
    }
    if (filters?.planterId) {
      plantingsQuery = query(plantingsQuery, where('planterId', '==', filters.planterId));
    }
    if (filters?.status) {
      plantingsQuery = query(plantingsQuery, where('status', '==', filters.status));
    }

    plantingsQuery = query(plantingsQuery, orderBy('createdAt', 'desc'));

    return onSnapshot(plantingsQuery, (snapshot: QuerySnapshot<DocumentData>) => {
      const plantings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        plantedAt: doc.data().plantedAt?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as TreePlanting[];

      callback(plantings);
    });
  }

  // Get planting statistics
  async getPlantingStats(fieldId?: string): Promise<{
    total: number;
    pending: number;
    verified: number;
    rejected: number;
    bySpecies: { [species: string]: number };
  }> {
    try {
      let plantingsQuery = query(collection(db, this.COLLECTION_NAME));
      
      if (fieldId) {
        plantingsQuery = query(plantingsQuery, where('fieldId', '==', fieldId));
      }

      const snapshot = await getDocs(plantingsQuery);
      const plantings = snapshot.docs.map(doc => doc.data());

      const stats = {
        total: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
        bySpecies: {} as { [species: string]: number }
      };

      plantings.forEach(planting => {
        if (planting.status !== 'deleted') {
          stats.total++;
          
          switch (planting.status) {
            case 'pending':
              stats.pending++;
              break;
            case 'verified':
              stats.verified++;
              break;
            case 'rejected':
              stats.rejected++;
              break;
          }

          // Count by species
          const species = planting.species || 'unknown';
          stats.bySpecies[species] = (stats.bySpecies[species] || 0) + 1;
        }
      });

      return stats;
    } catch (error: any) {
      console.error('Error getting planting stats:', error);
      throw error;
    }
  }

  // Private helper methods
  private async incrementFieldPlantedCount(fieldId: string): Promise<void> {
    try {
      const fieldRef = doc(db, 'fields', fieldId);
      const fieldSnap = await getDoc(fieldRef);
      
      if (fieldSnap.exists()) {
        const currentCount = fieldSnap.data().plantedCount || 0;
        await updateDoc(fieldRef, {
          plantedCount: currentCount + 1,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.warn('Error incrementing field planted count:', error);
    }
  }

  private async decrementFieldPlantedCount(fieldId: string): Promise<void> {
    try {
      const fieldRef = doc(db, 'fields', fieldId);
      const fieldSnap = await getDoc(fieldRef);
      
      if (fieldSnap.exists()) {
        const currentCount = fieldSnap.data().plantedCount || 0;
        if (currentCount > 0) {
          await updateDoc(fieldRef, {
            plantedCount: currentCount - 1,
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.warn('Error decrementing field planted count:', error);
    }
  }
}

export default new FirebasePlantingService();