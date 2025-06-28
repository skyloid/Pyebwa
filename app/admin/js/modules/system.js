import { showNotification, formatDate, formatFileSize } from '../utils/helpers.js';
import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/+esm';

Chart.register(...registerables);

export class SystemModule {
    constructor() {
        this.charts = {};
        this.refreshInterval = null;
        this.maintenanceMode = false;
    }

    init() {
        this.render();
        this.attachEventListeners();
        this.loadSystemStatus();
        this.startMonitoring();
    }

    render() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="system-container">
                <div class="page-header">
                    <h1>System Management</h1>
                    <div class="header-actions">
                        <button class="btn btn-warning" id="maintenanceModeBtn">
                            <span class="material-icons">build</span>
                            <span id="maintenanceBtnText">Enable Maintenance Mode</span>
                        </button>
                        <button class="btn btn-primary" id="refreshSystemBtn">
                            <span class="material-icons">refresh</span>
                            Refresh
                        </button>
                    </div>
                </div>

                <div class="system-sections">
                    <!-- System Health Overview -->
                    <div class="system-health-grid">
                        <div class="health-card">
                            <div class="health-icon">
                                <span class="material-icons">dns</span>
                            </div>
                            <div class="health-info">
                                <h3>Server Status</h3>
                                <p class="health-value" id="serverStatus">Checking...</p>
                                <p class="health-label">Uptime: <span id="serverUptime">--</span></p>
                            </div>
                        </div>

                        <div class="health-card">
                            <div class="health-icon">
                                <span class="material-icons">storage</span>
                            </div>
                            <div class="health-info">
                                <h3>Database</h3>
                                <p class="health-value" id="dbStatus">Checking...</p>
                                <p class="health-label">Collections: <span id="dbCollections">--</span></p>
                            </div>
                        </div>

                        <div class="health-card">
                            <div class="health-icon">
                                <span class="material-icons">memory</span>
                            </div>
                            <div class="health-info">
                                <h3>Memory Usage</h3>
                                <p class="health-value" id="memoryUsage">-- MB</p>
                                <p class="health-label">Available: <span id="memoryAvailable">-- MB</span></p>
                            </div>
                        </div>

                        <div class="health-card">
                            <div class="health-icon">
                                <span class="material-icons">speed</span>
                            </div>
                            <div class="health-info">
                                <h3>API Performance</h3>
                                <p class="health-value" id="apiResponseTime">-- ms</p>
                                <p class="health-label">Requests/min: <span id="apiRequests">--</span></p>
                            </div>
                        </div>
                    </div>

                    <!-- Performance Charts -->
                    <div class="card">
                        <div class="card-header">
                            <h2>Performance Metrics</h2>
                            <select id="metricsTimeRange" class="form-control" style="width: 150px;">
                                <option value="1h">Last Hour</option>
                                <option value="24h" selected>Last 24 Hours</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                            </select>
                        </div>
                        <div class="card-body">
                            <div class="charts-grid">
                                <div class="chart-container">
                                    <h3>CPU Usage</h3>
                                    <canvas id="cpuChart"></canvas>
                                </div>
                                <div class="chart-container">
                                    <h3>Memory Usage</h3>
                                    <canvas id="memoryChart"></canvas>
                                </div>
                                <div class="chart-container">
                                    <h3>API Response Times</h3>
                                    <canvas id="responseTimeChart"></canvas>
                                </div>
                                <div class="chart-container">
                                    <h3>Error Rate</h3>
                                    <canvas id="errorRateChart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Configuration Management -->
                    <div class="card">
                        <div class="card-header">
                            <h2>Configuration</h2>
                            <button class="btn btn-secondary btn-sm" id="editConfigBtn">
                                <span class="material-icons">edit</span>
                                Edit
                            </button>
                        </div>
                        <div class="card-body">
                            <div class="config-section">
                                <h3>Environment Variables</h3>
                                <div id="envVarsList" class="env-vars-list">
                                    <div class="loading">Loading configuration...</div>
                                </div>
                            </div>

                            <div class="config-section">
                                <h3>Feature Flags</h3>
                                <div id="featureFlagsList" class="feature-flags-list">
                                    <div class="loading">Loading feature flags...</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Service Integrations -->
                    <div class="card">
                        <div class="card-header">
                            <h2>Service Integrations</h2>
                        </div>
                        <div class="card-body">
                            <div class="services-grid" id="servicesGrid">
                                <div class="loading">Loading services...</div>
                            </div>
                        </div>
                    </div>

