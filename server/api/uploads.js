const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifySession } = require('../db/auth');
const { saveFile, saveLocalFile, deleteFile } = require('../services/file-storage');
const treeQueries = require('../db/queries/family-trees');
const personQueries = require('../db/queries/persons');

// Configure multer for memory storage (we'll save to disk ourselves)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 5
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
        }
    }
});

const uploadAny = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024,
        files: 1
    }
});

async function requireTreeWriteAccess(treeId, userId) {
    if (!treeId) return false;
    return treeQueries.hasWriteAccess(treeId, userId);
}

async function requirePersonInTree(personId, treeId) {
    if (!personId) return true;
    const person = await personQueries.findById(personId);
    return !!person && person.family_tree_id === treeId;
}

function extractStoragePathFromUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const publicMatch = raw.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    if (publicMatch) return publicMatch[1];

    const uploadMatch = raw.match(/\/uploads\/(.+)$/);
    if (uploadMatch) return uploadMatch[1];

    return raw.replace(/^\/+/, '');
}

async function canMutateStoragePath(fileUrl, userId) {
    const storagePath = extractStoragePathFromUrl(fileUrl);
    if (!storagePath || storagePath.includes('..')) return false;

    if (storagePath.startsWith(`users/${userId}/`)) {
        return true;
    }

    const treeMatch = storagePath.match(/^trees\/([^/]+)\//);
    if (!treeMatch) return false;

    return requireTreeWriteAccess(treeMatch[1], userId);
}

// Upload photo
router.post('/photo', verifySession, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { treeId, personId, type } = req.body;
        let category, id;

        if (type === 'profile') {
            category = `users/${req.user.uid}`;
            id = 'photos';
        } else if (treeId && personId) {
            const [hasAccess, personBelongsToTree] = await Promise.all([
                requireTreeWriteAccess(treeId, req.user.uid),
                requirePersonInTree(personId, treeId)
            ]);
            if (!hasAccess || !personBelongsToTree) {
                return res.status(403).json({ error: 'Access denied' });
            }
            category = `trees/${treeId}`;
            id = `photos/${personId}`;
        } else if (treeId) {
            const hasAccess = await requireTreeWriteAccess(treeId, req.user.uid);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied' });
            }
            category = `trees/${treeId}`;
            id = 'photos';
        } else {
            category = `users/${req.user.uid}`;
            id = 'photos';
        }

        const url = await saveFile(category, id, req.file.buffer, req.file.originalname);

        res.json({ success: true, url });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Delete photo
router.delete('/photo', verifySession, async (req, res) => {
    try {
        const { path: filePath } = req.body;
        if (!filePath) {
            return res.status(400).json({ error: 'File path required' });
        }

        if (!(await canMutateStoragePath(filePath, req.user.uid))) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await deleteFile(filePath);
        res.json({ success: true, message: 'File deleted' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

router.post('/file', verifySession, uploadAny.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { treeId, personId, type } = req.body;
        let baseCategory;
        if (treeId) {
            const [hasAccess, personBelongsToTree] = await Promise.all([
                requireTreeWriteAccess(treeId, req.user.uid),
                requirePersonInTree(personId, treeId)
            ]);
            if (!hasAccess || !personBelongsToTree) {
                return res.status(403).json({ error: 'Access denied' });
            }
            baseCategory = `trees/${treeId}`;
        } else if (req.body.category) {
            return res.status(403).json({ error: 'Access denied' });
        } else {
            baseCategory = `users/${req.user.uid}`;
        }
        const baseId = personId || req.user.uid || 'shared';
        const bucketFolder = type || 'files';
        const targetId = `${bucketFolder}/${baseId}`;
        const url = type === 'audio-stories'
            ? await saveLocalFile(
                baseCategory,
                targetId,
                req.file.buffer,
                req.file.originalname
            )
            : await saveFile(
                baseCategory,
                targetId,
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype === 'video/webm' ? 'audio/webm' : req.file.mimetype
            );

        res.json({ success: true, url });
    } catch (error) {
        console.error('Generic upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

router.delete('/file', verifySession, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'File URL required' });
        }

        if (!(await canMutateStoragePath(url, req.user.uid))) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await deleteFile(url);
        res.json({ success: true, message: 'File deleted' });
    } catch (error) {
        console.error('Generic delete error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

module.exports = router;
