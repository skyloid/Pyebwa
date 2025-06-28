// Family Tree Management Module
(function() {
    'use strict';
    
    const TreeManagement = {
        trees: [],
        currentPage: 1,
        pageSize: 20,
        totalTrees: 0,
        filters: {
            search: '',
            status: '',
            dateFrom: '',
            sortBy: 'createdAt',
            sortOrder: 'desc'
        },
        selectedTrees: new Set(),
        
        // Initialize tree management
        init() {
            this.attachEventListeners();
            this.loadTrees();
        },
        
        // Attach event listeners
        attachEventListeners() {
            // Search
            const searchInput = document.getElementById('treeSearch');
            if (searchInput) {
                searchInput.addEventListener('input', 
                    this.debounce(() => this.handleSearch(), 300)
                );
            }
            
            // Filters
            const statusFilter = document.getElementById('treeStatusFilter');
            if (statusFilter) {
                statusFilter.addEventListener('change', () => this.handleFilterChange());
            }
            
            const dateFilter = document.getElementById('treeDateFilter');
            if (dateFilter) {
                dateFilter.addEventListener('change', () => this.handleFilterChange());
            }
            
            const sortFilter = document.getElementById('treeSortFilter');
            if (sortFilter) {
                sortFilter.addEventListener('change', () => this.handleSortChange());
            }
            
            // Pagination
            document.getElementById('treePrevPage')?.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadTrees();
                }
            });
            
            document.getElementById('treeNextPage')?.addEventListener('click', () => {
                const maxPage = Math.ceil(this.totalTrees / this.pageSize);
                if (this.currentPage < maxPage) {
                    this.currentPage++;
                    this.loadTrees();
                }
            });
            
            // Select all checkbox
            document.getElementById('selectAllTrees')?.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('#treesTableBody input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                    const treeId = cb.getAttribute('data-tree-id');
                    if (e.target.checked) {
                        this.selectedTrees.add(treeId);
                    } else {
                        this.selectedTrees.delete(treeId);
                    }
                });
                this.updateBulkActions();
            });
            
            // Export button
            document.getElementById('exportTrees')?.addEventListener('click', () => {
                this.exportTrees();
            });
            
            // Bulk actions
            document.getElementById('bulkDeleteTrees')?.addEventListener('click', () => {
                this.bulkDeleteTrees();
            });
            
            document.getElementById('bulkArchiveTrees')?.addEventListener('click', () => {
                this.bulkArchiveTrees();
            });
        },
        
        // Handle search
        handleSearch() {
            this.filters.search = document.getElementById('treeSearch').value.trim();
            this.currentPage = 1;
            this.loadTrees();
        },
        
        // Handle filter change
        handleFilterChange() {
            this.filters.status = document.getElementById('treeStatusFilter').value;
            this.filters.dateFrom = document.getElementById('treeDateFilter').value;
            this.currentPage = 1;
            this.loadTrees();
        },
        
        // Handle sort change
        handleSortChange() {
            const sortValue = document.getElementById('treeSortFilter').value;
            const [sortBy, sortOrder] = sortValue.split('-');
            this.filters.sortBy = sortBy;
            this.filters.sortOrder = sortOrder;
            this.currentPage = 1;
            this.loadTrees();
        },
        
        // Load trees from Firestore
        async loadTrees() {
            try {
                this.showLoading();
                
                const db = firebase.firestore();
                let query = db.collection('familyTrees');
                
                // Apply filters
                if (this.filters.status === 'active') {
                    query = query.where('isActive', '==', true);
                } else if (this.filters.status === 'archived') {
                    query = query.where('isActive', '==', false);
                }
                
                if (this.filters.dateFrom) {
                    const dateFrom = new Date(this.filters.dateFrom);
                    query = query.where('createdAt', '>=', dateFrom);
                }
                
                // Get total count
                const countSnapshot = await query.get();
                this.totalTrees = countSnapshot.size;
                
                // Apply sorting
                query = query.orderBy(this.filters.sortBy, this.filters.sortOrder);
                
                // Apply pagination
                const startAt = (this.currentPage - 1) * this.pageSize;
                query = query.limit(this.pageSize);
                
                // Execute query
                const snapshot = await query.get();
                this.trees = [];
                
                // Process trees
                for (const doc of snapshot.docs) {
                    const tree = { id: doc.id, ...doc.data() };
                    
                    // Get member count
                    const membersSnapshot = await db.collection('familyTrees')
                        .doc(doc.id)
                        .collection('persons')
                        .get();
                    tree.memberCount = membersSnapshot.size;
                    
                    // Get owner info
                    if (tree.createdBy) {
                        const userDoc = await db.collection('users').doc(tree.createdBy).get();
                        if (userDoc.exists) {
                            tree.ownerName = userDoc.data().displayName || userDoc.data().email;
                            tree.ownerEmail = userDoc.data().email;
                        }
                    }
                    
                    this.trees.push(tree);
                }
                
                // Apply client-side search filter
                if (this.filters.search) {
                    const search = this.filters.search.toLowerCase();
                    this.trees = this.trees.filter(tree => 
                        tree.name?.toLowerCase().includes(search) ||
                        tree.ownerName?.toLowerCase().includes(search) ||
                        tree.ownerEmail?.toLowerCase().includes(search)
                    );
                }
                
                this.renderTrees();
                this.updatePagination();
                
            } catch (error) {
                console.error('Error loading trees:', error);
                this.showError('Failed to load family trees');
            } finally {
                this.hideLoading();
            }
        },
        
        // Render trees table
        renderTrees() {
            const tbody = document.getElementById('treesTableBody');
            if (!tbody) return;
            
            if (this.trees.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="empty-state">
                            <div class="empty-state-content">
                                <span class="material-icons">account_tree</span>
                                <h3>No family trees found</h3>
                                <p>Try adjusting your filters or search criteria</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = this.trees.map(tree => `
                <tr data-tree-id="${tree.id}">
                    <td class="checkbox-col">
                        <input type="checkbox" data-tree-id="${tree.id}" 
                            ${this.selectedTrees.has(tree.id) ? 'checked' : ''}>
                    </td>
                    <td>
                        <div class="tree-info">
                            <h4>${this.escapeHtml(tree.name || 'Unnamed Tree')}</h4>
                            <p>${tree.description ? this.escapeHtml(tree.description) : 'No description'}</p>
                        </div>
                    </td>
                    <td>
                        <div class="user-info">
                            <div class="user-details">
                                <h4>${this.escapeHtml(tree.ownerName || 'Unknown')}</h4>
                                <p>${this.escapeHtml(tree.ownerEmail || '')}</p>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="member-count">${tree.memberCount || 0}</span>
                    </td>
                    <td>
                        <span class="status-badge ${tree.isActive !== false ? 'active' : 'archived'}">
                            ${tree.isActive !== false ? 'Active' : 'Archived'}
                        </span>
                    </td>
                    <td>${this.formatDate(tree.createdAt)}</td>
                    <td>${this.formatDate(tree.lastModified || tree.createdAt)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn" onclick="TreeManagement.viewTree('${tree.id}')" 
                                title="View Details">
                                <span class="material-icons">visibility</span>
                            </button>
                            <button class="action-btn" onclick="TreeManagement.exportTree('${tree.id}')" 
                                title="Export">
                                <span class="material-icons">download</span>
                            </button>
                            <button class="action-btn" onclick="TreeManagement.archiveTree('${tree.id}')" 
                                title="${tree.isActive !== false ? 'Archive' : 'Restore'}">
                                <span class="material-icons">
                                    ${tree.isActive !== false ? 'archive' : 'unarchive'}
                                </span>
                            </button>
                            <button class="action-btn" onclick="TreeManagement.deleteTree('${tree.id}')" 
                                title="Delete">
                                <span class="material-icons">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
            
            // Re-attach checkbox listeners
            tbody.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const treeId = e.target.getAttribute('data-tree-id');
                    if (e.target.checked) {
                        this.selectedTrees.add(treeId);
                    } else {
                        this.selectedTrees.delete(treeId);
                    }
                    this.updateBulkActions();
                });
            });
        },
        
        // Update pagination
        updatePagination() {
            const start = (this.currentPage - 1) * this.pageSize + 1;
            const end = Math.min(this.currentPage * this.pageSize, this.totalTrees);
            const maxPage = Math.ceil(this.totalTrees / this.pageSize);
            
            document.getElementById('treeStart').textContent = start;
            document.getElementById('treeEnd').textContent = end;
            document.getElementById('treeTotal').textContent = this.totalTrees;
            document.getElementById('treeCurrentPage').textContent = this.currentPage;
            
            const prevBtn = document.getElementById('treePrevPage');
            const nextBtn = document.getElementById('treeNextPage');
            
            if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
            if (nextBtn) nextBtn.disabled = this.currentPage >= maxPage;
        },
        
        // Update bulk actions
        updateBulkActions() {
            const bulkActions = document.querySelector('.bulk-actions');
            if (bulkActions) {
                if (this.selectedTrees.size > 0) {
                    bulkActions.style.display = 'flex';
                    bulkActions.querySelector('.selected-count').textContent = 
                        `${this.selectedTrees.size} selected`;
                } else {
                    bulkActions.style.display = 'none';
                }
            }
        },
        
        // View tree details
        async viewTree(treeId) {
            try {
                const tree = this.trees.find(t => t.id === treeId);
                if (!tree) return;
                
                // Create modal content
                const modalHtml = `
                    <div class="modal-header">
                        <h2>Family Tree Details</h2>
                        <button class="modal-close" onclick="TreeManagement.closeModal()">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="tree-details">
                            <div class="detail-row">
                                <label>Tree Name:</label>
                                <span>${this.escapeHtml(tree.name || 'Unnamed')}</span>
                            </div>
                            <div class="detail-row">
                                <label>Description:</label>
                                <span>${this.escapeHtml(tree.description || 'No description')}</span>
                            </div>
                            <div class="detail-row">
                                <label>Owner:</label>
                                <span>${this.escapeHtml(tree.ownerName || 'Unknown')} 
                                    (${this.escapeHtml(tree.ownerEmail || '')})</span>
                            </div>
                            <div class="detail-row">
                                <label>Members:</label>
                                <span>${tree.memberCount || 0} people</span>
                            </div>
                            <div class="detail-row">
                                <label>Status:</label>
                                <span class="status-badge ${tree.isActive !== false ? 'active' : 'archived'}">
                                    ${tree.isActive !== false ? 'Active' : 'Archived'}
                                </span>
                            </div>
                            <div class="detail-row">
                                <label>Created:</label>
                                <span>${this.formatDate(tree.createdAt, true)}</span>
                            </div>
                            <div class="detail-row">
                                <label>Last Modified:</label>
                                <span>${this.formatDate(tree.lastModified || tree.createdAt, true)}</span>
                            </div>
                        </div>
                        
                        <h3 style="margin-top: 30px;">Recent Members</h3>
                        <div id="recentMembers" class="members-list">
                            <div class="loading">Loading members...</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="TreeManagement.closeModal()">Close</button>
                        <button class="btn btn-primary" onclick="TreeManagement.exportTree('${treeId}')">
                            <span class="material-icons">download</span>
                            Export Tree
                        </button>
                    </div>
                `;
                
                this.showModal(modalHtml);
                
                // Load recent members
                await this.loadRecentMembers(treeId);
                
            } catch (error) {
                console.error('Error viewing tree:', error);
                this.showError('Failed to load tree details');
            }
        },
        
        // Load recent members
        async loadRecentMembers(treeId) {
            try {
                const db = firebase.firestore();
                const membersSnapshot = await db.collection('familyTrees')
                    .doc(treeId)
                    .collection('persons')
                    .orderBy('createdAt', 'desc')
                    .limit(10)
                    .get();
                
                const membersContainer = document.getElementById('recentMembers');
                if (!membersContainer) return;
                
                if (membersSnapshot.empty) {
                    membersContainer.innerHTML = '<p>No members found</p>';
                    return;
                }
                
                const members = membersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                membersContainer.innerHTML = members.map(member => `
                    <div class="member-item">
                        <div class="member-info">
                            <h4>${this.escapeHtml(member.firstName || '')} ${this.escapeHtml(member.lastName || '')}</h4>
                            <p>${member.birthDate ? `Born: ${this.formatDate(member.birthDate)}` : 'Birth date unknown'}</p>
                        </div>
                    </div>
                `).join('');
                
            } catch (error) {
                console.error('Error loading members:', error);
                document.getElementById('recentMembers').innerHTML = 
                    '<p class="error">Failed to load members</p>';
            }
        },
        
        // Export tree
        async exportTree(treeId) {
            try {
                const tree = this.trees.find(t => t.id === treeId);
                if (!tree) return;
                
                showInfo('Preparing export...');
                
                const db = firebase.firestore();
                const membersSnapshot = await db.collection('familyTrees')
                    .doc(treeId)
                    .collection('persons')
                    .get();
                
                const members = membersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                const exportData = {
                    tree: {
                        id: tree.id,
                        name: tree.name,
                        description: tree.description,
                        createdAt: tree.createdAt,
                        ownerEmail: tree.ownerEmail,
                        memberCount: members.length
                    },
                    members: members,
                    exportDate: new Date().toISOString(),
                    exportedBy: firebase.auth().currentUser.email
                };
                
                // Convert to JSON and download
                const blob = new Blob([JSON.stringify(exportData, null, 2)], 
                    { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `family-tree-${tree.name || treeId}-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                showSuccess('Tree exported successfully');
                
                // Log the export
                await AdminAPI.logActivity('tree_exported', {
                    treeId: treeId,
                    treeName: tree.name,
                    memberCount: members.length
                });
                
            } catch (error) {
                console.error('Error exporting tree:', error);
                showError('Failed to export tree');
            }
        },
        
        // Archive/Unarchive tree
        async archiveTree(treeId) {
            try {
                const tree = this.trees.find(t => t.id === treeId);
                if (!tree) return;
                
                const isActive = tree.isActive !== false;
                const action = isActive ? 'archive' : 'restore';
                
                if (!confirm(`Are you sure you want to ${action} this family tree?`)) {
                    return;
                }
                
                const db = firebase.firestore();
                await db.collection('familyTrees').doc(treeId).update({
                    isActive: !isActive,
                    lastModified: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                showSuccess(`Tree ${action}d successfully`);
                
                // Log the action
                await AdminAPI.logActivity(`tree_${action}d`, {
                    treeId: treeId,
                    treeName: tree.name
                });
                
                // Reload trees
                this.loadTrees();
                
            } catch (error) {
                console.error('Error archiving tree:', error);
                showError('Failed to update tree status');
            }
        },
        
        // Delete tree
        async deleteTree(treeId) {
            try {
                const tree = this.trees.find(t => t.id === treeId);
                if (!tree) return;
                
                if (!confirm(`Are you sure you want to permanently delete "${tree.name}"? This action cannot be undone.`)) {
                    return;
                }
                
                // Double confirmation for safety
                const confirmText = prompt('Type "DELETE" to confirm deletion:');
                if (confirmText !== 'DELETE') {
                    showInfo('Deletion cancelled');
                    return;
                }
                
                showInfo('Deleting tree and all its data...');
                
                const db = firebase.firestore();
                const batch = db.batch();
                
                // Delete all members first
                const membersSnapshot = await db.collection('familyTrees')
                    .doc(treeId)
                    .collection('persons')
                    .get();
                
                membersSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                // Delete the tree document
                batch.delete(db.collection('familyTrees').doc(treeId));
                
                await batch.commit();
                
                showSuccess('Tree deleted successfully');
                
                // Log the deletion
                await AdminAPI.logActivity('tree_deleted', {
                    treeId: treeId,
                    treeName: tree.name,
                    memberCount: membersSnapshot.size
                });
                
                // Remove from selected trees
                this.selectedTrees.delete(treeId);
                this.updateBulkActions();
                
                // Reload trees
                this.loadTrees();
                
            } catch (error) {
                console.error('Error deleting tree:', error);
                showError('Failed to delete tree');
            }
        },
        
        // Bulk delete trees
        async bulkDeleteTrees() {
            if (this.selectedTrees.size === 0) return;
            
            if (!confirm(`Are you sure you want to delete ${this.selectedTrees.size} trees? This action cannot be undone.`)) {
                return;
            }
            
            try {
                showInfo('Deleting selected trees...');
                
                const db = firebase.firestore();
                const batch = db.batch();
                let totalMembers = 0;
                
                for (const treeId of this.selectedTrees) {
                    // Delete all members
                    const membersSnapshot = await db.collection('familyTrees')
                        .doc(treeId)
                        .collection('persons')
                        .get();
                    
                    membersSnapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    
                    totalMembers += membersSnapshot.size;
                    
                    // Delete tree
                    batch.delete(db.collection('familyTrees').doc(treeId));
                }
                
                await batch.commit();
                
                showSuccess(`Deleted ${this.selectedTrees.size} trees`);
                
                // Log the bulk deletion
                await AdminAPI.logActivity('bulk_trees_deleted', {
                    treeCount: this.selectedTrees.size,
                    totalMembers: totalMembers
                });
                
                // Clear selection
                this.selectedTrees.clear();
                this.updateBulkActions();
                
                // Reload trees
                this.loadTrees();
                
            } catch (error) {
                console.error('Error bulk deleting trees:', error);
                showError('Failed to delete selected trees');
            }
        },
        
        // Bulk archive trees
        async bulkArchiveTrees() {
            if (this.selectedTrees.size === 0) return;
            
            try {
                showInfo('Archiving selected trees...');
                
                const db = firebase.firestore();
                const batch = db.batch();
                
                for (const treeId of this.selectedTrees) {
                    batch.update(db.collection('familyTrees').doc(treeId), {
                        isActive: false,
                        lastModified: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                await batch.commit();
                
                showSuccess(`Archived ${this.selectedTrees.size} trees`);
                
                // Log the bulk action
                await AdminAPI.logActivity('bulk_trees_archived', {
                    treeCount: this.selectedTrees.size
                });
                
                // Clear selection
                this.selectedTrees.clear();
                this.updateBulkActions();
                
                // Reload trees
                this.loadTrees();
                
            } catch (error) {
                console.error('Error bulk archiving trees:', error);
                showError('Failed to archive selected trees');
            }
        },
        
        // Export all trees
        async exportTrees() {
            try {
                showInfo('Preparing export...');
                
                const exportData = {
                    trees: this.trees,
                    totalCount: this.totalTrees,
                    exportDate: new Date().toISOString(),
                    exportedBy: firebase.auth().currentUser.email,
                    filters: this.filters
                };
                
                // Convert to CSV
                const csv = this.convertToCSV(this.trees);
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `family-trees-export-${Date.now()}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                showSuccess('Trees exported successfully');
                
                // Log the export
                await AdminAPI.logActivity('trees_exported', {
                    count: this.trees.length,
                    format: 'csv'
                });
                
            } catch (error) {
                console.error('Error exporting trees:', error);
                showError('Failed to export trees');
            }
        },
        
        // Convert to CSV
        convertToCSV(trees) {
            const headers = ['ID', 'Name', 'Owner Name', 'Owner Email', 'Members', 'Status', 'Created', 'Last Modified'];
            const rows = trees.map(tree => [
                tree.id,
                tree.name || 'Unnamed',
                tree.ownerName || 'Unknown',
                tree.ownerEmail || '',
                tree.memberCount || 0,
                tree.isActive !== false ? 'Active' : 'Archived',
                this.formatDate(tree.createdAt),
                this.formatDate(tree.lastModified || tree.createdAt)
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ].join('\n');
            
            return csvContent;
        },
        
        // Show modal
        showModal(content) {
            let modal = document.getElementById('treeModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'treeModal';
                modal.className = 'admin-modal';
                document.body.appendChild(modal);
            }
            
            modal.innerHTML = `<div class="modal-content">${content}</div>`;
            modal.classList.add('active');
            
            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        },
        
        // Close modal
        closeModal() {
            const modal = document.getElementById('treeModal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.remove();
                }, 300);
            }
        },
        
        // Show loading
        showLoading() {
            const tbody = document.getElementById('treesTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="loading-state">
                            <div class="spinner"></div>
                            <p>Loading family trees...</p>
                        </td>
                    </tr>
                `;
            }
        },
        
        // Hide loading
        hideLoading() {
            // Loading is handled by renderTrees
        },
        
        // Utility functions
        formatDate(date, includeTime = false) {
            if (!date) return 'N/A';
            
            const d = date.toDate ? date.toDate() : new Date(date);
            const options = {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            };
            
            if (includeTime) {
                options.hour = '2-digit';
                options.minute = '2-digit';
            }
            
            return d.toLocaleDateString('en-US', options);
        },
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        showError(message) {
            if (window.showError) {
                window.showError(message);
            } else {
                console.error(message);
            }
        },
        
        showSuccess(message) {
            if (window.showSuccess) {
                window.showSuccess(message);
            } else {
                console.log(message);
            }
        }
    };
    
    // Export for global use
    window.TreeManagement = TreeManagement;
})();