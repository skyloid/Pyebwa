const { query } = require('./pool');
const { supabaseAdmin } = require('../services/supabase');

// JWT-based auth middleware: verifies Bearer token via Supabase
async function verifySession(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.slice(7);

    try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Look up app-level user data from public.users
        const result = await query('SELECT role, display_name, status FROM users WHERE id = $1', [user.id]);
        const appUser = result.rows[0];

        if (appUser?.status === 'suspended') {
            return res.status(403).json({ error: 'Account suspended' });
        }

        req.user = {
            uid: user.id,
            email: user.email,
            role: appUser ? appUser.role : (user.user_metadata?.role || 'member'),
            displayName: appUser ? appUser.display_name : (user.user_metadata?.display_name || ''),
            status: appUser ? appUser.status : 'active'
        };
        next();
    } catch (err) {
        console.error('Auth verification error:', err.message);
        return res.status(401).json({ error: 'Authentication failed' });
    }
}

// Require admin or superadmin role
function requireAdmin(req, res, next) {
    if (!req.user || !['admin', 'superadmin', 'moderator'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
}

// Require superadmin role
function requireSuperAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Only superadmins can perform this action' });
    }
    next();
}

// Get current user from DB (full profile)
async function getCurrentUser(req) {
    if (!req.user || !req.user.uid) return null;
    try {
        const result = await query('SELECT * FROM users WHERE id = $1', [req.user.uid]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('getCurrentUser error:', error);
        return null;
    }
}

// Check if a user is admin by userId
async function isAdmin(userId) {
    try {
        const result = await query('SELECT role FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) return false;
        return ['admin', 'superadmin'].includes(result.rows[0].role);
    } catch (error) {
        console.error('isAdmin check failed:', error);
        return false;
    }
}

// Combined middleware: verifySession + requireAdmin
function verifyAdminAuth(req, res, next) {
    verifySession(req, res, (err) => {
        if (err) return;
        if (res.headersSent) return;
        requireAdmin(req, res, next);
    });
}

module.exports = {
    verifySession,
    requireAdmin,
    requireSuperAdmin,
    getCurrentUser,
    isAdmin,
    verifyAdminAuth
};
