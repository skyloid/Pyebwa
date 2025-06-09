import { initializeApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// Firebase configuration
// Note: The configuration is handled by google-services.json (Android) 
// and GoogleService-Info.plist (iOS) files

// Initialize Firebase (this happens automatically with the config files)
const app = initializeApp();

// Export Firebase services
export { auth, firestore, storage };

// Export the app instance if needed
export default app;