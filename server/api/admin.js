const express = require('express');
const { verifySession, requireAdmin } = require('../db/auth');
const { query } = require('../db/pool');
const userQueries = require('../db/queries/users');
const multer = require('multer');
const { saveFile } = require('../services/file-storage');
const slideshowManager = require('../services/slideshow-manager');
const pageContentManager = require('../services/page-content-manager');
const { URL } = require('url');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

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
            currentUserRole: req.user.role,
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

router.get('/trees', verifySession, requireAdmin, async (req, res) => {
    try {
        const result = await query(`
            SELECT
                ft.id,
                ft.name,
                ft.description,
                ft.owner_id,
                ft.is_public,
                ft.settings,
                ft.created_at,
                ft.updated_at,
                u.email AS owner_email,
                u.display_name AS owner_display_name,
                COUNT(DISTINCT p.id)::int AS member_count
            FROM family_trees ft
            LEFT JOIN users u ON u.id = ft.owner_id
            LEFT JOIN persons p ON p.family_tree_id = ft.id
            GROUP BY ft.id, u.email, u.display_name
            ORDER BY ft.created_at DESC
        `);

        const trees = result.rows.map((row) => {
            const settings = typeof row.settings === 'string'
                ? (() => { try { return JSON.parse(row.settings); } catch (_) { return {}; } })()
                : (row.settings || {});
            return {
                id: row.id,
                name: row.name,
                description: row.description || '',
                owner_id: row.owner_id,
                owner_email: row.owner_email || '',
                owner_display_name: row.owner_display_name || '',
                member_count: row.member_count || 0,
                status: settings.archived ? 'archived' : 'active',
                is_public: !!row.is_public,
                created_at: row.created_at,
                updated_at: row.updated_at
            };
        });

        res.json({ total: trees.length, trees });
    } catch (error) {
        console.error('Admin trees load error:', error);
        res.status(500).json({ error: 'Failed to load family trees' });
    }
});

router.post('/trees/archive', verifySession, requireAdmin, async (req, res) => {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
        const archived = !!req.body?.archived;
        if (!ids.length) {
            return res.status(400).json({ error: 'Tree ids are required' });
        }

        for (const id of ids) {
            const existing = await query('SELECT settings FROM family_trees WHERE id = $1', [id]);
            if (!existing.rows.length) continue;
            const settings = typeof existing.rows[0].settings === 'string'
                ? (() => { try { return JSON.parse(existing.rows[0].settings); } catch (_) { return {}; } })()
                : (existing.rows[0].settings || {});
            settings.archived = archived;
            await query('UPDATE family_trees SET settings = $2, updated_at = NOW() WHERE id = $1', [id, JSON.stringify(settings)]);
        }

        res.json({ success: true, updated: ids.length, archived });
    } catch (error) {
        console.error('Admin tree archive error:', error);
        res.status(500).json({ error: 'Failed to update tree status' });
    }
});

router.delete('/trees/:id', verifySession, requireAdmin, async (req, res) => {
    try {
        await query('DELETE FROM family_trees WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Admin tree delete error:', error);
        res.status(500).json({ error: 'Failed to delete tree' });
    }
});

router.get('/audit', verifySession, requireAdmin, async (req, res) => {
    try {
        const limit = normalizeLimit(req.query.limit, 50, 200);
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const offset = (page - 1) * limit;
        const search = String(req.query.search || '').trim().toLowerCase();
        const action = String(req.query.action || '').trim().toLowerCase();
        const dateFrom = String(req.query.dateFrom || '').trim();
        const dateTo = String(req.query.dateTo || '').trim();

        const result = await query(`
            SELECT
                al.id,
                al.action,
                al.user_id,
                al.details,
                al.ip_address,
                al.created_at,
                u.email AS user_email,
                u.display_name AS user_display_name
            FROM admin_logs al
            LEFT JOIN users u ON u.id = al.user_id
            ORDER BY al.created_at DESC
        `);

        let logs = result.rows.map((row) => ({
            id: row.id,
            action: row.action || 'unknown',
            user_id: row.user_id,
            user_email: row.user_email || '',
            user_display_name: row.user_display_name || '',
            details: typeof row.details === 'string' ? (() => {
                try { return JSON.parse(row.details); } catch (_) { return row.details; }
            })() : (row.details || {}),
            ip_address: row.ip_address || '',
            created_at: row.created_at
        }));

        if (search) {
            logs = logs.filter((log) => {
                const haystack = [
                    log.action,
                    log.user_email,
                    log.user_display_name,
                    typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {}),
                    log.ip_address
                ].join(' ').toLowerCase();
                return haystack.includes(search);
            });
        }

        if (action) {
            logs = logs.filter((log) => String(log.action || '').toLowerCase() === action);
        }

        if (dateFrom) {
            const fromDate = new Date(`${dateFrom}T00:00:00Z`);
            logs = logs.filter((log) => new Date(log.created_at) >= fromDate);
        }

        if (dateTo) {
            const toDate = new Date(`${dateTo}T23:59:59.999Z`);
            logs = logs.filter((log) => new Date(log.created_at) <= toDate);
        }

        const total = logs.length;
        res.json({
            total,
            page,
            limit,
            logs: logs.slice(offset, offset + limit)
        });
    } catch (error) {
        console.error('Admin audit load error:', error);
        res.status(500).json({ error: 'Failed to load audit logs' });
    }
});

