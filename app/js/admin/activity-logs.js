// Admin Activity Logs Module
(function() {
    'use strict';
    
    console.log('[AdminActivityLogs] Initializing activity logs module');
    
    class AdminActivityLogs {
        constructor() {
            this.db = firebase.firestore();
            this.initialized = false;
            this.currentFilter = 'all';
            this.logs = [];
        }
        
        // Initialize logs
        async initialize() {
            if (this.initialized) return;
            
            try {
                console.log('[AdminActivityLogs] Loading activity logs...');
                
                // Load logs
                await this.loadLogs();
                
                this.initialized = true;
            } catch (error) {
                console.error('[AdminActivityLogs] Initialization error:', error);
            }
        }
        
        // Filter logs
        filterLogs() {
            const filterSelect = document.getElementById('logFilter');
            if (filterSelect) {
                this.currentFilter = filterSelect.value;
                this.renderLogs();
            }
        }
        
        // Load activity logs
        async loadLogs() {
            try {
                const logsContainer = document.getElementById('logsContainer');
                if (!logsContainer) return;
                
                // Load admin activity logs
                const adminLogs = await this.db.collection('adminActivityLogs')
                    .orderBy('timestamp', 'desc')
                    .limit(100)
                    .get();
                
                this.logs = [];
                adminLogs.forEach(doc => {
                    this.logs.push({
                        id: doc.id,
                        type: 'admin',
                        ...doc.data()
                    });
                });
                
                // Load admin access logs
                const accessLogs = await this.db.collection('adminAccessLogs')
                    .orderBy('timestamp', 'desc')
                    .limit(50)
                    .get();
                
                accessLogs.forEach(doc => {
                    this.logs.push({
                        id: doc.id,
                        type: 'access',
                        ...doc.data()
                    });
                });
                
                // Sort by timestamp
                this.logs.sort((a, b) => {
                    const timeA = a.timestamp?.toMillis() || 0;
                    const timeB = b.timestamp?.toMillis() || 0;
                    return timeB - timeA;
                });
                
                this.renderLogs();
                
            } catch (error) {
                console.error('[AdminActivityLogs] Error loading logs:', error);
                const logsContainer = document.getElementById('logsContainer');
                if (logsContainer) {
                    logsContainer.innerHTML = '<p class="error-text">Failed to load logs</p>';
                }
            }
        }
        
        // Render logs
        renderLogs() {
            const logsContainer = document.getElementById('logsContainer');
            if (!logsContainer) return;
            
            let filteredLogs = this.logs;
            
            // Apply filter
            if (this.currentFilter !== 'all') {
                filteredLogs = this.logs.filter(log => {
                    switch (this.currentFilter) {
                        case 'admin':
                            return log.type === 'admin';
                        case 'auth':
                            return log.type === 'access' || log.action?.includes('auth');
                        case 'user':
                            return log.action?.includes('user');
                        case 'error':
                            return log.type === 'error' || log.action?.includes('error');
                        default:
                            return true;
                    }
                });
            }
            
            if (filteredLogs.length === 0) {
                logsContainer.innerHTML = '<p class="no-data">No logs found</p>';
                return;
            }
            
            logsContainer.innerHTML = filteredLogs.slice(0, 100).map(log => {
                const timestamp = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                const formattedTime = timestamp.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                let logClass = 'log-item';
                if (log.type === 'error') logClass += ' error';
                if (log.type === 'admin') logClass += ' admin';
                
                let message = '';
                if (log.action) {
                    message = `[${log.action}] `;
                    if (log.adminEmail) {
                        message += `Admin: ${log.adminEmail} - `;
                    }
                    if (log.details) {
                        message += JSON.stringify(log.details);
                    }
                } else if (log.type === 'access') {
                    message = `[${log.type}] User ${log.email} - ${log.ip || 'Unknown IP'}`;
                }
                
                return `
                    <div class="${logClass}">
                        <span class="log-time">${formattedTime}</span>
                        <span class="log-message">${this.escapeHtml(message)}</span>
                    </div>
                `;
            }).join('');
        }
        
        // Utility functions
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }
    
    // Create global instance
    window.adminActivityLogs = new AdminActivityLogs();
    
})();