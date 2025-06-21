// Admin Dashboard Main Controller
(function() {
    'use strict';
    
    console.log('[AdminDashboard] Initializing admin dashboard');
    
    class AdminDashboard {
        constructor() {
            this.db = firebase.firestore();
            this.storage = firebase.storage();
            this.initialized = false;
            this.stats = {
                users: 0,
                trees: 0,
                members: 0,
                photos: 0
            };
        }
        
        // Initialize dashboard
        async initialize() {
            if (this.initialized) return;
            
            try {
                console.log('[AdminDashboard] Starting initialization...');
                
                // Hide loading screen
                this.hideLoadingScreen();
                
                // Update admin info in header
                this.updateAdminInfo();
                
                // Load dashboard statistics
                await this.loadDashboardStats();
                
                // Load recent activity
                await this.loadRecentActivity();
                
                // Initialize user management
                if (window.adminUserManagement) {
                    await window.adminUserManagement.initialize();
                }
                
                // Initialize other modules based on current section
                this.initializeCurrentSection();
                
                this.initialized = true;
                console.log('[AdminDashboard] Initialization complete');
                
            } catch (error) {
                console.error('[AdminDashboard] Initialization error:', error);
                this.showError('Failed to initialize dashboard');
            }
        }
        
        // Hide loading screen
        hideLoadingScreen() {
            const loadingScreen = document.getElementById('adminLoadingScreen');
            if (loadingScreen) {
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                }, 500);
            }
        }
        
        // Update admin info in header
        updateAdminInfo() {
            const adminUser = window.adminAuthGuard.getAdminUser();
            if (!adminUser) return;
            
            const usernameEl = document.getElementById('adminUsername');
            const roleEl = document.getElementById('adminRole');
            
            if (usernameEl) {
                usernameEl.textContent = adminUser.displayName || adminUser.email.split('@')[0];
            }
            
            if (roleEl) {
                roleEl.textContent = this.formatRole(adminUser.role);
            }
        }
        
        // Load dashboard statistics
        async loadDashboardStats() {
            try {
                console.log('[AdminDashboard] Loading statistics...');
                
                // Get total users
                const usersSnapshot = await this.db.collection('users').get();
                this.stats.users = usersSnapshot.size;
                this.updateStatCard('totalUsers', this.stats.users);
                
                // Get total family trees
                const treesSnapshot = await this.db.collection('familyTrees').get();
                this.stats.trees = treesSnapshot.size;
                this.updateStatCard('totalTrees', this.stats.trees);
                
                // Get total members across all trees
                let totalMembers = 0;
                const memberPromises = [];
                
                treesSnapshot.forEach(treeDoc => {
                    memberPromises.push(
                        this.db.collection('familyTrees')
                            .doc(treeDoc.id)
                            .collection('members')
                            .get()
                    );
                });
                
                const memberSnapshots = await Promise.all(memberPromises);
                memberSnapshots.forEach(snapshot => {
                    totalMembers += snapshot.size;
                });
                
                this.stats.members = totalMembers;
                this.updateStatCard('totalMembers', this.stats.members);
                
                // Estimate photos (count members with photoUrl)
                let photosCount = 0;
                memberSnapshots.forEach(snapshot => {
                    snapshot.forEach(doc => {
                        if (doc.data().photoUrl) photosCount++;
                    });
                });
                
                this.stats.photos = photosCount;
                this.updateStatCard('totalPhotos', this.stats.photos);
                
                console.log('[AdminDashboard] Statistics loaded:', this.stats);
                
            } catch (error) {
                console.error('[AdminDashboard] Error loading stats:', error);
            }
        }
        
        // Update stat card
        updateStatCard(elementId, value) {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = this.formatNumber(value);
            }
        }
        
        // Load recent activity
        async loadRecentActivity() {
            try {
                const activityContainer = document.getElementById('recentActivity');
                if (!activityContainer) return;
                
                // Get recent user registrations
                const recentUsers = await this.db.collection('users')
                    .orderBy('createdAt', 'desc')
                    .limit(10)
                    .get();
                
                // Get recent tree creations
                const recentTrees = await this.db.collection('familyTrees')
                    .orderBy('createdAt', 'desc')
                    .limit(10)
                    .get();
                
                // Combine and sort activities
                const activities = [];
                
                recentUsers.forEach(doc => {
                    const user = doc.data();
                    activities.push({
                        type: 'user_registered',
                        title: `New user registered`,
                        description: user.email,
                        timestamp: user.createdAt,
                        icon: 'person_add'
                    });
                });
                
                recentTrees.forEach(doc => {
                    const tree = doc.data();
                    activities.push({
                        type: 'tree_created',
                        title: `Family tree created`,
                        description: tree.name,
                        timestamp: tree.createdAt,
                        icon: 'account_tree'
                    });
                });
                
                // Sort by timestamp
                activities.sort((a, b) => {
                    const timeA = a.timestamp?.toMillis() || 0;
                    const timeB = b.timestamp?.toMillis() || 0;
                    return timeB - timeA;
                });
                
                // Render activities
                if (activities.length === 0) {
                    activityContainer.innerHTML = '<p class="no-data">No recent activity</p>';
                } else {
                    activityContainer.innerHTML = activities.slice(0, 10).map(activity => `
                        <div class="activity-item">
                            <div class="activity-icon">
                                <span class="material-icons">${activity.icon}</span>
                            </div>
                            <div class="activity-content">
                                <div class="activity-title">${activity.title}</div>
                                <div class="activity-description">${this.escapeHtml(activity.description)}</div>
                                <div class="activity-time">${this.formatRelativeTime(activity.timestamp)}</div>
                            </div>
                        </div>
                    `).join('');
                }
                
            } catch (error) {
                console.error('[AdminDashboard] Error loading activity:', error);
                const activityContainer = document.getElementById('recentActivity');
                if (activityContainer) {
                    activityContainer.innerHTML = '<p class="error-text">Failed to load activity</p>';
                }
            }
        }
        
        // Initialize current section based on URL hash
        initializeCurrentSection() {
            const hash = window.location.hash.substring(1);
            
            switch (hash) {
                case 'users':
                    if (window.adminUserManagement) {
                        window.adminUserManagement.initialize();
                    }
                    break;
                case 'trees':
                    if (window.adminTreeManagement) {
                        window.adminTreeManagement.initialize();
                    }
                    break;
                case 'analytics':
                    if (window.adminAnalytics) {
                        window.adminAnalytics.initialize();
                    }
                    break;
                case 'logs':
                    if (window.adminActivityLogs) {
                        window.adminActivityLogs.initialize();
                    }
                    break;
            }
        }
        
        // Utility functions
        formatNumber(num) {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            } else if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
        }
        
        formatRole(role) {
            const roleMap = {
                'superadmin': 'Super Administrator',
                'admin': 'Administrator',
                'user': 'User'
            };
            return roleMap[role] || 'User';
        }
        
        formatRelativeTime(timestamp) {
            if (!timestamp) return 'Unknown';
            
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return 'Just now';
            if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
            
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        showError(message) {
            // TODO: Implement toast notifications
            console.error('[AdminDashboard]', message);
            alert(message);
        }
    }
    
    // Create global instance
    window.adminDashboard = new AdminDashboard();
    
    // Listen for admin auth success
    window.addEventListener('adminAuthSuccess', () => {
        console.log('[AdminDashboard] Admin authenticated, initializing dashboard...');
        window.adminDashboard.initialize();
    });
    
})();