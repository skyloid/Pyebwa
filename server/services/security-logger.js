const winston = require('winston');
const path = require('path');
const { getFirestore } = require('firebase-admin/firestore');

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
        // Console output
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        // File output for errors
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/error.log'), 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // File output for all logs
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Security-specific logs
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/security.log'),
            level: 'warn',
            maxsize: 5242880, // 5MB
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

// Security logger class
class SecurityLogger {
    constructor() {
        this.logger = logger;
        this.db = null;
        this.initializeFirestore();
    }
    
    async initializeFirestore() {
        try {
            this.db = getFirestore();
            this.auditCollection = this.db.collection('securityAuditLogs');
        } catch (error) {
            this.logger.error('Failed to initialize Firestore for security logging:', error);
        }
    }
    
    // Log security event
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
        
        // Log to Firestore for audit trail
        if (this.db && this.auditCollection) {
            try {
                await this.auditCollection.add(event);
            } catch (error) {
                this.logger.error('Failed to write security event to Firestore:', error);
            }
        }
        
        // Check if event requires immediate alert
        if (this.requiresAlert(eventType, severity)) {
            await this.sendSecurityAlert(event);
        }
        
        return event;
    }
    
    // Track failed login attempts
    async trackFailedLogin(email, ip, reason) {
        const key = `failed_login:${email}`;
        // This would integrate with Redis in production
        // For now, we'll use in-memory tracking
        
        await this.logSecurityEvent(
            SecurityEvents.LOGIN_FAILED,
            email,
            { ip, reason },
            'warn'
        );
        
        // Check if account should be locked
        // Implementation would check Redis for attempt count
    }
    
    // Log successful login
    async logSuccessfulLogin(userId, email, ip, userAgent) {
        await this.logSecurityEvent(
            SecurityEvents.LOGIN_SUCCESS,
            userId,
            { email, ip, userAgent },
            'info'
        );
    }
    
    // Log suspicious activity
    async logSuspiciousActivity(userId, activity, details) {
        await this.logSecurityEvent(
            SecurityEvents.SUSPICIOUS_ACTIVITY,
            userId,
            { activity, ...details },
            'error'
        );
    }
    
    // Log rate limit violations
    async logRateLimitExceeded(ip, endpoint, userId = null) {
        await this.logSecurityEvent(
            SecurityEvents.RATE_LIMIT_EXCEEDED,
            userId,
            { ip, endpoint },
            'warn'
        );
    }
    
    // Log unauthorized access attempts
    async logUnauthorizedAccess(userId, resource, ip) {
        await this.logSecurityEvent(
            SecurityEvents.UNAUTHORIZED_ACCESS,
            userId,
            { resource, ip },
            'error'
        );
    }
    
    // Get security metrics
    async getSecurityMetrics(timeRange = '24h') {
        if (!this.db || !this.auditCollection) {
            return null;
        }
        
        const now = new Date();
        const startTime = new Date(now.getTime() - this.parseTimeRange(timeRange));
        
        try {
            const snapshot = await this.auditCollection
                .where('timestamp', '>=', startTime.toISOString())
                .get();
            
            const events = snapshot.docs.map(doc => doc.data());
            
            // Aggregate metrics
            const metrics = {
                totalEvents: events.length,
                byType: {},
                bySeverity: {},
                failedLogins: 0,
                suspiciousActivities: 0,
                rateLimitations: 0
            };
            
            events.forEach(event => {
                metrics.byType[event.eventType] = (metrics.byType[event.eventType] || 0) + 1;
                metrics.bySeverity[event.severity] = (metrics.bySeverity[event.severity] || 0) + 1;
                
                if (event.eventType === SecurityEvents.LOGIN_FAILED) metrics.failedLogins++;
                if (event.eventType === SecurityEvents.SUSPICIOUS_ACTIVITY) metrics.suspiciousActivities++;
                if (event.eventType === SecurityEvents.RATE_LIMIT_EXCEEDED) metrics.rateLimitViolations++;
            });
            
            return metrics;
        } catch (error) {
            this.logger.error('Failed to get security metrics:', error);
            return null;
        }
    }
    
    // Helper methods
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
        // In production, this would send to Slack, email, or monitoring service
        this.logger.error('🚨 SECURITY ALERT:', event);
        
        // TODO: Implement actual alerting (SendGrid, Slack, etc.)
    }
    
    parseTimeRange(timeRange) {
        const units = {
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
            w: 7 * 24 * 60 * 60 * 1000
        };
        
        const match = timeRange.match(/(\d+)([hdw])/);
        if (!match) return 24 * 60 * 60 * 1000; // Default 24h
        
        const [, num, unit] = match;
        return parseInt(num) * (units[unit] || units.h);
    }
}

// Create singleton instance
const securityLogger = new SecurityLogger();

// Export instance and event types
module.exports = {
    securityLogger,
    SecurityEvents,
    
    // Convenience methods
    logSecurityEvent: (...args) => securityLogger.logSecurityEvent(...args),
    trackFailedLogin: (...args) => securityLogger.trackFailedLogin(...args),
    logSuccessfulLogin: (...args) => securityLogger.logSuccessfulLogin(...args),
    logSuspiciousActivity: (...args) => securityLogger.logSuspiciousActivity(...args),
    logRateLimitExceeded: (...args) => securityLogger.logRateLimitExceeded(...args),
    logUnauthorizedAccess: (...args) => securityLogger.logUnauthorizedAccess(...args),
    getSecurityMetrics: (...args) => securityLogger.getSecurityMetrics(...args)
};