const session = require('express-session');
const FirestoreStore = require('firestore-store')(session);
const { getFirestore } = require('firebase-admin/firestore');

// Session security configuration
const createSecureSession = () => {
    const db = getFirestore();
    
    return session({
        store: new FirestoreStore({
            database: db,
            collection: 'sessions',
        }),
        name: 'pyebwa_session',
        secret: process.env.SESSION_SECRET || require('crypto').randomBytes(64).toString('hex'),
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            httpOnly: true, // Prevent XSS
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict', // CSRF protection
            domain: '.pyebwa.com' // Allow across subdomains
        },
        rolling: true, // Reset expiry on activity
    });
};

// Session timeout middleware
const sessionTimeout = (timeoutMinutes = 30) => {
    return (req, res, next) => {
        if (req.session && req.session.user) {
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
    if (req.session && req.session.user) {
        const userId = req.session.user.uid;
        const sessionId = req.sessionID;
        
        try {
            const db = getFirestore();
            const userSessionRef = db.collection('userSessions').doc(userId);
            const doc = await userSessionRef.get();
            
            if (doc.exists) {
                const data = doc.data();
                if (data.activeSessionId && data.activeSessionId !== sessionId) {
                    // Another session is active
                    req.session.destroy();
                    return res.status(401).json({
                        error: 'Another session is active',
                        code: 'CONCURRENT_SESSION'
                    });
                }
            }
            
            // Update active session
            await userSessionRef.set({
                activeSessionId: sessionId,
                lastActive: new Date(),
                userAgent: req.headers['user-agent'],
                ip: req.ip
            }, { merge: true });
            
        } catch (error) {
            console.error('Concurrent session check error:', error);
        }
    }
    next();
};

// Device fingerprinting
const deviceFingerprint = (req, res, next) => {
    if (req.session && req.session.user) {
        const fingerprint = {
            userAgent: req.headers['user-agent'],
            acceptLanguage: req.headers['accept-language'],
            acceptEncoding: req.headers['accept-encoding'],
            ip: req.ip
        };
        
        if (!req.session.deviceFingerprint) {
            req.session.deviceFingerprint = Buffer.from(JSON.stringify(fingerprint)).toString('base64');
        } else {
            // Verify fingerprint hasn't changed significantly
            const currentFingerprint = Buffer.from(JSON.stringify(fingerprint)).toString('base64');
            if (currentFingerprint !== req.session.deviceFingerprint) {
                // Log suspicious activity
                console.warn('Device fingerprint mismatch for user:', req.session.user.uid);
                // Could implement additional verification here
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