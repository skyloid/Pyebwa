const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const emailService = require('../services/email');
const passwordGenerator = require('../services/passwordGenerator');
const { admin, db } = require('../services/firebase-admin');

// User signup with auto-generated password
router.post('/signup', async (req, res) => {
    try {
        const { email, fullName } = req.body;
        
        // Validate input
        if (!email || !fullName) {
            return res.status(400).json({ error: 'Email and full name are required' });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        
        // Check if user already exists
        try {
            const existingUser = await admin.auth().getUserByEmail(email);
            if (existingUser) {
                return res.status(409).json({ error: 'An account with this email already exists' });
            }
        } catch (error) {
            // User doesn't exist, which is what we want
            if (error.code !== 'auth/user-not-found') {
                throw error;
            }
        }
        
        // Generate secure password
        const password = passwordGenerator.generatePassword();
        
        try {
            // Create Firebase user
            const userRecord = await admin.auth().createUser({
                email: email,
                password: password,
                displayName: fullName,
                emailVerified: false
            });
            
            // Create user document in Firestore
            await db.collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                email: userRecord.email,
                fullName: fullName,
                displayName: fullName,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                language: 'en',
                signupMethod: 'email',
                passwordGenerated: true
            });
            
            // Log the signup
            await db.collection('admin_logs').add({
                action: 'user_signup',
                userId: userRecord.uid,
                email: email,
                method: 'email_with_generated_password',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Send welcome email with password
            const loginUrl = process.env.APP_URL || 'https://rasin.pyebwa.com';
            await emailService.sendEmail(email, 'Welcome to Pyebwa Family Tree', 'welcome-with-password', {
                userName: fullName,
                password: password,
                loginUrl: loginUrl + '/login.html',
                language: 'en'
            });
            
            console.log(`New user created: ${email} with generated password`);
            
            res.json({
                success: true,
                message: 'Account created successfully. Check your email for login instructions.',
                userId: userRecord.uid
            });
            
        } catch (error) {
            console.error('Error creating user:', error);
            
            // Clean up if user was partially created
            try {
                const partialUser = await admin.auth().getUserByEmail(email);
                if (partialUser) {
                    await admin.auth().deleteUser(partialUser.uid);
                }
            } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
            }
            
            throw error;
        }
        
    } catch (error) {
        console.error('Signup error:', error);
        
        let errorMessage = 'Failed to create account. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'An account with this email already exists.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        }
        
        res.status(500).json({ error: errorMessage });
    }
});

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

// Complete password reset - generates new password
router.post('/password-reset/complete', async (req, res) => {
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
        
        // Generate new secure password
        const newPassword = passwordGenerator.generatePassword();
        
        // Update user password
        await admin.auth().updateUser(resetData.userId, {
            password: newPassword
        });
        
        // Mark token as used
        await resetDoc.ref.update({
            used: true,
            usedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Get user info for email
        const userRecord = await admin.auth().getUser(resetData.userId);
        const userDoc = await db.collection('users').doc(resetData.userId).get();
        const userData = userDoc.data() || {};
        
        // Send email with new password
        const userName = userRecord.displayName || userData.displayName || userRecord.email.split('@')[0];
        const loginUrl = process.env.APP_URL || 'https://rasin.pyebwa.com';
        
        await emailService.sendEmail(userRecord.email, 'Your New Password', 'password-reset-complete', {
            userName: userName,
            password: newPassword,
            loginUrl: loginUrl + '/login.html',
            language: userData.language || 'en'
        });
        
        // Log the activity
        await db.collection('admin_logs').add({
            action: 'password_reset_completed',
            userId: resetData.userId,
            method: 'generated_password',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({
            success: true,
            message: 'Password has been reset successfully. Check your email for the new password.'
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