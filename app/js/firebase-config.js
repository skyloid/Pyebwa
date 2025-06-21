// Firebase configuration - Updated for rasin.pyebwa.com
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
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
let storage = null;

// Initialize storage only if available
try {
    if (firebase.storage) {
        storage = firebase.storage();
    }
} catch (error) {
    console.log('Firebase Storage not available:', error.message);
}

// Set auth persistence to LOCAL (persists across browser sessions and domains)
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log('Auth persistence set to LOCAL');
    })
    .catch((error) => {
        console.error('Error setting auth persistence:', error);
    });

// Log auth state changes for debugging
auth.onAuthStateChanged((user) => {
    console.log('Firebase auth state (in firebase-config):', user ? `User: ${user.email}` : 'No user');
});