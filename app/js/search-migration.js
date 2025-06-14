// Search Index Migration Script
// This script indexes existing family members for search functionality

(function() {
    'use strict';
    
    const SearchMigration = {
        // Index all existing members
        async indexAllMembers() {
            if (!window.pyebwaSearch || !window.userFamilyTreeId) {
                console.error('Search engine or family tree ID not available');
                return;
            }
            
            try {
                console.log('Starting search index migration...');
                
                // Get all members
                const snapshot = await firebase.firestore()
                    .collection('familyTrees')
                    .doc(window.userFamilyTreeId)
                    .collection('members')
                    .get();
                
                const totalMembers = snapshot.size;
                let indexed = 0;
                
                console.log(`Found ${totalMembers} members to index`);
                
                // Index each member
                const promises = [];
                snapshot.forEach(doc => {
                    const member = { id: doc.id, ...doc.data() };
                    const promise = window.pyebwaSearch.updateSearchIndex(member, window.userFamilyTreeId)
                        .then(() => {
                            indexed++;
                            console.log(`Indexed ${indexed}/${totalMembers}: ${member.firstName} ${member.lastName}`);
                        })
                        .catch(error => {
                            console.error(`Failed to index ${member.firstName} ${member.lastName}:`, error);
                        });
                    promises.push(promise);
                });
                
                // Wait for all indexing to complete
                await Promise.all(promises);
                
                console.log(`Search index migration complete! Indexed ${indexed} of ${totalMembers} members`);
                
                // Save migration status
                localStorage.setItem('pyebwaSearchMigrated', 'true');
                localStorage.setItem('pyebwaSearchMigrationDate', new Date().toISOString());
                
                return { indexed, total: totalMembers };
                
            } catch (error) {
                console.error('Search migration error:', error);
                throw error;
            }
        },
        
        // Check if migration is needed
        checkMigrationStatus() {
            const migrated = localStorage.getItem('pyebwaSearchMigrated');
            const migrationDate = localStorage.getItem('pyebwaSearchMigrationDate');
            
            return {
                migrated: migrated === 'true',
                date: migrationDate
            };
        },
        
        // Run migration if needed
        async runMigrationIfNeeded() {
            const status = this.checkMigrationStatus();
            
            if (!status.migrated) {
                console.log('Search index migration needed. Starting...');
                try {
                    const result = await this.indexAllMembers();
                    if (window.showSuccess) {
                        window.showSuccess(`Search index created! ${result.indexed} members indexed.`);
                    }
                } catch (error) {
                    console.error('Migration failed:', error);
                    if (window.showError) {
                        window.showError('Failed to create search index. Search may not work properly.');
                    }
                }
            } else {
                console.log('Search index already migrated on:', status.date);
            }
        },
        
        // Force reindex all members
        async reindexAll() {
            localStorage.removeItem('pyebwaSearchMigrated');
            localStorage.removeItem('pyebwaSearchMigrationDate');
            return await this.indexAllMembers();
        }
    };
    
    // Export for use
    window.pyebwaSearchMigration = SearchMigration;
    
    // Auto-run migration when user is logged in
    const checkAndMigrate = () => {
        if (window.currentUser && window.userFamilyTreeId && window.pyebwaSearch) {
            SearchMigration.runMigrationIfNeeded();
        }
    };
    
    // Wait for authentication and search engine
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Check after a delay to ensure everything is loaded
            setTimeout(checkAndMigrate, 2000);
        });
    } else {
        setTimeout(checkAndMigrate, 2000);
    }
})();