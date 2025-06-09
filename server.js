const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = 9111;

// Middleware
app.use(cors({
    origin: ['https://www.pyebwa.com', 'https://pyebwa.com', 'https://secure.pyebwa.com', 'http://localhost:3000'],
    credentials: true
}));
app.use(compression());
app.use(express.json());

// Serve static files from the app directory
app.use('/app', express.static(path.join(__dirname, 'app')));

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

// Redirect root to /app (preserving query parameters)
app.get('/', (req, res) => {
    const queryString = req.originalUrl.includes('?') ? req.originalUrl.substring(req.originalUrl.indexOf('?')) : '';
    res.redirect('/app' + queryString);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Pyebwa app server is running' });
});

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