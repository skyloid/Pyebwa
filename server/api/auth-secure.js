const express = require('express');
const router = express.Router();
const { admin, auth, db, getCurrentUser, isAdmin } = require('../services/firebase-admin-secure');
const { validateInput, sanitizeInput } = require('../middleware/input-validation');
const { logSecurityEvent, trackFailedLogin, logSuccessfulLogin, SecurityEvents } = require('../services/security-logger');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Generate secure password
function generateSecurePassword() {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        password += charset[randomBytes[i] % charset.length];
    }
    
    // Ensure password meets complexity requirements
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
    
    if (!hasLower || !hasUpper || !hasDigit || !hasSpecial) {
        return generateSecurePassword(); // Regenerate if requirements not met
    }
    
    return password;
}

// Send welcome email with password
async function sendWelcomeEmail(email, name, password) {
    if (!process.env.SENDGRID_API_KEY) {
        console.warn('SendGrid not configured, skipping email');
        return;
    }
    
    const msg = {
        to: email,
        from: process.env.FROM_EMAIL || 'noreply@pyebwa.com',
        subject: 'Welcome to Pyebwa - Your Family Tree Account',
        html: `
            <h2>Welcome to Pyebwa, ${name}!</h2>
            <p>Your family tree account has been created successfully.</p>
            <p><strong>Your secure login credentials:</strong></p>
            <p>Email: ${email}<br>
            Password: <code>${password}</code></p>
            <p><strong>Important:</strong> Please save this password securely. For your safety, we recommend changing it after your first login.</p>
            <p>Login at: <a href="https://rasin.pyebwa.com/login.html">https://rasin.pyebwa.com/login.html</a></p>
            <br>
            <p>Best regards,<br>The Pyebwa Team</p>
        `
    };
    
    try {
        await sgMail.send(msg);
        console.log('Welcome email sent to:', email);
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        throw new Error('Account created but email delivery failed');
    }
}

// Registration endpoint with enhanced security
router.post('/signup', 
    validateInput({
        email: { required: true, type: 'email' },
        fullName: { required: true, type: 'name' }
    }),
    sanitizeInput([
        { name: 'email', type: 'email' },
        { name: 'fullName', type: 'text' }
    ]),
    async (req, res) => {
        const { email, fullName } = req.body;
        const clientIp = req.ip;
        const userAgent = req.get('user-agent');
        
        try {
            // Check if email already exists
            try {
                await auth.getUserByEmail(email);
                await trackFailedLogin(email, clientIp, 'email_already_exists');
                return res.status(409).json({ 
                    error: 'An account with this email already exists' 
                });
            } catch (error) {
                // User doesn't exist, continue with registration
            }
            
            // Generate secure password
            const password = generateSecurePassword();
            
            // Create user account
            const userRecord = await auth.createUser({
                email: email,
                password: password,
                displayName: fullName,
                emailVerified: false
            });
            
            // Create user profile in Firestore
            await db.collection('users').doc(userRecord.uid).set({
                email: email,
                displayName: fullName,
                role: 'member',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                familyTreeIds: [],
                primaryFamilyTreeId: null,
                registrationIp: clientIp,
                registrationUserAgent: userAgent
            });
            
            // Send welcome email with password
            await sendWelcomeEmail(email, fullName, password);
            
            // Log successful registration
            await logSecurityEvent(
                SecurityEvents.LOGIN_SUCCESS,
                userRecord.uid,
                { email, ip: clientIp, userAgent, action: 'registration' },
                'info'
            );
            
            res.status(201).json({
                success: true,
                message: 'Account created successfully. Check your email for login credentials.',
                uid: userRecord.uid
            });
            
        } catch (error) {
            console.error('Registration error:', error);
            
            await logSecurityEvent(
                SecurityEvents.SUSPICIOUS_ACTIVITY,
                email,
                { error: error.message, ip: clientIp, userAgent },
                'error'
            );
            
            // Generic error message to prevent information leakage
            res.status(500).json({ 
                error: 'Registration failed. Please try again later.' 
            });
        }
    }
);

