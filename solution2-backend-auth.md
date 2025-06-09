# Solution 2: Backend Authentication Service

## Overview
Implement a backend service that handles authentication and generates proper Firebase custom tokens.

## Implementation Steps

### 1. Create Node.js Authentication Service
```javascript
// auth-service/server.js
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'pyebwa-8f81f'
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        // Verify credentials with your auth system
        const user = await verifyUser(email, password);
        
        // Generate Firebase custom token
        const customToken = await admin.auth().createCustomToken(user.uid);
        
        // Return token
        res.json({ 
            success: true, 
            token: customToken,
            user: { email: user.email, uid: user.uid }
        });
    } catch (error) {
        res.status(401).json({ success: false, error: error.message });
    }
});

// Token verification endpoint
app.post('/api/verify', async (req, res) => {
    const { token } = req.body;
    
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        res.json({ success: true, user: decodedToken });
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

app.listen(3000);
```

### 2. Update secure.pyebwa.com to use the service
```javascript
// secure.pyebwa.com login handler
async function handleLogin(email, password) {
    const response = await fetch('https://api.pyebwa.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
        // Redirect with token
        const redirectUrl = getRedirectUrl();
        window.location.href = `${redirectUrl}?token=${data.token}&auth=success`;
    }
}
```

### 3. Update auth-token-bridge.js
```javascript
// Now it will receive a proper token
if (authToken) {
    firebase.auth().signInWithCustomToken(authToken)
        .then((result) => {
            console.log('Successfully authenticated');
            // Continue to app
        })
        .catch((error) => {
            console.error('Token authentication failed:', error);
        });
}
```

## Advantages
- Proper token generation
- Centralized authentication
- Works across domains
- Scalable solution

## Requirements
- Node.js server
- Firebase Admin SDK
- SSL certificate for API domain