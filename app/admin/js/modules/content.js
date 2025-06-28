// Content Management Module
(function() {
    'use strict';
    
    const ContentManagement = {
        // Module properties
        currentView: 'photos',
        selectedItems: new Set(),
        filters: {
            type: 'all',
            userId: '',
            dateRange: 'all',
            status: 'all',
            search: ''
        },
        currentPage: 1,
        itemsPerPage: 50,
        totalItems: 0,
        contentCache: new Map(),
        storageUsageCache: new Map(),
        
        // Initialize module
        async init() {
            console.log('Initializing content management module');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadContent();
            
            // Setup real-time listeners
            this.setupRealtimeListeners();
            
            // Load storage statistics
            await this.loadStorageStats();
        },
        
        // Setup event listeners
        setupEventListeners() {
            // Tab navigation
            document.querySelectorAll('.content-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const view = tab.dataset.view;
                    this.switchView(view);
                });
            });
            
            // Search
            const searchInput = document.getElementById('contentSearch');
            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.filters.search = e.target.value;
                        this.loadContent();
                    }, 300);
                });
            }
            
            // Filters
            this.setupFilters();
            
            // Bulk actions
            this.setupBulkActions();
            
            // Upload button
            const uploadBtn = document.getElementById('uploadContent');
            if (uploadBtn) {
                uploadBtn.addEventListener('click', () => this.showUploadDialog());
            }
        },
        
        // Setup filters
        setupFilters() {
            // Type filter
            const typeFilter = document.getElementById('contentTypeFilter');
            if (typeFilter) {
                typeFilter.addEventListener('change', (e) => {
                    this.filters.type = e.target.value;
                    this.loadContent();
                });
            }
            
            // Date range filter
            const dateFilter = document.getElementById('contentDateFilter');
            if (dateFilter) {
                dateFilter.addEventListener('change', (e) => {
                    this.filters.dateRange = e.target.value;
                    this.loadContent();
                });
            }
            
            // Status filter
            const statusFilter = document.getElementById('contentStatusFilter');
            if (statusFilter) {
                statusFilter.addEventListener('change', (e) => {
                    this.filters.status = e.target.value;
                    this.loadContent();
                });
            }
            
            // User filter
            const userFilter = document.getElementById('contentUserFilter');
            if (userFilter) {
                userFilter.addEventListener('input', (e) => {
                    this.filters.userId = e.target.value;
                    this.loadContent();
                });
            }
        },
        
        // Setup bulk actions
        setupBulkActions() {
            // Select all checkbox
            const selectAll = document.getElementById('selectAllContent');
            if (selectAll) {
                selectAll.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.selectAllVisible();
                    } else {
                        this.deselectAll();
                    }
                });
            }
            
            // Bulk actions buttons
            document.getElementById('bulkApprove')?.addEventListener('click', () => {
                this.bulkUpdateStatus('approved');
            });
            
            document.getElementById('bulkReject')?.addEventListener('click', () => {
                this.bulkUpdateStatus('rejected');
            });
            
            document.getElementById('bulkDelete')?.addEventListener('click', () => {
                this.bulkDelete();
            });
            
            document.getElementById('bulkDownload')?.addEventListener('click', () => {
                this.bulkDownload();
            });
        },
        
        // Switch view
        switchView(view) {
            this.currentView = view;
            
            // Update tab active state
            document.querySelectorAll('.content-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.view === view);
            });
            
            // Update view title
            const viewTitle = document.getElementById('contentViewTitle');
            if (viewTitle) {
                const titles = {
                    photos: 'Photos',
                    documents: 'Documents',
                    all: 'All Content'
                };
                viewTitle.textContent = titles[view] || 'Content';
            }
            
            // Reset page and load content
            this.currentPage = 1;
            this.loadContent();
        },
        
        // Load content
        async loadContent() {
            try {
                this.showLoading(true);
                
                // Build query
                let query = firebase.firestore().collection('content');
                
                // Apply view filter
                if (this.currentView === 'photos') {
                    query = query.where('type', 'in', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
                } else if (this.currentView === 'documents') {
                    query = query.where('type', 'in', ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
                }
                
                // Apply filters
                if (this.filters.status !== 'all') {
                    query = query.where('status', '==', this.filters.status);
                }
                
                if (this.filters.userId) {
                    query = query.where('userId', '==', this.filters.userId);
                }
                
                // Apply date range
                const dateRange = this.getDateRange();
                if (dateRange.start) {
                    query = query.where('uploadedAt', '>=', dateRange.start);
                }
                if (dateRange.end) {
                    query = query.where('uploadedAt', '<=', dateRange.end);
                }
                
                // Order by upload date
                query = query.orderBy('uploadedAt', 'desc');
                
                // Get total count
                const snapshot = await query.get();
                let items = [];
                
                snapshot.forEach(doc => {
                    items.push({ id: doc.id, ...doc.data() });
                });
                
                // Apply search filter (client-side)
                if (this.filters.search) {
                    const searchLower = this.filters.search.toLowerCase();
                    items = items.filter(item => 
                        item.fileName?.toLowerCase().includes(searchLower) ||
                        item.description?.toLowerCase().includes(searchLower) ||
                        item.tags?.some(tag => tag.toLowerCase().includes(searchLower))
                    );
                }
                
                this.totalItems = items.length;
                
                // Paginate
                const startIndex = (this.currentPage - 1) * this.itemsPerPage;
                const paginatedItems = items.slice(startIndex, startIndex + this.itemsPerPage);
                
                // Enrich with user data
                await this.enrichContentData(paginatedItems);
                
                // Display content
                this.displayContent(paginatedItems);
                
                // Update pagination
                this.updatePagination();
                
                // Update stats
                this.updateContentStats(items);
                
            } catch (error) {
                console.error('Error loading content:', error);
                this.showError('Failed to load content');
            } finally {
                this.showLoading(false);
            }
        },
        
        // Get date range
        getDateRange() {
            const now = new Date();
            const range = { start: null, end: null };
            
            switch (this.filters.dateRange) {
                case 'today':
                    range.start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    range.start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    range.start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                    break;
                case 'year':
                    range.start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                    break;
            }
            
            return range;
        },
        
        // Enrich content data with user information
        async enrichContentData(items) {
            const userIds = [...new Set(items.map(item => item.userId))];
            const userMap = new Map();
            
            // Batch fetch users
            for (const userId of userIds) {
                if (!userMap.has(userId)) {
                    try {
                        const userDoc = await firebase.firestore()
                            .collection('users')
                            .doc(userId)
                            .get();
                        
                        if (userDoc.exists) {
                            userMap.set(userId, userDoc.data());
                        }
                    } catch (error) {
                        console.error('Error fetching user:', error);
                    }
                }
            }
            
            // Add user data to items
            items.forEach(item => {
                const user = userMap.get(item.userId);
                if (user) {
                    item.userName = user.displayName || user.email;
                    item.userEmail = user.email;
                }
            });
        },
        
        // Display content
        displayContent(items) {
            const container = document.getElementById('contentGrid');
            if (!container) return;
            
            if (items.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="material-icons">folder_open</span>
                        <h3>No content found</h3>
                        <p>Try adjusting your filters or search criteria</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = items.map(item => this.renderContentItem(item)).join('');
            
            // Setup item event listeners
            this.setupItemEventListeners();
        },
        
        // Render content item
        renderContentItem(item) {
            const isImage = item.type?.startsWith('image/');
            const statusClass = `status-${item.status || 'pending'}`;
            const statusIcon = {
                approved: 'check_circle',
                rejected: 'cancel',
                pending: 'schedule',
                flagged: 'flag'
            }[item.status || 'pending'];
            
            return `
                <div class="content-item ${statusClass}" data-id="${item.id}">
                    <div class="content-checkbox">
                        <input type="checkbox" id="content-${item.id}" 
                               ${this.selectedItems.has(item.id) ? 'checked' : ''}>
                    </div>
                    
                    <div class="content-preview">
                        ${isImage ? `
                            <img src="${item.thumbnailUrl || item.url}" 
                                 alt="${item.fileName || 'Content'}" 
                                 loading="lazy">
                        ` : `
                            <div class="file-icon">
                                <span class="material-icons">description</span>
                                <span class="file-ext">${this.getFileExtension(item.fileName)}</span>
                            </div>
                        `}
                    </div>
                    
                    <div class="content-info">
                        <h4>${item.fileName || 'Untitled'}</h4>
                        <div class="content-meta">
                            <span><i class="material-icons">person</i> ${item.userName || item.userId}</span>
                            <span><i class="material-icons">schedule</i> ${this.formatDate(item.uploadedAt)}</span>
                            <span><i class="material-icons">storage</i> ${this.formatFileSize(item.size)}</span>
                        </div>
                        ${item.description ? `<p class="content-description">${item.description}</p>` : ''}
                    </div>
                    
                    <div class="content-status">
                        <span class="material-icons">${statusIcon}</span>
                        <span>${item.status || 'pending'}</span>
                    </div>
                    
                    <div class="content-actions">
                        <button class="btn-icon" onclick="ContentManagement.viewContent('${item.id}')" title="View">
                            <span class="material-icons">visibility</span>
                        </button>
                        <button class="btn-icon" onclick="ContentManagement.downloadContent('${item.id}')" title="Download">
                            <span class="material-icons">download</span>
                        </button>
                        <button class="btn-icon dropdown-trigger" data-dropdown="content-menu-${item.id}">
                            <span class="material-icons">more_vert</span>
                        </button>
                        <div class="dropdown-menu" id="content-menu-${item.id}">
                            <a href="#" onclick="ContentManagement.approveContent('${item.id}')">Approve</a>
                            <a href="#" onclick="ContentManagement.rejectContent('${item.id}')">Reject</a>
                            <a href="#" onclick="ContentManagement.flagContent('${item.id}')">Flag</a>
                            <a href="#" onclick="ContentManagement.editContent('${item.id}')">Edit</a>
                            <a href="#" onclick="ContentManagement.deleteContent('${item.id}')" class="text-danger">Delete</a>
                        </div>
                    </div>
                </div>
            `;
        },
        
        // Setup item event listeners
        setupItemEventListeners() {
            // Checkbox handling
            document.querySelectorAll('.content-item input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const id = e.target.closest('.content-item').dataset.id;
                    if (e.target.checked) {
                        this.selectedItems.add(id);
                    } else {
                        this.selectedItems.delete(id);
                    }
                    this.updateBulkActionsVisibility();
                });
            });
            
            // Dropdown menus
            document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const dropdownId = trigger.dataset.dropdown;
                    this.toggleDropdown(dropdownId);
                });
            });
        },
        
        // View content
        async viewContent(contentId) {
            try {
                const doc = await firebase.firestore()
                    .collection('content')
                    .doc(contentId)
                    .get();
                
                if (!doc.exists) {
                    this.showError('Content not found');
                    return;
                }
                
                const content = doc.data();
                const isImage = content.type?.startsWith('image/');
                
                // Show content viewer modal
                const modal = this.createModal('View Content', `
                    <div class="content-viewer">
                        ${isImage ? `
                            <img src="${content.url}" alt="${content.fileName}" style="max-width: 100%; height: auto;">
                        ` : `
                            <iframe src="${content.url}" style="width: 100%; height: 500px; border: none;"></iframe>
                        `}
                        
                        <div class="content-details">
                            <h3>${content.fileName}</h3>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>Uploaded By:</label>
                                    <span>${content.userName || content.userId}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Upload Date:</label>
                                    <span>${this.formatDate(content.uploadedAt)}</span>
                                </div>
                                <div class="detail-item">
                                    <label>File Size:</label>
                                    <span>${this.formatFileSize(content.size)}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Status:</label>
                                    <span class="status-badge status-${content.status}">${content.status}</span>
                                </div>
                                ${content.description ? `
                                    <div class="detail-item full-width">
                                        <label>Description:</label>
                                        <p>${content.description}</p>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `);
                
                document.body.appendChild(modal);
                
                // Log view action
                await this.logAction('view_content', { contentId, fileName: content.fileName });
                
            } catch (error) {
                console.error('Error viewing content:', error);
                this.showError('Failed to load content');
            }
        },
        
        // Download content
        async downloadContent(contentId) {
            try {
                const doc = await firebase.firestore()
                    .collection('content')
                    .doc(contentId)
                    .get();
                
                if (!doc.exists) {
                    this.showError('Content not found');
                    return;
                }
                
                const content = doc.data();
                
                // Create download link
                const a = document.createElement('a');
                a.href = content.url;
                a.download = content.fileName;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Log download
                await this.logAction('download_content', { contentId, fileName: content.fileName });
                
            } catch (error) {
                console.error('Error downloading content:', error);
                this.showError('Failed to download content');
            }
        },
        
        // Approve content
        async approveContent(contentId) {
            await this.updateContentStatus(contentId, 'approved');
        },
        
        // Reject content
        async rejectContent(contentId) {
            await this.updateContentStatus(contentId, 'rejected');
        },
        
        // Flag content
        async flagContent(contentId) {
            await this.updateContentStatus(contentId, 'flagged');
        },
        
        // Update content status
        async updateContentStatus(contentId, status) {
            try {
                await firebase.firestore()
                    .collection('content')
                    .doc(contentId)
                    .update({
                        status: status,
                        statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        statusUpdatedBy: AdminAuthGuard.getCurrentAdmin().uid
                    });
                
                this.showSuccess(`Content ${status}`);
                await this.loadContent();
                
                // Log action
                await this.logAction(`${status}_content`, { contentId });
                
            } catch (error) {
                console.error('Error updating content status:', error);
                this.showError('Failed to update content status');
            }
        },
        
        // Delete content
        async deleteContent(contentId) {
            if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
                return;
            }
            
            try {
                // Get content details first
                const doc = await firebase.firestore()
                    .collection('content')
                    .doc(contentId)
                    .get();
                
                if (!doc.exists) {
                    this.showError('Content not found');
                    return;
                }
                
                const content = doc.data();
                
                // Delete from storage
                if (content.storagePath) {
                    try {
                        const storageRef = firebase.storage().ref(content.storagePath);
                        await storageRef.delete();
                    } catch (error) {
                        console.error('Error deleting from storage:', error);
                    }
                }
                
                // Delete from Firestore
                await firebase.firestore()
                    .collection('content')
                    .doc(contentId)
                    .delete();
                
                this.showSuccess('Content deleted successfully');
                await this.loadContent();
                
                // Log action
                await this.logAction('delete_content', { 
                    contentId, 
                    fileName: content.fileName,
                    userId: content.userId 
                });
                
            } catch (error) {
                console.error('Error deleting content:', error);
                this.showError('Failed to delete content');
            }
        },
        
        // Bulk update status
        async bulkUpdateStatus(status) {
            if (this.selectedItems.size === 0) {
                this.showError('No items selected');
                return;
            }
            
            const count = this.selectedItems.size;
            if (!confirm(`Are you sure you want to ${status} ${count} items?`)) {
                return;
            }
            
            try {
                const batch = firebase.firestore().batch();
                const admin = AdminAuthGuard.getCurrentAdmin();
                
                for (const contentId of this.selectedItems) {
                    const ref = firebase.firestore().collection('content').doc(contentId);
                    batch.update(ref, {
                        status: status,
                        statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        statusUpdatedBy: admin.uid
                    });
                }
                
                await batch.commit();
                
                this.showSuccess(`${count} items ${status}`);
                this.selectedItems.clear();
                await this.loadContent();
                
                // Log action
                await this.logAction(`bulk_${status}_content`, { count, contentIds: Array.from(this.selectedItems) });
                
            } catch (error) {
                console.error('Error bulk updating status:', error);
                this.showError('Failed to update content status');
            }
        },
        
        // Bulk delete
        async bulkDelete() {
            if (this.selectedItems.size === 0) {
                this.showError('No items selected');
                return;
            }
            
            const count = this.selectedItems.size;
            if (!confirm(`Are you sure you want to delete ${count} items? This action cannot be undone.`)) {
                return;
            }
            
            try {
                // Delete each item
                for (const contentId of this.selectedItems) {
                    await this.deleteContent(contentId);
                }
                
                this.selectedItems.clear();
                this.updateBulkActionsVisibility();
                
            } catch (error) {
                console.error('Error bulk deleting:', error);
                this.showError('Failed to delete some items');
            }
        },
        
        // Load storage stats
        async loadStorageStats() {
            try {
                // Get all content
                const snapshot = await firebase.firestore()
                    .collection('content')
                    .get();
                
                let totalSize = 0;
                const userStorage = new Map();
                const typeBreakdown = new Map();
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const size = data.size || 0;
                    
                    totalSize += size;
                    
                    // User breakdown
                    const currentUserSize = userStorage.get(data.userId) || 0;
                    userStorage.set(data.userId, currentUserSize + size);
                    
                    // Type breakdown
                    const fileType = this.getFileCategory(data.type);
                    const currentTypeSize = typeBreakdown.get(fileType) || 0;
                    typeBreakdown.set(fileType, currentTypeSize + size);
                });
                
                // Update storage stats display
                this.displayStorageStats({
                    total: totalSize,
                    userBreakdown: userStorage,
                    typeBreakdown: typeBreakdown,
                    itemCount: snapshot.size
                });
                
            } catch (error) {
                console.error('Error loading storage stats:', error);
            }
        },
        
        // Display storage stats
        displayStorageStats(stats) {
            // Update total storage
            const totalStorageEl = document.getElementById('totalStorage');
            if (totalStorageEl) {
                totalStorageEl.textContent = this.formatFileSize(stats.total);
            }
            
            // Update item count
            const itemCountEl = document.getElementById('totalItems');
            if (itemCountEl) {
                itemCountEl.textContent = stats.itemCount.toLocaleString();
            }
            
            // Update storage chart if available
            this.updateStorageChart(stats.typeBreakdown);
        },
        
        // Update storage chart
        updateStorageChart(typeBreakdown) {
            const ctx = document.getElementById('storageChart')?.getContext('2d');
            if (!ctx) return;
            
            const labels = [];
            const data = [];
            const colors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0'];
            
            typeBreakdown.forEach((size, type) => {
                labels.push(type);
                data.push(size);
            });
            
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label || '';
                                    const value = this.formatFileSize(context.raw);
                                    return `${label}: ${value}`;
                                }
                            }
                        }
                    }
                }
            });
        },
        
        // Get file category
        getFileCategory(mimeType) {
            if (!mimeType) return 'Other';
            
            if (mimeType.startsWith('image/')) return 'Images';
            if (mimeType.startsWith('video/')) return 'Videos';
            if (mimeType.includes('pdf')) return 'PDFs';
            if (mimeType.includes('word') || mimeType.includes('document')) return 'Documents';
            if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'Spreadsheets';
            
            return 'Other';
        },
        
        // Get file extension
        getFileExtension(fileName) {
            if (!fileName) return '';
            const parts = fileName.split('.');
            return parts.length > 1 ? parts.pop().toUpperCase() : '';
        },
        
        // Format file size
        formatFileSize(bytes) {
            if (!bytes) return '0 B';
            
            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            const k = 1024;
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
        },
        
        // Format date
        formatDate(timestamp) {
            if (!timestamp) return 'N/A';
            
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            // If less than 24 hours, show relative time
            if (diff < 24 * 60 * 60 * 1000) {
                const hours = Math.floor(diff / (60 * 60 * 1000));
                if (hours === 0) {
                    const minutes = Math.floor(diff / (60 * 1000));
                    return minutes === 0 ? 'Just now' : `${minutes}m ago`;
                }
                return `${hours}h ago`;
            }
            
            // Otherwise show date
            return date.toLocaleDateString();
        },
        
        // Update pagination
        updatePagination() {
            const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
            const pagination = document.getElementById('contentPagination');
            if (!pagination) return;
            
            let html = '';
            
            // Previous button
            html += `
                <button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''} 
                        onclick="ContentManagement.goToPage(${this.currentPage - 1})">
                    <span class="material-icons">chevron_left</span>
                </button>
            `;
            
            // Page numbers
            const maxPages = 5;
            let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
            let endPage = Math.min(totalPages, startPage + maxPages - 1);
            
            if (endPage - startPage < maxPages - 1) {
                startPage = Math.max(1, endPage - maxPages + 1);
            }
            
            if (startPage > 1) {
                html += `<button class="page-btn" onclick="ContentManagement.goToPage(1)">1</button>`;
                if (startPage > 2) html += `<span class="page-ellipsis">...</span>`;
            }
            
            for (let i = startPage; i <= endPage; i++) {
                html += `
                    <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                            onclick="ContentManagement.goToPage(${i})">${i}</button>
                `;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) html += `<span class="page-ellipsis">...</span>`;
                html += `<button class="page-btn" onclick="ContentManagement.goToPage(${totalPages})">${totalPages}</button>`;
            }
            
            // Next button
            html += `
                <button class="page-btn" ${this.currentPage === totalPages ? 'disabled' : ''} 
                        onclick="ContentManagement.goToPage(${this.currentPage + 1})">
                    <span class="material-icons">chevron_right</span>
                </button>
            `;
            
            pagination.innerHTML = html;
            
            // Update info
            const info = document.getElementById('contentPaginationInfo');
            if (info) {
                const start = (this.currentPage - 1) * this.itemsPerPage + 1;
                const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
                info.textContent = `Showing ${start}-${end} of ${this.totalItems} items`;
            }
        },
        
        // Go to page
        goToPage(page) {
            this.currentPage = page;
            this.loadContent();
        },
        
        // Select all visible
        selectAllVisible() {
            document.querySelectorAll('.content-item').forEach(item => {
                const id = item.dataset.id;
                this.selectedItems.add(id);
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox) checkbox.checked = true;
            });
            this.updateBulkActionsVisibility();
        },
        
        // Deselect all
        deselectAll() {
            this.selectedItems.clear();
            document.querySelectorAll('.content-item input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            this.updateBulkActionsVisibility();
        },
        
        // Update bulk actions visibility
        updateBulkActionsVisibility() {
            const bulkActions = document.getElementById('bulkActions');
            if (bulkActions) {
                bulkActions.style.display = this.selectedItems.size > 0 ? 'flex' : 'none';
            }
            
            const selectedCount = document.getElementById('selectedCount');
            if (selectedCount) {
                selectedCount.textContent = `${this.selectedItems.size} selected`;
            }
        },
        
        // Setup realtime listeners
        setupRealtimeListeners() {
            // Listen for new content
            this.contentListener = firebase.firestore()
                .collection('content')
                .orderBy('uploadedAt', 'desc')
                .limit(1)
                .onSnapshot((snapshot) => {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'added' && this.initialized) {
                            // Refresh content list
                            this.loadContent();
                            // Update storage stats
                            this.loadStorageStats();
                        }
                    });
                });
        },
        
        // Create modal helper
        createModal(title, content) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h2>${title}</h2>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            `;
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            return modal;
        },
        
        // Toggle dropdown
        toggleDropdown(dropdownId) {
            const dropdown = document.getElementById(dropdownId);
            if (!dropdown) return;
            
            // Close all other dropdowns
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                if (menu.id !== dropdownId) {
                    menu.classList.remove('show');
                }
            });
            
            dropdown.classList.toggle('show');
            
            // Close on outside click
            const closeDropdown = (e) => {
                if (!dropdown.contains(e.target) && !e.target.closest('.dropdown-trigger')) {
                    dropdown.classList.remove('show');
                    document.removeEventListener('click', closeDropdown);
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', closeDropdown);
            }, 0);
        },
        
        // Log action
        async logAction(action, details) {
            try {
                await firebase.firestore().collection('admin_logs').add({
                    action: action,
                    module: 'content',
                    adminId: AdminAuthGuard.getCurrentAdmin().uid,
                    adminEmail: AdminAuthGuard.getCurrentAdmin().email,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    details: details
                });
            } catch (error) {
                console.error('Error logging action:', error);
            }
        },
        
        // Show loading
        showLoading(show) {
            const loader = document.getElementById('contentLoader');
            if (loader) {
                loader.style.display = show ? 'flex' : 'none';
            }
        },
        
        // Show success message
        showSuccess(message) {
            if (window.showSuccess) {
                window.showSuccess(message);
            }
        },
        
        // Show error message
        showError(message) {
            if (window.showError) {
                window.showError(message);
            }
        },
        
        // Cleanup
        destroy() {
            if (this.contentListener) {
                this.contentListener();
            }
        }
    };
    
    // Export for use
    window.ContentManagement = ContentManagement;
})();