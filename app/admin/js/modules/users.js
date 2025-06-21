// User Management Module
(function() {
    'use strict';
    
    const UserManagement = {
        users: [],
        currentPage: 1,
        pageSize: 20,
        totalUsers: 0,
        filters: {
            search: '',
            status: '',
            role: '',
            dateFrom: ''
        },
        
        // Initialize user management
        init() {
            this.attachEventListeners();
            this.loadUsers();
        },
        
        // Attach event listeners
        attachEventListeners() {
            // Search
            const searchInput = document.getElementById('userSearch');
            if (searchInput) {
                searchInput.addEventListener('input', 
                    this.debounce(() => this.handleSearch(), 300)
                );
            }
            
            // Filters
            const statusFilter = document.getElementById('userStatusFilter');
            if (statusFilter) {
                statusFilter.addEventListener('change', () => this.handleFilterChange());
            }
            
            const roleFilter = document.getElementById('userRoleFilter');
            if (roleFilter) {
                roleFilter.addEventListener('change', () => this.handleFilterChange());
            }
            
            const dateFilter = document.getElementById('userDateFilter');
            if (dateFilter) {
                dateFilter.addEventListener('change', () => this.handleFilterChange());
            }
            
            // Pagination
            document.getElementById('userPrevPage')?.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadUsers();
                }
            });
            
            document.getElementById('userNextPage')?.addEventListener('click', () => {
                const maxPage = Math.ceil(this.totalUsers / this.pageSize);
                if (this.currentPage < maxPage) {
                    this.currentPage++;
                    this.loadUsers();
                }
            });
            
            // Select all checkbox
            document.getElementById('selectAllUsers')?.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('#usersTableBody input[type="checkbox"]');
                checkboxes.forEach(cb => cb.checked = e.target.checked);
            });
            
            // Export button
            document.getElementById('exportUsers')?.addEventListener('click', () => {
                this.exportUsers();
            });
            
            // Invite user button
            document.getElementById('inviteUser')?.addEventListener('click', () => {
                this.showInviteModal();
            });
        },
        
        // Handle search
        handleSearch() {
            this.filters.search = document.getElementById('userSearch').value.trim();
            this.currentPage = 1;
            this.loadUsers();
        },
        
        // Handle filter change
        handleFilterChange() {
            this.filters.status = document.getElementById('userStatusFilter').value;
            this.filters.role = document.getElementById('userRoleFilter').value;
            this.filters.dateFrom = document.getElementById('userDateFilter').value;
            this.currentPage = 1;
            this.loadUsers();
        },
        
        // Load users from Firestore
        async loadUsers() {
            try {
                this.showLoading(true);
                
                let query = firebase.firestore().collection('users');
                
                // Apply filters
                if (this.filters.status) {
                    query = query.where('status', '==', this.filters.status);
                }
                
                if (this.filters.role) {
                    query = query.where('role', '==', this.filters.role);
                }
                
                if (this.filters.dateFrom) {
                    const date = new Date(this.filters.dateFrom);
                    query = query.where('createdAt', '>=', date);
                }
                
                // Get total count (simplified - in production use aggregation)
                const totalSnapshot = await query.get();
                let allUsers = [];
                
                totalSnapshot.forEach(doc => {
                    const userData = doc.data();
                    allUsers.push({
                        id: doc.id,
                        ...userData
                    });
                });
                
                // Apply search filter (client-side for simplicity)
                if (this.filters.search) {
                    const searchTerm = this.filters.search.toLowerCase();
                    allUsers = allUsers.filter(user => 
                        (user.displayName || '').toLowerCase().includes(searchTerm) ||
                        (user.email || '').toLowerCase().includes(searchTerm) ||
                        (user.fullName || '').toLowerCase().includes(searchTerm)
                    );
                }
                
                this.totalUsers = allUsers.length;
                
                // Apply pagination
                const startIndex = (this.currentPage - 1) * this.pageSize;
                const endIndex = startIndex + this.pageSize;
                this.users = allUsers.slice(startIndex, endIndex);
                
                this.renderUsers();
                this.updatePagination();
                this.showLoading(false);
                
            } catch (error) {
                console.error('Error loading users:', error);
                this.showError('Failed to load users');
                this.showLoading(false);
            }
        },
        
        // Render users table
        renderUsers() {
            const tbody = document.getElementById('usersTableBody');
            if (!tbody) return;
            
            if (this.users.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="empty-state">
                            <div class="material-icons">people_outline</div>
                            <h3>No users found</h3>
                            <p>No users match your current filters.</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = this.users.map(user => `
                <tr>
                    <td class="checkbox-col">
                        <input type="checkbox" value="${user.id}">
                    </td>
                    <td>
                        <div class="user-info">
                            <img src="${user.photoURL || '/app/images/default-avatar.png'}" 
                                 alt="${user.displayName || 'User'}" 
                                 class="user-avatar-small">
                            <div class="user-details">
                                <h4>${user.displayName || user.fullName || 'No Name'}</h4>
                                <p>ID: ${user.id}</p>
                            </div>
                        </div>
                    </td>
                    <td>${user.email}</td>
                    <td>
                        <span class="role-badge ${user.role || 'user'}">
                            ${this.formatRole(user.role)}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${user.status || 'active'}">
                            ${this.formatStatus(user.status)}
                        </span>
                    </td>
                    <td>${this.formatDate(user.createdAt)}</td>
                    <td>${this.formatDate(user.lastLoginAt) || 'Never'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn" onclick="UserManagement.editUser('${user.id}')" 
                                    title="Edit User">
                                <span class="material-icons">edit</span>
                            </button>
                            <button class="action-btn" onclick="UserManagement.viewUserDetails('${user.id}')" 
                                    title="View Details">
                                <span class="material-icons">visibility</span>
                            </button>
                            <button class="action-btn" onclick="UserManagement.toggleUserStatus('${user.id}', '${user.status || 'active'}')" 
                                    title="${user.status === 'suspended' ? 'Activate' : 'Suspend'} User">
                                <span class="material-icons">${user.status === 'suspended' ? 'play_circle' : 'pause_circle'}</span>
                            </button>
                            ${this.canDeleteUser(user) ? `
                                <button class="action-btn" onclick="UserManagement.deleteUser('${user.id}')" 
                                        title="Delete User">
                                    <span class="material-icons">delete</span>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        },
        
        // Update pagination
        updatePagination() {
            const startIndex = (this.currentPage - 1) * this.pageSize + 1;
            const endIndex = Math.min(this.currentPage * this.pageSize, this.totalUsers);
            const maxPage = Math.ceil(this.totalUsers / this.pageSize);
            
            document.getElementById('userStart').textContent = this.totalUsers > 0 ? startIndex : 0;
            document.getElementById('userEnd').textContent = endIndex;
            document.getElementById('userTotal').textContent = this.totalUsers;
            document.getElementById('userCurrentPage').textContent = this.currentPage;
            
            document.getElementById('userPrevPage').disabled = this.currentPage <= 1;
            document.getElementById('userNextPage').disabled = this.currentPage >= maxPage;
            
            // Update user count in sidebar
            document.getElementById('userCount').textContent = this.totalUsers;
        },
        
        // Format role for display
        formatRole(role) {
            const roleMap = {
                'superadmin': 'Super Admin',
                'admin': 'Admin',
                'moderator': 'Moderator',
                'user': 'User'
            };
            return roleMap[role] || 'User';
        },
        
        // Format status for display
        formatStatus(status) {
            const statusMap = {
                'active': 'Active',
                'inactive': 'Inactive',
                'suspended': 'Suspended'
            };
            return statusMap[status] || 'Active';
        },
        
        // Format date
        formatDate(timestamp) {
            if (!timestamp) return '';
            
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        },
        
        // Check if user can be deleted
        canDeleteUser(user) {
            const currentAdmin = AdminAuthGuard.getCurrentAdmin();
            const currentRole = AdminAuthGuard.getAdminRole();
            
            // Can't delete yourself
            if (user.id === currentAdmin.uid) return false;
            
            // Super admin can delete anyone except other super admins
            if (currentRole === 'superadmin') {
                return user.role !== 'superadmin' || user.id === currentAdmin.uid;
            }
            
            // Admin can only delete regular users
            if (currentRole === 'admin') {
                return !user.role || user.role === 'user';
            }
            
            return false;
        },
        
        // Edit user
        async editUser(userId) {
            try {
                const user = this.users.find(u => u.id === userId);
                if (!user) return;
                
                this.showEditModal(user);
                
            } catch (error) {
                console.error('Error editing user:', error);
                this.showError('Failed to load user details');
            }
        },
        
        // View user details
        async viewUserDetails(userId) {
            try {
                const user = this.users.find(u => u.id === userId);
                if (!user) return;
                
                // Get additional details
                const familyTreesSnapshot = await firebase.firestore()
                    .collection('familyTrees')
                    .where('createdBy', '==', userId)
                    .get();
                
                const familyTrees = [];
                familyTreesSnapshot.forEach(doc => {
                    familyTrees.push({ id: doc.id, ...doc.data() });
                });
                
                this.showDetailsModal(user, { familyTrees });
                
            } catch (error) {
                console.error('Error loading user details:', error);
                this.showError('Failed to load user details');
            }
        },
        
        // Toggle user status
        async toggleUserStatus(userId, currentStatus) {
            const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
            const action = newStatus === 'suspended' ? 'suspend' : 'activate';
            
            if (!confirm(`Are you sure you want to ${action} this user?`)) {
                return;
            }
            
            try {
                await firebase.firestore()
                    .collection('users')
                    .doc(userId)
                    .update({
                        status: newStatus,
                        statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        statusUpdatedBy: AdminAuthGuard.getCurrentAdmin().uid
                    });
                
                // Log admin action
                await this.logAdminAction('user_status_change', {
                    targetUserId: userId,
                    oldStatus: currentStatus,
                    newStatus: newStatus
                });
                
                this.showSuccess(`User ${action}d successfully`);
                this.loadUsers();
                
            } catch (error) {
                console.error('Error updating user status:', error);
                this.showError(`Failed to ${action} user`);
            }
        },
        
        // Delete user
        async deleteUser(userId) {
            if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                return;
            }
            
            try {
                // Delete user document
                await firebase.firestore()
                    .collection('users')
                    .doc(userId)
                    .delete();
                
                // Log admin action
                await this.logAdminAction('user_deleted', {
                    targetUserId: userId
                });
                
                this.showSuccess('User deleted successfully');
                this.loadUsers();
                
            } catch (error) {
                console.error('Error deleting user:', error);
                this.showError('Failed to delete user');
            }
        },
        
        // Export users
        async exportUsers() {
            try {
                const selectedUsers = this.getSelectedUsers();
                const usersToExport = selectedUsers.length > 0 ? selectedUsers : this.users;
                
                const csv = this.generateUserCSV(usersToExport);
                this.downloadCSV(csv, 'users-export.csv');
                
                this.showSuccess('Users exported successfully');
                
            } catch (error) {
                console.error('Error exporting users:', error);
                this.showError('Failed to export users');
            }
        },
        
        // Get selected users
        getSelectedUsers() {
            const checkboxes = document.querySelectorAll('#usersTableBody input[type="checkbox"]:checked');
            return Array.from(checkboxes).map(cb => 
                this.users.find(u => u.id === cb.value)
            ).filter(Boolean);
        },
        
        // Generate CSV
        generateUserCSV(users) {
            const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Joined', 'Last Login'];
            const rows = users.map(user => [
                user.id,
                user.displayName || user.fullName || '',
                user.email,
                this.formatRole(user.role),
                this.formatStatus(user.status),
                this.formatDate(user.createdAt),
                this.formatDate(user.lastLoginAt)
            ]);
            
            return [headers, ...rows]
                .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
                .join('\n');
        },
        
        // Download CSV
        downloadCSV(csv, filename) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        
        // Log admin action
        async logAdminAction(action, details) {
            try {
                const admin = AdminAuthGuard.getCurrentAdmin();
                await firebase.firestore().collection('adminActivityLogs').add({
                    action,
                    adminId: admin.uid,
                    adminEmail: admin.email,
                    details,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error('Error logging admin action:', error);
            }
        },
        
        // UI Helper Methods
        showLoading(show) {
            const tbody = document.getElementById('usersTableBody');
            if (!tbody) return;
            
            if (show) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 40px;">
                            <div class="spinner"></div>
                            <p>Loading users...</p>
                        </td>
                    </tr>
                `;
            }
        },
        
        showSuccess(message) {
            // Show success toast or alert
            if (window.showSuccess) {
                window.showSuccess(message);
            } else {
                alert(message);
            }
        },
        
        showError(message) {
            // Show error toast or alert
            if (window.showError) {
                window.showError(message);
            } else {
                alert(message);
            }
        },
        
        // Debounce helper
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
        }
    };
    
    // Export for global use
    window.UserManagement = UserManagement;
})();