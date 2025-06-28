import { showNotification, formatDate, formatFileSize } from '../utils/helpers.js';

export class BackupModule {
    constructor() {
        this.backupHistory = [];
        this.backupInProgress = false;
    }

    init() {
        this.render();
        this.attachEventListeners();
        this.loadBackupHistory();
    }

    render() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="backup-container">
                <div class="page-header">
                    <h1>Backup Management</h1>
                    <button class="btn btn-primary" id="createBackupBtn">
                        <span class="material-icons">backup</span>
                        Create Backup
                    </button>
                </div>

                <div class="backup-sections">
                    <!-- Backup Options -->
                    <div class="card">
                        <div class="card-header">
                            <h2>Backup Options</h2>
                        </div>
                        <div class="card-body">
                            <div class="backup-options">
                                <div class="backup-option">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="backupUsers" checked>
                                        <span>Users & Authentication</span>
                                    </label>
                                </div>
                                <div class="backup-option">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="backupTrees" checked>
                                        <span>Family Trees & Members</span>
                                    </label>
                                </div>
                                <div class="backup-option">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="backupContent" checked>
                                        <span>Photos & Documents</span>
                                    </label>
                                </div>
                                <div class="backup-option">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="backupStories" checked>
                                        <span>Stories & Events</span>
                                    </label>
                                </div>
                                <div class="backup-option">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="backupAudit" checked>
                                        <span>Audit Logs</span>
                                    </label>
                                </div>
                                <div class="backup-option">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="backupAnnouncements" checked>
                                        <span>Announcements</span>
                                    </label>
                                </div>
                            </div>

                            <div class="backup-format">
                                <h3>Export Format</h3>
                                <div class="radio-group">
                                    <label class="radio-label">
                                        <input type="radio" name="backupFormat" value="json" checked>
                                        <span>JSON (Full data)</span>
                                    </label>
                                    <label class="radio-label">
                                        <input type="radio" name="backupFormat" value="csv">
                                        <span>CSV (Tabular data only)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Scheduled Backups -->
                    <div class="card">
                        <div class="card-header">
                            <h2>Scheduled Backups</h2>
                            <button class="btn btn-secondary btn-sm" id="configureScheduleBtn">
                                <span class="material-icons">schedule</span>
                                Configure
                            </button>
                        </div>
                        <div class="card-body">
                            <div id="scheduleInfo" class="schedule-info">
                                <p>No scheduled backups configured</p>
                            </div>
                        </div>
                    </div>

                    <!-- Backup History -->
                    <div class="card">
                        <div class="card-header">
                            <h2>Backup History</h2>
                            <button class="btn btn-secondary btn-sm" id="refreshHistoryBtn">
                                <span class="material-icons">refresh</span>
                                Refresh
                            </button>
                        </div>
                        <div class="card-body">
                            <div id="backupHistoryList" class="backup-history-list">
                                <div class="loading">Loading backup history...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Schedule Modal -->
            <div id="scheduleModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Configure Scheduled Backups</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Backup Frequency</label>
                            <select id="backupFrequency" class="form-control">
                                <option value="disabled">Disabled</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                        <div class="form-group" id="timeGroup" style="display: none;">
                            <label>Backup Time</label>
                            <input type="time" id="backupTime" class="form-control" value="02:00">
                        </div>
                        <div class="form-group" id="dayGroup" style="display: none;">
                            <label>Day of Week</label>
                            <select id="backupDay" class="form-control">
                                <option value="0">Sunday</option>
                                <option value="1">Monday</option>
                                <option value="2">Tuesday</option>
                                <option value="3">Wednesday</option>
                                <option value="4">Thursday</option>
                                <option value="5">Friday</option>
                                <option value="6">Saturday</option>
                            </select>
                        </div>
                        <div class="form-group" id="dateGroup" style="display: none;">
                            <label>Day of Month</label>
                            <input type="number" id="backupDate" class="form-control" min="1" max="28" value="1">
                        </div>
                        <div class="form-group">
                            <label>Retention Policy</label>
                            <select id="retentionPolicy" class="form-control">
                                <option value="7">Keep last 7 backups</option>
                                <option value="14">Keep last 14 backups</option>
                                <option value="30">Keep last 30 backups</option>
                                <option value="90">Keep last 90 backups</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').style.display='none'">Cancel</button>
                        <button class="btn btn-primary" id="saveScheduleBtn">Save Schedule</button>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Create backup button
        document.getElementById('createBackupBtn').addEventListener('click', () => this.createBackup());

