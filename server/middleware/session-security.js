const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('../db/pool');

// Session security configuration
const createSecureSession = () => {
    if (!process.env.SESSION_SECRET) {
        throw new Error('SESSION_SECRET environment variable is required. Server cannot start without it.');
    }

    return session({
        store: new pgSession({
            pool: pool,
            tableName: 'session',
            createTableIfMissing: true
        }),
        name: 'pyebwa.sid',
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: 'lax'
        },
        rolling: true,
    });
};

// Session timeout middleware
const sessionTimeout = (timeoutMinutes = 30) => {
    return (req, res, next) => {
        if (req.session && req.session.userId) {
            const now = Date.now();
            const lastActivity = req.session.lastActivity || now;
            const timeSinceActivity = now - lastActivity;

            if (timeSinceActivity > timeoutMinutes * 60 * 1000) {
                req.session.destroy((err) => {
                    if (err) console.error('Session destruction error:', err);
                });
                return res.status(401).json({
                    error: 'Session expired',
                    code: 'SESSION_TIMEOUT'
                });
            }

            req.session.lastActivity = now;
        }
        next();
    };
};

// Concurrent session detection
const concurrentSessionCheck = async (req, res, next) => {
    if (req.session && req.session.userId) {
        const userId = req.session.userId;
        const sessionId = req.sessionID;

        try {
            // Check if another session is active for this user
            const result = await pool.query(
                `SELECT sess FROM session
                 WHERE sess->>'userId' = $1 AND sid != $2
                 AND expire > NOW()`,
                [userId, sessionId]
            );

            if (result.rows.length > 0) {
                // Multiple sessions exist - allow but log
                console.log(`Multiple active sessions for user ${userId}`);
            }
        } catch (error) {
            console.error('Concurrent session check error:', error);
        }
    }
    next();
};

// Device fingerprinting
const deviceFingerprint = (req, res, next) => {
    if (req.session && req.session.userId) {
        const fingerprint = {
            userAgent: req.headers['user-agent'],
            acceptLanguage: req.headers['accept-language'],
            acceptEncoding: req.headers['accept-encoding'],
            ip: req.ip
        };

        if (!req.session.deviceFingerprint) {
            req.session.deviceFingerprint = Buffer.from(JSON.stringify(fingerprint)).toString('base64');
        } else {
            const currentFingerprint = Buffer.from(JSON.stringify(fingerprint)).toString('base64');
            if (currentFingerprint !== req.session.deviceFingerprint) {
                console.warn('Device fingerprint mismatch for user:', req.session.userId);
            }
        }
    }
    next();
};

// CSRF token generation and validation
const csrfProtection = {
    generateToken: (req) => {
        if (!req.session.csrfToken) {
            req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
        }
        return req.session.csrfToken;
    },

    validateToken: (req, res, next) => {
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
            const token = req.headers['x-csrf-token'] || req.body._csrf;

            if (!token || token !== req.session.csrfToken) {
                return res.status(403).json({
                    error: 'Invalid CSRF token',
                    code: 'CSRF_VALIDATION_FAILED'
                });
            }
        }
        next();
    }
};

module.exports = {
    createSecureSession,
    sessionTimeout,
    concurrentSessionCheck,
    deviceFingerprint,
    csrfProtection
};
