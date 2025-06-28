// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { setupAdminEndpoint } = require('./server-admin-setup');

// Initialize Firebase Admin SDK (if not already initialized)
const admin = require('firebase-admin');
if (!admin.apps.length) {
    try {
        const serviceAccount = require('./serviceAccountKey.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL || "https://pyebwa-f5960.firebaseio.com"
        });
        console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
        console.error('❌ Firebase Admin SDK initialization failed:', error.message);
        console.error('Make sure serviceAccountKey.json exists and is valid');
    }
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

// Serve test pages
app.get('/test-auth-flow-final.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-auth-flow-final.html'));
});

app.get('/verify-firebase-auth.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'verify-firebase-auth.html'));
});

// Diagnostic tools
app.get('/diagnose-admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'diagnose-admin.html'));
});

app.get('/admin-diagnostic.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-diagnostic.html'));
});

// Server admin setup page
app.get('/server-admin-setup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'server-admin-setup.html'));
});

// Quick admin fix page
app.get('/quick-admin-fix.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'quick-admin-fix.html'));
});

// Test audit log page
app.get('/test-audit-log.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-audit-log.html'));
});

// Admin status check page
app.get('/admin-status-check.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-status-check.html'));
});

// Verify admin status page
app.get('/verify-admin-status.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'verify-admin-status.html'));
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