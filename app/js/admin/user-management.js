// Admin User Management
(function() {
    'use strict';
    
    console.log('[AdminUserManagement] Initializing user management module');
    
    class AdminUserManagement {
        constructor() {
            this.db = firebase.firestore();
            this.users = [];
            this.filteredUsers = [];
            this.currentPage = 1;
            this.itemsPerPage = 20;
            this.searchTerm = '';
            this.initialized = false;
        }
        
        // Initialize user management
        async initialize() {
            if (this.initialized) return;
            
            try {
                console.log('[AdminUserManagement] Loading users...');
                
                // Set up event listeners
                this.setupEventListeners();
                
                // Load initial user data
                await this.loadUsers();
                
                this.initialized = true;
            } catch (error) {
                console.error('[AdminUserManagement] Initialization error:', error);
                this.showError('Failed to load users');
            }
        }
        
        // Setup event listeners
        setupEventListeners() {
            const searchInput = document.getElementById('userSearch');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.searchTerm = e.target.value.toLowerCase();
                    this.filterUsers();
                });
            }
        }
        
        // Load all users
        async loadUsers() {
            try {
                const snapshot = await this.db.collection('users')
                    .orderBy('createdAt', 'desc')
                    .get();
                
                this.users = [];
                snapshot.forEach(doc => {
                    this.users.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                console.log(`[AdminUserManagement] Loaded ${this.users.length} users`);
                
                this.filterUsers();
                this.updateStats();
                
            } catch (error) {
                console.error('[AdminUserManagement] Error loading users:', error);
                throw error;
            }
        }
        
        // Filter users based on search
        filterUsers() {
            if (!this.searchTerm) {
                this.filteredUsers = [...this.users];
            } else {
                this.filteredUsers = this.users.filter(user => {
                    const searchFields = [
                        user.email,
                        user.fullName,
                        user.displayName,
                        user.role
                    ].filter(Boolean).join(' ').toLowerCase();
                    
                    return searchFields.includes(this.searchTerm);
                });
            }
            
            this.currentPage = 1;
            this.renderUsersTable();
        }
        
        // Render users table
        renderUsersTable() {
            const tbody = document.getElementById('usersTableBody');
            if (!tbody) return;
            
            // Calculate pagination
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const pageUsers = this.filteredUsers.slice(startIndex, endIndex);
            
            if (pageUsers.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="loading-cell">No users found</td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = pageUsers.map(user => `
                <tr>
                    <td>${this.escapeHtml(user.fullName || user.displayName || 'No name')}</td>
                    <td>${this.escapeHtml(user.email)}</td>
                    <td>
                        <span class="badge badge-${user.role === 'admin' ? 'admin' : 'user'}">
                            ${user.role || 'user'}
                        </span>
                    </td>
                    <td>${user.familyTreeId ? 'Yes' : 'No'}</td>
                    <td>${this.formatDate(user.createdAt)}</td>
                    <td>${this.formatDate(user.lastLoginAt || user.lastLogin)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon" onclick="adminUserManagement.editUser('${user.id}')" title="Edit">
                                <span class="material-icons">edit</span>
                            </button>
                            <button class="btn-icon" onclick="adminUserManagement.viewUserDetails('${user.id}')" title="View">
                                <span class="material-icons">visibility</span>
                            </button>
                            ${user.role !== 'superadmin' ? `
                                <button class="btn-icon" onclick="adminUserManagement.toggleUserStatus('${user.id}')" title="Toggle Status">
                                    <span class="material-icons">${user.isActive !== false ? 'block' : 'check_circle'}</span>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
            
            this.renderPagination();
        }
        
        // Render pagination
        renderPagination() {
            const paginationDiv = document.getElementById('usersPagination');
            if (!paginationDiv) return;
            
            const totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
            
            if (totalPages <= 1) {
                paginationDiv.innerHTML = '';
                return;
            }
            
            let html = `
                <button class="pagination-btn" onclick="adminUserManagement.goToPage(${this.currentPage - 1})" 
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
                            onclick="adminUserManagement.goToPage(${i})">
                        ${i}
                    </button>
                `;
            }
            
            html += `
                <button class="pagination-btn" onclick="adminUserManagement.goToPage(${this.currentPage + 1})" 
                        ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Next
                </button>
            `;
            
            paginationDiv.innerHTML = html;
        }
        
        // Go to specific page
        goToPage(page) {
            const totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
            if (page < 1 || page > totalPages) return;
            
            this.currentPage = page;
            this.renderUsersTable();
        }
        
        // Edit user
        editUser(userId) {
            const user = this.users.find(u => u.id === userId);
            if (!user) return;
            
            // Populate modal
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editUserName').value = user.fullName || user.displayName || '';
            document.getElementById('editUserEmail').value = user.email;
            document.getElementById('editUserRole').value = user.role || 'user';
            document.getElementById('editUserActive').checked = user.isActive !== false;
            
            // Show modal
            document.getElementById('userEditModal').classList.add('active');
        }
        
        // Save user changes
        async saveUser() {
            try {
                const userId = document.getElementById('editUserId').value;
                const updates = {
                    fullName: document.getElementById('editUserName').value,
                    role: document.getElementById('editUserRole').value,
                    isAdmin: document.getElementById('editUserRole').value === 'admin' || 
                             document.getElementById('editUserRole').value === 'superadmin',
                    isActive: document.getElementById('editUserActive').checked,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await this.db.collection('users').doc(userId).update(updates);
                
                // Log admin action
                await this.logAdminAction('user_updated', {
                    targetUserId: userId,
                    updates: updates
                });
                
                // Refresh data
                await this.loadUsers();
                
                // Close modal
                this.closeEditModal();
                
                this.showSuccess('User updated successfully');
                
            } catch (error) {
                console.error('[AdminUserManagement] Error saving user:', error);
                this.showError('Failed to save user changes');
            }
        }
        
        // Close edit modal
        closeEditModal() {
            document.getElementById('userEditModal').classList.remove('active');
        }
        
        // View user details
        async viewUserDetails(userId) {
            try {
                const user = this.users.find(u => u.id === userId);
                if (!user) return;
                
                // Get additional user data
                let familyTreeName = 'None';
                if (user.familyTreeId) {
                    const treeDoc = await this.db.collection('familyTrees').doc(user.familyTreeId).get();
                    if (treeDoc.exists) {
                        familyTreeName = treeDoc.data().name;
                    }
                }
                
                // Show details in a modal or redirect to user profile
                alert(`User Details:\n\nName: ${user.fullName || user.displayName || 'N/A'}\nEmail: ${user.email}\nRole: ${user.role || 'user'}\nFamily Tree: ${familyTreeName}\nJoined: ${this.formatDate(user.createdAt)}`);
                
            } catch (error) {
                console.error('[AdminUserManagement] Error viewing user:', error);
                this.showError('Failed to load user details');
            }
        }
        
        // Toggle user active status
        async toggleUserStatus(userId) {
            try {
                const user = this.users.find(u => u.id === userId);
                if (!user) return;
                
                const newStatus = user.isActive === false ? true : false;
                
                await this.db.collection('users').doc(userId).update({
                    isActive: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Log admin action
                await this.logAdminAction('user_status_changed', {
                    targetUserId: userId,
                    newStatus: newStatus
                });
                
                // Refresh data
                await this.loadUsers();
                
                this.showSuccess(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
                
            } catch (error) {
                console.error('[AdminUserManagement] Error toggling user status:', error);
                this.showError('Failed to change user status');
            }
        }
        
        // Export users to CSV
        exportUsers() {
            try {
                const csv = this.convertToCSV(this.filteredUsers);
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pyebwa-users-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                
                this.logAdminAction('users_exported', {
                    count: this.filteredUsers.length
                });
                
            } catch (error) {
                console.error('[AdminUserManagement] Error exporting users:', error);
                this.showError('Failed to export users');
            }
        }
        
        // Convert users to CSV
        convertToCSV(users) {
            const headers = ['ID', 'Email', 'Name', 'Role', 'Family Tree', 'Created', 'Last Login'];
            const rows = users.map(user => [
                user.id,
                user.email,
                user.fullName || user.displayName || '',
                user.role || 'user',
                user.familyTreeId || '',
                this.formatDate(user.createdAt),
                this.formatDate(user.lastLoginAt || user.lastLogin)
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');
            
            return csvContent;
        }
        
        // Update dashboard stats
        updateStats() {
            const totalUsersEl = document.getElementById('totalUsers');
            if (totalUsersEl) {
                totalUsersEl.textContent = this.users.length;
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
                console.error('[AdminUserManagement] Error logging action:', error);
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
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        showSuccess(message) {
            // TODO: Implement toast notifications
            console.log('[Success]', message);
        }
        
        showError(message) {
            // TODO: Implement toast notifications
            console.error('[Error]', message);
        }
    }
    
    // Create global instance
    window.adminUserManagement = new AdminUserManagement();
    
})();