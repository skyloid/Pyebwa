// Script to add claude@humanlevel.ai as superadmin
// This script should be run from a secure environment with proper Firebase Admin SDK access

const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json'); // You'll need the service account key

// Initialize admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'pyebwa-f5960'
});

const db = admin.firestore();

async function addSuperAdmin() {
    const email = 'claude@humanlevel.ai';
    
    try {
        // First, check if user exists
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).get();
        
        if (snapshot.empty) {
            console.log(`User with email ${email} not found.`);
            console.log('Please ensure the user has created an account first.');
            return;
        }
        
        // Update the user document
        const userDoc = snapshot.docs[0];
        const userId = userDoc.id;
        
        await usersRef.doc(userId).update({
            role: 'superadmin',
            isAdmin: true,
            adminPromotedAt: admin.firestore.FieldValue.serverTimestamp(),
            adminPromotedBy: 'script',
            adminNote: 'Promoted via admin script'
        });
        
        console.log(`✅ Successfully promoted ${email} to superadmin!`);
        console.log(`User ID: ${userId}`);
        console.log('The user can now access the admin dashboard at /app/admin');
        
    } catch (error) {
        console.error('Error promoting user:', error);
    } finally {
        // Close the admin app
        await admin.app().delete();
    }
}

// Run the function
addSuperAdmin();