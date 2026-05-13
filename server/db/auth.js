const { query } = require('./pool');
const { supabaseAdmin } = require('../services/supabase');
const crypto = require('crypto');

function decodeBase64Url(value) {
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    return Buffer.from(padded, 'base64');
}

function verifyJwtLocally(token) {
    const secret = String(process.env.SUPABASE_AUTH_JWT_SECRET || '').trim();
    if (!secret) {
        throw new Error('SUPABASE_AUTH_JWT_SECRET is not configured');
    }

    const parts = String(token || '').split('.');
    if (parts.length !== 3) {
        throw new Error('Malformed JWT');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = JSON.parse(decodeBase64Url(encodedHeader).toString('utf8'));
    const payload = JSON.parse(decodeBase64Url(encodedPayload).toString('utf8'));

    if (header.alg !== 'HS256') {
        throw new Error(`Unsupported JWT algorithm: ${header.alg}`);
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

    if (expectedSignature !== encodedSignature) {
        throw new Error('JWT signature is invalid');
    }

    if (typeof payload.exp === 'number' && Math.floor(Date.now() / 1000) >= payload.exp) {
        throw new Error('JWT has expired');
    }

    if (!payload.sub) {
        throw new Error('JWT subject is missing');
    }

    return payload;
}

async function getAuthUserFromDatabase(userId) {
    const result = await query(
        `SELECT id, email, raw_user_meta_data, raw_app_meta_data
         FROM auth.users
         WHERE id = $1
         LIMIT 1`,
        [userId]
    );
    return result.rows[0] || null;
}

function normalizeRole(appUser, user) {
    const dbRole = appUser?.role;
    if (dbRole && !['authenticated', 'anon', 'service_role'].includes(dbRole)) {
        return dbRole;
    }

    const metadataRole = user?.user_metadata?.role || user?.app_metadata?.role;
    if (metadataRole && !['authenticated', 'anon', 'service_role'].includes(metadataRole)) {
        return metadataRole;
    }

    return 'member';
}

function normalizeDisplayName(appUser, user) {
    return appUser?.display_name
        || user?.user_metadata?.display_name
        || user?.user_metadata?.full_name
        || user?.user_metadata?.fullName
        || '';
}

// JWT-based auth middleware: verifies Bearer token via Supabase
async function verifySession(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.slice(7);

    try {
        let verifiedUser = null;

        try {
            const payload = verifyJwtLocally(token);
            const authUser = await getAuthUserFromDatabase(payload.sub);
            if (authUser) {
                verifiedUser = {
                    id: authUser.id,
                    email: authUser.email,
                    user_metadata: authUser.raw_user_meta_data || {},
                    app_metadata: authUser.raw_app_meta_data || {}
                };
            } else {
                verifiedUser = {
                    id: payload.sub,
                    email: payload.email || null,
                    user_metadata: payload.user_metadata || {},
                    app_metadata: payload.app_metadata || {}
                };
            }
        } catch (localJwtError) {
            console.warn('Local JWT verification fallback:', localJwtError.message);
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (!error && user) {
                verifiedUser = user;
            }
        }

        if (!verifiedUser) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Look up app-level user data from public.users
        let appUser = null;
        try {
            const result = await query('SELECT role, display_name, status FROM users WHERE id = $1', [verifiedUser.id]);
            appUser = result.rows[0] || null;
        } catch (dbError) {
            console.warn('Auth user lookup fallback:', dbError.message);
        }

        if (appUser && appUser.status === 'suspended') {
            return res.status(403).json({ error: 'Account suspended' });
        }

        req.user = {
            uid: verifiedUser.id,
            email: verifiedUser.email,
            role: normalizeRole(appUser, verifiedUser),
            displayName: normalizeDisplayName(appUser, verifiedUser),
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
    if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
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
    verifyAdminAuth,
    normalizeRole,
    normalizeDisplayName
};
