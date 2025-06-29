const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const emailService = require('../services/email');
const { admin, db } = require('../services/firebase-admin');

// Password reset request
router.post('/password-reset/request', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        // Get user by email
        const userRecord = await admin.auth().getUserByEmail(email);
        if (!userRecord) {
            // Don't reveal if email exists or not for security
            return res.json({ 
                success: true, 
                message: 'If the email exists, a password reset link has been sent' 
            });
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        // Store reset token in database
        await db.collection('passwordResets').doc(hashedToken).set({
            userId: userRecord.uid,
            email: userRecord.email,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(
                new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
            ),
            used: false
        });
        
        // Generate reset URL
        const baseUrl = process.env.APP_URL || 'https://rasin.pyebwa.com';
        const resetUrl = `${baseUrl}/app/reset-password.html?token=${resetToken}`;
        
        // Send password reset email
        try {
            const userName = userRecord.displayName || userRecord.email.split('@')[0];
            await emailService.sendPasswordResetEmail(userRecord.email, {
                userName: userName,
                resetUrl: resetUrl,
                expiryHours: 2
            });
            
            console.log(`Password reset email sent to ${userRecord.email}`);
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
            // Still return success to avoid revealing information
        }
        
        // Log the activity
        await db.collection('admin_logs').add({
            action: 'password_reset_requested',
            email: email,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ 
            success: true, 
            message: 'If the email exists, a password reset link has been sent' 
        });
        
    } catch (error) {
        console.error('Error requesting password reset:', error);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});

// Verify reset token
router.post('/password-reset/verify', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Reset token is required' });
        }
        
        // Hash the token to look it up
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        // Get reset record
        const resetDoc = await db.collection('passwordResets').doc(hashedToken).get();
        
        if (!resetDoc.exists) {
            return res.status(404).json({ error: 'Invalid or expired reset token' });
        }
        
        const resetData = resetDoc.data();
        
        // Check if token is expired
        if (resetData.expiresAt.toDate() < new Date()) {
            return res.status(410).json({ error: 'Reset token has expired' });
        }
        
        // Check if already used
        if (resetData.used) {
            return res.status(410).json({ error: 'Reset token has already been used' });
        }
        
        res.json({
            success: true,
            email: resetData.email,
            userId: resetData.userId
        });
        
    } catch (error) {
        console.error('Error verifying reset token:', error);
        res.status(500).json({ error: 'Failed to verify reset token' });
    }
});

// Complete password reset
router.post('/password-reset/complete', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }
        
        // Validate password strength
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }
        
        // Hash the token to look it up
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        // Get reset record
        const resetDoc = await db.collection('passwordResets').doc(hashedToken).get();
        
        if (!resetDoc.exists) {
            return res.status(404).json({ error: 'Invalid or expired reset token' });
        }
        
        const resetData = resetDoc.data();
        
        // Check if token is expired
        if (resetData.expiresAt.toDate() < new Date()) {
            return res.status(410).json({ error: 'Reset token has expired' });
        }
        
        // Check if already used
        if (resetData.used) {
            return res.status(410).json({ error: 'Reset token has already been used' });
        }
        
        // Update user password
        await admin.auth().updateUser(resetData.userId, {
            password: newPassword
        });
        
        // Mark token as used
        await resetDoc.ref.update({
            used: true,
            usedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Log the activity
        await db.collection('admin_logs').add({
            action: 'password_reset_completed',
            userId: resetData.userId,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({
            success: true,
            message: 'Password has been reset successfully'
        });
        
    } catch (error) {
        console.error('Error completing password reset:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Send welcome email after signup
router.post('/welcome-email', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        // Get user data
        const userRecord = await admin.auth().getUser(userId);
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data() || {};
        
        // Send welcome email
        try {
            const userName = userRecord.displayName || userData.displayName || userRecord.email.split('@')[0];
            const appUrl = process.env.APP_URL || 'https://rasin.pyebwa.com/app';
            
            await emailService.sendWelcomeEmail(userRecord.email, {
                userName: userName,
                appUrl: appUrl
            });
            
            console.log(`Welcome email sent to ${userRecord.email}`);
            
            res.json({
                success: true,
                message: 'Welcome email sent'
            });
            
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            res.status(500).json({ error: 'Failed to send welcome email' });
        }
        
    } catch (error) {
        console.error('Error sending welcome email:', error);
        res.status(500).json({ error: 'Failed to send welcome email' });
    }
});

module.exports = router;