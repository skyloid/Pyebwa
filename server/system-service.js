const { pool, query } = require('./db/pool');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class SystemService {
    constructor() {
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
            await query('SELECT 1');

            const tables = ['users', 'family_trees', 'persons', 'invites', 'admin_logs', 'announcements', 'content'];
            let totalTables = 0;

            for (const table of tables) {
                try {
                    await query(`SELECT 1 FROM ${table} LIMIT 1`);
                    totalTables++;
                } catch (error) {
                    // Table might not exist yet
                }
            }

            return {
                status: 'Connected',
                tables: totalTables,
                type: 'PostgreSQL'
            };
        } catch (error) {
            return {
                status: 'Error',
                tables: 0,
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
        const recentMetrics = this.metrics.responseTime.slice(-10);
        const avgResponseTime = recentMetrics.length > 0
            ? Math.round(recentMetrics.reduce((a, b) => a + b, 0) / recentMetrics.length)
            : 0;

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

        // PostgreSQL
        try {
            await query('SELECT 1');
            services.push({
                name: 'PostgreSQL',
                status: 'operational',
                details: 'Database connection active'
            });
        } catch (error) {
            services.push({
                name: 'PostgreSQL',
                status: 'error',
                details: error.message
            });
        }

        // Session Auth
        services.push({
            name: 'Session Auth',
            status: 'operational',
            details: 'Session-based authentication active'
        });

        // Local File Storage
        try {
            const uploadsDir = path.join(__dirname, '../uploads');
            await fs.access(uploadsDir);
            services.push({
                name: 'File Storage',
                status: 'operational',
                details: 'Local file storage available'
            });
        } catch (error) {
            services.push({
                name: 'File Storage',
                status: 'not_configured',
                details: 'Uploads directory not found'
            });
        }

        // SendGrid
        const sendGridKey = process.env.SENDGRID_API_KEY;
        services.push({
            name: 'SendGrid',
            status: sendGridKey ? 'operational' : 'not_configured',
            details: sendGridKey ? 'Email service configured' : 'API key not configured'
        });

        return services;
    }

    async getMaintenanceMode() {
        try {
            const result = await query(
                `SELECT value FROM content WHERE key = 'maintenance'`
            );
            if (result.rows.length === 0) return false;
            const data = typeof result.rows[0].value === 'string'
                ? JSON.parse(result.rows[0].value)
                : result.rows[0].value;
            return data.enabled || false;
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
            default:
                startTime = now - (24 * 60 * 60 * 1000);
        }

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
        setInterval(() => {
            this.collectMetrics();
        }, 60000);

        setInterval(() => {
            this.cleanupOldMetrics();
        }, 3600000);
    }

    collectMetrics() {
        const timestamp = Date.now();

        const loadavg = os.loadavg();
        const cpuUsage = Math.min(100, (loadavg[0] / os.cpus().length) * 100);

        const memoryStatus = this.getMemoryStatus();
        const memoryUsageMB = Math.round(memoryStatus.used / 1024 / 1024);

        this.metrics.timestamps.push(timestamp);
        this.metrics.cpu.push(Math.round(cpuUsage));
        this.metrics.memory.push(memoryUsageMB);
        this.metrics.responseTime.push(0);
        this.metrics.errors.push(0);

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
        if (this.metrics.responseTime.length > 0) {
            this.metrics.responseTime[this.metrics.responseTime.length - 1] = responseTime;
        }
    }

    recordError() {
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
            const result = await query(
                `SELECT id, action as type, user_id, details, created_at as timestamp
                 FROM admin_logs ORDER BY created_at DESC LIMIT 100`
            );
            return result.rows.map(row => ({
                id: row.id,
                timestamp: row.timestamp,
                level: 'info',
                message: row.action || row.type,
                module: 'system',
                details: row.details
            }));
        } catch (error) {
            console.error('Error getting system logs:', error);
            return [{
                id: '1',
                timestamp: new Date(),
                level: 'info',
                message: 'System started successfully',
                module: 'system'
            }];
        }
    }

    async clearSystemLogs() {
        try {
            const result = await query(`DELETE FROM admin_logs`);
            return { success: true, cleared: result.rowCount };
        } catch (error) {
            console.error('Error clearing system logs:', error);
            throw error;
        }
    }

    async getConfiguration() {
        try {
            const env = {
                NODE_ENV: { value: process.env.NODE_ENV, sensitive: false, readonly: true },
                PORT: { value: process.env.PORT, sensitive: false, readonly: true },
                DATABASE_URL: { value: process.env.DATABASE_URL ? '••••••••' : 'Not set', sensitive: true, readonly: true },
                SENDGRID_API_KEY: { value: process.env.SENDGRID_API_KEY ? '••••••••' : 'Not set', sensitive: true, readonly: false },
                SENDER_EMAIL: { value: process.env.SENDER_EMAIL, sensitive: false, readonly: false }
            };

            let features = {
                emailNotifications: true,
                maintenanceMode: false,
                backupEnabled: true,
                auditLogging: true
            };

            try {
                const result = await query(
                    `SELECT value FROM content WHERE key = 'features'`
                );
                if (result.rows.length > 0) {
                    features = typeof result.rows[0].value === 'string'
                        ? JSON.parse(result.rows[0].value)
                        : result.rows[0].value;
                }
            } catch (e) {
                // Use defaults
            }

            return { env, features };
        } catch (error) {
            console.error('Error getting configuration:', error);
            throw error;
        }
    }

    async saveConfiguration(config) {
        try {
            if (config.features) {
                await query(
                    `INSERT INTO content (id, key, value, updated_at) VALUES (gen_random_uuid(), 'features', $1, NOW())
                     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
                    [JSON.stringify({ ...config.features, updatedAt: new Date().toISOString() })]
                );
            }

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
                enabledAt: enabled ? new Date().toISOString() : null,
                enabledBy: options.adminId || 'system'
            };

            await query(
                `INSERT INTO content (id, key, value, updated_at) VALUES (gen_random_uuid(), 'maintenance', $1, NOW())
                 ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
                [JSON.stringify(config)]
            );

            await query(
                `INSERT INTO admin_logs (action, user_id, details) VALUES ($1, $2, $3)`,
                [
                    enabled ? 'maintenance_enabled' : 'maintenance_disabled',
                    options.adminId || null,
                    JSON.stringify({ message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}` })
                ]
            );

            return { success: true };
        } catch (error) {
            console.error('Error setting maintenance mode:', error);
            throw error;
        }
    }

    async logSystemEvent(type, message, metadata = {}) {
        try {
            await query(
                `INSERT INTO admin_logs (action, user_id, details) VALUES ($1, $2, $3)`,
                [type, metadata.adminId || null, JSON.stringify({ message, ...metadata })]
            );
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
