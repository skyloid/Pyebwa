const express = require('express');
const router = express.Router();
const { verifySession } = require('../db/auth');
const treeQueries = require('../db/queries/family-trees');
const personQueries = require('../db/queries/persons');
const adminQueries = require('../db/queries/admin');

// All routes require authentication
router.use(verifySession);

// List user's trees
router.get('/', async (req, res) => {
    try {
        const trees = await treeQueries.findAllForUser(req.user.uid);
        res.json({ success: true, trees });
    } catch (error) {
        console.error('Error listing trees:', error);
        res.status(500).json({ error: 'Failed to list family trees' });
    }
});

// Get tree with persons
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tree = await treeQueries.findById(id);

        if (!tree) {
            return res.status(404).json({ error: 'Family tree not found' });
        }

        const hasAccess = await treeQueries.hasAccess(id, req.user.uid);
        if (!hasAccess && !tree.is_public) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const members = await treeQueries.getMembers(id);
        const memberIds = members.map(m => m.id);

        res.json({
            success: true,
            tree: {
                ...tree,
                memberIds,
                members
            }
        });
    } catch (error) {
        console.error('Error getting tree:', error);
        res.status(500).json({ error: 'Failed to get family tree' });
    }
});

// Create tree
router.post('/', async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Tree name is required' });
        }

        const tree = await treeQueries.create({
            name: name.trim(),
            description: description || '',
            owner_id: req.user.uid
        });

        res.status(201).json({ success: true, tree });
    } catch (error) {
        console.error('Error creating tree:', error);
        res.status(500).json({ error: 'Failed to create family tree' });
    }
});

// Update tree
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tree = await treeQueries.findById(id);

        if (!tree) {
            return res.status(404).json({ error: 'Family tree not found' });
        }

        if (tree.owner_id !== req.user.uid) {
            return res.status(403).json({ error: 'Only tree owner can update' });
        }

        const updated = await treeQueries.update(id, req.body);
        res.json({ success: true, tree: updated });
    } catch (error) {
        console.error('Error updating tree:', error);
        res.status(500).json({ error: 'Failed to update family tree' });
    }
});

// Delete tree
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tree = await treeQueries.findById(id);

        if (!tree) {
            return res.status(404).json({ error: 'Family tree not found' });
        }

        if (tree.owner_id !== req.user.uid) {
            return res.status(403).json({ error: 'Only tree owner can delete' });
        }

        await treeQueries.deleteTree(id);
        res.json({ success: true, message: 'Family tree deleted' });
    } catch (error) {
        console.error('Error deleting tree:', error);
        res.status(500).json({ error: 'Failed to delete family tree' });
    }
});

// --- Persons (nested under tree) ---

// List persons in tree
router.get('/:id/persons', async (req, res) => {
    try {
        const { id } = req.params;
        const hasAccess = await treeQueries.hasAccess(id, req.user.uid);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { limit, offset } = req.query;
        if (limit) {
            const result = await personQueries.findByTreePaginated(id, parseInt(limit), parseInt(offset) || 0);
            return res.json({ success: true, ...result });
        }

        const persons = await personQueries.findByTree(id);
        res.json({ success: true, persons });
    } catch (error) {
        console.error('Error listing persons:', error);
        res.status(500).json({ error: 'Failed to list persons' });
    }
});

// Search persons in tree
router.get('/:id/persons/search', async (req, res) => {
    try {
        const { id } = req.params;
        const { q } = req.query;

        const hasAccess = await treeQueries.hasAccess(id, req.user.uid);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!q) {
            return res.status(400).json({ error: 'Search query required' });
        }

        const results = await personQueries.search(id, q);
        res.json({ success: true, persons: results });
    } catch (error) {
        console.error('Error searching persons:', error);
        res.status(500).json({ error: 'Failed to search persons' });
    }
});

// Get single person
router.get('/:id/persons/:pid', async (req, res) => {
    try {
        const { id, pid } = req.params;
        const hasAccess = await treeQueries.hasAccess(id, req.user.uid);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const person = await personQueries.findById(pid);
        if (!person || person.family_tree_id !== id) {
            return res.status(404).json({ error: 'Person not found' });
        }

        res.json({ success: true, person });
    } catch (error) {
        console.error('Error getting person:', error);
        res.status(500).json({ error: 'Failed to get person' });
    }
});

// Add person to tree
router.post('/:id/persons', async (req, res) => {
    try {
        const { id } = req.params;
        const hasAccess = await treeQueries.hasAccess(id, req.user.uid);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!req.body.firstName || !req.body.firstName.trim()) {
            return res.status(400).json({ error: 'First name is required' });
        }

        const person = await personQueries.create({
            family_tree_id: id,
            first_name: req.body.firstName,
            last_name: req.body.lastName || '',
            nickname: req.body.nickname || '',
            use_nickname: req.body.useNickname === true,
            birth_date: req.body.birthDate || null,
            death_date: req.body.deathDate || null,
            biography: req.body.biography || '',
            email: req.body.email || null,
            phone: req.body.phone || null,
            gender: req.body.gender || null,
            photos: req.body.photos || [],
            relationships: req.body.relationships || []
        });

        res.status(201).json({ success: true, person });
    } catch (error) {
        console.error('Error adding person:', error);
        res.status(500).json({ error: 'Failed to add person' });
    }
});

// Update person
router.put('/:id/persons/:pid', async (req, res) => {
    try {
        const { id, pid } = req.params;
        const hasAccess = await treeQueries.hasAccess(id, req.user.uid);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const existing = await personQueries.findById(pid);
        if (!existing || existing.family_tree_id !== id) {
            return res.status(404).json({ error: 'Person not found' });
        }

        // Map camelCase to snake_case
        const updateData = {};
        const fieldMap = {
            firstName: 'first_name', lastName: 'last_name',
            nickname: 'nickname', useNickname: 'use_nickname',
            birthDate: 'birth_date', deathDate: 'death_date',
            biography: 'biography', email: 'email', phone: 'phone',
            gender: 'gender', photos: 'photos', relationships: 'relationships'
        };

        for (const [camel, snake] of Object.entries(fieldMap)) {
            if (req.body[camel] !== undefined) {
                updateData[snake] = req.body[camel];
            }
        }

        // Handle photoUrl — store as first entry in photos array with isProfile flag
        if (req.body.photoUrl !== undefined) {
            const currentPhotos = existing.photos || [];
            // Remove old profile photo entry
            const filtered = currentPhotos.filter(p => !p.isProfile);
            if (req.body.photoUrl) {
                // Add new profile photo at the front
                filtered.unshift({ url: req.body.photoUrl, isProfile: true, caption: 'Profile Photo' });
            }
            updateData.photos = filtered;
        }

        const person = await personQueries.update(pid, updateData);
        res.json({ success: true, person });
    } catch (error) {
        console.error('Error updating person:', error);
        res.status(500).json({ error: 'Failed to update person' });
    }
});

// Delete person
router.delete('/:id/persons/:pid', async (req, res) => {
    try {
        const { id, pid } = req.params;
        const hasAccess = await treeQueries.hasAccess(id, req.user.uid);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const existing = await personQueries.findById(pid);
        if (!existing || existing.family_tree_id !== id) {
            return res.status(404).json({ error: 'Person not found' });
        }

        await personQueries.remove(pid);
        res.json({ success: true, message: 'Person deleted' });
    } catch (error) {
        console.error('Error deleting person:', error);
        res.status(500).json({ error: 'Failed to delete person' });
    }
});

module.exports = router;
