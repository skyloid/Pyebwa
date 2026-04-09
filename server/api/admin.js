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
