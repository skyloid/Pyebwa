// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { setupAdminEndpoint } = require('./server-admin-setup');

// Initialize Firebase Admin SDK through centralized service
try {
    require('./server/services/firebase-admin');
    console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error.message);
    console.error('Make sure serviceAccountKey.json exists and is valid');
}

const app = express();
const PORT = process.env.PORT || 9111;

// Middleware
app.use(cors({
    origin: ['https://www.pyebwa.com', 'https://pyebwa.com', 'https://secure.pyebwa.com', 'http://localhost:3000'],
    credentials: true
}));
app.use(compression());
app.use(express.json());

// API endpoint for Firebase configuration
app.get('/api/firebase-config', (req, res) => {
    // Return Firebase config from environment variables
    const requiredKeys = ['FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID'];
    const missing = requiredKeys.filter(k => !process.env[k]);
    if (missing.length > 0) {
        return res.status(500).json({ error: 'Firebase config not set. Missing: ' + missing.join(', ') });
    }

    const config = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };
    
    res.json(config);
});

// New admin dashboard route (temporarily redirect to old admin)
app.get('/admin', (req, res) => {
    // For now, redirect to the existing admin interface
    // Once React app is working, we can proxy to it
    res.redirect('/app/admin/');
});

// Old admin routes (kept for backward compatibility)
app.get('/app/admin/setup-admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'app/admin/setup-admin.html'));
});

app.get('/app/admin/setup-simple.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'app/admin/setup-simple.html'));
});

app.get('/app/admin/manual-setup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'app/admin/manual-setup.html'));
});

app.get('/app/admin/promote-claude.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'app/admin/promote-claude.html'));
});

app.get('/app/admin/promote-claude-auth.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'app/admin/promote-claude-auth.html'));
});

app.get('/app/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'app/admin/index.html'));
});

app.get('/app/admin/', (req, res) => {
    res.sendFile(path.join(__dirname, 'app/admin/index.html'));
});

// Invite page route - must come before static files
app.get('/app/invite/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'app/invite.html'));
});

// Serve static files from the app directory
app.use('/app', express.static(path.join(__dirname, 'app')));

// Serve favicon.ico from root
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'favicon.ico'));
});

// Serve service worker from root
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'sw.js'));
});

// Serve login.html
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Serve signup.html
app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

// Serve standalone signup page (no external scripts)
app.get('/signup-standalone.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup-standalone.html'));
});

// Serve standalone login page (no external scripts)
app.get('/login-standalone.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login-standalone.html'));
});

// Redirect root to /app (preserving query parameters)
app.get('/', (req, res) => {
    const queryString = req.originalUrl.includes('?') ? req.originalUrl.substring(req.originalUrl.indexOf('?')) : '';
    res.redirect('/app' + queryString);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Pyebwa app server is running' });
});

// Admin setup endpoint (protected)
app.post('/api/admin/setup', setupAdminEndpoint);

// Notification API routes
const notificationRoutes = require('./server/api/notifications');
app.use('/api/notifications', notificationRoutes);

// Backup API routes
const backupRoutes = require('./server/api/backup');
app.use('/api/backup', backupRoutes);

// System management API routes  
const systemRoutes = require('./server/api/system');
app.use('/api/system', systemRoutes);

// Invite API routes
const inviteRoutes = require('./server/api/invites');
app.use('/api/invites', inviteRoutes);

// Auth API routes
const authRoutes = require('./server/api/auth');
app.use('/api/auth', authRoutes);

// Handle 404s
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'app', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
🌳 Pyebwa Family Tree App Server
================================
Server running on 0.0.0.0:${PORT}
Local: http://0.0.0.0:${PORT}
External: https://rasin.pyebwa.com

App URL: https://rasin.pyebwa.com/app
Health: https://rasin.pyebwa.com/health
    `);
});