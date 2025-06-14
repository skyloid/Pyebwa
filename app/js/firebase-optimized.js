// Optimized Firebase queries with caching for Pyebwa App
(function() {
    'use strict';
    
    const FirebaseOptimized = {
        cache: new Map(),
        cacheExpiry: 5 * 60 * 1000, // 5 minutes
        pendingRequests: new Map(),
        
        // Initialize optimization strategies
        init() {
            this.setupCaching();
            this.setupBatchOperations();
            this.optimizeQueries();
        },
        
        // Setup intelligent caching
        setupCaching() {
            // Override Firestore get methods
            if (window.firebase && window.firebase.firestore) {
                const originalGet = firebase.firestore.DocumentReference.prototype.get;
                const originalQuery = firebase.firestore.Query.prototype.get;
                
                // Cache document gets
                firebase.firestore.DocumentReference.prototype.get = function(options) {
                    const path = this.path;
                    const cacheKey = `doc:${path}`;
                    
                    // Check cache first
                    const cached = FirebaseOptimized.getFromCache(cacheKey);
                    if (cached && !options?.source) {
                        console.log(`Cache hit for document: ${path}`);
                        return Promise.resolve(cached);
                    }
                    
                    // Check if request is already pending
                    if (FirebaseOptimized.pendingRequests.has(cacheKey)) {
                        console.log(`Reusing pending request for: ${path}`);
                        return FirebaseOptimized.pendingRequests.get(cacheKey);
                    }
                    
                    // Make request and cache
                    const promise = originalGet.call(this, options).then(doc => {
                        FirebaseOptimized.setCache(cacheKey, doc);
                        FirebaseOptimized.pendingRequests.delete(cacheKey);
                        return doc;
                    }).catch(error => {
                        FirebaseOptimized.pendingRequests.delete(cacheKey);
                        throw error;
                    });
                    
                    FirebaseOptimized.pendingRequests.set(cacheKey, promise);
                    return promise;
                };
                
                // Cache query results
                firebase.firestore.Query.prototype.get = function(options) {
                    const queryStr = this.toString();
                    const cacheKey = `query:${queryStr}`;
                    
                    // Check cache first
                    const cached = FirebaseOptimized.getFromCache(cacheKey);
                    if (cached && !options?.source) {
                        console.log(`Cache hit for query: ${queryStr}`);
                        return Promise.resolve(cached);
                    }
                    
                    // Check if request is already pending
                    if (FirebaseOptimized.pendingRequests.has(cacheKey)) {
                        console.log(`Reusing pending query: ${queryStr}`);
                        return FirebaseOptimized.pendingRequests.get(cacheKey);
                    }
                    
                    // Make request and cache
                    const promise = originalQuery.call(this, options).then(snapshot => {
                        FirebaseOptimized.setCache(cacheKey, snapshot);
                        FirebaseOptimized.pendingRequests.delete(cacheKey);
                        return snapshot;
                    }).catch(error => {
                        FirebaseOptimized.pendingRequests.delete(cacheKey);
                        throw error;
                    });
                    
                    FirebaseOptimized.pendingRequests.set(cacheKey, promise);
                    return promise;
                };
            }
        },
        
        // Get from cache with expiry check
        getFromCache(key) {
            const cached = this.cache.get(key);
            if (cached) {
                const age = Date.now() - cached.timestamp;
                if (age < this.cacheExpiry) {
                    return cached.data;
                }
                this.cache.delete(key);
            }
            return null;
        },
        
        // Set cache with timestamp
        setCache(key, data) {
            this.cache.set(key, {
                data,
                timestamp: Date.now()
            });
            
            // Limit cache size
            if (this.cache.size > 100) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
        },
        
        // Clear cache for specific paths
        clearCache(pathPattern) {
            for (const [key, value] of this.cache.entries()) {
                if (key.includes(pathPattern)) {
                    this.cache.delete(key);
                }
            }
        },
        
        // Setup batch operations
        setupBatchOperations() {
            window.pyebwaBatch = {
                queue: [],
                timeout: null,
                
                // Add operation to batch queue
                add(operation) {
                    this.queue.push(operation);
                    
                    // Clear existing timeout
                    if (this.timeout) {
                        clearTimeout(this.timeout);
                    }
                    
                    // Process batch after 100ms of inactivity
                    this.timeout = setTimeout(() => this.process(), 100);
                },
                
                // Process batch operations
                async process() {
                    if (this.queue.length === 0) return;
                    
                    const operations = [...this.queue];
                    this.queue = [];
                    
                    console.log(`Processing batch of ${operations.length} operations`);
                    
                    const batch = firebase.firestore().batch();
                    
                    operations.forEach(op => {
                        switch (op.type) {
                            case 'set':
                                batch.set(op.ref, op.data, op.options || {});
                                break;
                            case 'update':
                                batch.update(op.ref, op.data);
                                break;
                            case 'delete':
                                batch.delete(op.ref);
                                break;
                        }
                    });
                    
                    try {
                        await batch.commit();
                        console.log('Batch committed successfully');
                        
                        // Clear related cache
                        operations.forEach(op => {
                            FirebaseOptimized.clearCache(op.ref.path);
                        });
                    } catch (error) {
                        console.error('Batch commit failed:', error);
                        throw error;
                    }
                }
            };
        },
        
        // Optimize common queries
        optimizeQueries() {
            window.pyebwaQueries = {
                // Get family tree with optimized field selection
                async getFamilyTree(treeId, fields = ['name', 'createdAt', 'memberCount']) {
                    const db = firebase.firestore();
                    const docRef = db.collection('familyTrees').doc(treeId);
                    
                    // Use field mask to reduce data transfer
                    try {
                        const doc = await docRef.get();
                        if (doc.exists) {
                            const data = doc.data();
                            // Return only requested fields
                            const result = { id: doc.id };
                            fields.forEach(field => {
                                if (data[field] !== undefined) {
                                    result[field] = data[field];
                                }
                            });
                            return result;
                        }
                        return null;
                    } catch (error) {
                        console.error('Error fetching family tree:', error);
                        throw error;
                    }
                },
                
                // Get family members with pagination
                async getFamilyMembers(treeId, lastDoc = null, limit = 20) {
                    const db = firebase.firestore();
                    let query = db.collection('familyTrees')
                        .doc(treeId)
                        .collection('members')
                        .orderBy('createdAt', 'desc')
                        .limit(limit);
                    
                    if (lastDoc) {
                        query = query.startAfter(lastDoc);
                    }
                    
                    const snapshot = await query.get();
                    
                    return {
                        members: snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        })),
                        lastDoc: snapshot.docs[snapshot.docs.length - 1],
                        hasMore: snapshot.docs.length === limit
                    };
                },
                
                // Search members with optimized indexing
                async searchMembers(treeId, searchTerm, limit = 10) {
                    const db = firebase.firestore();
                    const searchLower = searchTerm.toLowerCase();
                    
                    // Use composite index for efficient searching
                    const results = await db.collection('familyTrees')
                        .doc(treeId)
                        .collection('members')
                        .where('searchTerms', 'array-contains', searchLower)
                        .limit(limit)
                        .get();
                    
                    return results.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                },
                
                // Batch get multiple documents
                async batchGet(collection, ids) {
                    const db = firebase.firestore();
                    const chunks = [];
                    
                    // Firestore limits batches to 10 documents
                    for (let i = 0; i < ids.length; i += 10) {
                        chunks.push(ids.slice(i, i + 10));
                    }
                    
                    const results = [];
                    
                    for (const chunk of chunks) {
                        const refs = chunk.map(id => db.collection(collection).doc(id));
                        const docs = await db.getAll(...refs);
                        
                        docs.forEach(doc => {
                            if (doc.exists) {
                                results.push({
                                    id: doc.id,
                                    ...doc.data()
                                });
                            }
                        });
                    }
                    
                    return results;
                },
                
                // Optimized count query
                async getCount(query) {
                    // For Firestore versions that support count()
                    if (query.count) {
                        const countSnapshot = await query.count().get();
                        return countSnapshot.data().count;
                    }
                    
                    // Fallback for older versions
                    const snapshot = await query.select().get();
                    return snapshot.size;
                }
            };
        },
        
        // Preload critical data
        async preloadCriticalData(userId) {
            if (!userId) return;
            
            try {
                const db = firebase.firestore();
                
                // Preload user data
                const userPromise = db.collection('users').doc(userId).get();
                
                // Preload user's family tree
                const userDoc = await userPromise;
                if (userDoc.exists) {
                    const treeId = userDoc.data().familyTreeId;
                    if (treeId) {
                        // Preload tree data and first batch of members
                        await Promise.all([
                            db.collection('familyTrees').doc(treeId).get(),
                            pyebwaQueries.getFamilyMembers(treeId, null, 10)
                        ]);
                    }
                }
                
                console.log('Critical data preloaded');
            } catch (error) {
                console.error('Error preloading data:', error);
            }
        },
        
        // Get cache statistics
        getCacheStats() {
            const stats = {
                size: this.cache.size,
                entries: []
            };
            
            for (const [key, value] of this.cache.entries()) {
                stats.entries.push({
                    key,
                    age: Date.now() - value.timestamp,
                    type: key.startsWith('doc:') ? 'document' : 'query'
                });
            }
            
            return stats;
        }
    };
    
    // Initialize when Firebase is ready
    if (window.firebase && window.firebase.firestore) {
        FirebaseOptimized.init();
    } else {
        // Wait for Firebase to load
        const checkInterval = setInterval(() => {
            if (window.firebase && window.firebase.firestore) {
                clearInterval(checkInterval);
                FirebaseOptimized.init();
            }
        }, 100);
    }
    
    // Export for debugging
    window.firebaseOptimized = FirebaseOptimized;
})();