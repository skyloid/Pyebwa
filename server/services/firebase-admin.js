const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
    try {
        // Use absolute path to ensure we can find the service account key
        const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
        console.log('Loading service account from:', serviceAccountPath);
        
        const serviceAccount = require(serviceAccountPath);
        
        // Set the GOOGLE_APPLICATION_CREDENTIALS environment variable
        process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL || "https://pyebwa-f5960.firebaseio.com",
            projectId: serviceAccount.project_id
        });
        console.log('Firebase Admin SDK initialized with project ID:', serviceAccount.project_id);
        console.log('GOOGLE_APPLICATION_CREDENTIALS set to:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } catch (error) {
        console.error('Failed to initialize Firebase Admin SDK:', error.message);
        console.error('Current directory:', process.cwd());
        console.error('__dirname:', __dirname);
        throw error;
    }
}

// Export the initialized admin instance and commonly used services
module.exports = {
    admin,
    db: admin.firestore(),
    auth: admin.auth(),
    storage: admin.storage()
};