router.get('/slideshows', verifySession, requireAdmin, async (req, res) => {
    try {
        const [draft, published] = await Promise.all([
            slideshowManager.getDraft(),
            slideshowManager.getPublished()
        ]);

        res.json({
            draft,
            published,
            pages: slideshowManager.VALID_PAGES
        });
    } catch (error) {
        console.error('Admin slideshow load error:', error);
        res.status(500).json({ error: 'Failed to load slideshow data' });
    }
});

router.get('/page-content', verifySession, requireAdmin, async (req, res) => {
    try {
        const [draft, published] = await Promise.all([
            pageContentManager.getDraft(),
            pageContentManager.getPublished()
        ]);

        res.json({
            draft,
            published,
            pages: pageContentManager.VALID_PAGES,
            languages: pageContentManager.VALID_LANGS
        });
    } catch (error) {
        console.error('Admin page content load error:', error);
        res.status(500).json({ error: 'Failed to load page content' });
    }
});

router.put('/page-content/draft', verifySession, requireAdmin, async (req, res) => {
    try {
        const saved = await pageContentManager.saveDraft(req.body || {});
        res.json({ success: true, draft: saved });
    } catch (error) {
        console.error('Admin page content save error:', error);
        res.status(500).json({ error: 'Failed to save page content draft' });
    }
});

router.post('/page-content/publish', verifySession, requireAdmin, async (req, res) => {
    try {
        const published = await pageContentManager.publishDraft();
        res.json({ success: true, published });
    } catch (error) {
        console.error('Admin page content publish error:', error);
        res.status(500).json({ error: 'Failed to publish page content changes' });
    }
});

router.put('/slideshows/draft', verifySession, requireAdmin, async (req, res) => {
    try {
        const saved = await slideshowManager.saveDraft(req.body || {});
        res.json({ success: true, draft: saved });
    } catch (error) {
        console.error('Admin slideshow save error:', error);
        res.status(500).json({ error: 'Failed to save slideshow draft' });
    }
});

router.post('/slideshows/publish', verifySession, requireAdmin, async (req, res) => {
    try {
        const published = await slideshowManager.publishDraft();
        res.json({ success: true, published });
    } catch (error) {
        console.error('Admin slideshow publish error:', error);
        res.status(500).json({ error: 'Failed to publish slideshow changes' });
    }
});

router.post('/slideshows/upload', verifySession, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const page = slideshowManager.VALID_PAGES.includes(req.body.page) ? req.body.page : 'home';
        const url = await saveFile('slideshows', page, req.file.buffer, req.file.originalname);
        res.json({ success: true, url });
    } catch (error) {
        console.error('Admin slideshow upload error:', error);
        res.status(500).json({ error: 'Failed to upload slideshow image' });
    }
});

router.get('/slideshows/preview', async (req, res) => {
    try {
        const source = String(req.query.url || '').trim();
        if (!source) {
            return res.status(400).json({ error: 'Preview URL is required' });
        }

        const target = new URL(source);
        const allowedHosts = new Set([
            'pyebwa.com',
            'www.pyebwa.com',
            'images.unsplash.com',
            'rasin.pyebwa.com'
        ]);

        if (!allowedHosts.has(target.hostname)) {
            return res.status(400).json({ error: 'Preview host is not allowed' });
        }

        const response = await fetch(target.toString());
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Unable to fetch preview image' });
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const buffer = Buffer.from(await response.arrayBuffer());

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.send(buffer);
    } catch (error) {
        console.error('Admin slideshow preview error:', error);
        res.status(500).json({ error: 'Failed to load preview image' });
    }
});

module.exports = router;
