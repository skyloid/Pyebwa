import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  userType: 'family' | 'planter';
  createdAt: Date;
  lastLogin: Date;
}

class AuthService {
  private currentUser: User | null = null;
  private userProfile: UserProfile | null = null;

  // Initialize auth state listener
  initializeAuth(): Promise<User | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        this.currentUser = user;
        if (user) {
          this.loadUserProfile(user.uid);
        } else {
          this.userProfile = null;
        }
        unsubscribe();
        resolve(user);
      });
    });
  }

  // Register new user
  async register(
    email: string, 
    password: string, 
    name: string, 
    userType: 'family' | 'planter'
  ): Promise<UserProfile> {
    try {
      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName: name });

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        name,
        userType,
        createdAt: new Date(),
        lastLogin: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);

      this.currentUser = user;
      this.userProfile = userProfile;

      // Store user type locally for quick access
      await AsyncStorage.setItem('userType', userType);

      return userProfile;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  // Login user
  async login(email: string, password: string): Promise<UserProfile> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Load user profile
      const userProfile = await this.loadUserProfile(user.uid);
      
      // Update last login
      await setDoc(doc(db, 'users', user.uid), {
        ...userProfile,
        lastLogin: new Date()
      }, { merge: true });

      this.currentUser = user;
      this.userProfile = { ...userProfile, lastLogin: new Date() };

      // Store user type locally
      await AsyncStorage.setItem('userType', userProfile.userType);

      return this.userProfile;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  // Demo login for testing
  async demoLogin(userType: 'family' | 'planter'): Promise<UserProfile> {
    const demoUsers = {
      family: {
        email: 'family@demo.com',
        password: 'demo123',
        name: 'Demo Family User'
      },
      planter: {
        email: 'planter@demo.com', 
        password: 'demo123',
        name: 'Demo Tree Planter'
      }
    };

    const demoUser = demoUsers[userType];
    
    try {
      // Try to login first
      return await this.login(demoUser.email, demoUser.password);
    } catch (error) {
      // If login fails, register the demo user
      return await this.register(
        demoUser.email, 
        demoUser.password, 
        demoUser.name, 
        userType
      );
    }
  }

  // Load user profile from Firestore
  private async loadUserProfile(uid: string): Promise<UserProfile> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }
    return userDoc.data() as UserProfile;
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.currentUser = null;
      this.userProfile = null;
      await AsyncStorage.removeItem('userType');
    } catch (error: any) {
      throw new Error('Failed to logout');
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Get user profile
  getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  // Get user type from storage (for quick access)
  async getUserType(): Promise<'family' | 'planter' | null> {
    try {
      const userType = await AsyncStorage.getItem('userType');
      return userType as 'family' | 'planter' | null;
    } catch (error) {
      return null;
    }
  }

  // Convert Firebase error codes to user-friendly messages
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please use a different email or try logging in.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-not-found':
        return 'No account found with this email. Please check your email or create a new account.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}

export default new AuthService();