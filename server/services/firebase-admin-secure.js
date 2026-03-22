const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
    try {
        let credential;
        
        // Method 1: Use service account file path from environment variable
        if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
            console.log('Loading service account from environment path');
            
            const serviceAccount = require(serviceAccountPath);
            credential = admin.credential.cert(serviceAccount);
            
            // Set the GOOGLE_APPLICATION_CREDENTIALS environment variable
            process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
        }
        // Method 2: Use individual credentials from environment variables
        else if (process.env.FIREBASE_ADMIN_PROJECT_ID && 
                 process.env.FIREBASE_ADMIN_PRIVATE_KEY && 
                 process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
            console.log('Using individual Firebase Admin credentials from environment');
            
            credential = admin.credential.cert({
                projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
                privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
                clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL
            });
        }
        // Method 3: Default credentials (for Google Cloud environments)
        else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.log('Using default application credentials');
            credential = admin.credential.applicationDefault();
        }
        // Method 4: Fallback to local file (development only)
        else if (process.env.NODE_ENV !== 'production') {
            console.warn('⚠️  Using local serviceAccountKey.json - NOT for production!');
            const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
            const serviceAccount = require(serviceAccountPath);
            credential = admin.credential.cert(serviceAccount);
        } else {
            throw new Error('No Firebase Admin credentials configured. Please set FIREBASE_SERVICE_ACCOUNT_PATH or individual credential environment variables.');
        }
        
        // Initialize Firebase Admin
        admin.initializeApp({
            credential: credential,
            databaseURL: process.env.FIREBASE_DATABASE_URL || "https://pyebwa-f5960.firebaseio.com",
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "pyebwa-f5960",
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "pyebwa-f5960.firebasestorage.app"
        });
        
        console.log('✅ Firebase Admin SDK initialized securely');
        
        // Verify initialization
        admin.auth().listUsers(1).then(() => {
            console.log('✅ Firebase Admin SDK verified - authentication working');
        }).catch(err => {
            console.error('⚠️  Firebase Admin SDK verification failed:', err.message);
        });
        
    } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
        console.error('Please ensure Firebase Admin credentials are properly configured in environment variables');
        
        // In production, fail hard if Firebase Admin cannot be initialized
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
        
        throw error;
    }
}

// Export the initialized admin instance and commonly used services
module.exports = {
    admin,
    db: admin.firestore(),
    auth: admin.auth(),
    storage: admin.storage(),
    
    // Helper function to verify admin is initialized
    isInitialized: () => admin.apps.length > 0,
    
    // Helper to get current user from request
    getCurrentUser: async (req) => {
        const token = req.headers.authorization?.split('Bearer ')[1];
        if (!token) return null;
        
        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            return decodedToken;
        } catch (error) {
            console.error('Token verification failed:', error);
            return null;
        }
    },
    
    // Helper to check if user is admin
    isAdmin: async (uid) => {
        try {
            const user = await admin.auth().getUser(uid);
            return user.customClaims?.role === 'admin';
        } catch (error) {
            console.error('Admin check failed:', error);
            return false;
        }
    }
};