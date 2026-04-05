const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const userQueries = require('../db/queries/users');
const { verifySession, isAdmin } = require('../db/auth');
const { supabaseAdmin } = require('../services/supabase');
const { logSecurityEvent, logUnauthorizedAccess, SecurityEvents } = require('../services/security-logger');

// Signup — create user in Supabase Auth (triggers sync to public.users)
router.post('/signup', async (req, res) => {
    try {
        const { email, fullName } = req.body;

        if (!email || !fullName) {
            return res.status(400).json({ error: 'Email and full name are required' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Generate a secure random password
        const tempPassword = crypto.randomBytes(12).toString('base64url');

        // Create user in Supabase Auth (on_auth_user_created trigger syncs to public.users)
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
                display_name: fullName,
                role: 'member'
            }
        });

        if (error) {
            console.error('Supabase signup error:', JSON.stringify(error), error.message, error.status);
            const errMsg = error.message || error.msg || JSON.stringify(error);
            if (errMsg.includes('already been registered') || errMsg.includes('already exists')) {
                return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
            }
            return res.status(400).json({ error: errMsg });
        }

        // Update public.users with display_name if trigger didn't set it
        try {
            const existingUser = await userQueries.findById(data.user.id);
            if (existingUser && !existingUser.display_name) {
                await userQueries.update(data.user.id, { display_name: fullName });
            } else if (!existingUser) {
                // Trigger may not have fired yet — insert manually as fallback
                await userQueries.create({
                    id: data.user.id,
                    email: email,
                    password_hash: 'supabase-managed',
                    display_name: fullName,
                    role: 'member'
                });
            }
        } catch (syncErr) {
            console.warn('User sync fallback:', syncErr.message);
        }

        // Send welcome email with temporary password
        try {
            const emailService = require('../services/email');
            if (emailService.isConfigured) {
                await emailService.sendWelcomeEmail(email, {
                    displayName: fullName,
                    tempPassword: tempPassword,
                    loginUrl: 'https://rasin.pyebwa.com/login-standalone.html'
                });
            } else {
                console.log(`[SIGNUP] Email not configured. Temp password for ${email}: ${tempPassword}`);
            }
        } catch (emailErr) {
            console.error('Welcome email failed:', emailErr.message);
            // Don't fail signup if email fails — log the password so admin can share it
            console.log(`[SIGNUP] Temp password for ${email}: ${tempPassword}`);
        }

        await logSecurityEvent(
            SecurityEvents.ADMIN_ACTION,
            data.user.id,
            { action: 'user_signup', email, ip: req.ip },
            'info'
        );

        res.status(201).json({
            success: true,
            message: 'Account created successfully. Check your email for login credentials.',
            uid: data.user.id
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create account. Please try again.' });
    }
});

// Get current user info (JWT-based)
router.get('/me', verifySession, async (req, res) => {
    try {
        const user = await userQueries.findById(req.user.uid);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update last active timestamp
        await userQueries.update(user.id, { last_active: new Date() });

        res.json({
            uid: user.id,
            email: user.email,
            displayName: user.display_name,
            role: user.role,
            photoURL: user.photo_url,
            emailVerified: user.email_verified
        });
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// Update user profile
router.patch('/user/:uid', verifySession, async (req, res) => {
    try {
        const { uid } = req.params;
        const updateData = req.body;
        const currentUser = req.user;

        // Users can only update their own profile unless admin
        if (currentUser.uid !== uid && !(await isAdmin(currentUser.uid))) {
            await logUnauthorizedAccess(currentUser.uid, `user/${uid}`, req.ip);
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const allowedFields = ['display_name', 'photo_url'];
        const filteredData = {};
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                filteredData[field] = updateData[field];
            }
        }

        if (Object.keys(filteredData).length > 0) {
            await userQueries.update(uid, filteredData);

            // Also update Supabase Auth user metadata
            const metaUpdate = {};
            if (filteredData.display_name) metaUpdate.display_name = filteredData.display_name;
            if (Object.keys(metaUpdate).length > 0) {
                await supabaseAdmin.auth.admin.updateUserById(uid, {
                    user_metadata: metaUpdate
                });
            }
        }

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

// Update user role (admin only)
router.post('/user/:uid/claims', verifySession, async (req, res) => {
    try {
        const { uid } = req.params;
        const { claims } = req.body;
        const currentUser = req.user;

        if (!(await isAdmin(currentUser.uid))) {
            await logUnauthorizedAccess(currentUser.uid, `user/${uid}/claims`, req.ip);
            return res.status(403).json({ error: 'Admin access required' });
        }

        const allowedRoles = ['member', 'moderator', 'admin', 'superadmin'];
        if (claims.role && allowedRoles.includes(claims.role)) {
            // Update in public.users
            await userQueries.update(uid, { role: claims.role });

            // Update in Supabase Auth metadata
            await supabaseAdmin.auth.admin.updateUserById(uid, {
                user_metadata: { role: claims.role }
            });
        }

        await logSecurityEvent(
            SecurityEvents.ADMIN_ACTION,
            currentUser.uid,
            { action: 'update_claims', targetUid: uid, claims, ip: req.ip },
            'warn'
        );

        res.json({ success: true, message: 'Role updated successfully.' });
    } catch (error) {
        console.error('Claims update error:', error);
        res.status(500).json({ error: 'Claims update failed' });
    }
});

// List all users (admin only)
router.get('/users', verifySession, async (req, res) => {
    try {
        if (!(await isAdmin(req.user.uid))) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const users = await userQueries.findAll();
        res.json({ success: true, users });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
});

module.exports = router;
