const admin = require('firebase-admin');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class SystemService {
    constructor() {
        this.db = admin.firestore();
        this.metrics = {
            cpu: [],
            memory: [],
            responseTime: [],
            errors: [],
            timestamps: []
        };
        this.startMetricsCollection();
    }

    async getSystemStatus() {
        try {
            const status = {
                server: await this.getServerStatus(),
                database: await this.getDatabaseStatus(),
                memory: this.getMemoryStatus(),
                api: await this.getAPIStatus(),
                services: await this.getServiceStatus(),
                maintenanceMode: await this.getMaintenanceMode()
            };

            return status;
        } catch (error) {
            console.error('Error getting system status:', error);
            throw error;
        }
    }

    async getServerStatus() {
        const uptime = process.uptime();
        
        return {
            status: 'Online',
            uptime: uptime,
            nodeVersion: process.version,
            platform: os.platform(),
            arch: os.arch()
        };
    }

    async getDatabaseStatus() {
        try {
            // Test Firestore connection
            const testDoc = await this.db.collection('system_health').doc('test').get();
            
            // Get collection count
            const collections = ['users', 'familyTrees', 'persons', 'stories', 'content', 'announcements', 'admin_logs'];
            let totalCollections = 0;
            
            for (const collection of collections) {
                try {
                    const snapshot = await this.db.collection(collection).limit(1).get();
                    if (!snapshot.empty) totalCollections++;
                } catch (error) {
                    console.warn(`Collection ${collection} not accessible:`, error.message);
                }
            }

            return {
                status: 'Connected',
                collections: totalCollections,
                type: 'Firestore'
            };
        } catch (error) {
            return {
                status: 'Error',
                collections: 0,
                error: error.message
            };
        }
    }

    getMemoryStatus() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;

        return {
            total: totalMemory,
            free: freeMemory,
            used: usedMemory,
            usage: (usedMemory / totalMemory) * 100
        };
    }

    async getAPIStatus() {
        // Get recent API metrics
        const now = Date.now();
        const recentMetrics = this.metrics.responseTime.slice(-10);
        const avgResponseTime = recentMetrics.length > 0 
            ? Math.round(recentMetrics.reduce((a, b) => a + b, 0) / recentMetrics.length)
            : 0;

        // Calculate requests per minute (approximate)
        const requestsPerMinute = this.metrics.responseTime.length > 0 
            ? Math.round(this.metrics.responseTime.length / (process.uptime() / 60))
            : 0;

        return {
            avgResponseTime,
            requestsPerMinute,
            status: avgResponseTime < 1000 ? 'Good' : 'Slow'
        };
    }

    async getServiceStatus() {
        const services = [];

        // Firebase Auth
        try {
            await admin.auth().listUsers(1);
            services.push({
                name: 'Firebase Auth',
                status: 'operational',
                details: 'Authentication service running'
            });
        } catch (error) {
            services.push({
                name: 'Firebase Auth',
                status: 'error',
                details: error.message
            });
        }

        // Firestore
        try {
            await this.db.collection('system_health').limit(1).get();
            services.push({
                name: 'Firestore',
                status: 'operational',
                details: 'Database connection active'
            });
        } catch (error) {
            services.push({
                name: 'Firestore',
                status: 'error',
                details: error.message
            });
        }

        // Cloud Storage
        try {
            const bucket = admin.storage().bucket();
            await bucket.getMetadata();
            services.push({
                name: 'Cloud Storage',
                status: 'operational',
                details: 'Storage service available'
            });
        } catch (error) {
            services.push({
                name: 'Cloud Storage',
                status: 'error',
                details: error.message
            });
        }

        // SendGrid (check if API key is configured)
        const sendGridKey = process.env.SENDGRID_API_KEY;
        services.push({
            name: 'SendGrid',
            status: sendGridKey ? 'operational' : 'not_configured',
            details: sendGridKey ? 'Email service configured' : 'API key not configured'
        });

        // FCM (check if configured)
        const fcmKey = process.env.FCM_SERVER_KEY;
        services.push({
            name: 'FCM',
            status: fcmKey ? 'operational' : 'not_configured',
            details: fcmKey ? 'Push notification service configured' : 'Server key not configured'
        });

        return services;
    }

    async getMaintenanceMode() {
        try {
            const configDoc = await this.db.collection('system_config').doc('maintenance').get();
            return configDoc.exists ? configDoc.data().enabled : false;
        } catch (error) {
            console.error('Error checking maintenance mode:', error);
            return false;
        }
    }

    async getMetrics(timeRange = '24h') {
        const now = Date.now();
        let startTime;

        switch (timeRange) {
            case '1h':
                startTime = now - (60 * 60 * 1000);
                break;
            case '7d':
                startTime = now - (7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startTime = now - (30 * 24 * 60 * 60 * 1000);
                break;
            default: // 24h
                startTime = now - (24 * 60 * 60 * 1000);
        }

        // Filter metrics by time range
        const filteredIndices = this.metrics.timestamps
            .map((timestamp, index) => timestamp >= startTime ? index : -1)
            .filter(index => index !== -1);

        return {
            timestamps: filteredIndices.map(i => new Date(this.metrics.timestamps[i]).toISOString()),
            cpu: filteredIndices.map(i => this.metrics.cpu[i] || 0),
            memory: filteredIndices.map(i => this.metrics.memory[i] || 0),
            responseTime: filteredIndices.map(i => this.metrics.responseTime[i] || 0),
            errors: filteredIndices.map(i => this.metrics.errors[i] || 0)
        };
    }

    startMetricsCollection() {
        // Collect metrics every minute
        setInterval(() => {
            this.collectMetrics();
        }, 60000); // 1 minute

        // Clean up old metrics (keep only last 30 days)
        setInterval(() => {
            this.cleanupOldMetrics();
        }, 3600000); // 1 hour
    }

    collectMetrics() {
        const timestamp = Date.now();
        
        // CPU usage (approximation using loadavg)
        const loadavg = os.loadavg();
        const cpuUsage = Math.min(100, (loadavg[0] / os.cpus().length) * 100);

        // Memory usage
        const memoryStatus = this.getMemoryStatus();
        const memoryUsageMB = Math.round(memoryStatus.used / 1024 / 1024);

        // Add to metrics arrays
        this.metrics.timestamps.push(timestamp);
        this.metrics.cpu.push(Math.round(cpuUsage));
        this.metrics.memory.push(memoryUsageMB);
        this.metrics.responseTime.push(0); // Will be updated by API calls
        this.metrics.errors.push(0); // Will be updated by error tracking

        // Limit arrays to last 30 days of data (30 * 24 * 60 = 43200 data points)
        const maxDataPoints = 43200;
        if (this.metrics.timestamps.length > maxDataPoints) {
            this.metrics.timestamps = this.metrics.timestamps.slice(-maxDataPoints);
            this.metrics.cpu = this.metrics.cpu.slice(-maxDataPoints);
            this.metrics.memory = this.metrics.memory.slice(-maxDataPoints);
            this.metrics.responseTime = this.metrics.responseTime.slice(-maxDataPoints);
            this.metrics.errors = this.metrics.errors.slice(-maxDataPoints);
        }
    }

    recordAPICall(responseTime) {
        // Update the most recent response time metric
        if (this.metrics.responseTime.length > 0) {
            this.metrics.responseTime[this.metrics.responseTime.length - 1] = responseTime;
        }
    }

    recordError() {
        // Increment the most recent error count
        if (this.metrics.errors.length > 0) {
            this.metrics.errors[this.metrics.errors.length - 1]++;
        }
    }

    cleanupOldMetrics() {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        const cutoffIndex = this.metrics.timestamps.findIndex(timestamp => timestamp >= thirtyDaysAgo);
        
        if (cutoffIndex > 0) {
            this.metrics.timestamps = this.metrics.timestamps.slice(cutoffIndex);
            this.metrics.cpu = this.metrics.cpu.slice(cutoffIndex);
            this.metrics.memory = this.metrics.memory.slice(cutoffIndex);
            this.metrics.responseTime = this.metrics.responseTime.slice(cutoffIndex);
            this.metrics.errors = this.metrics.errors.slice(cutoffIndex);
        }
    }

    async getSystemLogs() {
        try {
            // Get logs from Firestore (you might want to implement file-based logging)
            const snapshot = await this.db.collection('system_logs')
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();

            const logs = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                logs.push({
                    id: doc.id,
                    timestamp: data.timestamp.toDate(),
                    level: data.level,
                    message: data.message,
                    module: data.module
                });
            });

            return logs;
        } catch (error) {
            console.error('Error getting system logs:', error);
            // Return some sample logs if collection doesn't exist
            return [
                {
                    id: '1',
                    timestamp: new Date(),
                    level: 'info',
                    message: 'System started successfully',
                    module: 'system'
                }
            ];
        }
    }

    async clearSystemLogs() {
        try {
            const snapshot = await this.db.collection('system_logs').get();
            const batch = this.db.batch();

            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            return { success: true, cleared: snapshot.size };
        } catch (error) {
            console.error('Error clearing system logs:', error);
            throw error;
        }
    }

    async getConfiguration() {
        try {
            // Get environment variables (filtered for security)
            const env = {
                NODE_ENV: { value: process.env.NODE_ENV, sensitive: false, readonly: true },
                PORT: { value: process.env.PORT, sensitive: false, readonly: true },
                FIREBASE_PROJECT_ID: { value: process.env.FIREBASE_PROJECT_ID, sensitive: false, readonly: true },
                SENDGRID_API_KEY: { value: process.env.SENDGRID_API_KEY ? '••••••••' : 'Not set', sensitive: true, readonly: false },
                SENDER_EMAIL: { value: process.env.SENDER_EMAIL, sensitive: false, readonly: false },
                FCM_SERVER_KEY: { value: process.env.FCM_SERVER_KEY ? '••••••••' : 'Not set', sensitive: true, readonly: false },
                VAPID_KEY: { value: process.env.VAPID_KEY ? '••••••••' : 'Not set', sensitive: true, readonly: false }
            };

            // Get feature flags
            const featuresDoc = await this.db.collection('system_config').doc('features').get();
            const features = featuresDoc.exists ? featuresDoc.data() : {
                pushNotifications: true,
                emailNotifications: true,
                maintenanceMode: false,
                backupEnabled: true,
                auditLogging: true
            };

            return { env, features };
        } catch (error) {
            console.error('Error getting configuration:', error);
            throw error;
        }
    }

    async saveConfiguration(config) {
        try {
            // Update feature flags
            if (config.features) {
                await this.db.collection('system_config').doc('features').set({
                    ...config.features,
                    updatedAt: admin.firestore.Timestamp.now()
                });
            }

            // Environment variables would typically be handled differently in production
            // For security reasons, we don't update env vars through the API in this example
            console.log('Configuration saved:', config);

            return { success: true };
        } catch (error) {
            console.error('Error saving configuration:', error);
            throw error;
        }
    }

    async setMaintenanceMode(enabled, options = {}) {
        try {
            const config = {
                enabled,
                message: options.message || 'Site is currently under maintenance',
                duration: options.duration || 30,
                allowAdmins: options.allowAdmins !== false,
                enabledAt: enabled ? admin.firestore.Timestamp.now() : null,
                enabledBy: options.adminId || 'system'
            };

            await this.db.collection('system_config').doc('maintenance').set(config);

            // Log the maintenance mode change
            await this.logSystemEvent(
                enabled ? 'maintenance_enabled' : 'maintenance_disabled',
                `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
                { adminId: options.adminId }
            );

            return { success: true };
        } catch (error) {
            console.error('Error setting maintenance mode:', error);
            throw error;
        }
    }

    async logSystemEvent(type, message, metadata = {}) {
        try {
            await this.db.collection('system_logs').add({
                timestamp: admin.firestore.Timestamp.now(),
                level: 'info',
                message,
                module: 'system',
                type,
                metadata
            });
        } catch (error) {
            console.error('Error logging system event:', error);
        }
    }

    async getHealthCheck() {
        try {
            const status = await this.getSystemStatus();
            
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: os.loadavg(),
                services: status.services.map(s => ({
                    name: s.name,
                    status: s.status
                }))
            };

            // Determine overall health
            const hasErrors = status.services.some(s => s.status === 'error');
            if (hasErrors) {
                health.status = 'degraded';
            }

            return health;
        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }
}

module.exports = SystemService;