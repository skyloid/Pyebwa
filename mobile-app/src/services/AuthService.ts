import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
  UserCredential,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { FirebaseService } from './FirebaseService';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  familyTreeId: string;
  createdAt: any;
  updatedAt: any;
  photoURL?: string;
  phoneNumber?: string;
  birthDate?: string;
  location?: string;
}

class AuthServiceClass {
  async signIn(email: string, password: string): Promise<UserCredential> {
    try {
      const auth = FirebaseService.getAuth();
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('User signed in successfully');
      return result;
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  async signUp(email: string, password: string, displayName: string): Promise<UserCredential> {
    try {
      const auth = FirebaseService.getAuth();
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name
      await updateProfile(result.user, { displayName });

      // Create user profile document
      await this.createUserProfile(result.user, { displayName });

      console.log('User signed up successfully');
      return result;
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw this.handleAuthError(error);
    }
  }

  async signOut(): Promise<void> {
    try {
      const auth = FirebaseService.getAuth();
      await firebaseSignOut(auth);
      console.log('User signed out successfully');
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw this.handleAuthError(error);
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const auth = FirebaseService.getAuth();
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent');
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw this.handleAuthError(error);
    }
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    const auth = FirebaseService.getAuth();
    return firebaseOnAuthStateChanged(auth, callback);
  }

  getCurrentUser(): User | null {
    const auth = FirebaseService.getAuth();
    return auth.currentUser;
  }

  async createUserProfile(user: User, additionalData: any = {}): Promise<UserProfile> {
    try {
      const db = FirebaseService.getFirestore();
      const userRef = doc(db, 'users', user.uid);
      
      // Generate a unique family tree ID
      const familyTreeId = `tree_${user.uid}_${Date.now()}`;
      
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || additionalData.displayName || '',
        familyTreeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...additionalData,
      };

      await setDoc(userRef, userProfile);
      
      // Create the family tree document
      const treeRef = doc(db, 'familyTrees', familyTreeId);
      await setDoc(treeRef, {
        id: familyTreeId,
        ownerId: user.uid,
        name: `${userProfile.displayName}'s Family Tree`,
        description: 'My family genealogy',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        members: {},
        settings: {
          isPublic: false,
          allowComments: true,
          allowCollaboration: false,
        },
      });

      console.log('User profile created successfully');
      return userProfile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const db = FirebaseService.getFirestore();
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
      } else {
        console.log('No user profile found');
        return null;
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    try {
      const db = FirebaseService.getFirestore();
      const userRef = doc(db, 'users', uid);
      
      await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      
      console.log('User profile updated successfully');
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async getFamilyTreeId(uid: string): Promise<string | null> {
    try {
      const profile = await this.getUserProfile(uid);
      return profile?.familyTreeId || null;
    } catch (error) {
      console.error('Error getting family tree ID:', error);
      return null;
    }
  }

  private handleAuthError(error: any): Error {
    let message = 'An unexpected error occurred';
    
    switch (error.code) {
      case 'auth/user-not-found':
        message = 'No account found with this email address';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password';
        break;
      case 'auth/email-already-in-use':
        message = 'An account with this email already exists';
        break;
      case 'auth/weak-password':
        message = 'Password should be at least 6 characters';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your connection';
        break;
      default:
        message = error.message || message;
    }
    
    return new Error(message);
  }
}

export const AuthService = new AuthServiceClass();