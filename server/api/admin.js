const express = require('express');
const { verifySession, requireAdmin } = require('../db/auth');
const { query } = require('../db/pool');
const userQueries = require('../db/queries/users');

const router = express.Router();

function normalizeLimit(value, fallback = 50, max = 200) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(parsed, max);
}

router.get('/summary', verifySession, requireAdmin, async (req, res) => {
    try {
        const [usersResult, activeUsersResult, treesResult, membersResult, recentUsersResult, recentTreesResult] = await Promise.all([
            query('SELECT COUNT(*)::int AS count FROM users'),
            query("SELECT COUNT(*)::int AS count FROM users WHERE last_active >= NOW() - INTERVAL '30 days'"),
            query('SELECT COUNT(*)::int AS count FROM family_trees'),
            query('SELECT COUNT(*)::int AS count FROM persons'),
            query(`
                SELECT id, email, display_name, role, last_active, created_at
                FROM users
                ORDER BY created_at DESC
                LIMIT 8
            `),
            query(`
                SELECT ft.id, ft.name, ft.created_at, u.display_name AS owner_name, u.email AS owner_email
                FROM family_trees ft
                LEFT JOIN users u ON u.id = ft.owner_id
                ORDER BY ft.created_at DESC
                LIMIT 8
            `)
        ]);

        res.json({
            totalUsers: usersResult.rows[0]?.count || 0,
            activeUsers30d: activeUsersResult.rows[0]?.count || 0,
            totalTrees: treesResult.rows[0]?.count || 0,
            totalMembers: membersResult.rows[0]?.count || 0,
            recentUsers: recentUsersResult.rows,
            recentTrees: recentTreesResult.rows
        });
    } catch (error) {
        console.error('Admin summary error:', error);
        res.status(500).json({ error: 'Failed to load admin summary' });
    }
});

router.get('/users', verifySession, requireAdmin, async (req, res) => {
    try {
        const limit = normalizeLimit(req.query.limit, 100, 500);
        const search = String(req.query.search || '').trim().toLowerCase();
        const role = String(req.query.role || '').trim().toLowerCase();
        const status = String(req.query.status || '').trim().toLowerCase();

        let users = await userQueries.findAll();

        users = users.map((user) => {
            const lastActive = user.last_active ? new Date(user.last_active) : null;
            const isActiveRecently = lastActive && ((Date.now() - lastActive.getTime()) <= (30 * 24 * 60 * 60 * 1000));
            return {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                role: user.role || 'member',
                photo_url: user.photo_url || null,
                last_active: user.last_active,
                created_at: user.created_at,
                status: isActiveRecently ? 'active' : 'inactive'
            };
        });

        if (search) {
            users = users.filter((user) => {
                const haystack = [
                    user.display_name,
                    user.email,
                    user.role
                ].filter(Boolean).join(' ').toLowerCase();
                return haystack.includes(search);
            });
        }

        if (role) {
            users = users.filter((user) => user.role === role);
        }

        if (status) {
            users = users.filter((user) => user.status === status);
        }

        res.json({
            total: users.length,
            users: users.slice(0, limit)
        });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to load users' });
    }
});

module.exports = router;
