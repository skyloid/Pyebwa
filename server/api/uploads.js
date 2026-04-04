const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifySession } = require('../db/auth');
const { saveFile, deleteFile } = require('../services/file-storage');

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
            category = `trees/${treeId}`;
            id = `photos/${personId}`;
        } else if (treeId) {
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

        deleteFile(filePath);
        res.json({ success: true, message: 'File deleted' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

module.exports = router;
