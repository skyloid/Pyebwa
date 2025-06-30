// Family Statistics Dashboard Module
(function() {
    'use strict';
    
    const FamilyStatistics = {
        // Initialize statistics
        init() {
            this.createStatisticsWidget();
            this.attachEventListeners();
            this.updateStatistics();
        },
        
        // Create statistics widget
        createStatisticsWidget() {
            const dashboard = document.getElementById('dashboardView');
            if (!dashboard) return;
            
            // Check if widget already exists
            if (document.getElementById('familyStatsWidget')) return;
            
            const widget = document.createElement('div');
            widget.id = 'familyStatsWidget';
            widget.className = 'dashboard-widget stats-widget';
            widget.innerHTML = `
                <div class="widget-header">
                    <h3>
                        <span class="material-icons">analytics</span>
                        <span data-i18n="familyStatistics">Family Statistics</span>
                    </h3>
                    <button class="widget-refresh" title="Refresh Statistics">
                        <span class="material-icons">refresh</span>
                    </button>
                </div>
                <div class="widget-content">
                    <div class="stats-loading">
                        <div class="spinner"></div>
                        <p>Loading statistics...</p>
                    </div>
                    <div class="stats-container" style="display: none;">
                        <!-- Overview Stats -->
                        <div class="stats-overview">
                            <div class="stat-card total-members">
                                <div class="stat-icon">
                                    <span class="material-icons">groups</span>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-value">0</div>
                                    <div class="stat-label" data-i18n="totalMembers">Total Members</div>
                                </div>
                            </div>
                            <div class="stat-card living-members">
                                <div class="stat-icon">
                                    <span class="material-icons">favorite</span>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-value">0</div>
                                    <div class="stat-label" data-i18n="livingMembers">Living Members</div>
                                </div>
                            </div>
                            <div class="stat-card generations">
                                <div class="stat-icon">
                                    <span class="material-icons">account_tree</span>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-value">0</div>
                                    <div class="stat-label" data-i18n="generations">Generations</div>
                                </div>
                            </div>
                            <div class="stat-card avg-lifespan">
                                <div class="stat-icon">
                                    <span class="material-icons">schedule</span>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-value">0</div>
                                    <div class="stat-label" data-i18n="avgLifespan">Avg. Lifespan</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Gender Distribution -->
                        <div class="stats-section">
                            <h4 data-i18n="genderDistribution">Gender Distribution</h4>
                            <div class="gender-chart">
                                <div class="chart-bars">
                                    <div class="chart-bar male" style="width: 0%">
                                        <span class="bar-label">0</span>
                                    </div>
                                    <div class="chart-bar female" style="width: 0%">
                                        <span class="bar-label">0</span>
                                    </div>
                                </div>
                                <div class="chart-legend">
                                    <div class="legend-item">
                                        <span class="legend-color male"></span>
                                        <span data-i18n="male">Male</span>
                                        <span class="legend-percent male-percent">0%</span>
                                    </div>
                                    <div class="legend-item">
                                        <span class="legend-color female"></span>
                                        <span data-i18n="female">Female</span>
                                        <span class="legend-percent female-percent">0%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Age Distribution -->
                        <div class="stats-section">
                            <h4 data-i18n="ageDistribution">Age Distribution</h4>
                            <div class="age-distribution">
                                <div class="age-group">
                                    <span class="age-label">0-18</span>
                                    <div class="age-bar">
                                        <div class="age-fill" style="width: 0%"></div>
                                    </div>
                                    <span class="age-count">0</span>
                                </div>
                                <div class="age-group">
                                    <span class="age-label">19-35</span>
                                    <div class="age-bar">
                                        <div class="age-fill" style="width: 0%"></div>
                                    </div>
                                    <span class="age-count">0</span>
                                </div>
                                <div class="age-group">
                                    <span class="age-label">36-50</span>
                                    <div class="age-bar">
                                        <div class="age-fill" style="width: 0%"></div>
                                    </div>
                                    <span class="age-count">0</span>
                                </div>
                                <div class="age-group">
                                    <span class="age-label">51-65</span>
                                    <div class="age-bar">
                                        <div class="age-fill" style="width: 0%"></div>
                                    </div>
                                    <span class="age-count">0</span>
                                </div>
                                <div class="age-group">
                                    <span class="age-label">65+</span>
                                    <div class="age-bar">
                                        <div class="age-fill" style="width: 0%"></div>
                                    </div>
                                    <span class="age-count">0</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Recent Activity -->
                        <div class="stats-section">
                            <h4 data-i18n="recentActivity">Recent Activity</h4>
                            <div class="activity-list">
                                <div class="no-activity" data-i18n="noRecentActivity">No recent activity</div>
                            </div>
                        </div>
                        
                        <!-- Quick Actions -->
                        <div class="stats-actions">
                            <button class="btn btn-secondary" onclick="window.pyebwaTreeControls?.printTree()">
                                <span class="material-icons">print</span>
                                <span data-i18n="printReport">Print Report</span>
                            </button>
                            <button class="btn btn-primary" onclick="FamilyStatistics.exportStatistics()">
                                <span class="material-icons">download</span>
                                <span data-i18n="exportStats">Export Stats</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Find a good position in dashboard
            const existingWidgets = dashboard.querySelectorAll('.dashboard-widget');
            if (existingWidgets.length > 0) {
                // Insert after the first widget
                existingWidgets[0].parentNode.insertBefore(widget, existingWidgets[0].nextSibling);
            } else {
                dashboard.appendChild(widget);
            }
        },
        
        // Attach event listeners
        attachEventListeners() {
            // Refresh button
            const refreshBtn = document.querySelector('#familyStatsWidget .widget-refresh');
            refreshBtn?.addEventListener('click', () => {
                this.updateStatistics();
            });
            
            // Listen for family member updates
            document.addEventListener('memberAdded', () => this.updateStatistics());
            document.addEventListener('memberUpdated', () => this.updateStatistics());
            document.addEventListener('memberDeleted', () => this.updateStatistics());
        },
        
        // Update statistics
        async updateStatistics() {
            const widget = document.getElementById('familyStatsWidget');
            if (!widget) return;
            
            // Show loading
            const loading = widget.querySelector('.stats-loading');
            const container = widget.querySelector('.stats-container');
            loading.style.display = 'block';
            container.style.display = 'none';
            
            try {
                // Get family members
                const members = await this.getFamilyMembers();
                
                // Calculate statistics
                const stats = this.calculateStatistics(members);
                
                // Update UI
                this.renderStatistics(stats);
                
                // Update activity
                this.updateRecentActivity(members);
                
                // Show container
                loading.style.display = 'none';
                container.style.display = 'block';
                
            } catch (error) {
                console.error('Error updating statistics:', error);
                loading.innerHTML = '<p class="error">Failed to load statistics</p>';
            }
        },
        
        // Get family members from Firebase
        async getFamilyMembers() {
            if (!window.currentUser || !window.db) return [];
            
            try {
                const familyTreeId = window.currentUser.familyTreeId;
                if (!familyTreeId) return [];
                
                const membersRef = window.db.collection('familyTrees')
                    .doc(familyTreeId)
                    .collection('members');
                
                const snapshot = await membersRef.get();
                const members = [];
                
                snapshot.forEach(doc => {
                    members.push({ id: doc.id, ...doc.data() });
                });
                
                return members;
            } catch (error) {
                console.error('Error fetching family members:', error);
                return [];
            }
        },
        
        // Calculate statistics from members data
        calculateStatistics(members) {
            const stats = {
                total: members.length,
                living: 0,
                deceased: 0,
                male: 0,
                female: 0,
                generations: new Set(),
                avgLifespan: 0,
                ageGroups: {
                    '0-18': 0,
                    '19-35': 0,
                    '36-50': 0,
                    '51-65': 0,
                    '65+': 0
                },
                lifespans: []
            };
            
            const today = new Date();
            
            members.forEach(member => {
                // Gender count
                if (member.gender === 'male') stats.male++;
                if (member.gender === 'female') stats.female++;
                
                // Living/Deceased
                if (member.deathDate) {
                    stats.deceased++;
                    
                    // Calculate lifespan
                    if (member.birthDate) {
                        const birth = new Date(member.birthDate);
                        const death = new Date(member.deathDate);
                        const lifespan = Math.floor((death - birth) / (365.25 * 24 * 60 * 60 * 1000));
                        if (lifespan > 0 && lifespan < 150) {
                            stats.lifespans.push(lifespan);
                        }
                    }
                } else {
                    stats.living++;
                    
                    // Calculate age for living members
                    if (member.birthDate) {
                        const birth = new Date(member.birthDate);
                        const age = Math.floor((today - birth) / (365.25 * 24 * 60 * 60 * 1000));
                        
                        // Age groups
                        if (age <= 18) stats.ageGroups['0-18']++;
                        else if (age <= 35) stats.ageGroups['19-35']++;
                        else if (age <= 50) stats.ageGroups['36-50']++;
                        else if (age <= 65) stats.ageGroups['51-65']++;
                        else stats.ageGroups['65+']++;
                    }
                }
                
                // Track generation (simplified - based on birth year)
                if (member.birthDate) {
                    const birthYear = new Date(member.birthDate).getFullYear();
                    const generation = Math.floor(birthYear / 25);
                    stats.generations.add(generation);
                }
            });
            
            // Calculate average lifespan
            if (stats.lifespans.length > 0) {
                stats.avgLifespan = Math.round(
                    stats.lifespans.reduce((a, b) => a + b, 0) / stats.lifespans.length
                );
            }
            
            // Calculate number of generations
            stats.generationCount = stats.generations.size;
            
            return stats;
        },
        
        // Render statistics to UI
        renderStatistics(stats) {
            const widget = document.getElementById('familyStatsWidget');
            if (!widget) return;
            
            // Update overview cards
            widget.querySelector('.total-members .stat-value').textContent = stats.total;
            widget.querySelector('.living-members .stat-value').textContent = stats.living;
            widget.querySelector('.generations .stat-value').textContent = stats.generationCount;
            widget.querySelector('.avg-lifespan .stat-value').textContent = 
                stats.avgLifespan > 0 ? `${stats.avgLifespan} yrs` : 'N/A';
            
            // Update gender distribution
            const malePercent = stats.total > 0 ? Math.round((stats.male / stats.total) * 100) : 0;
            const femalePercent = stats.total > 0 ? Math.round((stats.female / stats.total) * 100) : 0;
            
            widget.querySelector('.chart-bar.male').style.width = `${malePercent}%`;
            widget.querySelector('.chart-bar.male .bar-label').textContent = stats.male;
            widget.querySelector('.male-percent').textContent = `${malePercent}%`;
            
            widget.querySelector('.chart-bar.female').style.width = `${femalePercent}%`;
            widget.querySelector('.chart-bar.female .bar-label').textContent = stats.female;
            widget.querySelector('.female-percent').textContent = `${femalePercent}%`;
            
            // Update age distribution
            const maxAge = Math.max(...Object.values(stats.ageGroups));
            Object.entries(stats.ageGroups).forEach(([group, count]) => {
                // Find age group by looking for the text content in age labels
                const ageGroups = widget.querySelectorAll('.age-group');
                let targetAgeGroup = null;
                
                for (const ageGroupEl of ageGroups) {
                    const ageLabel = ageGroupEl.querySelector('.age-label');
                    if (ageLabel && ageLabel.textContent.trim() === group) {
                        targetAgeGroup = ageGroupEl;
                        break;
                    }
                }
                
                if (targetAgeGroup) {
                    const percent = maxAge > 0 ? (count / maxAge) * 100 : 0;
                    targetAgeGroup.querySelector('.age-fill').style.width = `${percent}%`;
                    targetAgeGroup.querySelector('.age-count').textContent = count;
                }
            });
        },
        
        // Update recent activity
        updateRecentActivity(members) {
            const widget = document.getElementById('familyStatsWidget');
            if (!widget) return;
            
            const activityList = widget.querySelector('.activity-list');
            
            // Get recently added/updated members (last 7 days)
            const recentDate = new Date();
            recentDate.setDate(recentDate.getDate() - 7);
            
            const recentMembers = members
                .filter(m => m.createdAt && new Date(m.createdAt.toDate()) > recentDate)
                .sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate())
                .slice(0, 5);
            
            if (recentMembers.length === 0) {
                activityList.innerHTML = '<div class="no-activity" data-i18n="noRecentActivity">No recent activity</div>';
                return;
            }
            
            activityList.innerHTML = recentMembers.map(member => `
                <div class="activity-item">
                    <span class="material-icons">person_add</span>
                    <span class="activity-text">Added ${member.firstName} ${member.lastName}</span>
                    <span class="activity-time">${this.formatRelativeTime(member.createdAt.toDate())}</span>
                </div>
            `).join('');
        },
        
        // Format relative time
        formatRelativeTime(date) {
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return `${days}d ago`;
            if (hours > 0) return `${hours}h ago`;
            if (minutes > 0) return `${minutes}m ago`;
            return 'Just now';
        },
        
        // Export statistics
        exportStatistics() {
            // Get current statistics
            const widget = document.getElementById('familyStatsWidget');
            if (!widget) return;
            
            const stats = {
                date: new Date().toISOString(),
                familyName: document.querySelector('.family-name-header')?.textContent || 'Family',
                overview: {
                    totalMembers: widget.querySelector('.total-members .stat-value').textContent,
                    livingMembers: widget.querySelector('.living-members .stat-value').textContent,
                    generations: widget.querySelector('.generations .stat-value').textContent,
                    avgLifespan: widget.querySelector('.avg-lifespan .stat-value').textContent
                },
                gender: {
                    male: widget.querySelector('.chart-bar.male .bar-label').textContent,
                    female: widget.querySelector('.chart-bar.female .bar-label').textContent
                }
            };
            
            // Create CSV content
            const csv = this.generateCSV(stats);
            
            // Download file
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `family-statistics-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Show success message
            if (window.showSuccess) {
                window.showSuccess('Statistics exported successfully!');
            }
        },
        
        // Generate CSV from statistics
        generateCSV(stats) {
            const lines = [
                'Family Statistics Report',
                `Generated on: ${new Date().toLocaleDateString()}`,
                '',
                'Overview',
                `Total Members,${stats.overview.totalMembers}`,
                `Living Members,${stats.overview.livingMembers}`,
                `Generations,${stats.overview.generations}`,
                `Average Lifespan,${stats.overview.avgLifespan}`,
                '',
                'Gender Distribution',
                `Male,${stats.gender.male}`,
                `Female,${stats.gender.female}`
            ];
            
            return lines.join('\n');
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => FamilyStatistics.init(), 1000);
        });
    } else {
        setTimeout(() => FamilyStatistics.init(), 1000);
    }
    
    // Export for global use
    window.FamilyStatistics = FamilyStatistics;
})();