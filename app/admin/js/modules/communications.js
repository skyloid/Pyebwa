// Communications Module
(function() {
    'use strict';
    
    const CommunicationsModule = {
        // Module properties
        currentView: 'announcements',
        selectedRecipients: new Set(),
        currentAnnouncement: null,
        filters: {
            status: 'all',
            type: 'all',
            dateRange: 'all',
            search: ''
        },
        currentPage: 1,
        itemsPerPage: 20,
        totalItems: 0,
        
        // Initialize module
        async init() {
            console.log('Initializing communications module');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadAnnouncements();
            
            // Setup real-time listeners
            this.setupRealtimeListeners();
            
            // Load communication stats
            await this.loadCommunicationStats();
        },
        
        // Setup event listeners
        setupEventListeners() {
            // Tab navigation
            document.querySelectorAll('.comm-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const view = tab.dataset.view;
                    this.switchView(view);
                });
            });
            
            // Create announcement button
            const createBtn = document.getElementById('createAnnouncement');
            if (createBtn) {
                createBtn.addEventListener('click', () => this.showCreateAnnouncementModal());
            }
            
            // Search
            const searchInput = document.getElementById('commSearch');
            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.filters.search = e.target.value;
                        this.loadAnnouncements();
                    }, 300);
                });
            }
            
            // Filters
            this.setupFilters();
        },
        
        // Setup filters
        setupFilters() {
            // Status filter
            const statusFilter = document.getElementById('commStatusFilter');
            if (statusFilter) {
                statusFilter.addEventListener('change', (e) => {
                    this.filters.status = e.target.value;
                    this.loadAnnouncements();
                });
            }
            
            // Type filter
            const typeFilter = document.getElementById('commTypeFilter');
            if (typeFilter) {
                typeFilter.addEventListener('change', (e) => {
                    this.filters.type = e.target.value;
                    this.loadAnnouncements();
                });
            }
            
            // Date range filter
            const dateFilter = document.getElementById('commDateFilter');
            if (dateFilter) {
                dateFilter.addEventListener('change', (e) => {
                    this.filters.dateRange = e.target.value;
                    this.loadAnnouncements();
                });
            }
        },
        
        // Switch view
        switchView(view) {
            this.currentView = view;
            
            // Update tab active state
            document.querySelectorAll('.comm-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.view === view);
            });
            
            // Show/hide views
            document.querySelectorAll('.comm-view').forEach(v => {
                v.style.display = v.dataset.view === view ? 'block' : 'none';
            });
            
            // Load view data
            switch (view) {
                case 'announcements':
                    this.loadAnnouncements();
                    break;
                case 'templates':
                    this.loadTemplates();
                    break;
                case 'scheduled':
                    this.loadScheduledMessages();
                    break;
                case 'analytics':
                    this.loadCommunicationAnalytics();
                    break;
            }
        },
        
        // Load announcements
        async loadAnnouncements() {
            try {
                this.showLoading(true);
                
                // Build query
                let query = firebase.firestore()
                    .collection('announcements')
                    .orderBy('createdAt', 'desc');
                
                // Apply filters
                if (this.filters.status !== 'all') {
                    query = query.where('status', '==', this.filters.status);
                }
                
                if (this.filters.type !== 'all') {
                    query = query.where('type', '==', this.filters.type);
                }
                
                // Apply date range
                const dateRange = this.getDateRange();
                if (dateRange.start) {
                    query = query.where('createdAt', '>=', dateRange.start);
                }
                
                // Get announcements
                const snapshot = await query.get();
                let announcements = [];
                
                snapshot.forEach(doc => {
                    announcements.push({ id: doc.id, ...doc.data() });
                });
                
                // Apply search filter (client-side)
                if (this.filters.search) {
                    const searchLower = this.filters.search.toLowerCase();
                    announcements = announcements.filter(ann => 
                        ann.title?.toLowerCase().includes(searchLower) ||
                        ann.content?.toLowerCase().includes(searchLower)
                    );
                }
                
                this.totalItems = announcements.length;
                
                // Paginate
                const startIndex = (this.currentPage - 1) * this.itemsPerPage;
                const paginatedItems = announcements.slice(startIndex, startIndex + this.itemsPerPage);
                
                // Display announcements
                this.displayAnnouncements(paginatedItems);
                
                // Update pagination
                this.updatePagination();
                
            } catch (error) {
                console.error('Error loading announcements:', error);
                this.showError('Failed to load announcements');
            } finally {
                this.showLoading(false);
            }
        },
        
        // Display announcements
        displayAnnouncements(announcements) {
            const container = document.getElementById('announcementsList');
            if (!container) return;
            
            if (announcements.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="material-icons">campaign</span>
                        <h3>No announcements found</h3>
                        <p>Create your first announcement to communicate with users</p>
                        <button class="btn btn-primary" onclick="CommunicationsModule.showCreateAnnouncementModal()">
                            <span class="material-icons">add</span>
                            Create Announcement
                        </button>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = announcements.map(ann => this.renderAnnouncementCard(ann)).join('');
            
            // Setup card event listeners
            this.setupCardEventListeners();
        },
        
        // Render announcement card
        renderAnnouncementCard(announcement) {
            const statusIcon = {
                draft: 'edit',
                published: 'check_circle',
                scheduled: 'schedule',
                archived: 'archive'
            }[announcement.status || 'draft'];
            
            const typeIcon = {
                general: 'campaign',
                update: 'update',
                maintenance: 'engineering',
                feature: 'new_releases',
                security: 'security'
            }[announcement.type || 'general'];
            
            const recipientText = this.getRecipientText(announcement.recipients);
            
            return `
                <div class="announcement-card status-${announcement.status}" data-id="${announcement.id}">
                    <div class="announcement-header">
                        <div class="announcement-type">
                            <span class="material-icons">${typeIcon}</span>
                            <span>${announcement.type || 'general'}</span>
                        </div>
                        <div class="announcement-status">
                            <span class="material-icons">${statusIcon}</span>
                            <span>${announcement.status || 'draft'}</span>
                        </div>
                    </div>
                    
                    <div class="announcement-content">
                        <h3>${announcement.title}</h3>
                        <p>${this.truncateText(announcement.content, 150)}</p>
                        
                        <div class="announcement-meta">
                            <span><i class="material-icons">people</i> ${recipientText}</span>
                            <span><i class="material-icons">schedule</i> ${this.formatDate(announcement.createdAt)}</span>
                            ${announcement.sentAt ? `<span><i class="material-icons">send</i> Sent ${this.formatDate(announcement.sentAt)}</span>` : ''}
                        </div>
                        
                        ${announcement.stats ? `
                            <div class="announcement-stats">
                                <span><i class="material-icons">visibility</i> ${announcement.stats.views || 0} views</span>
                                <span><i class="material-icons">touch_app</i> ${announcement.stats.clicks || 0} clicks</span>
                                <span><i class="material-icons">percent</i> ${this.calculateEngagementRate(announcement.stats)}% engagement</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="announcement-actions">
                        <button class="btn-icon" onclick="CommunicationsModule.viewAnnouncement('${announcement.id}')" title="View">
                            <span class="material-icons">visibility</span>
                        </button>
                        ${announcement.status === 'draft' ? `
                            <button class="btn-icon" onclick="CommunicationsModule.editAnnouncement('${announcement.id}')" title="Edit">
                                <span class="material-icons">edit</span>
                            </button>
                        ` : ''}
                        ${announcement.status === 'draft' || announcement.status === 'scheduled' ? `
                            <button class="btn-icon" onclick="CommunicationsModule.sendAnnouncement('${announcement.id}')" title="Send">
                                <span class="material-icons">send</span>
                            </button>
                        ` : ''}
                        <button class="btn-icon dropdown-trigger" data-dropdown="ann-menu-${announcement.id}">
                            <span class="material-icons">more_vert</span>
                        </button>
                        <div class="dropdown-menu" id="ann-menu-${announcement.id}">
                            <a href="#" onclick="CommunicationsModule.duplicateAnnouncement('${announcement.id}')">Duplicate</a>
                            ${announcement.status === 'published' ? `
                                <a href="#" onclick="CommunicationsModule.archiveAnnouncement('${announcement.id}')">Archive</a>
                            ` : ''}
                            ${announcement.status === 'draft' ? `
                                <a href="#" onclick="CommunicationsModule.deleteAnnouncement('${announcement.id}')" class="text-danger">Delete</a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        },
        
        // Show create announcement modal
        showCreateAnnouncementModal() {
            const modal = this.createModal('Create Announcement', `
                <form id="createAnnouncementForm">
                    <div class="form-group">
                        <label>Title *</label>
                        <input type="text" id="annTitle" class="form-control" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Type</label>
                        <select id="annType" class="form-control">
                            <option value="general">General Announcement</option>
                            <option value="update">Product Update</option>
                            <option value="maintenance">Maintenance Notice</option>
                            <option value="feature">New Feature</option>
                            <option value="security">Security Alert</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Content *</label>
                        <textarea id="annContent" class="form-control" rows="6" required></textarea>
                        <small class="form-text">Supports basic HTML formatting</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Recipients</label>
                        <div class="recipient-options">
                            <label class="radio-option">
                                <input type="radio" name="recipients" value="all" checked>
                                <span>All Users</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="recipients" value="active">
                                <span>Active Users (last 30 days)</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="recipients" value="new">
                                <span>New Users (joined last 7 days)</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="recipients" value="custom">
                                <span>Custom Selection</span>
                            </label>
                        </div>
                        <div id="customRecipients" style="display: none; margin-top: 1rem;">
                            <input type="text" id="recipientSearch" class="form-control" placeholder="Search users by email or name...">
                            <div id="recipientsList" class="recipients-list"></div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Schedule</label>
                        <div class="schedule-options">
                            <label class="radio-option">
                                <input type="radio" name="schedule" value="now" checked>
                                <span>Send immediately</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="schedule" value="later">
                                <span>Schedule for later</span>
                            </label>
                        </div>
                        <div id="scheduleDateTime" style="display: none; margin-top: 1rem;">
                            <input type="datetime-local" id="scheduleTime" class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Options</label>
                        <label class="checkbox-option">
                            <input type="checkbox" id="annPushNotification" checked>
                            <span>Send push notification</span>
                        </label>
                        <label class="checkbox-option">
                            <input type="checkbox" id="annEmail">
                            <span>Send email notification</span>
                        </label>
                        <label class="checkbox-option">
                            <input type="checkbox" id="annPinned">
                            <span>Pin to top of announcements</span>
                        </label>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <span class="material-icons">save</span>
                            Save as Draft
                        </button>
                        <button type="button" class="btn btn-primary" onclick="CommunicationsModule.createAndSendAnnouncement()">
                            <span class="material-icons">send</span>
                            Save & Send
                        </button>
                    </div>
                </form>
            `);
            
            document.body.appendChild(modal);
            
            // Setup form event listeners
            this.setupAnnouncementFormListeners();
        },
        
        // Setup announcement form listeners
        setupAnnouncementFormListeners() {
            // Recipients radio change
            document.querySelectorAll('input[name="recipients"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const customDiv = document.getElementById('customRecipients');
                    customDiv.style.display = e.target.value === 'custom' ? 'block' : 'none';
                    if (e.target.value === 'custom') {
                        this.loadUsersList();
                    }
                });
            });
            
            // Schedule radio change
            document.querySelectorAll('input[name="schedule"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const scheduleDiv = document.getElementById('scheduleDateTime');
                    scheduleDiv.style.display = e.target.value === 'later' ? 'block' : 'none';
                });
            });
            
            // Form submit
            const form = document.getElementById('createAnnouncementForm');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveAnnouncement('draft');
                });
            }
            
            // Recipient search
            const recipientSearch = document.getElementById('recipientSearch');
            if (recipientSearch) {
                recipientSearch.addEventListener('input', (e) => {
                    this.filterRecipientsList(e.target.value);
                });
            }
        },
        
        // Save announcement
        async saveAnnouncement(status = 'draft') {
            try {
                const title = document.getElementById('annTitle').value;
                const type = document.getElementById('annType').value;
                const content = document.getElementById('annContent').value;
                const recipientsType = document.querySelector('input[name="recipients"]:checked').value;
                const scheduleType = document.querySelector('input[name="schedule"]:checked').value;
                const pushNotification = document.getElementById('annPushNotification').checked;
                const email = document.getElementById('annEmail').checked;
                const pinned = document.getElementById('annPinned').checked;
                
                if (!title || !content) {
                    this.showError('Please fill in all required fields');
                    return;
                }
                
                const announcementData = {
                    title,
                    type,
                    content,
                    status,
                    recipients: {
                        type: recipientsType,
                        userIds: recipientsType === 'custom' ? Array.from(this.selectedRecipients) : []
                    },
                    options: {
                        pushNotification,
                        email,
                        pinned
                    },
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: AdminAuthGuard.getCurrentAdmin().uid,
                    createdByEmail: AdminAuthGuard.getCurrentAdmin().email
                };
                
                // Add schedule info if needed
                if (scheduleType === 'later' && status !== 'published') {
                    const scheduleTime = document.getElementById('scheduleTime').value;
                    if (scheduleTime) {
                        announcementData.scheduledFor = new Date(scheduleTime);
                        announcementData.status = 'scheduled';
                    }
                }
                
                // Save to Firestore
                const docRef = await firebase.firestore()
                    .collection('announcements')
                    .add(announcementData);
                
                this.showSuccess(`Announcement ${status === 'draft' ? 'saved as draft' : 'created'}`);
                
                // Close modal
                document.querySelector('.modal-overlay')?.remove();
                
                // Reload announcements
                await this.loadAnnouncements();
                
                // Log action
                await this.logAction('create_announcement', { 
                    announcementId: docRef.id, 
                    title, 
                    status 
                });
                
                // If status is published, send it
                if (status === 'published') {
                    await this.sendAnnouncementToUsers(docRef.id, announcementData);
                }
                
            } catch (error) {
                console.error('Error saving announcement:', error);
                this.showError('Failed to save announcement');
            }
        },
        
        // Create and send announcement
        async createAndSendAnnouncement() {
            await this.saveAnnouncement('published');
        },
        
        // Send announcement
        async sendAnnouncement(announcementId) {
            if (!confirm('Are you sure you want to send this announcement now?')) {
                return;
            }
            
            try {
                // Get announcement data
                const doc = await firebase.firestore()
                    .collection('announcements')
                    .doc(announcementId)
                    .get();
                
                if (!doc.exists) {
                    this.showError('Announcement not found');
                    return;
                }
                
                const announcement = doc.data();
                
                // Update status to published
                await firebase.firestore()
                    .collection('announcements')
                    .doc(announcementId)
                    .update({
                        status: 'published',
                        sentAt: firebase.firestore.FieldValue.serverTimestamp(),
                        sentBy: AdminAuthGuard.getCurrentAdmin().uid
                    });
                
                // Send to users
                await this.sendAnnouncementToUsers(announcementId, announcement);
                
                this.showSuccess('Announcement sent successfully');
                await this.loadAnnouncements();
                
                // Log action
                await this.logAction('send_announcement', { 
                    announcementId, 
                    title: announcement.title 
                });
                
            } catch (error) {
                console.error('Error sending announcement:', error);
                this.showError('Failed to send announcement');
            }
        },
        
        // Send announcement to users
        async sendAnnouncementToUsers(announcementId, announcement) {
            try {
                // Get target users based on recipients
                const users = await this.getTargetUsers(announcement.recipients);
                
                // Create notification for each user
                const batch = firebase.firestore().batch();
                const timestamp = firebase.firestore.FieldValue.serverTimestamp();
                
                users.forEach(user => {
                    const notificationRef = firebase.firestore()
                        .collection('users')
                        .doc(user.id)
                        .collection('notifications')
                        .doc();
                    
                    batch.set(notificationRef, {
                        type: 'announcement',
                        announcementId: announcementId,
                        title: announcement.title,
                        content: announcement.content,
                        read: false,
                        createdAt: timestamp,
                        priority: announcement.type === 'security' ? 'high' : 'normal'
                    });
                });
                
                await batch.commit();
                
                // Update announcement stats
                await firebase.firestore()
                    .collection('announcements')
                    .doc(announcementId)
                    .update({
                        'stats.sent': users.length,
                        'stats.views': 0,
                        'stats.clicks': 0
                    });
                
                // Send push notifications and emails via API
                if (announcement.options.pushNotification || announcement.options.email) {
                    await this.sendViaAPI(announcementId);
                }
                
            } catch (error) {
                console.error('Error sending to users:', error);
                throw error;
            }
        },
        
        // Send notifications via API
        async sendViaAPI(announcementId) {
            try {
                const user = firebase.auth().currentUser;
                if (!user) {
                    console.error('No authenticated user');
                    return;
                }
                
                // Get ID token
                const idToken = await user.getIdToken();
                
                // Call API endpoint
                const response = await fetch('/api/notifications/send-announcement', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ announcementId })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to send notifications');
                }
                
                const result = await response.json();
                console.log('Notification send results:', result);
                
                // Show results to admin
                if (result.results) {
                    let message = `Sent to ${result.results.totalRecipients} users.\n`;
                    
                    if (result.results.notifications) {
                        message += `Push: ${result.results.notifications.success} sent, ${result.results.notifications.failure} failed.\n`;
                    }
                    
                    if (result.results.emails) {
                        message += `Email: ${result.results.emails.success || 0} sent, ${result.results.emails.failure || 0} failed.`;
                    }
                    
                    this.showSuccess(message);
                }
                
            } catch (error) {
                console.error('Error calling notification API:', error);
                this.showError('Failed to send some notifications. Check console for details.');
            }
        },
        
        // Get target users based on recipients
        async getTargetUsers(recipients) {
            let query = firebase.firestore().collection('users');
            const users = [];
            
            switch (recipients.type) {
                case 'all':
                    // Get all users
                    const allSnapshot = await query.get();
                    allSnapshot.forEach(doc => {
                        users.push({ id: doc.id, ...doc.data() });
                    });
                    break;
                    
                case 'active':
                    // Get users active in last 30 days
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    const activeSnapshot = await query
                        .where('lastActive', '>=', thirtyDaysAgo)
                        .get();
                    activeSnapshot.forEach(doc => {
                        users.push({ id: doc.id, ...doc.data() });
                    });
                    break;
                    
                case 'new':
                    // Get users joined in last 7 days
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    const newSnapshot = await query
                        .where('createdAt', '>=', sevenDaysAgo)
                        .get();
                    newSnapshot.forEach(doc => {
                        users.push({ id: doc.id, ...doc.data() });
                    });
                    break;
                    
                case 'custom':
                    // Get specific users
                    if (recipients.userIds && recipients.userIds.length > 0) {
                        for (const userId of recipients.userIds) {
                            const userDoc = await firebase.firestore()
                                .collection('users')
                                .doc(userId)
                                .get();
                            if (userDoc.exists) {
                                users.push({ id: userDoc.id, ...userDoc.data() });
                            }
                        }
                    }
                    break;
            }
            
            return users;
        },
        
        // View announcement
        async viewAnnouncement(announcementId) {
            try {
                const doc = await firebase.firestore()
                    .collection('announcements')
                    .doc(announcementId)
                    .get();
                
                if (!doc.exists) {
                    this.showError('Announcement not found');
                    return;
                }
                
                const announcement = doc.data();
                
                const modal = this.createModal('View Announcement', `
                    <div class="announcement-details">
                        <div class="detail-header">
                            <h2>${announcement.title}</h2>
                            <div class="detail-meta">
                                <span class="status-badge status-${announcement.status}">${announcement.status}</span>
                                <span class="type-badge type-${announcement.type}">${announcement.type}</span>
                            </div>
                        </div>
                        
                        <div class="detail-content">
                            ${announcement.content}
                        </div>
                        
                        <div class="detail-info">
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Created By:</label>
                                    <span>${announcement.createdByEmail || 'Unknown'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Created At:</label>
                                    <span>${this.formatDate(announcement.createdAt)}</span>
                                </div>
                                ${announcement.sentAt ? `
                                    <div class="info-item">
                                        <label>Sent At:</label>
                                        <span>${this.formatDate(announcement.sentAt)}</span>
                                    </div>
                                ` : ''}
                                <div class="info-item">
                                    <label>Recipients:</label>
                                    <span>${this.getRecipientText(announcement.recipients)}</span>
                                </div>
                            </div>
                        </div>
                        
                        ${announcement.stats ? `
                            <div class="announcement-analytics">
                                <h3>Performance Analytics</h3>
                                <div class="analytics-grid">
                                    <div class="analytics-card">
                                        <span class="analytics-value">${announcement.stats.sent || 0}</span>
                                        <span class="analytics-label">Sent To</span>
                                    </div>
                                    <div class="analytics-card">
                                        <span class="analytics-value">${announcement.stats.views || 0}</span>
                                        <span class="analytics-label">Views</span>
                                    </div>
                                    <div class="analytics-card">
                                        <span class="analytics-value">${announcement.stats.clicks || 0}</span>
                                        <span class="analytics-label">Clicks</span>
                                    </div>
                                    <div class="analytics-card">
                                        <span class="analytics-value">${this.calculateEngagementRate(announcement.stats)}%</span>
                                        <span class="analytics-label">Engagement Rate</span>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `);
                
                document.body.appendChild(modal);
                
            } catch (error) {
                console.error('Error viewing announcement:', error);
                this.showError('Failed to load announcement');
            }
        },
        
        // Load communication stats
        async loadCommunicationStats() {
            try {
                const stats = {
                    totalAnnouncements: 0,
                    totalSent: 0,
                    totalViews: 0,
                    avgEngagement: 0
                };
                
                // Get all announcements
                const snapshot = await firebase.firestore()
                    .collection('announcements')
                    .where('status', '==', 'published')
                    .get();
                
                let totalEngagement = 0;
                let announcementsWithStats = 0;
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    stats.totalAnnouncements++;
                    
                    if (data.stats) {
                        stats.totalSent += data.stats.sent || 0;
                        stats.totalViews += data.stats.views || 0;
                        
                        const engagement = this.calculateEngagementRate(data.stats);
                        if (engagement > 0) {
                            totalEngagement += engagement;
                            announcementsWithStats++;
                        }
                    }
                });
                
                if (announcementsWithStats > 0) {
                    stats.avgEngagement = Math.round(totalEngagement / announcementsWithStats);
                }
                
                // Update stats display
                this.displayCommunicationStats(stats);
                
            } catch (error) {
                console.error('Error loading communication stats:', error);
            }
        },
        
        // Display communication stats
        displayCommunicationStats(stats) {
            // Update stat cards
            const totalSentEl = document.getElementById('totalSent');
            if (totalSentEl) totalSentEl.textContent = stats.totalSent.toLocaleString();
            
            const totalViewsEl = document.getElementById('totalViews');
            if (totalViewsEl) totalViewsEl.textContent = stats.totalViews.toLocaleString();
            
            const avgEngagementEl = document.getElementById('avgEngagement');
            if (avgEngagementEl) avgEngagementEl.textContent = `${stats.avgEngagement}%`;
        },
        
        // Calculate engagement rate
        calculateEngagementRate(stats) {
            if (!stats || !stats.sent || stats.sent === 0) return 0;
            const engagement = ((stats.views || 0) / stats.sent) * 100;
            return Math.round(engagement);
        },
        
        // Get recipient text
        getRecipientText(recipients) {
            if (!recipients) return 'Unknown';
            
            switch (recipients.type) {
                case 'all':
                    return 'All Users';
                case 'active':
                    return 'Active Users';
                case 'new':
                    return 'New Users';
                case 'custom':
                    return `${recipients.userIds?.length || 0} Selected Users`;
                default:
                    return recipients.type;
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
        
        // Truncate text
        truncateText(text, length) {
            if (!text || text.length <= length) return text;
            return text.substring(0, length) + '...';
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
            const pagination = document.getElementById('commPagination');
            if (!pagination) return;
            
            let html = '';
            
            // Previous button
            html += `
                <button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''} 
                        onclick="CommunicationsModule.goToPage(${this.currentPage - 1})">
                    <span class="material-icons">chevron_left</span>
                </button>
            `;
            
            // Page numbers
            const maxPages = 5;
            let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
            let endPage = Math.min(totalPages, startPage + maxPages - 1);
            
            for (let i = startPage; i <= endPage; i++) {
                html += `
                    <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                            onclick="CommunicationsModule.goToPage(${i})">${i}</button>
                `;
            }
            
            // Next button
            html += `
                <button class="page-btn" ${this.currentPage === totalPages ? 'disabled' : ''} 
                        onclick="CommunicationsModule.goToPage(${this.currentPage + 1})">
                    <span class="material-icons">chevron_right</span>
                </button>
            `;
            
            pagination.innerHTML = html;
        },
        
        // Go to page
        goToPage(page) {
            this.currentPage = page;
            this.loadAnnouncements();
        },
        
        // Setup realtime listeners
        setupRealtimeListeners() {
            // Listen for announcement updates
            this.announcementListener = firebase.firestore()
                .collection('announcements')
                .orderBy('createdAt', 'desc')
                .limit(10)
                .onSnapshot((snapshot) => {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'added' && this.initialized) {
                            // Refresh announcements list
                            this.loadAnnouncements();
                        }
                    });
                });
        },
        
        // Create modal helper
        createModal(title, content) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal large-modal">
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
        
        // Setup card event listeners
        setupCardEventListeners() {
            // Dropdown menus
            document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const dropdownId = trigger.dataset.dropdown;
                    this.toggleDropdown(dropdownId);
                });
            });
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
                    module: 'communications',
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
            const loader = document.getElementById('commLoader');
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
            if (this.announcementListener) {
                this.announcementListener();
            }
        }
    };
    
    // Export for use
    window.CommunicationsModule = CommunicationsModule;
})();