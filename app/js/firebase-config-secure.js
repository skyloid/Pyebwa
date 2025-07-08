// Secure Firebase configuration loader
// This file should be used in production to load Firebase config from environment

(function() {
    'use strict';
    
    // Function to load Firebase config from server
    async function loadFirebaseConfig() {
        try {
            // In production, this endpoint should return Firebase config from environment variables
            const response = await fetch('/api/firebase-config');
            if (!response.ok) {
                throw new Error('Failed to load Firebase configuration');
            }
            
            const config = await response.json();
            return config;
        } catch (error) {
            console.error('Error loading Firebase config:', error);
            
            // Fallback to hardcoded config for development
            // In production, this should throw an error instead
            console.warn('Using fallback Firebase configuration');
            return {
                apiKey: "AIzaSyApTHhm_Ia0sz63YDw2mYXiXp_qED7NdOQ",
                authDomain: "rasin.pyebwa.com",
                projectId: "pyebwa-f5960",
                storageBucket: "pyebwa-f5960.firebasestorage.app",
                messagingSenderId: "1042887343749",
                appId: "1:1042887343749:web:c276bf69b6c0895111f3ec",
                measurementId: "G-ZX92K1TMM3"
            };
        }
    }
    
    // Initialize Firebase with secure config
    async function initializeFirebase() {
        try {
            const firebaseConfig = await loadFirebaseConfig();
            
            // Initialize Firebase
            firebase.initializeApp(firebaseConfig);
            
            // Initialize services
            window.auth = firebase.auth();
            window.db = firebase.firestore();
            window.storage = null;
            
            // Initialize storage only if available
            try {
                if (firebase.storage) {
                    window.storage = firebase.storage();
                }
            } catch (error) {
                console.log('Firebase Storage not available:', error.message);
            }
            
            // Set auth persistence to LOCAL
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            console.log('Auth persistence set to LOCAL');
            
            // Log auth state changes for debugging
            auth.onAuthStateChanged((user) => {
                console.log('Firebase auth state:', user ? `User: ${user.email}` : 'No user');
            });
            
            // Dispatch event to signal Firebase is ready
            window.dispatchEvent(new Event('firebaseReady'));
            
        } catch (error) {
            console.error('Failed to initialize Firebase:', error);
            // Dispatch error event
            window.dispatchEvent(new CustomEvent('firebaseError', { detail: error }));
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFirebase);
    } else {
        initializeFirebase();
    }
})();