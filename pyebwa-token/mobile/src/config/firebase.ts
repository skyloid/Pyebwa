import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration for PYEBWA Token
const firebaseConfig = {
  apiKey: "AIzaSyApTHhm_Ia0sz63YDw2mYXiXp_qED7NdOQ",
  authDomain: "rasin.pyebwa.com",
  projectId: "pyebwa-f5960",
  storageBucket: "pyebwa-f5960.firebasestorage.app",
  messagingSenderId: "1042887343749",
  appId: "1:1042887343749:web:c276bf69b6c0895111f3ec",
  measurementId: "G-ZX92K1TMM3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { auth, db, storage };
export default app;