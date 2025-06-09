// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyApTHhm_Ia0sz63YDw2mYXiXp_qED7NdOQ",
    authDomain: "pyebwa-f5960.firebaseapp.com",
    projectId: "pyebwa-f5960",
    storageBucket: "pyebwa-f5960.firebasestorage.app",
    messagingSenderId: "1042887343749",
    appId: "1:1042887343749:web:c276bf69b6c0895111f3ec",
    measurementId: "G-ZX92K1TMM3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Set persistence
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);