                    <!-- System Logs -->
                    <div class="card">
                        <div class="card-header">
                            <h2>System Logs</h2>
                            <div class="log-controls">
                                <select id="logLevel" class="form-control">
                                    <option value="all">All Levels</option>
                                    <option value="error">Errors</option>
                                    <option value="warning">Warnings</option>
                                    <option value="info">Info</option>
                                </select>
                                <button class="btn btn-secondary btn-sm" id="clearLogsBtn">
                                    <span class="material-icons">clear</span>
                                    Clear
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div id="systemLogs" class="system-logs">
                                <div class="loading">Loading logs...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Maintenance Mode Modal -->
            <div id="maintenanceModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Maintenance Mode Configuration</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Maintenance Message</label>
                            <textarea id="maintenanceMessage" class="form-control" rows="3" 
                                placeholder="We're currently performing scheduled maintenance...">We're currently performing scheduled maintenance. The site will be back online shortly. Thank you for your patience.</textarea>
                        </div>
                        <div class="form-group">
                            <label>Expected Duration</label>
                            <input type="number" id="maintenanceDuration" class="form-control" 
                                placeholder="Minutes" min="1" value="30">
                            <small>Duration in minutes</small>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="allowAdminAccess" checked>
                                <span>Allow admin access during maintenance</span>
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').style.display='none'">Cancel</button>
                        <button class="btn btn-warning" id="confirmMaintenanceBtn">Enable Maintenance Mode</button>
                    </div>
                </div>
            </div>

            <!-- Config Edit Modal -->
            <div id="configModal" class="modal">
                <div class="modal-content modal-lg">
                    <div class="modal-header">
                        <h2>Edit Configuration</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="tabs">
                            <button class="tab-btn active" data-tab="env">Environment Variables</button>
                            <button class="tab-btn" data-tab="features">Feature Flags</button>
                        </div>
                        <div class="tab-content">
                            <div id="envTab" class="tab-pane active">
                                <div id="envVarsEditor" class="config-editor">
                                    <!-- Environment variables editor will be populated here -->
                                </div>
                                <button class="btn btn-secondary btn-sm" id="addEnvVarBtn">
                                    <span class="material-icons">add</span>
                                    Add Variable
                                </button>
                            </div>
                            <div id="featuresTab" class="tab-pane">
                                <div id="featureFlagsEditor" class="config-editor">
                                    <!-- Feature flags editor will be populated here -->
                                </div>
                                <button class="btn btn-secondary btn-sm" id="addFeatureFlagBtn">
                                    <span class="material-icons">add</span>
                                    Add Flag
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').style.display='none'">Cancel</button>
                        <button class="btn btn-primary" id="saveConfigBtn">Save Changes</button>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Refresh button
        document.getElementById('refreshSystemBtn').addEventListener('click', () => {
            this.loadSystemStatus();
        });

        // Maintenance mode
        document.getElementById('maintenanceModeBtn').addEventListener('click', () => {
            if (this.maintenanceMode) {
                this.disableMaintenanceMode();
            } else {
                document.getElementById('maintenanceModal').style.display = 'block';
            }
        });

        // Maintenance modal
        const maintenanceModal = document.getElementById('maintenanceModal');
        maintenanceModal.querySelector('.modal-close').addEventListener('click', () => {
            maintenanceModal.style.display = 'none';
        });

        document.getElementById('confirmMaintenanceBtn').addEventListener('click', () => {
            this.enableMaintenanceMode();
        });

        // Config modal
        document.getElementById('editConfigBtn').addEventListener('click', () => {
            document.getElementById('configModal').style.display = 'block';
            this.loadConfigEditor();
        });

