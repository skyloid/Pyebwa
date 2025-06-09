const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 9112;

// Enable CORS for all domains that need to access this server
app.use(cors({
    origin: [
        'https://www.pyebwa.com',
        'https://pyebwa.com',
        'https://rasin.pyebwa.com',
        'https://secure.pyebwa.com',
        'http://localhost:3000' // for development
    ],
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve auth page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Login route (redirects to root for now)
app.get('/login', (req, res) => {
    const redirect = req.query.redirect || '';
    res.redirect('/?redirect=' + encodeURIComponent(redirect));
});

// API endpoint for token verification (placeholder)
app.post('/api/verify-token', (req, res) => {
    // This would normally verify a Firebase ID token
    // For now, return a placeholder response
    res.json({ 
        valid: false, 
        message: 'Token verification not yet implemented',
        timestamp: new Date().toISOString()
    });
});

// Start server on all interfaces (0.0.0.0) to make it publicly accessible
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Authentication server running on port ${PORT}`);
    console.log(`Server is accessible at:`);
    console.log(`  - http://localhost:${PORT}`);
    console.log(`  - http://145.223.119.193:${PORT}`);
    console.log(`  - https://secure.pyebwa.com (via proxy)`);
});