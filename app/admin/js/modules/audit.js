// Audit Logging Module
(function() {
    'use strict';
    
    const AuditModule = {
        logs: [],
        currentPage: 1,
        pageSize: 50,
        totalLogs: 0,
        filters: {
            search: '',
            action: '',
            dateFrom: '',
            dateTo: '',
            userId: ''
        },
        
        // Initialize audit module
        init() {
            this.attachEventListeners();
            this.loadLogs();
        },
        
        // Attach event listeners
        attachEventListeners() {
            // Search
            const searchInput = document.getElementById('auditSearch');
            if (searchInput) {
                searchInput.addEventListener('input', 
                    this.debounce(() => this.handleSearch(), 300)
                );
            }
            
            // Filters
            document.getElementById('auditActionFilter')?.addEventListener('change', () => this.handleFilterChange());
            document.getElementById('auditDateFrom')?.addEventListener('change', () => this.handleFilterChange());
            document.getElementById('auditDateTo')?.addEventListener('change', () => this.handleFilterChange());
            
            // Pagination
            document.getElementById('auditPrevPage')?.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadLogs();
                }
            });
            
            document.getElementById('auditNextPage')?.addEventListener('click', () => {
                const maxPage = Math.ceil(this.totalLogs / this.pageSize);
                if (this.currentPage < maxPage) {
                    this.currentPage++;
                    this.loadLogs();
                }
            });
            
            // Export button
            document.getElementById('exportAuditLogs')?.addEventListener('click', () => {
                this.exportLogs();
            });
            
            // Refresh button
            document.getElementById('refreshAuditLogs')?.addEventListener('click', () => {
                this.loadLogs();
            });
        },
        
        // Handle search
        handleSearch() {
            this.filters.search = document.getElementById('auditSearch').value.trim();
            this.currentPage = 1;
            this.loadLogs();
        },
        
        // Handle filter change
        handleFilterChange() {
            this.filters.action = document.getElementById('auditActionFilter').value;
            this.filters.dateFrom = document.getElementById('auditDateFrom').value;
            this.filters.dateTo = document.getElementById('auditDateTo').value;
            this.currentPage = 1;
            this.loadLogs();
        },
        
        // Load audit logs
        async loadLogs() {
            try {
                this.showLoading();
                
                const db = firebase.firestore();
                let query = db.collection('admin_logs');
                
                // Apply filters
                if (this.filters.action) {
                    query = query.where('action', '==', this.filters.action);
                }
                
                if (this.filters.dateFrom) {
                    const dateFrom = new Date(this.filters.dateFrom);
                    dateFrom.setHours(0, 0, 0, 0);
                    query = query.where('timestamp', '>=', dateFrom);
                }
                
                if (this.filters.dateTo) {
                    const dateTo = new Date(this.filters.dateTo);
                    dateTo.setHours(23, 59, 59, 999);
                    query = query.where('timestamp', '<=', dateTo);
                }
                
                // Order by timestamp descending
                query = query.orderBy('timestamp', 'desc');
                
                // Get total count
                const countSnapshot = await query.get();
                this.totalLogs = countSnapshot.size;
                
                // Apply pagination
                query = query.limit(this.pageSize);
                if (this.currentPage > 1) {
                    const lastVisible = countSnapshot.docs[(this.currentPage - 1) * this.pageSize - 1];
                    if (lastVisible) {
                        query = query.startAfter(lastVisible);
                    }
                }
                
                // Execute query
                const snapshot = await query.get();
                this.logs = [];
                
                // Process logs
                for (const doc of snapshot.docs) {
                    const log = { id: doc.id, ...doc.data() };
                    
                    // Get admin user info
                    if (log.adminId) {
                        try {
                            const userDoc = await db.collection('users').doc(log.adminId).get();
                            if (userDoc.exists) {
                                log.adminName = userDoc.data().displayName || userDoc.data().email;
                                log.adminEmail = userDoc.data().email;
                            }
                        } catch (error) {
                            console.error('Error fetching admin info:', error);
                        }
                    }
                    
                    this.logs.push(log);
                }
                
                // Apply client-side search filter
                if (this.filters.search) {
                    const search = this.filters.search.toLowerCase();
                    this.logs = this.logs.filter(log => 
                        log.action?.toLowerCase().includes(search) ||
                        log.adminEmail?.toLowerCase().includes(search) ||
                        log.targetUser?.toLowerCase().includes(search) ||
                        JSON.stringify(log.details).toLowerCase().includes(search)
                    );
                }
                
                this.renderLogs();
                this.updatePagination();
                
            } catch (error) {
                console.error('Error loading audit logs:', error);
                this.showError('Failed to load audit logs');
            } finally {
                this.hideLoading();
            }
        },
        
        // Render logs table
        renderLogs() {
            const tbody = document.getElementById('auditLogsTableBody');
            if (!tbody) return;
            
            if (this.logs.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-state">
                            <div class="empty-state-content">
                                <span class="material-icons">history</span>
                                <h3>No audit logs found</h3>
                                <p>Admin actions will appear here</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = this.logs.map(log => `
                <tr data-log-id="${log.id}">
                    <td>${this.formatDate(log.timestamp, true)}</td>
                    <td>
                        <div class="user-info">
                            <div class="user-details">
                                <h4>${this.escapeHtml(log.adminName || 'System')}</h4>
                                <p>${this.escapeHtml(log.adminEmail || 'system@pyebwa.com')}</p>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="action-badge ${this.getActionClass(log.action)}">
                            ${this.formatAction(log.action)}
                        </span>
                    </td>
                    <td>${log.targetUser ? this.escapeHtml(log.targetUser) : '-'}</td>
                    <td class="details-cell">
                        ${this.formatDetails(log.details)}
                    </td>
                    <td>
                        <button class="action-btn" onclick="AuditModule.viewLogDetails('${log.id}')" 
                            title="View Details">
                            <span class="material-icons">visibility</span>
                        </button>
                    </td>
                </tr>
            `).join('');
        },
        
        // View log details
        viewLogDetails(logId) {
            const log = this.logs.find(l => l.id === logId);
            if (!log) return;
            
            const modalHtml = `
                <div class="modal-header">
                    <h2>Audit Log Details</h2>
                    <button class="modal-close" onclick="AuditModule.closeModal()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="log-details">
                        <div class="detail-row">
                            <label>Timestamp:</label>
                            <span>${this.formatDate(log.timestamp, true)}</span>
                        </div>
                        <div class="detail-row">
                            <label>Admin:</label>
                            <span>${this.escapeHtml(log.adminName || 'System')} 
                                (${this.escapeHtml(log.adminEmail || 'system@pyebwa.com')})</span>
                        </div>
                        <div class="detail-row">
                            <label>Action:</label>
                            <span class="action-badge ${this.getActionClass(log.action)}">
                                ${this.formatAction(log.action)}
                            </span>
                        </div>
                        <div class="detail-row">
                            <label>Target User:</label>
                            <span>${log.targetUser ? this.escapeHtml(log.targetUser) : 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <label>IP Address:</label>
                            <span>${log.ipAddress || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <label>User Agent:</label>
                            <span style="font-size: 12px; word-break: break-all;">
                                ${log.userAgent || 'N/A'}
                            </span>
                        </div>
                    </div>
                    
                    <h3 style="margin-top: 30px;">Additional Details</h3>
                    <pre class="log-details-json">${JSON.stringify(log.details || {}, null, 2)}</pre>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="AuditModule.closeModal()">Close</button>
                </div>
            `;
            
            this.showModal(modalHtml);
        },
        
        // Format action name
        formatAction(action) {
            const actionLabels = {
                'login': 'Admin Login',
                'logout': 'Admin Logout',
                'user_created': 'User Created',
                'user_updated': 'User Updated',
                'user_deleted': 'User Deleted',
                'user_suspended': 'User Suspended',
                'user_activated': 'User Activated',
                'role_changed': 'Role Changed',
                'tree_created': 'Tree Created',
                'tree_updated': 'Tree Updated',
                'tree_deleted': 'Tree Deleted',
                'tree_archived': 'Tree Archived',
                'tree_restored': 'Tree Restored',
                'tree_exported': 'Tree Exported',
                'bulk_action': 'Bulk Action',
                'settings_updated': 'Settings Updated',
                'content_deleted': 'Content Deleted',
                'email_sent': 'Email Sent',
                'backup_created': 'Backup Created',
                'data_exported': 'Data Exported'
            };
            
            return actionLabels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        },
        
        // Get action class for styling
        getActionClass(action) {
            if (action.includes('delete') || action.includes('suspend')) return 'danger';
            if (action.includes('create') || action.includes('activate')) return 'success';
            if (action.includes('update') || action.includes('change')) return 'warning';
            if (action.includes('login') || action.includes('logout')) return 'info';
            return 'default';
        },
        
        // Format details
        formatDetails(details) {
            if (!details || Object.keys(details).length === 0) return '-';
            
            const key = Object.keys(details)[0];
            const value = details[key];
            
            if (typeof value === 'string' || typeof value === 'number') {
                return `${key}: ${value}`;
            }
            
            return `${Object.keys(details).length} properties`;
        },
        
        // Update pagination
        updatePagination() {
            const start = (this.currentPage - 1) * this.pageSize + 1;
            const end = Math.min(this.currentPage * this.pageSize, this.totalLogs);
            const maxPage = Math.ceil(this.totalLogs / this.pageSize);
            
            document.getElementById('auditStart').textContent = start;
            document.getElementById('auditEnd').textContent = end;
            document.getElementById('auditTotal').textContent = this.totalLogs;
            document.getElementById('auditCurrentPage').textContent = this.currentPage;
            
            const prevBtn = document.getElementById('auditPrevPage');
            const nextBtn = document.getElementById('auditNextPage');
            
            if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
            if (nextBtn) nextBtn.disabled = this.currentPage >= maxPage;
        },
        
        // Export logs
        async exportLogs() {
            try {
                showInfo('Preparing export...');
                
                // For CSV export
                const csv = this.convertToCSV(this.logs);
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit-logs-${Date.now()}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                showSuccess('Audit logs exported successfully');
                
                // Log the export itself
                await AdminAPI.logActivity('audit_logs_exported', {
                    count: this.logs.length,
                    filters: this.filters
                });
                
            } catch (error) {
                console.error('Error exporting logs:', error);
                showError('Failed to export audit logs');
            }
        },
        
        // Convert to CSV
        convertToCSV(logs) {
            const headers = ['Timestamp', 'Admin', 'Email', 'Action', 'Target User', 'Details'];
            const rows = logs.map(log => [
                this.formatDate(log.timestamp, true),
                log.adminName || 'System',
                log.adminEmail || 'system@pyebwa.com',
                this.formatAction(log.action),
                log.targetUser || '',
                JSON.stringify(log.details || {})
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ].join('\n');
            
            return csvContent;
        },
        
        // Show modal
        showModal(content) {
            let modal = document.getElementById('auditModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'auditModal';
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
            const modal = document.getElementById('auditModal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.remove();
                }, 300);
            }
        },
        
        // Show loading
        showLoading() {
            const tbody = document.getElementById('auditLogsTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="loading-state">
                            <div class="spinner"></div>
                            <p>Loading audit logs...</p>
                        </td>
                    </tr>
                `;
            }
        },
        
        // Hide loading
        hideLoading() {
            // Loading is handled by renderLogs
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
                options.second = '2-digit';
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
        }
    };
    
    // Export for global use
    window.AuditModule = AuditModule;
})();