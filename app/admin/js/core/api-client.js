// Admin API Client
(function() {
    'use strict';
    
    const AdminApiClient = {
        // Get all users with pagination and filters
        async getUsers(options = {}) {
            const {
                limit = 50,
                offset = 0,
                search = '',
                status = '',
                role = '',
                orderBy = 'createdAt',
                orderDirection = 'desc'
            } = options;
            
            try {
                let query = firebase.firestore().collection('users');
                
                // Apply filters
                if (status) {
                    query = query.where('status', '==', status);
                }
                
                if (role) {
                    query = query.where('role', '==', role);
                }
                
                // Apply ordering
                query = query.orderBy(orderBy, orderDirection);
                
                // Apply pagination
                if (offset > 0) {
                    // For pagination, we need to get the last document from previous page
                    // This is a simplified approach - in production, use cursor-based pagination
                    const prevQuery = firebase.firestore().collection('users')
                        .orderBy(orderBy, orderDirection)
                        .limit(offset);
                    const prevSnapshot = await prevQuery.get();
                    const lastDoc = prevSnapshot.docs[prevSnapshot.docs.length - 1];
                    if (lastDoc) {
                        query = query.startAfter(lastDoc);
                    }
                }
                
                query = query.limit(limit);
                
                const snapshot = await query.get();
                const users = [];
                
                snapshot.forEach(doc => {
                    users.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                // Apply search filter (client-side for simplicity)
                let filteredUsers = users;
                if (search) {
                    const searchTerm = search.toLowerCase();
                    filteredUsers = users.filter(user => 
                        (user.displayName || '').toLowerCase().includes(searchTerm) ||
                        (user.email || '').toLowerCase().includes(searchTerm) ||
                        (user.fullName || '').toLowerCase().includes(searchTerm)
                    );
                }
                
                return {
                    users: filteredUsers,
                    hasMore: snapshot.docs.length === limit,
                    total: await this.getUserCount()
                };
                
            } catch (error) {
                console.error('Error getting users:', error);
                throw error;
            }
        },
        
        // Get user count
        async getUserCount() {
            try {
                const snapshot = await firebase.firestore().collection('users').get();
                return snapshot.size;
            } catch (error) {
                console.error('Error getting user count:', error);
                return 0;
            }
        },
        
        // Get user by ID
        async getUser(userId) {
            try {
                const doc = await firebase.firestore()
                    .collection('users')
                    .doc(userId)
                    .get();
                
                if (!doc.exists) {
                    throw new Error('User not found');
                }
                
                return {
                    id: doc.id,
                    ...doc.data()
                };
            } catch (error) {
                console.error('Error getting user:', error);
                throw error;
            }
        },
        
        // Update user
        async updateUser(userId, data) {
            try {
                const updateData = {
                    ...data,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: AdminAuthGuard.getCurrentAdmin().uid
                };
                
                await firebase.firestore()
                    .collection('users')
                    .doc(userId)
                    .update(updateData);
                
                return await this.getUser(userId);
            } catch (error) {
                console.error('Error updating user:', error);
                throw error;
            }
        },
        
        // Delete user
        async deleteUser(userId) {
            try {
                await firebase.firestore()
                    .collection('users')
                    .doc(userId)
                    .delete();
                
                return true;
            } catch (error) {
                console.error('Error deleting user:', error);
                throw error;
            }
        },
        
        // Get family trees with pagination
        async getFamilyTrees(options = {}) {
            const {
                limit = 50,
                offset = 0,
                search = '',
                orderBy = 'createdAt',
                orderDirection = 'desc'
            } = options;
            
            try {
                let query = firebase.firestore().collection('familyTrees');
                
                // Apply ordering
                query = query.orderBy(orderBy, orderDirection);
                
                // Apply pagination
                if (offset > 0) {
                    const prevQuery = firebase.firestore().collection('familyTrees')
                        .orderBy(orderBy, orderDirection)
                        .limit(offset);
                    const prevSnapshot = await prevQuery.get();
                    const lastDoc = prevSnapshot.docs[prevSnapshot.docs.length - 1];
                    if (lastDoc) {
                        query = query.startAfter(lastDoc);
                    }
                }
                
                query = query.limit(limit);
                
                const snapshot = await query.get();
                const trees = [];
                
                for (const doc of snapshot.docs) {
                    const treeData = doc.data();
                    
                    // Get member count
                    const membersSnapshot = await firebase.firestore()
                        .collection('familyTrees')
                        .doc(doc.id)
                        .collection('members')
                        .get();
                    
                    trees.push({
                        id: doc.id,
                        ...treeData,
                        memberCount: membersSnapshot.size
                    });
                }
                
                // Apply search filter
                let filteredTrees = trees;
                if (search) {
                    const searchTerm = search.toLowerCase();
                    filteredTrees = trees.filter(tree => 
                        (tree.name || '').toLowerCase().includes(searchTerm)
                    );
                }
                
                return {
                    trees: filteredTrees,
                    hasMore: snapshot.docs.length === limit,
                    total: await this.getTreeCount()
                };
                
            } catch (error) {
                console.error('Error getting family trees:', error);
                throw error;
            }
        },
        
        // Get tree count
        async getTreeCount() {
            try {
                const snapshot = await firebase.firestore().collection('familyTrees').get();
                return snapshot.size;
            } catch (error) {
                console.error('Error getting tree count:', error);
                return 0;
            }
        },
        
        // Delete family tree
        async deleteFamilyTree(treeId) {
            try {
                // Delete all members first
                const membersSnapshot = await firebase.firestore()
                    .collection('familyTrees')
                    .doc(treeId)
                    .collection('members')
                    .get();
                
                const batch = firebase.firestore().batch();
                
                membersSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                // Delete the tree itself
                const treeRef = firebase.firestore().collection('familyTrees').doc(treeId);
                batch.delete(treeRef);
                
                await batch.commit();
                
                return true;
            } catch (error) {
                console.error('Error deleting family tree:', error);
                throw error;
            }
        },
        
        // Get activity logs
        async getActivityLogs(options = {}) {
            const {
                limit = 100,
                offset = 0,
                type = '',
                startDate = null,
                endDate = null
            } = options;
            
            try {
                let query = firebase.firestore().collection('adminActivityLogs');
                
                // Apply filters
                if (type) {
                    query = query.where('action', '==', type);
                }
                
                if (startDate) {
                    query = query.where('timestamp', '>=', startDate);
                }
                
                if (endDate) {
                    query = query.where('timestamp', '<=', endDate);
                }
                
                // Apply ordering
                query = query.orderBy('timestamp', 'desc');
                
                // Apply pagination
                if (offset > 0) {
                    const prevQuery = firebase.firestore().collection('adminActivityLogs')
                        .orderBy('timestamp', 'desc')
                        .limit(offset);
                    const prevSnapshot = await prevQuery.get();
                    const lastDoc = prevSnapshot.docs[prevSnapshot.docs.length - 1];
                    if (lastDoc) {
                        query = query.startAfter(lastDoc);
                    }
                }
                
                query = query.limit(limit);
                
                const snapshot = await query.get();
                const logs = [];
                
                snapshot.forEach(doc => {
                    logs.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                return {
                    logs,
                    hasMore: snapshot.docs.length === limit
                };
                
            } catch (error) {
                console.error('Error getting activity logs:', error);
                throw error;
            }
        },
        
        // Get dashboard statistics
        async getDashboardStats() {
            try {
                const [usersSnapshot, treesSnapshot] = await Promise.all([
                    firebase.firestore().collection('users').get(),
                    firebase.firestore().collection('familyTrees').get()
                ]);
                
                const totalUsers = usersSnapshot.size;
                const totalTrees = treesSnapshot.size;
                
                // Get active users (last 24 hours)
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                const activeUsersSnapshot = await firebase.firestore()
                    .collection('users')
                    .where('lastLoginAt', '>=', yesterday)
                    .get();
                const activeUsers = activeUsersSnapshot.size;
                
                // Calculate growth (last 30 days)
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                
                const [newUsersSnapshot, newTreesSnapshot] = await Promise.all([
                    firebase.firestore()
                        .collection('users')
                        .where('createdAt', '>=', lastMonth)
                        .get(),
                    firebase.firestore()
                        .collection('familyTrees')
                        .where('createdAt', '>=', lastMonth)
                        .get()
                ]);
                
                const newUsers = newUsersSnapshot.size;
                const newTrees = newTreesSnapshot.size;
                
                return {
                    totalUsers,
                    totalTrees,
                    activeUsers,
                    newUsers,
                    newTrees,
                    userGrowthRate: totalUsers > 0 ? Math.round((newUsers / totalUsers) * 100) : 0,
                    treeGrowthRate: totalTrees > 0 ? Math.round((newTrees / totalTrees) * 100) : 0,
                    activeUserRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
                };
                
            } catch (error) {
                console.error('Error getting dashboard stats:', error);
                throw error;
            }
        },
        
        // Log admin action
        async logAdminAction(action, details = {}) {
            try {
                const admin = AdminAuthGuard.getCurrentAdmin();
                if (!admin) return;
                
                await firebase.firestore().collection('adminActivityLogs').add({
                    action,
                    adminId: admin.uid,
                    adminEmail: admin.email,
                    adminRole: admin.role,
                    details,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    userAgent: navigator.userAgent
                });
            } catch (error) {
                console.error('Error logging admin action:', error);
            }
        },
        
        // Batch operations
        async batchUpdateUsers(userIds, updates) {
            try {
                const batch = firebase.firestore().batch();
                const admin = AdminAuthGuard.getCurrentAdmin();
                
                const updateData = {
                    ...updates,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: admin.uid
                };
                
                userIds.forEach(userId => {
                    const userRef = firebase.firestore().collection('users').doc(userId);
                    batch.update(userRef, updateData);
                });
                
                await batch.commit();
                
                // Log the batch action
                await this.logAdminAction('batch_user_update', {
                    userIds,
                    updates,
                    count: userIds.length
                });
                
                return true;
            } catch (error) {
                console.error('Error batch updating users:', error);
                throw error;
            }
        },
        
        // Get system health
        async getSystemHealth() {
            try {
                // This is a simplified health check
                // In production, you'd check various system metrics
                
                const startTime = Date.now();
                
                // Test Firestore connectivity
                await firebase.firestore().collection('users').limit(1).get();
                
                const firestoreLatency = Date.now() - startTime;
                
                return {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    checks: {
                        firestore: {
                            status: 'healthy',
                            latency: firestoreLatency
                        },
                        auth: {
                            status: firebase.auth().currentUser ? 'healthy' : 'error'
                        }
                    }
                };
            } catch (error) {
                console.error('Error checking system health:', error);
                return {
                    status: 'error',
                    timestamp: new Date().toISOString(),
                    error: error.message
                };
            }
        }
    };
    
    // Export for global use
    window.AdminApiClient = AdminApiClient;
})();