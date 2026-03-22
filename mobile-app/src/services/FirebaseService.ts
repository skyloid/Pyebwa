import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration - these should match your web app configuration
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};

class FirebaseServiceClass {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private storage: FirebaseStorage | null = null;

  async initialize(): Promise<void> {
    try {
      // Check if Firebase is already initialized
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
      } else {
        this.app = getApps()[0];
      }

      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.storage = getStorage(this.app);

      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  }

  getAuth(): Auth {
    if (!this.auth) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.auth;
  }

  getFirestore(): Firestore {
    if (!this.db) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.db;
  }

  getStorage(): FirebaseStorage {
    if (!this.storage) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.storage;
  }

  getApp(): FirebaseApp {
    if (!this.app) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.app;
  }
}

export const FirebaseService = new FirebaseServiceClass();