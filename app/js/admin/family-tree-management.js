// Admin Family Tree Management
(function() {
    'use strict';
    
    console.log('[AdminTreeManagement] Initializing family tree management module');
    
    class AdminTreeManagement {
        constructor() {
            this.db = firebase.firestore();
            this.trees = [];
            this.filteredTrees = [];
            this.currentPage = 1;
            this.itemsPerPage = 20;
            this.searchTerm = '';
            this.initialized = false;
        }
        
        // Initialize tree management
        async initialize() {
            if (this.initialized) return;
            
            try {
                console.log('[AdminTreeManagement] Loading family trees...');
                
                // Set up event listeners
                this.setupEventListeners();
                
                // Load initial tree data
                await this.loadTrees();
                
                this.initialized = true;
            } catch (error) {
                console.error('[AdminTreeManagement] Initialization error:', error);
                this.showError('Failed to load family trees');
            }
        }
        
        // Setup event listeners
        setupEventListeners() {
            const searchInput = document.getElementById('treeSearch');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.searchTerm = e.target.value.toLowerCase();
                    this.filterTrees();
                });
            }
        }
        
        // Load all family trees
        async loadTrees() {
            try {
                const snapshot = await this.db.collection('familyTrees')
                    .orderBy('createdAt', 'desc')
                    .get();
                
                this.trees = [];
                const treePromises = [];
                
                snapshot.forEach(doc => {
                    const treeData = {
                        id: doc.id,
                        ...doc.data()
                    };
                    
                    // Get member count for each tree
                    treePromises.push(
                        this.getTreeDetails(doc.id).then(details => {
                            treeData.memberCount = details.memberCount;
                            treeData.ownerEmail = details.ownerEmail;
                            return treeData;
                        })
                    );
                });
                
                this.trees = await Promise.all(treePromises);
                
                console.log(`[AdminTreeManagement] Loaded ${this.trees.length} family trees`);
                
                this.filterTrees();
                this.updateStats();
                
            } catch (error) {
                console.error('[AdminTreeManagement] Error loading trees:', error);
                throw error;
            }
        }
        
        // Get tree details including member count and owner info
        async getTreeDetails(treeId) {
            try {
                // Get member count
                const membersSnapshot = await this.db.collection('familyTrees')
                    .doc(treeId)
                    .collection('members')
                    .get();
                
                const memberCount = membersSnapshot.size;
                
                // Get owner email
                const tree = this.trees.find(t => t.id === treeId);
                let ownerEmail = 'Unknown';
                
                if (tree && tree.ownerId) {
                    const ownerDoc = await this.db.collection('users').doc(tree.ownerId).get();
                    if (ownerDoc.exists) {
                        ownerEmail = ownerDoc.data().email;
                    }
                }
                
                return { memberCount, ownerEmail };
                
            } catch (error) {
                console.error('[AdminTreeManagement] Error getting tree details:', error);
                return { memberCount: 0, ownerEmail: 'Unknown' };
            }
        }
        
        // Filter trees based on search
        filterTrees() {
            if (!this.searchTerm) {
                this.filteredTrees = [...this.trees];
            } else {
                this.filteredTrees = this.trees.filter(tree => {
                    const searchFields = [
                        tree.name,
                        tree.ownerEmail,
                        tree.region,
                        tree.id
                    ].filter(Boolean).join(' ').toLowerCase();
                    
                    return searchFields.includes(this.searchTerm);
                });
            }
            
            this.currentPage = 1;
            this.renderTreesTable();
        }
        
        // Render trees table
        renderTreesTable() {
            const tbody = document.getElementById('treesTableBody');
            if (!tbody) return;
            
            // Calculate pagination
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const pageTrees = this.filteredTrees.slice(startIndex, endIndex);
            
            if (pageTrees.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="loading-cell">No family trees found</td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = pageTrees.map(tree => `
                <tr>
                    <td>${this.escapeHtml(tree.name)}</td>
                    <td>${this.escapeHtml(tree.ownerEmail || 'Unknown')}</td>
                    <td>${tree.memberCount || 0}</td>
                    <td>${this.escapeHtml(tree.region || 'Not specified')}</td>
                    <td>${this.formatDate(tree.createdAt)}</td>
                    <td>${this.formatDate(tree.updatedAt)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon" onclick="adminTreeManagement.viewTree('${tree.id}')" title="View">
                                <span class="material-icons">visibility</span>
                            </button>
                            <button class="btn-icon" onclick="adminTreeManagement.exportTree('${tree.id}')" title="Export">
                                <span class="material-icons">download</span>
                            </button>
                            <button class="btn-icon" onclick="adminTreeManagement.deleteTree('${tree.id}')" title="Delete">
                                <span class="material-icons">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
            
            this.renderPagination();
        }
        
        // Render pagination
        renderPagination() {
            const paginationDiv = document.getElementById('treesPagination');
            if (!paginationDiv) return;
            
            const totalPages = Math.ceil(this.filteredTrees.length / this.itemsPerPage);
            
            if (totalPages <= 1) {
                paginationDiv.innerHTML = '';
                return;
            }
            
            let html = `
                <button class="pagination-btn" onclick="adminTreeManagement.goToPage(${this.currentPage - 1})" 
                        ${this.currentPage === 1 ? 'disabled' : ''}>
                    Previous
                </button>
            `;
            
            // Show page numbers
            const maxButtons = 5;
            let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
            let endPage = Math.min(totalPages, startPage + maxButtons - 1);
            
            if (endPage - startPage < maxButtons - 1) {
                startPage = Math.max(1, endPage - maxButtons + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                html += `
                    <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                            onclick="adminTreeManagement.goToPage(${i})">
                        ${i}
                    </button>
                `;
            }
            
            html += `
                <button class="pagination-btn" onclick="adminTreeManagement.goToPage(${this.currentPage + 1})" 
                        ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Next
                </button>
            `;
            
            paginationDiv.innerHTML = html;
        }
        
        // Go to specific page
        goToPage(page) {
            const totalPages = Math.ceil(this.filteredTrees.length / this.itemsPerPage);
            if (page < 1 || page > totalPages) return;
            
            this.currentPage = page;
            this.renderTreesTable();
        }
        
        // View tree details
        async viewTree(treeId) {
            try {
                // For now, open the tree in the main app
                // In future, could create a detailed admin view
                window.open(`/app/#tree/${treeId}`, '_blank');
                
                // Log admin action
                await this.logAdminAction('tree_viewed', {
                    treeId: treeId
                });
                
            } catch (error) {
                console.error('[AdminTreeManagement] Error viewing tree:', error);
                this.showError('Failed to view tree');
            }
        }
        
        // Export tree data
        async exportTree(treeId) {
            try {
                const tree = this.trees.find(t => t.id === treeId);
                if (!tree) return;
                
                // Get all members
                const membersSnapshot = await this.db.collection('familyTrees')
                    .doc(treeId)
                    .collection('members')
                    .get();
                
                const members = [];
                membersSnapshot.forEach(doc => {
                    members.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                // Create export data
                const exportData = {
                    tree: {
                        id: tree.id,
                        name: tree.name,
                        region: tree.region,
                        createdAt: tree.createdAt?.toDate?.() || tree.createdAt,
                        memberCount: members.length
                    },
                    members: members.map(m => ({
                        id: m.id,
                        firstName: m.firstName,
                        lastName: m.lastName,
                        birthDate: m.birthDate,
                        deathDate: m.deathDate,
                        biography: m.biography,
                        email: m.email,
                        phoneNumber: m.phoneNumber
                    }))
                };
                
                // Download as JSON
                const json = JSON.stringify(exportData, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pyebwa-tree-${tree.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                
                // Log admin action
                await this.logAdminAction('tree_exported', {
                    treeId: treeId,
                    treeName: tree.name,
                    memberCount: members.length
                });
                
                this.showSuccess('Tree exported successfully');
                
            } catch (error) {
                console.error('[AdminTreeManagement] Error exporting tree:', error);
                this.showError('Failed to export tree');
            }
        }
        
        // Delete tree (with confirmation)
        async deleteTree(treeId) {
            try {
                const tree = this.trees.find(t => t.id === treeId);
                if (!tree) return;
                
                const confirmed = confirm(`Are you sure you want to delete the family tree "${tree.name}"?\n\nThis action cannot be undone and will delete all members and data associated with this tree.`);
                
                if (!confirmed) return;
                
                // Delete all members first
                const membersSnapshot = await this.db.collection('familyTrees')
                    .doc(treeId)
                    .collection('members')
                    .get();
                
                const batch = this.db.batch();
                
                membersSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                // Delete the tree document
                batch.delete(this.db.collection('familyTrees').doc(treeId));
                
                await batch.commit();
                
                // Update user's familyTreeId if this was their tree
                const usersWithTree = await this.db.collection('users')
                    .where('familyTreeId', '==', treeId)
                    .get();
                
                const userUpdateBatch = this.db.batch();
                usersWithTree.forEach(doc => {
                    userUpdateBatch.update(doc.ref, {
                        familyTreeId: null,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                
                if (!usersWithTree.empty) {
                    await userUpdateBatch.commit();
                }
                
                // Log admin action
                await this.logAdminAction('tree_deleted', {
                    treeId: treeId,
                    treeName: tree.name,
                    memberCount: membersSnapshot.size
                });
                
                // Refresh data
                await this.loadTrees();
                
                this.showSuccess('Family tree deleted successfully');
                
            } catch (error) {
                console.error('[AdminTreeManagement] Error deleting tree:', error);
                this.showError('Failed to delete tree');
            }
        }
        
        // Update dashboard stats
        updateStats() {
            const totalTreesEl = document.getElementById('totalTrees');
            if (totalTreesEl) {
                totalTreesEl.textContent = this.trees.length;
            }
            
            // Calculate total members
            const totalMembers = this.trees.reduce((sum, tree) => sum + (tree.memberCount || 0), 0);
            const totalMembersEl = document.getElementById('totalMembers');
            if (totalMembersEl) {
                totalMembersEl.textContent = totalMembers;
            }
        }
        
        // Log admin action
        async logAdminAction(action, details) {
            try {
                const adminUser = window.adminAuthGuard.getAdminUser();
                await this.db.collection('adminActivityLogs').add({
                    action: action,
                    adminId: adminUser.uid,
                    adminEmail: adminUser.email,
                    details: details,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error('[AdminTreeManagement] Error logging action:', error);
            }
        }
        
        // Utility functions
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        formatDate(timestamp) {
            if (!timestamp) return 'Never';
            
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
        
        showSuccess(message) {
            // TODO: Implement toast notifications
            console.log('[Success]', message);
            alert(message);
        }
        
        showError(message) {
            // TODO: Implement toast notifications
            console.error('[Error]', message);
            alert(message);
        }
    }
    
    // Create global instance
    window.adminTreeManagement = new AdminTreeManagement();
    
})();