// User Migration Script - Add role and isAdmin fields to existing users
// This script should be run once by a super admin to update existing users

(function() {
    'use strict';
    
    console.log('[UserMigration] User migration script loaded');
    
    class UserMigration {
        constructor() {
            this.db = firebase.firestore();
            this.auth = firebase.auth();
        }
        
        // Run migration
        async runMigration() {
            try {
                console.log('[UserMigration] Starting user migration...');
                
                // Check if current user is authenticated
                const currentUser = this.auth.currentUser;
                if (!currentUser) {
                    throw new Error('You must be authenticated to run this migration');
                }
                
                // Check if current user is admin
                const currentUserDoc = await this.db.collection('users').doc(currentUser.uid).get();
                if (!currentUserDoc.exists || !currentUserDoc.data().isAdmin) {
                    throw new Error('You must be an admin to run this migration');
                }
                
                // Get all users
                const usersSnapshot = await this.db.collection('users').get();
                console.log(`[UserMigration] Found ${usersSnapshot.size} users to migrate`);
                
                let migrated = 0;
                let skipped = 0;
                let errors = 0;
                
                // Process each user
                const batch = this.db.batch();
                let batchCount = 0;
                
                for (const doc of usersSnapshot.docs) {
                    try {
                        const userData = doc.data();
                        
                        // Check if already has role field
                        if (userData.role !== undefined && userData.isAdmin !== undefined) {
                            console.log(`[UserMigration] Skipping ${userData.email} - already migrated`);
                            skipped++;
                            continue;
                        }
                        
                        // Prepare update
                        const updates = {};
                        
                        if (userData.role === undefined) {
                            updates.role = 'user'; // Default role
                        }
                        
                        if (userData.isAdmin === undefined) {
                            updates.isAdmin = false; // Default not admin
                        }
                        
                        // Add update timestamp
                        updates.migratedAt = firebase.firestore.FieldValue.serverTimestamp();
                        
                        // Add to batch
                        batch.update(doc.ref, updates);
                        batchCount++;
                        migrated++;
                        
                        console.log(`[UserMigration] Migrating ${userData.email}`);
                        
                        // Commit batch every 400 documents (Firestore limit is 500)
                        if (batchCount >= 400) {
                            await batch.commit();
                            console.log(`[UserMigration] Committed batch of ${batchCount} users`);
                            batchCount = 0;
                        }
                        
                    } catch (error) {
                        console.error(`[UserMigration] Error migrating user ${doc.id}:`, error);
                        errors++;
                    }
                }
                
                // Commit remaining batch
                if (batchCount > 0) {
                    await batch.commit();
                    console.log(`[UserMigration] Committed final batch of ${batchCount} users`);
                }
                
                // Log migration completion
                await this.db.collection('adminActivityLogs').add({
                    action: 'user_migration_completed',
                    adminId: currentUser.uid,
                    adminEmail: currentUser.email,
                    details: {
                        totalUsers: usersSnapshot.size,
                        migrated: migrated,
                        skipped: skipped,
                        errors: errors
                    },
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log('[UserMigration] Migration completed!');
                console.log(`Total users: ${usersSnapshot.size}`);
                console.log(`Migrated: ${migrated}`);
                console.log(`Skipped: ${skipped}`);
                console.log(`Errors: ${errors}`);
                
                return {
                    success: true,
                    totalUsers: usersSnapshot.size,
                    migrated: migrated,
                    skipped: skipped,
                    errors: errors
                };
                
            } catch (error) {
                console.error('[UserMigration] Migration error:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }
        
        // Set specific user as admin (helper function)
        async setUserAsAdmin(userEmail) {
            try {
                // Find user by email
                const usersSnapshot = await this.db.collection('users')
                    .where('email', '==', userEmail)
                    .limit(1)
                    .get();
                
                if (usersSnapshot.empty) {
                    throw new Error(`User with email ${userEmail} not found`);
                }
                
                const userDoc = usersSnapshot.docs[0];
                
                // Update user to admin
                await userDoc.ref.update({
                    role: 'admin',
                    isAdmin: true,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log(`[UserMigration] Successfully set ${userEmail} as admin`);
                
                // Log action
                const currentUser = this.auth.currentUser;
                if (currentUser) {
                    await this.db.collection('adminActivityLogs').add({
                        action: 'user_promoted_to_admin',
                        adminId: currentUser.uid,
                        adminEmail: currentUser.email,
                        details: {
                            targetUserId: userDoc.id,
                            targetUserEmail: userEmail
                        },
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                return true;
                
            } catch (error) {
                console.error('[UserMigration] Error setting user as admin:', error);
                return false;
            }
        }
    }
    
    // Create global instance
    window.userMigration = new UserMigration();
    
    // Usage instructions
    console.log(`
    ===================================
    USER MIGRATION SCRIPT
    ===================================
    
    To run the migration:
    1. Make sure you are logged in as an admin
    2. Open browser console on any Pyebwa page
    3. Run: userMigration.runMigration()
    
    To make a specific user an admin:
    Run: userMigration.setUserAsAdmin('user@example.com')
    
    ===================================
    `);
    
})();