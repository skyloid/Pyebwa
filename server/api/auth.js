const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

// Mock auth routes for testing
router.post('/register', async (req, res) => {
  try {
    const { email, displayName, familyTreeName } = req.body;
    
    // Basic validation
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    
    // Create user with Firebase Admin
    const user = await admin.auth().createUser({
      email,
      displayName,
      password: 'temp-' + Math.random().toString(36).slice(-8)
    });
    
    res.status(201).json({
      uid: user.uid,
      email: user.email,
      temporaryPassword: 'Generated password sent via email'
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    try {
      await admin.auth().getUserByEmail(email);
      // In real implementation, generate reset link
      res.json({ message: 'Password reset email sent' });
    } catch (error) {
      // Return success even for non-existent users (security)
      res.json({ message: 'If account exists, reset email sent' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Reset failed' });
  }
});

router.patch('/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const updateData = req.body;
    
    // Basic validation
    if (updateData.email && !updateData.email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    const user = await admin.auth().updateUser(uid, updateData);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

router.post('/user/:uid/claims', async (req, res) => {
  try {
    const { uid } = req.params;
    const { claims } = req.body;
    
    // Mock authorization check
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await admin.auth().setCustomUserClaims(uid, claims);
    res.json({ message: 'Claims updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Claims update failed' });
  }
});

module.exports = router;