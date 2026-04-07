// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { setupAdminEndpoint } = require('./server-admin-setup');

const app = express();
const PORT = process.env.PORT || 9111;

// Trust proxy for correct req.ip behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Handled separately
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
});

// CORS
app.use(cors({
    origin: ['https://www.pyebwa.com', 'https://pyebwa.com', 'https://secure.pyebwa.com', 'https://rasin.pyebwa.com'],
    credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Legacy /uploads path - photos now stored in Supabase Storage
// Keep for backward compat if any old URLs exist
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Admin dashboard route
app.get('/admin', (req, res) => {
    res.redirect('/app/admin/');
});

// Admin page routes
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

function setVersionHeaders(res) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
}

function setAssetHeaders(res, filePath) {
    if (filePath.endsWith('.html') || filePath.endsWith('version.json')) {
        setVersionHeaders(res);
        return;
    }

    if (/\.(css|js|woff2?|ttf|eot)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return;
    }

    if (/\.(png|jpe?g|gif|svg|ico|webp)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return;
    }

    res.setHeader('Cache-Control', 'public, max-age=3600');
}

app.get('/version.json', (req, res) => {
    setVersionHeaders(res);
    res.sendFile(path.join(__dirname, 'app', 'version.json'));
});

app.get('/app/version.json', (req, res) => {
    setVersionHeaders(res);
    res.sendFile(path.join(__dirname, 'app', 'version.json'));
});

// Serve static files from the app directory
app.use('/app', express.static(path.join(__dirname, 'app'), {
    setHeaders: setAssetHeaders
}));

// Serve favicon.ico from root
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'favicon.ico'));
});

// Serve service worker from root
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    setVersionHeaders(res);
    res.sendFile(path.join(__dirname, 'sw.js'));
});

// Serve login/signup pages
app.get('/login.html', (req, res) => {
    setVersionHeaders(res);
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup.html', (req, res) => {
    setVersionHeaders(res);
    res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/signup-standalone.html', (req, res) => {
    setVersionHeaders(res);
    const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
    res.redirect(302, '/signup.html' + query);
});

app.get('/login-standalone.html', (req, res) => {
    setVersionHeaders(res);
    res.sendFile(path.join(__dirname, 'login-standalone.html'));
});

app.get('/reset-password.html', (req, res) => {
    setVersionHeaders(res);
    res.sendFile(path.join(__dirname, 'reset-password.html'));
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

// API routes with rate limiting
const notificationRoutes = require('./server/api/notifications');
app.use('/api/notifications', apiLimiter, notificationRoutes);

const backupRoutes = require('./server/api/backup');
app.use('/api/backup', apiLimiter, backupRoutes);

const systemRoutes = require('./server/api/system');
app.use('/api/system', apiLimiter, systemRoutes);

const inviteRoutes = require('./server/api/invites');
app.use('/api/invites', apiLimiter, inviteRoutes);

// Tree CRUD API
const treeRoutes = require('./server/api/trees');
app.use('/api/trees', apiLimiter, treeRoutes);

// File upload API
const uploadRoutes = require('./server/api/uploads');
app.use('/api/uploads', apiLimiter, uploadRoutes);

// Auth API routes (use secure auth module with rate limiting)
const authRoutes = require('./server/api/auth-secure');
app.use('/api/auth', authLimiter, authRoutes);

// Supabase proxy - forward /supabase/* to local Supabase Kong gateway
app.use('/supabase', createProxyMiddleware({
    target: 'http://127.0.0.1:8100',
    changeOrigin: true,
    pathRewrite: { '^/supabase': '' },
    ws: true
}));

// Handle 404s
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'app', 'index.html'));
});

// Error handling - never expose stack traces to client
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    res.status(err.status || 500).json({ error: 'An error occurred' });
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
Database: Supabase PostgreSQL
Auth: Supabase GoTrue (JWT)
    `);
});