        const configModal = document.getElementById('configModal');
        configModal.querySelector('.modal-close').addEventListener('click', () => {
            configModal.style.display = 'none';
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                
                e.target.classList.add('active');
                const tabId = e.target.dataset.tab + 'Tab';
                document.getElementById(tabId).classList.add('active');
            });
        });

        // Save config
        document.getElementById('saveConfigBtn').addEventListener('click', () => this.saveConfig());

        // Add buttons
        document.getElementById('addEnvVarBtn').addEventListener('click', () => this.addEnvVar());
        document.getElementById('addFeatureFlagBtn').addEventListener('click', () => this.addFeatureFlag());

        // Time range selector
        document.getElementById('metricsTimeRange').addEventListener('change', (e) => {
            this.loadMetrics(e.target.value);
        });

        // Log level filter
        document.getElementById('logLevel').addEventListener('change', (e) => {
            this.filterLogs(e.target.value);
        });

        // Clear logs
        document.getElementById('clearLogsBtn').addEventListener('click', () => this.clearLogs());
    }

    async loadSystemStatus() {
        try {
            const response = await fetch('/api/system/status', {
                headers: {
                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to load system status');

            const status = await response.json();
            this.updateSystemStatus(status);
            this.updateServiceStatus(status.services);
            this.maintenanceMode = status.maintenanceMode;
            this.updateMaintenanceButton();
        } catch (error) {
            console.error('Error loading system status:', error);
            showNotification('Failed to load system status', 'error');
        }
    }

    updateSystemStatus(status) {
        // Server status
        document.getElementById('serverStatus').textContent = status.server.status;
        document.getElementById('serverStatus').className = `health-value ${status.server.status === 'Online' ? 'status-good' : 'status-bad'}`;
        document.getElementById('serverUptime').textContent = this.formatUptime(status.server.uptime);

        // Database status
        document.getElementById('dbStatus').textContent = status.database.status;
        document.getElementById('dbStatus').className = `health-value ${status.database.status === 'Connected' ? 'status-good' : 'status-bad'}`;
        document.getElementById('dbCollections').textContent = status.database.collections;

        // Memory usage
        const memoryUsed = status.memory.total - status.memory.free;
        const memoryPercent = (memoryUsed / status.memory.total * 100).toFixed(1);
        document.getElementById('memoryUsage').textContent = `${formatFileSize(memoryUsed)} (${memoryPercent}%)`;
        document.getElementById('memoryAvailable').textContent = formatFileSize(status.memory.free);

        // API performance
        document.getElementById('apiResponseTime').textContent = `${status.api.avgResponseTime} ms`;
        document.getElementById('apiRequests').textContent = status.api.requestsPerMinute;
    }

    updateServiceStatus(services) {
        const container = document.getElementById('servicesGrid');
        container.innerHTML = services.map(service => `
            <div class="service-card ${service.status === 'operational' ? 'service-operational' : 'service-error'}">
                <div class="service-header">
                    <span class="material-icons">${this.getServiceIcon(service.name)}</span>
                    <h4>${service.name}</h4>
                </div>
                <div class="service-status">
                    <span class="status-indicator ${service.status === 'operational' ? 'status-good' : 'status-bad'}"></span>
                    <span>${service.status}</span>
                </div>
                <div class="service-details">
                    ${service.details ? `<small>${service.details}</small>` : ''}
                </div>
            </div>
        `).join('');
    }

    getServiceIcon(serviceName) {
        const icons = {
            'Firebase Auth': 'lock',
            'Firestore': 'storage',
            'Cloud Storage': 'cloud',
            'SendGrid': 'email',
            'FCM': 'notifications',
            'Analytics': 'analytics'
        };
        return icons[serviceName] || 'settings';
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    startMonitoring() {
        this.loadMetrics('24h');
        this.loadSystemLogs();
        this.loadConfiguration();
        
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadSystemStatus();
            this.updateCharts();
        }, 30000);
    }

    async loadMetrics(timeRange) {
        try {
            const response = await fetch(`/api/system/metrics?range=${timeRange}`, {
                headers: {
                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to load metrics');

            const metrics = await response.json();
            this.renderCharts(metrics);
        } catch (error) {
            console.error('Error loading metrics:', error);
        }
    }

    renderCharts(metrics) {
        // CPU Usage Chart
        if (this.charts.cpu) this.charts.cpu.destroy();
        const cpuCtx = document.getElementById('cpuChart').getContext('2d');
        this.charts.cpu = new Chart(cpuCtx, {
            type: 'line',
            data: {
                labels: metrics.timestamps,
                datasets: [{
                    label: 'CPU Usage %',
                    data: metrics.cpu,
                    borderColor: '#D41125',
                    backgroundColor: 'rgba(212, 17, 37, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        // Memory Usage Chart
        if (this.charts.memory) this.charts.memory.destroy();
        const memoryCtx = document.getElementById('memoryChart').getContext('2d');
        this.charts.memory = new Chart(memoryCtx, {
            type: 'line',
            data: {
                labels: metrics.timestamps,
                datasets: [{
                    label: 'Memory Usage MB',
                    data: metrics.memory,
                    borderColor: '#00217D',
                    backgroundColor: 'rgba(0, 33, 125, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Response Time Chart
        if (this.charts.responseTime) this.charts.responseTime.destroy();
        const responseCtx = document.getElementById('responseTimeChart').getContext('2d');
        this.charts.responseTime = new Chart(responseCtx, {
            type: 'line',
            data: {
                labels: metrics.timestamps,
                datasets: [{
                    label: 'Response Time (ms)',
                    data: metrics.responseTime,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Error Rate Chart
        if (this.charts.errorRate) this.charts.errorRate.destroy();
        const errorCtx = document.getElementById('errorRateChart').getContext('2d');
        this.charts.errorRate = new Chart(errorCtx, {
            type: 'bar',
            data: {
                labels: metrics.timestamps,
                datasets: [{
                    label: 'Errors',
                    data: metrics.errors,
                    backgroundColor: '#dc3545'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    async loadSystemLogs() {
        try {
            const response = await fetch('/api/system/logs', {
                headers: {
                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to load logs');

            const logs = await response.json();
            this.renderLogs(logs);
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    }

    renderLogs(logs) {
        const container = document.getElementById('systemLogs');
        container.innerHTML = logs.map(log => `
            <div class="log-entry log-${log.level}" data-level="${log.level}">
                <span class="log-time">${formatDate(log.timestamp)}</span>
                <span class="log-level">[${log.level.toUpperCase()}]</span>
                <span class="log-message">${log.message}</span>
            </div>
        `).join('');
    }

    filterLogs(level) {
        const entries = document.querySelectorAll('.log-entry');
        entries.forEach(entry => {
            if (level === 'all' || entry.dataset.level === level) {
                entry.style.display = 'flex';
            } else {
                entry.style.display = 'none';
            }
        });
    }

    async clearLogs() {
        if (!confirm('Are you sure you want to clear system logs?')) return;

        try {
            const response = await fetch('/api/system/logs', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to clear logs');

            document.getElementById('systemLogs').innerHTML = '<div class="empty-state">No logs</div>';
            showNotification('Logs cleared successfully', 'success');
        } catch (error) {
            console.error('Error clearing logs:', error);
            showNotification('Failed to clear logs', 'error');
        }
    }

    async loadConfiguration() {
        try {
            const response = await fetch('/api/system/config', {
                headers: {
                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to load configuration');

            const config = await response.json();
            this.renderConfiguration(config);
        } catch (error) {
            console.error('Error loading configuration:', error);
        }
    }

    renderConfiguration(config) {
        // Environment variables
        const envContainer = document.getElementById('envVarsList');
        envContainer.innerHTML = Object.entries(config.env).map(([key, value]) => `
            <div class="config-item">
                <strong>${key}:</strong> 
                <span class="${value.sensitive ? 'sensitive-value' : ''}">${value.sensitive ? '••••••••' : value.value}</span>
            </div>
        `).join('');

        // Feature flags
        const flagsContainer = document.getElementById('featureFlagsList');
        flagsContainer.innerHTML = Object.entries(config.features).map(([key, enabled]) => `
            <div class="feature-flag">
                <label class="switch">
                    <input type="checkbox" ${enabled ? 'checked' : ''} disabled>
                    <span class="slider"></span>
                </label>
                <span>${key}</span>
            </div>
        `).join('');
    }

    async enableMaintenanceMode() {
        const message = document.getElementById('maintenanceMessage').value;
        const duration = document.getElementById('maintenanceDuration').value;
        const allowAdmins = document.getElementById('allowAdminAccess').checked;

        try {
            const response = await fetch('/api/system/maintenance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                },
                body: JSON.stringify({
                    enabled: true,
                    message,
                    duration: parseInt(duration),
                    allowAdmins
                })
            });

            if (!response.ok) throw new Error('Failed to enable maintenance mode');

            this.maintenanceMode = true;
            this.updateMaintenanceButton();
            document.getElementById('maintenanceModal').style.display = 'none';
            showNotification('Maintenance mode enabled', 'success');
        } catch (error) {
            console.error('Error enabling maintenance mode:', error);
            showNotification('Failed to enable maintenance mode', 'error');
        }
    }

    async disableMaintenanceMode() {
        if (!confirm('Are you sure you want to disable maintenance mode?')) return;

        try {
            const response = await fetch('/api/system/maintenance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                },
                body: JSON.stringify({ enabled: false })
            });

            if (!response.ok) throw new Error('Failed to disable maintenance mode');

            this.maintenanceMode = false;
            this.updateMaintenanceButton();
            showNotification('Maintenance mode disabled', 'success');
        } catch (error) {
            console.error('Error disabling maintenance mode:', error);
            showNotification('Failed to disable maintenance mode', 'error');
        }
    }

    updateMaintenanceButton() {
        const btn = document.getElementById('maintenanceModeBtn');
        const text = document.getElementById('maintenanceBtnText');
        
        if (this.maintenanceMode) {
            btn.classList.remove('btn-warning');
            btn.classList.add('btn-danger');
            text.textContent = 'Disable Maintenance Mode';
        } else {
            btn.classList.remove('btn-danger');
            btn.classList.add('btn-warning');
            text.textContent = 'Enable Maintenance Mode';
        }
    }

    async loadConfigEditor() {
        try {
            const response = await fetch('/api/system/config', {
                headers: {
                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to load configuration');

            const config = await response.json();
            this.populateConfigEditor(config);
        } catch (error) {
            console.error('Error loading config editor:', error);
            showNotification('Failed to load configuration', 'error');
        }
    }

    populateConfigEditor(config) {
        // Environment variables editor
        const envEditor = document.getElementById('envVarsEditor');
        envEditor.innerHTML = Object.entries(config.env).map(([key, value]) => `
            <div class="config-editor-item" data-key="${key}">
                <input type="text" class="form-control" value="${key}" placeholder="Key" ${value.readonly ? 'readonly' : ''}>
                <input type="${value.sensitive ? 'password' : 'text'}" class="form-control" value="${value.value}" placeholder="Value">
                <button class="btn btn-sm btn-danger" onclick="systemModule.removeEnvVar('${key}')" ${value.readonly ? 'disabled' : ''}>
                    <span class="material-icons">delete</span>
                </button>
            </div>
        `).join('');

        // Feature flags editor
        const flagsEditor = document.getElementById('featureFlagsEditor');
        flagsEditor.innerHTML = Object.entries(config.features).map(([key, enabled]) => `
            <div class="config-editor-item" data-key="${key}">
                <input type="text" class="form-control" value="${key}" placeholder="Flag name">
                <label class="switch">
                    <input type="checkbox" ${enabled ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
                <button class="btn btn-sm btn-danger" onclick="systemModule.removeFeatureFlag('${key}')">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        `).join('');
    }

    addEnvVar() {
        const editor = document.getElementById('envVarsEditor');
        const item = document.createElement('div');
        item.className = 'config-editor-item';
        item.innerHTML = `
            <input type="text" class="form-control" placeholder="Key">
            <input type="text" class="form-control" placeholder="Value">
            <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">
                <span class="material-icons">delete</span>
            </button>
        `;
        editor.appendChild(item);
    }

    addFeatureFlag() {
        const editor = document.getElementById('featureFlagsEditor');
        const item = document.createElement('div');
        item.className = 'config-editor-item';
        item.innerHTML = `
            <input type="text" class="form-control" placeholder="Flag name">
            <label class="switch">
                <input type="checkbox">
                <span class="slider"></span>
            </label>
            <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">
                <span class="material-icons">delete</span>
            </button>
        `;
        editor.appendChild(item);
    }

    removeEnvVar(key) {
        document.querySelector(`#envVarsEditor [data-key="${key}"]`).remove();
    }

    removeFeatureFlag(key) {
        document.querySelector(`#featureFlagsEditor [data-key="${key}"]`).remove();
    }

    async saveConfig() {
        const envVars = {};
        document.querySelectorAll('#envVarsEditor .config-editor-item').forEach(item => {
            const inputs = item.querySelectorAll('input');
            if (inputs[0].value) {
                envVars[inputs[0].value] = inputs[1].value;
            }
        });

        const features = {};
        document.querySelectorAll('#featureFlagsEditor .config-editor-item').forEach(item => {
            const keyInput = item.querySelector('input[type="text"]');
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (keyInput.value) {
                features[keyInput.value] = checkbox.checked;
            }
        });

        try {
            const response = await fetch('/api/system/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                },
                body: JSON.stringify({ env: envVars, features })
            });

            if (!response.ok) throw new Error('Failed to save configuration');

            showNotification('Configuration saved successfully', 'success');
            document.getElementById('configModal').style.display = 'none';
            this.loadConfiguration();
        } catch (error) {
            console.error('Error saving configuration:', error);
            showNotification('Failed to save configuration', 'error');
        }
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        Object.values(this.charts).forEach(chart => chart.destroy());
    }
}

// Initialize and export
export const systemModule = new SystemModule();