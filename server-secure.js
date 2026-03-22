// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const { setupAdminEndpoint } = require('./server-admin-setup');
const { setupSecurity, authLimiter, apiLimiter, corsOptions } = require('./server/middleware/security');
const { createSecureSession, sessionTimeout, concurrentSessionCheck, deviceFingerprint, csrfProtection } = require('./server/middleware/session-security');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 9111;

// Apply security middleware first
const securityConfig = setupSecurity(app);

// CORS with security configuration
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Body parsing with size limits (already set in security middleware)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session management with security
if (process.env.SESSION_SECRET) {
    app.use(createSecureSession());
    app.use(sessionTimeout(parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30));
    
    // Enable concurrent session check if configured
    if (process.env.ENABLE_CONCURRENT_SESSION_CHECK === 'true') {
        app.use(concurrentSessionCheck);
    }
    
    app.use(deviceFingerprint);
}

// Initialize Firebase Admin SDK through centralized service
try {
    // Use environment variable for service account path
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    }
    
    require('./server/services/firebase-admin');
    console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error.message);
    console.error('Configure FIREBASE_SERVICE_ACCOUNT_PATH in .env or use individual credentials');
}

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Pyebwa app server is running',
        security: 'enhanced',
        timestamp: new Date().toISOString()
    });
});

// API endpoint for Firebase configuration (with rate limiting)
app.get('/api/firebase-config', apiLimiter, (req, res) => {
    // Check origin for additional security
    const origin = req.get('origin');
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
    
    if (process.env.NODE_ENV === 'production' && origin && !allowedOrigins.includes(origin)) {
        return res.status(403).json({ error: 'Origin not allowed' });
    }
    
    // Return Firebase config from environment variables
    const config = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };
    
    // Don't send config if any required field is missing
    for (const key in config) {
        if (!config[key]) {
            return res.status(500).json({ 
                error: 'Firebase configuration not properly set',
                message: 'Please configure Firebase environment variables'
            });
        }
    }
    
    res.json(config);
});

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
    if (!req.session) {
        return res.status(500).json({ error: 'Session not configured' });
    }
    
    const token = csrfProtection.generateToken(req);
    res.json({ csrfToken: token });
});

// Apply CSRF protection to all state-changing routes
app.use(csrfProtection.validateToken);

// Auth routes with strict rate limiting
const authRoutes = require('./server/api/auth');
app.use('/api/auth', authLimiter, authRoutes);

// Admin routes with authentication and rate limiting
app.get('/admin', (req, res) => {
    res.redirect('/app/admin/');
});

// Admin setup endpoint (protected with strict rate limiting)
const strictLimiter = securityConfig.strictLimiter;
app.post('/api/admin/setup', strictLimiter, setupAdminEndpoint);

// API routes with standard rate limiting
app.use('/api/notifications', apiLimiter, require('./server/api/notifications'));
app.use('/api/backup', apiLimiter, require('./server/api/backup'));
app.use('/api/system', apiLimiter, require('./server/api/system'));
app.use('/api/invites', apiLimiter, require('./server/api/invites'));

// Serve static files with security headers
app.use('/app', express.static(path.join(__dirname, 'app'), {
    setHeaders: (res, path) => {
        // Add cache headers for static assets
        if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.png') || path.endsWith('.jpg')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        }
    }
}));

// Authentication pages
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

// Service worker with proper headers
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, 'sw.js'));
});

// Favicon
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'favicon.ico'));
});

// Redirect root to /app
app.get('/', (req, res) => {
    const queryString = req.originalUrl.includes('?') ? req.originalUrl.substring(req.originalUrl.indexOf('?')) : '';
    res.redirect('/app' + queryString);
});

// Handle 404s
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'app', 'index.html'));
});

// Enhanced error handling
app.use((err, req, res, next) => {
    // Log error details server-side
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    
    // Send generic error to client (no stack traces)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.status(err.status || 500).json({
        error: isDevelopment ? err.message : 'An error occurred',
        code: err.code || 'INTERNAL_ERROR',
        ...(isDevelopment && { stack: err.stack })
    });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
🌳 Pyebwa Family Tree App Server (SECURE)
=========================================
Server running on 0.0.0.0:${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
Security: Enhanced with helmet, rate limiting, and session management

Local: http://0.0.0.0:${PORT}
External: https://rasin.pyebwa.com

App URL: https://rasin.pyebwa.com/app
Health: https://rasin.pyebwa.com/health

Security Features:
✅ Helmet.js security headers
✅ Rate limiting enabled
✅ CORS configured
✅ Session security
✅ Input validation
✅ CSRF protection
${process.env.ENABLE_CONCURRENT_SESSION_CHECK === 'true' ? '✅ Concurrent session detection' : ''}
    `);
});