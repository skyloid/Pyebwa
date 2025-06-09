// Authentication Bridge Endpoint
// This creates a bridge for cross-domain authentication

const express = require('express');
const router = express.Router();

// Temporary token store (in production, use Redis or similar)
const tokenStore = new Map();

// Generate a temporary bridge token
function generateBridgeToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Store auth info temporarily
router.post('/bridge/create', async (req, res) => {
    try {
        const { uid, email, idToken } = req.body;
        
        if (!uid || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Generate bridge token
        const bridgeToken = generateBridgeToken();
        
        // Store with 5-minute expiry
        tokenStore.set(bridgeToken, {
            uid,
            email,
            idToken,
            timestamp: Date.now(),
            expires: Date.now() + (5 * 60 * 1000) // 5 minutes
        });
        
        // Clean up old tokens
        for (const [token, data] of tokenStore.entries()) {
            if (Date.now() > data.expires) {
                tokenStore.delete(token);
            }
        }
        
        res.json({ bridgeToken });
    } catch (error) {
        console.error('Bridge create error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Retrieve auth info
router.get('/bridge/retrieve/:token', (req, res) => {
    try {
        const { token } = req.params;
        const data = tokenStore.get(token);
        
        if (!data) {
            return res.status(404).json({ error: 'Token not found' });
        }
        
        if (Date.now() > data.expires) {
            tokenStore.delete(token);
            return res.status(410).json({ error: 'Token expired' });
        }
        
        // Delete token after retrieval (one-time use)
        tokenStore.delete(token);
        
        res.json({
            uid: data.uid,
            email: data.email,
            idToken: data.idToken
        });
    } catch (error) {
        console.error('Bridge retrieve error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;