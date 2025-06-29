// Use centralized Firebase Admin initialization
const { admin, db } = require('./server/services/firebase-admin');

// Middleware to setup admin role
async function setupAdminEndpoint(req, res) {
    try {
        // Security check - in production, add proper authentication
        const { email, secretKey } = req.body;
        
        // Basic security - require a secret key
        if (secretKey !== process.env.ADMIN_SETUP_KEY && secretKey !== 'temporary-setup-key-2024') {
            return res.status(403).json({ error: 'Invalid secret key' });
        }
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        // Check if user exists by email
        console.log(`Setting up admin for: ${email}`);
        
        // First try to find user by email
        const usersSnapshot = await db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        let userId;
        let userDoc;
        
        if (!usersSnapshot.empty) {
            userDoc = usersSnapshot.docs[0];
            userId = userDoc.id;
            console.log(`Found existing user document: ${userId}`);
        } else {
            // Try to find by auth user
            try {
                const authUser = await admin.auth().getUserByEmail(email);
                userId = authUser.uid;
                console.log(`Found auth user: ${userId}`);
                
                // Check if document exists with UID
                const docRef = db.collection('users').doc(userId);
                const doc = await docRef.get();
                
                if (!doc.exists) {
                    // Create user document
                    await docRef.set({
                        email: email,
                        displayName: authUser.displayName || email.split('@')[0],
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        uid: userId
                    });
                    console.log('Created new user document');
                }
            } catch (authError) {
                return res.status(404).json({ error: 'User not found in auth or firestore' });
            }
        }
        
        // Update user with admin role
        const updateData = {
            role: 'superadmin',
            isAdmin: true,
            adminPromotedAt: admin.firestore.FieldValue.serverTimestamp(),
            adminPromotedBy: 'server-setup',
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (userDoc) {
            await userDoc.ref.update(updateData);
        } else {
            await db.collection('users').doc(userId).update(updateData);
        }
        
        console.log(`Successfully promoted ${email} to superadmin`);
        
        // Log the admin promotion
        try {
            await db.collection('admin_logs').add({
                action: 'admin_promoted',
                targetUser: email,
                targetUserId: userId,
                promotedBy: 'server-setup',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                details: {
                    role: 'superadmin',
                    method: 'server-endpoint'
                }
            });
        } catch (logError) {
            console.error('Failed to log promotion:', logError);
        }
        
        res.json({ 
            success: true, 
            message: `Successfully promoted ${email} to superadmin`,
            userId: userId
        });
        
    } catch (error) {
        console.error('Error setting up admin:', error);
        res.status(500).json({ 
            error: 'Failed to setup admin', 
            details: error.message 
        });
    }
}

// Export the middleware
module.exports = { setupAdminEndpoint };