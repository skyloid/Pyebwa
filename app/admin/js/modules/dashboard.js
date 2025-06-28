// Admin Dashboard Module
(function() {
    'use strict';
    
    const AdminDashboard = {
        charts: {},
        stats: {},
        refreshInterval: null,
        
        // Initialize dashboard
        init() {
            this.attachEventListeners();
            this.loadDashboardData();
            this.setupAutoRefresh();
        },
        
        // Attach event listeners
        attachEventListeners() {
            // Refresh button
            document.getElementById('refreshDashboard')?.addEventListener('click', () => {
                this.loadDashboardData();
            });
            
            // Export report button
            document.getElementById('exportReport')?.addEventListener('click', () => {
                this.exportReport();
            });
            
            // Chart period selector
            document.getElementById('growthPeriod')?.addEventListener('change', (e) => {
                this.updateUserGrowthChart(parseInt(e.target.value));
            });
        },
        
        // Load dashboard data
        async loadDashboardData() {
            try {
                this.showLoading(true);
                
                // Load stats in parallel
                await Promise.all([
                    this.loadStats(),
                    this.loadChartData(),
                    this.loadRecentActivity()
                ]);
                
                this.showLoading(false);
                
            } catch (error) {
                console.error('Error loading dashboard data:', error);
                this.showError('Failed to load dashboard data');
                this.showLoading(false);
            }
        },
        
        // Load statistics
        async loadStats() {
            try {
                // Get total users
                const usersSnapshot = await firebase.firestore().collection('users').get();
                const totalUsers = usersSnapshot.size;
                
                // Get active users (last 24 hours)
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                const activeUsersSnapshot = await firebase.firestore()
                    .collection('users')
                    .where('lastLoginAt', '>=', yesterday)
                    .get();
                const activeUsers = activeUsersSnapshot.size;
                
                // Get total family trees
                const treesSnapshot = await firebase.firestore().collection('familyTrees').get();
                const totalTrees = treesSnapshot.size;
                
                // Update the sidebar tree count badge if exists
                const treeCountBadge = document.querySelector('.menu-link[href="#trees"] .menu-badge');
                if (treeCountBadge) {
                    treeCountBadge.textContent = totalTrees;
                }
                
                // Calculate storage usage (simplified)
                let storageUsed = 0;
                // In a real implementation, you'd calculate actual storage usage
                // For now, estimate based on number of users and trees
                storageUsed = ((totalUsers * 5) + (totalTrees * 20)) / 1024; // MB to GB
                
                // Calculate growth percentages
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                
                const lastMonthUsersSnapshot = await firebase.firestore()
                    .collection('users')
                    .where('createdAt', '>=', lastMonth)
                    .get();
                const newUsersThisMonth = lastMonthUsersSnapshot.size;
                const userGrowth = totalUsers > 0 ? Math.round((newUsersThisMonth / totalUsers) * 100) : 0;
                
                const lastMonthTreesSnapshot = await firebase.firestore()
                    .collection('familyTrees')
                    .where('createdAt', '>=', lastMonth)
                    .get();
                const newTreesThisMonth = lastMonthTreesSnapshot.size;
                const treeGrowth = totalTrees > 0 ? Math.round((newTreesThisMonth / totalTrees) * 100) : 0;
                
                // Update UI
                this.updateStats({
                    totalUsers,
                    activeUsers,
                    totalTrees,
                    storageUsed: storageUsed.toFixed(1),
                    userGrowth,
                    treeGrowth,
                    activePercentage: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
                });
                
                this.stats = {
                    totalUsers,
                    activeUsers,
                    totalTrees,
                    storageUsed,
                    userGrowth,
                    treeGrowth
                };
                
            } catch (error) {
                console.error('Error loading stats:', error);
                throw error;
            }
        },
        
        // Update stats in UI
        updateStats(stats) {
            document.getElementById('totalUsers').textContent = stats.totalUsers;
            document.getElementById('totalTrees').textContent = stats.totalTrees;
            document.getElementById('activeUsers').textContent = stats.activeUsers;
            document.getElementById('storageUsed').textContent = `${stats.storageUsed} GB`;
            
            // Update growth indicators
            const userChange = document.querySelector('.stat-card:nth-child(1) .stat-change');
            if (userChange) {
                userChange.textContent = `+${stats.userGrowth}%`;
                userChange.className = `stat-change ${stats.userGrowth > 0 ? 'positive' : 'negative'}`;
            }
            
            const treeChange = document.querySelector('.stat-card:nth-child(2) .stat-change');
            if (treeChange) {
                treeChange.textContent = `+${stats.treeGrowth}%`;
                treeChange.className = `stat-change ${stats.treeGrowth > 0 ? 'positive' : 'negative'}`;
            }
            
            const activeChange = document.querySelector('.stat-card:nth-child(3) .stat-change');
            if (activeChange) {
                activeChange.textContent = `${stats.activePercentage}%`;
            }
        },
        
        // Load chart data
        async loadChartData() {
            try {
                await Promise.all([
                    this.updateUserGrowthChart(30),
                    this.updateActivityChart()
                ]);
            } catch (error) {
                console.error('Error loading chart data:', error);
                throw error;
            }
        },
        
        // Update user growth chart
        async updateUserGrowthChart(days = 30) {
            try {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);
                
                // Get users created in the period
                const usersSnapshot = await firebase.firestore()
                    .collection('users')
                    .where('createdAt', '>=', startDate)
                    .where('createdAt', '<=', endDate)
                    .orderBy('createdAt')
                    .get();
                
                // Group by date
                const usersByDate = {};
                usersSnapshot.forEach(doc => {
                    const date = doc.data().createdAt.toDate();
                    const dateKey = date.toISOString().split('T')[0];
                    usersByDate[dateKey] = (usersByDate[dateKey] || 0) + 1;
                });
                
                // Generate complete date range
                const labels = [];
                const data = [];
                const currentDate = new Date(startDate);
                
                while (currentDate <= endDate) {
                    const dateKey = currentDate.toISOString().split('T')[0];
                    labels.push(currentDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                    }));
                    data.push(usersByDate[dateKey] || 0);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                
                this.renderUserGrowthChart(labels, data);
                
            } catch (error) {
                console.error('Error updating user growth chart:', error);
                throw error;
            }
        },
        
        // Render user growth chart
        renderUserGrowthChart(labels, data) {
            const ctx = document.getElementById('userGrowthChart');
            if (!ctx) return;
            
            try {
                // Destroy existing chart
                if (this.charts.userGrowth) {
                    this.charts.userGrowth.destroy();
                    this.charts.userGrowth = null;
                }
                
                // Validate canvas size
                const canvas = ctx.getContext('2d').canvas;
                const container = canvas.parentElement;
                const maxWidth = Math.min(container.clientWidth || 400, 1000);
                const maxHeight = Math.min(container.clientHeight || 300, 400);
                
                if (maxWidth < 50 || maxHeight < 50) {
                    console.warn('Canvas container too small, skipping chart render');
                    return;
                }
                
                // Set reasonable canvas size
                canvas.style.maxWidth = maxWidth + 'px';
                canvas.style.maxHeight = maxHeight + 'px';
                
                this.charts.userGrowth = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'New Users',
                            data: data,
                            borderColor: '#00217D',
                            backgroundColor: 'rgba(0, 33, 125, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#00217D',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.05)'
                                }
                            },
                            x: {
                                grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        }
                    },
                    elements: {
                        point: {
                            hoverRadius: 6
                        }
                    },
                    onResize: (chart, size) => {
                        // Prevent excessive sizes
                        if (size.width > 1000 || size.height > 400) {
                            chart.resize(Math.min(size.width, 1000), Math.min(size.height, 400));
                        }
                    }
                }
            });
            } catch (error) {
                console.error('Error rendering user growth chart:', error);
                // Show fallback content
                ctx.parentElement.innerHTML = '<div class="chart-error">Chart unavailable</div>';
            }
        },
        
        // Update activity chart
        async updateActivityChart() {
            try {
                // Get recent activity data
                const activityData = await this.getActivityData();
                this.renderActivityChart(activityData);
                
            } catch (error) {
                console.error('Error updating activity chart:', error);
                throw error;
            }
        },
        
        // Get activity data
        async getActivityData() {
            const activities = {
                'Users Created': 0,
                'Trees Created': 0,
                'Members Added': 0,
                'Stories Added': 0
            };
            
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            
            try {
                // Users created
                const usersSnapshot = await firebase.firestore()
                    .collection('users')
                    .where('createdAt', '>=', lastWeek)
                    .get();
                activities['Users Created'] = usersSnapshot.size;
                
                // Trees created
                const treesSnapshot = await firebase.firestore()
                    .collection('familyTrees')
                    .where('createdAt', '>=', lastWeek)
                    .get();
                activities['Trees Created'] = treesSnapshot.size;
                
                // Estimate members and stories (simplified)
                activities['Members Added'] = treesSnapshot.size * 2;
                activities['Stories Added'] = treesSnapshot.size * 1;
                
            } catch (error) {
                console.error('Error getting activity data:', error);
            }
            
            return activities;
        },
        
        // Render activity chart
        renderActivityChart(data) {
            const ctx = document.getElementById('activityChart');
            if (!ctx) return;
            
            try {
                // Destroy existing chart
                if (this.charts.activity) {
                    this.charts.activity.destroy();
                    this.charts.activity = null;
                }
                
                // Validate canvas size
                const canvas = ctx.getContext('2d').canvas;
                const container = canvas.parentElement;
                const maxWidth = Math.min(container.clientWidth || 400, 800);
                const maxHeight = Math.min(container.clientHeight || 300, 600);
                
                if (maxWidth < 50 || maxHeight < 50) {
                    console.warn('Canvas container too small, skipping chart render');
                    return;
                }
                
                // Set reasonable canvas size
                canvas.style.maxWidth = maxWidth + 'px';
                canvas.style.maxHeight = maxHeight + 'px';
                
                const labels = Object.keys(data);
                const values = Object.values(data);
                
                this.charts.activity = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: values,
                            backgroundColor: [
                                '#00217D',
                                '#D41125',
                                '#4CAF50',
                                '#FF9800'
                            ],
                            borderWidth: 0,
                            hoverBorderWidth: 2,
                            hoverBorderColor: '#fff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    usePointStyle: true,
                                    padding: 20
                                }
                            }
                        },
                        cutout: '60%',
                        onResize: (chart, size) => {
                            // Prevent excessive sizes
                            if (size.width > 800 || size.height > 600) {
                                chart.resize(Math.min(size.width, 800), Math.min(size.height, 600));
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Error rendering activity chart:', error);
                // Show fallback content
                ctx.parentElement.innerHTML = '<div class="chart-error">Chart unavailable</div>';
            }
        },
        
        // Load recent activity
        async loadRecentActivity() {
            try {
                const activities = [];
                
                // Get recent users
                const recentUsersSnapshot = await firebase.firestore()
                    .collection('users')
                    .orderBy('createdAt', 'desc')
                    .limit(5)
                    .get();
                
                recentUsersSnapshot.forEach(doc => {
                    const user = doc.data();
                    activities.push({
                        type: 'user_created',
                        icon: 'person_add',
                        message: `New user registered: ${user.displayName || user.email}`,
                        timestamp: user.createdAt
                    });
                });
                
                // Get recent trees
                const recentTreesSnapshot = await firebase.firestore()
                    .collection('familyTrees')
                    .orderBy('createdAt', 'desc')
                    .limit(5)
                    .get();
                
                recentTreesSnapshot.forEach(doc => {
                    const tree = doc.data();
                    activities.push({
                        type: 'tree_created',
                        icon: 'account_tree',
                        message: `New family tree created: ${tree.name}`,
                        timestamp: tree.createdAt
                    });
                });
                
                // Sort by timestamp
                activities.sort((a, b) => {
                    const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
                    const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
                    return bTime - aTime;
                });
                
                this.renderRecentActivity(activities.slice(0, 10));
                
            } catch (error) {
                console.error('Error loading recent activity:', error);
                throw error;
            }
        },
        
        // Render recent activity
        renderRecentActivity(activities) {
            const container = document.getElementById('recentActivity');
            if (!container) return;
            
            if (activities.length === 0) {
                container.innerHTML = `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <span class="material-icons">info</span>
                        </div>
                        <div class="activity-content">
                            <p>No recent activity</p>
                        </div>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <span class="material-icons">${activity.icon}</span>
                    </div>
                    <div class="activity-content">
                        <p>${activity.message}</p>
                        <small>${this.formatRelativeTime(activity.timestamp)}</small>
                    </div>
                </div>
            `).join('');
        },
        
        // Format relative time
        formatRelativeTime(timestamp) {
            if (!timestamp) return '';
            
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
            if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            return 'Just now';
        },
        
        // Export report
        async exportReport() {
            try {
                const reportData = {
                    generatedAt: new Date().toISOString(),
                    period: '30 days',
                    stats: this.stats,
                    summary: {
                        totalUsers: this.stats.totalUsers,
                        activeUsers: this.stats.activeUsers,
                        userGrowthRate: this.stats.userGrowth,
                        totalTrees: this.stats.totalTrees,
                        treeGrowthRate: this.stats.treeGrowth,
                        storageUsed: this.stats.storageUsed
                    }
                };
                
                const csv = this.generateReportCSV(reportData);
                this.downloadCSV(csv, `admin-report-${new Date().toISOString().split('T')[0]}.csv`);
                
                this.showSuccess('Report exported successfully');
                
            } catch (error) {
                console.error('Error exporting report:', error);
                this.showError('Failed to export report');
            }
        },
        
        // Generate report CSV
        generateReportCSV(data) {
            const lines = [
                'Admin Dashboard Report',
                `Generated: ${new Date(data.generatedAt).toLocaleDateString()}`,
                `Period: ${data.period}`,
                '',
                'Summary Statistics',
                `Total Users,${data.summary.totalUsers}`,
                `Active Users,${data.summary.activeUsers}`,
                `User Growth Rate,${data.summary.userGrowthRate}%`,
                `Total Family Trees,${data.summary.totalTrees}`,
                `Tree Growth Rate,${data.summary.treeGrowthRate}%`,
                `Storage Used,${data.summary.storageUsed} GB`
            ];
            
            return lines.join('\n');
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
        
        // Setup auto refresh
        setupAutoRefresh() {
            // Refresh every 5 minutes
            this.refreshInterval = setInterval(() => {
                this.loadDashboardData();
            }, 5 * 60 * 1000);
        },
        
        // Cleanup
        destroy() {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
            
            Object.values(this.charts).forEach(chart => {
                if (chart && chart.destroy) {
                    chart.destroy();
                }
            });
        },
        
        // UI Helper Methods
        showLoading(show) {
            // Implementation depends on UI framework
        },
        
        showSuccess(message) {
            if (window.showSuccess) {
                window.showSuccess(message);
            } else {
                alert(message);
            }
        },
        
        showError(message) {
            if (window.showError) {
                window.showError(message);
            } else {
                alert(message);
            }
        }
    };
    
    // Export for global use
    window.AdminDashboard = AdminDashboard;
})();