const winston = require('winston');
const path = require('path');

// Create winston logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'pyebwa-security' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            maxsize: 5242880,
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/security.log'),
            level: 'warn',
            maxsize: 5242880,
            maxFiles: 10
        })
    ]
});

// Security event types
const SecurityEvents = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT: 'LOGOUT',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    CONCURRENT_SESSION: 'CONCURRENT_SESSION',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    CSRF_VIOLATION: 'CSRF_VIOLATION',
    INVALID_INPUT: 'INVALID_INPUT',
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
    ADMIN_ACTION: 'ADMIN_ACTION',
    DATA_EXPORT: 'DATA_EXPORT',
    PASSWORD_RESET: 'PASSWORD_RESET',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    API_KEY_USED: 'API_KEY_USED',
    FILE_UPLOAD: 'FILE_UPLOAD',
    CONFIGURATION_CHANGE: 'CONFIGURATION_CHANGE'
};

class SecurityLogger {
    constructor() {
        this.logger = logger;
        this.db = null;
        this.initializeDB();
    }

    async initializeDB() {
        try {
            // Lazy-load pool to avoid circular deps during startup
            const { query } = require('../db/pool');
            this.query = query;
        } catch (error) {
            this.logger.warn('Database not available for security logging, using file logs only');
        }
    }

    async logSecurityEvent(eventType, userId, details = {}, severity = 'info') {
        const event = {
            timestamp: new Date().toISOString(),
            eventType,
            userId: userId || 'anonymous',
            severity,
            details,
            ip: details.ip || 'unknown',
            userAgent: details.userAgent || 'unknown',
            ...this.getEnvironmentInfo()
        };

        // Log to Winston
        this.logger.log(severity, `Security Event: ${eventType}`, event);

        // Log to PostgreSQL
        if (this.query) {
            try {
                await this.query(
                    'INSERT INTO admin_logs (action, user_id, details, ip_address) VALUES ($1, $2, $3, $4)',
                    [eventType, userId || 'anonymous', JSON.stringify(details), details.ip || null]
                );
            } catch (error) {
                this.logger.error('Failed to write security event to database:', error);
            }
        }

        if (this.requiresAlert(eventType, severity)) {
            await this.sendSecurityAlert(event);
        }

        return event;
    }

    async trackFailedLogin(email, ip, reason) {
        await this.logSecurityEvent(
            SecurityEvents.LOGIN_FAILED,
            email,
            { ip, reason },
            'warn'
        );
    }

    async logSuccessfulLogin(userId, email, ip, userAgent) {
        await this.logSecurityEvent(
            SecurityEvents.LOGIN_SUCCESS,
            userId,
            { email, ip, userAgent },
            'info'
        );
    }

    async logSuspiciousActivity(userId, activity, details) {
        await this.logSecurityEvent(
            SecurityEvents.SUSPICIOUS_ACTIVITY,
            userId,
            { activity, ...details },
            'error'
        );
    }

    async logRateLimitExceeded(ip, endpoint, userId = null) {
        await this.logSecurityEvent(
            SecurityEvents.RATE_LIMIT_EXCEEDED,
            userId,
            { ip, endpoint },
            'warn'
        );
    }

    async logUnauthorizedAccess(userId, resource, ip) {
        await this.logSecurityEvent(
            SecurityEvents.UNAUTHORIZED_ACCESS,
            userId,
            { resource, ip },
            'error'
        );
    }

    async getSecurityMetrics(timeRange = '24h') {
        if (!this.query) return null;

        const ms = this.parseTimeRange(timeRange);
        const since = new Date(Date.now() - ms);

        try {
            const result = await this.query(
                'SELECT action, COUNT(*) as count FROM admin_logs WHERE created_at >= $1 GROUP BY action',
                [since]
            );

            const metrics = {
                totalEvents: 0,
                byType: {},
                failedLogins: 0,
                suspiciousActivities: 0
            };

            result.rows.forEach(row => {
                metrics.byType[row.action] = parseInt(row.count);
                metrics.totalEvents += parseInt(row.count);
                if (row.action === SecurityEvents.LOGIN_FAILED) metrics.failedLogins = parseInt(row.count);
                if (row.action === SecurityEvents.SUSPICIOUS_ACTIVITY) metrics.suspiciousActivities = parseInt(row.count);
            });

            return metrics;
        } catch (error) {
            this.logger.error('Failed to get security metrics:', error);
            return null;
        }
    }

    getEnvironmentInfo() {
        return {
            nodeEnv: process.env.NODE_ENV,
            serverTime: new Date().toISOString(),
            hostname: require('os').hostname()
        };
    }

    requiresAlert(eventType, severity) {
        const alertEvents = [
            SecurityEvents.SUSPICIOUS_ACTIVITY,
            SecurityEvents.UNAUTHORIZED_ACCESS,
            SecurityEvents.ACCOUNT_LOCKED,
            SecurityEvents.CONFIGURATION_CHANGE
        ];
        return alertEvents.includes(eventType) || severity === 'error';
    }

    async sendSecurityAlert(event) {
        this.logger.error('SECURITY ALERT:', event);
    }

    parseTimeRange(timeRange) {
        const units = { h: 3600000, d: 86400000, w: 604800000 };
        const match = timeRange.match(/(\d+)([hdw])/);
        if (!match) return 86400000;
        return parseInt(match[1]) * (units[match[2]] || units.h);
    }
}

const securityLogger = new SecurityLogger();

module.exports = {
    securityLogger,
    SecurityEvents,
    logSecurityEvent: (...args) => securityLogger.logSecurityEvent(...args),
    trackFailedLogin: (...args) => securityLogger.trackFailedLogin(...args),
    logSuccessfulLogin: (...args) => securityLogger.logSuccessfulLogin(...args),
    logSuspiciousActivity: (...args) => securityLogger.logSuspiciousActivity(...args),
    logRateLimitExceeded: (...args) => securityLogger.logRateLimitExceeded(...args),
    logUnauthorizedAccess: (...args) => securityLogger.logUnauthorizedAccess(...args),
    getSecurityMetrics: (...args) => securityLogger.getSecurityMetrics(...args)
};