        // Schedule configuration
        document.getElementById('configureScheduleBtn').addEventListener('click', () => {
            document.getElementById('scheduleModal').style.display = 'block';
            this.loadScheduleConfig();
        });

        // Schedule modal
        const modal = document.getElementById('scheduleModal');
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        document.getElementById('backupFrequency').addEventListener('change', (e) => {
            this.updateScheduleFields(e.target.value);
        });

        document.getElementById('saveScheduleBtn').addEventListener('click', () => this.saveSchedule());

        // Refresh history
        document.getElementById('refreshHistoryBtn').addEventListener('click', () => this.loadBackupHistory());
    }

    async createBackup() {
        if (this.backupInProgress) {
            showNotification('Backup already in progress', 'warning');
            return;
        }

        const selectedCollections = this.getSelectedCollections();
        if (selectedCollections.length === 0) {
            showNotification('Please select at least one collection to backup', 'warning');
            return;
        }

        const format = document.querySelector('input[name="backupFormat"]:checked').value;

        try {
            this.backupInProgress = true;
            document.getElementById('createBackupBtn').disabled = true;
            document.getElementById('createBackupBtn').innerHTML = `
                <span class="material-icons rotating">sync</span>
                Creating Backup...
            `;

            const response = await fetch('/api/backup/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                },
                body: JSON.stringify({
                    collections: selectedCollections,
                    format: format
                })
            });

            if (!response.ok) throw new Error('Failed to create backup');

            const result = await response.json();
            
            if (format === 'json') {
                // Download JSON file
                const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pyebwa-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                // Download CSV files (multiple files zipped)
                const response = await fetch(result.downloadUrl);
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pyebwa-backup-${new Date().toISOString().split('T')[0]}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            showNotification('Backup created successfully', 'success');
            this.loadBackupHistory();
        } catch (error) {
            console.error('Error creating backup:', error);
            showNotification('Failed to create backup', 'error');
        } finally {
            this.backupInProgress = false;
            document.getElementById('createBackupBtn').disabled = false;
            document.getElementById('createBackupBtn').innerHTML = `
                <span class="material-icons">backup</span>
                Create Backup
            `;
        }
    }

    getSelectedCollections() {
        const collections = [];
        if (document.getElementById('backupUsers').checked) collections.push('users');
        if (document.getElementById('backupTrees').checked) collections.push('familyTrees', 'persons');
        if (document.getElementById('backupContent').checked) collections.push('content');
        if (document.getElementById('backupStories').checked) collections.push('stories', 'events');
        if (document.getElementById('backupAudit').checked) collections.push('admin_logs');
        if (document.getElementById('backupAnnouncements').checked) collections.push('announcements');
        return collections;
    }

    async loadBackupHistory() {
        try {
            const response = await fetch('/api/backup/history', {
                headers: {
                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to load backup history');

            const history = await response.json();
            this.backupHistory = history;
            this.renderBackupHistory();
        } catch (error) {
            console.error('Error loading backup history:', error);
            document.getElementById('backupHistoryList').innerHTML = `
                <div class="error-message">Failed to load backup history</div>
            `;
        }
    }

    renderBackupHistory() {
        const container = document.getElementById('backupHistoryList');
        
        if (this.backupHistory.length === 0) {
            container.innerHTML = '<div class="empty-state">No backups found</div>';
            return;
        }

        container.innerHTML = `
            <div class="backup-history-table">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Size</th>
                            <th>Collections</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.backupHistory.map(backup => `
                            <tr>
                                <td>${formatDate(backup.created)}</td>
                                <td>
                                    <span class="badge badge-${backup.type === 'manual' ? 'primary' : 'secondary'}">
                                        ${backup.type}
                                    </span>
                                </td>
                                <td>${formatFileSize(backup.size)}</td>
                                <td>${backup.collections.join(', ')}</td>
                                <td>
                                    <span class="badge badge-${backup.status === 'completed' ? 'success' : 'warning'}">
                                        ${backup.status}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-secondary" onclick="backupModule.downloadBackup('${backup.id}')">
                                        <span class="material-icons">download</span>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="backupModule.deleteBackup('${backup.id}')">
                                        <span class="material-icons">delete</span>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async downloadBackup(backupId) {
        try {
            const response = await fetch(`/api/backup/download/${backupId}`, {
                headers: {
                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to download backup');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${backupId}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showNotification('Backup downloaded successfully', 'success');
        } catch (error) {
            console.error('Error downloading backup:', error);
            showNotification('Failed to download backup', 'error');
        }
    }

    async deleteBackup(backupId) {
        if (!confirm('Are you sure you want to delete this backup?')) return;

        try {
            const response = await fetch(`/api/backup/delete/${backupId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete backup');

            showNotification('Backup deleted successfully', 'success');
            this.loadBackupHistory();
        } catch (error) {
            console.error('Error deleting backup:', error);
            showNotification('Failed to delete backup', 'error');
        }
    }

    async loadScheduleConfig() {
        try {
            const response = await fetch('/api/backup/schedule', {
                headers: {
                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to load schedule config');

            const config = await response.json();
            
            document.getElementById('backupFrequency').value = config.frequency || 'disabled';
            document.getElementById('backupTime').value = config.time || '02:00';
            document.getElementById('backupDay').value = config.day || '0';
            document.getElementById('backupDate').value = config.date || '1';
            document.getElementById('retentionPolicy').value = config.retention || '30';

            this.updateScheduleFields(config.frequency || 'disabled');
        } catch (error) {
            console.error('Error loading schedule config:', error);
        }
    }

    updateScheduleFields(frequency) {
        const timeGroup = document.getElementById('timeGroup');
        const dayGroup = document.getElementById('dayGroup');
        const dateGroup = document.getElementById('dateGroup');

        timeGroup.style.display = 'none';
        dayGroup.style.display = 'none';
        dateGroup.style.display = 'none';

        if (frequency !== 'disabled') {
            timeGroup.style.display = 'block';
            if (frequency === 'weekly') {
                dayGroup.style.display = 'block';
            } else if (frequency === 'monthly') {
                dateGroup.style.display = 'block';
            }
        }

        this.updateScheduleInfo(frequency);
    }

    updateScheduleInfo(frequency) {
        const info = document.getElementById('scheduleInfo');
        if (frequency === 'disabled') {
            info.innerHTML = '<p>No scheduled backups configured</p>';
        } else {
            const time = document.getElementById('backupTime').value;
            let schedule = `<p><strong>Schedule:</strong> ${frequency} at ${time}`;
            
            if (frequency === 'weekly') {
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const day = days[document.getElementById('backupDay').value];
                schedule += ` on ${day}`;
            } else if (frequency === 'monthly') {
                const date = document.getElementById('backupDate').value;
                schedule += ` on day ${date}`;
            }
            
            schedule += '</p>';
            info.innerHTML = schedule;
        }
    }

    async saveSchedule() {
        const config = {
            frequency: document.getElementById('backupFrequency').value,
            time: document.getElementById('backupTime').value,
            day: document.getElementById('backupDay').value,
            date: document.getElementById('backupDate').value,
            retention: document.getElementById('retentionPolicy').value
        };

        try {
            const response = await fetch('/api/backup/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                },
                body: JSON.stringify(config)
            });

            if (!response.ok) throw new Error('Failed to save schedule');

            showNotification('Backup schedule saved successfully', 'success');
            document.getElementById('scheduleModal').style.display = 'none';
            this.updateScheduleInfo(config.frequency);
        } catch (error) {
            console.error('Error saving schedule:', error);
            showNotification('Failed to save backup schedule', 'error');
        }
    }
}

// Initialize and export
export const backupModule = new BackupModule();