// Password reset endpoint with security
router.post('/reset-password',
    validateInput({
        email: { required: true, type: 'email' }
    }),
    sanitizeInput([
        { name: 'email', type: 'email' }
    ]),
    async (req, res) => {
        const { email } = req.body;
        const clientIp = req.ip;
        
        try {
            // Generate password reset link
            const resetLink = await auth.generatePasswordResetLink(email, {
                url: 'https://rasin.pyebwa.com/reset-password.html'
            });
            
            // Send reset email
            if (process.env.SENDGRID_API_KEY) {
                const msg = {
                    to: email,
                    from: process.env.FROM_EMAIL || 'noreply@pyebwa.com',
                    subject: 'Reset Your Pyebwa Password',
                    html: `
                        <h2>Password Reset Request</h2>
                        <p>You requested to reset your password for your Pyebwa account.</p>
                        <p>Click the link below to reset your password:</p>
                        <p><a href="${resetLink}">Reset Password</a></p>
                        <p>This link will expire in 1 hour.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                        <br>
                        <p>Best regards,<br>The Pyebwa Team</p>
                    `
                };
                
                await sgMail.send(msg);
            }
            
            await logSecurityEvent(
                SecurityEvents.PASSWORD_RESET,
                email,
                { ip: clientIp },
                'info'
            );
            
            // Always return success to prevent email enumeration
            res.json({ 
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.' 
            });
            
        } catch (error) {
            console.error('Password reset error:', error);
            
            // Still return success to prevent email enumeration
            res.json({ 
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.' 
            });
        }
    }
);

// Update user endpoint with authorization
router.patch('/user/:uid', async (req, res) => {
    try {
        const { uid } = req.params;
        const updateData = req.body;
        const currentUser = await getCurrentUser(req);
        
        // Check authorization
        if (!currentUser) {
            await logUnauthorizedAccess(null, `user/${uid}`, req.ip);
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Users can only update their own profile unless admin
        if (currentUser.uid !== uid && !(await isAdmin(currentUser.uid))) {
            await logUnauthorizedAccess(currentUser.uid, `user/${uid}`, req.ip);
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Validate and sanitize update data
        const allowedFields = ['displayName', 'phoneNumber', 'photoURL'];
        const filteredData = {};
        
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                filteredData[field] = updateData[field];
            }
        }
        
        // Update Firebase Auth
        if (Object.keys(filteredData).length > 0) {
            await auth.updateUser(uid, filteredData);
        }
        
        // Update Firestore profile
        await db.collection('users').doc(uid).update({
            ...filteredData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        await logSecurityEvent(
            SecurityEvents.ADMIN_ACTION,
            currentUser.uid,
            { action: 'update_user', targetUid: uid, fields: Object.keys(filteredData) },
            'info'
        );
        
        res.json({ success: true, message: 'User updated successfully' });
        
    } catch (error) {
        console.error('User update error:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

// Update user claims (admin only)
router.post('/user/:uid/claims', async (req, res) => {
    try {
        const { uid } = req.params;
        const { claims } = req.body;
        const currentUser = await getCurrentUser(req);
        
        // Check if current user is admin
        if (!currentUser || !(await isAdmin(currentUser.uid))) {
            await logUnauthorizedAccess(currentUser?.uid, `user/${uid}/claims`, req.ip);
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        // Validate claims
        const allowedClaims = ['role', 'permissions'];
        const filteredClaims = {};
        
        for (const claim of allowedClaims) {
            if (claims[claim] !== undefined) {
                filteredClaims[claim] = claims[claim];
            }
        }
        
        // Set custom claims
        await auth.setCustomUserClaims(uid, filteredClaims);
        
        // Force token refresh
        await auth.revokeRefreshTokens(uid);
        
        await logSecurityEvent(
            SecurityEvents.ADMIN_ACTION,
            currentUser.uid,
            { 
                action: 'update_claims', 
                targetUid: uid, 
                claims: filteredClaims,
                ip: req.ip 
            },
            'warn'
        );
        
        res.json({ 
            success: true, 
            message: 'Claims updated successfully. User must re-authenticate.' 
        });
        
    } catch (error) {
        console.error('Claims update error:', error);
        res.status(500).json({ error: 'Claims update failed' });
    }
});

// Get current user info
router.get('/me', async (req, res) => {
    try {
        const currentUser = await getCurrentUser(req);
        
        if (!currentUser) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        // Get user profile from Firestore
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        res.json({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: userData?.displayName,
            role: currentUser.role || userData?.role || 'member',
            photoURL: userData?.photoURL,
            emailVerified: currentUser.email_verified
        });
        
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

module.exports = router;