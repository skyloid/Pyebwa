const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const emailService = require('../services/email');
const { verifySession } = require('../db/auth');
const treeQueries = require('../db/queries/family-trees');
const personQueries = require('../db/queries/persons');
const inviteQueries = require('../db/queries/invites');
const userQueries = require('../db/queries/users');
const adminQueries = require('../db/queries/admin');
const { getClient } = require('../db/pool');

// Generate invite link for a family member
router.post('/generate', verifySession, async (req, res) => {
    try {
        const { treeId, personId } = req.body;
        const userId = req.user.uid;

        if (!treeId || !personId) {
            return res.status(400).json({ error: 'Tree ID and Person ID are required' });
        }

        // Verify user has access to this tree
        const tree = await treeQueries.findById(treeId);
        if (!tree) {
            return res.status(404).json({ error: 'Family tree not found' });
        }

        const hasAccess = await treeQueries.hasAccess(treeId, userId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this family tree' });
        }

        // Get person data
        const person = await personQueries.findById(personId);
        if (!person || person.family_tree_id !== treeId) {
            return res.status(404).json({ error: 'Person not found' });
        }

        // Generate unique invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Create invite
        const invite = await inviteQueries.create({
            token: inviteToken,
            tree_id: treeId,
            person_id: personId,
            person_name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
            person_email: person.email || null,
            created_by: userId,
            expires_at: expiresAt
        });

        const baseUrl = process.env.APP_URL || 'https://rasin.pyebwa.com';
        const inviteUrl = `${baseUrl}/app/invite/${inviteToken}`;

        // Log activity
        await adminQueries.logAction('invite_generated', userId, {
            treeId,
            personId,
            inviteTokenHash: crypto.createHash('sha256').update(inviteToken).digest('hex').slice(0, 16)
        }, req.ip);

        // Send invite email if person has email
        if (person.email) {
            try {
                const inviter = await userQueries.findById(userId);
                const inviterName = inviter?.display_name || inviter?.email?.split('@')[0] || 'A family member';

                await emailService.sendInviteEmail(person.email, {
                    personName: invite.person_name,
                    familyName: tree.name || 'Family',
                    inviterName,
                    inviteUrl,
                    expiresAt: expiresAt.toLocaleDateString()
                });
            } catch (emailError) {
                console.error('Failed to send invite email:', emailError);
            }
        }

        res.json({
            success: true,
            inviteUrl,
            token: inviteToken,
            expiresAt,
            personName: invite.person_name,
            emailSent: !!person.email
        });
    } catch (error) {
        console.error('Error generating invite:', error);
        res.status(500).json({ error: 'Failed to generate invite link' });
    }
});

// Get invite details (public endpoint)
router.get('/details/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const invite = await inviteQueries.findByToken(token);

        if (!invite) {
            return res.status(404).json({ error: 'Invalid or expired invite link' });
        }

        if (new Date(invite.expires_at) < new Date()) {
            return res.status(410).json({ error: 'This invite link has expired' });
        }

        if (invite.status === 'accepted') {
            return res.status(410).json({ error: 'This invite has already been used' });
        }

        const tree = await treeQueries.findById(invite.tree_id);
        const person = await personQueries.findById(invite.person_id);

        if (!tree || !person) {
            return res.status(404).json({ error: 'Family tree or person no longer exists' });
        }

        res.json({
            success: true,
            invite: {
                personName: invite.person_name,
                treeName: tree.name || 'Family Tree',
                expiresAt: invite.expires_at
            }
        });
    } catch (error) {
        console.error('Error getting invite details:', error);
        res.status(500).json({ error: 'Failed to retrieve invite details' });
    }
});

// Accept invite
router.post('/accept/:token', verifySession, async (req, res) => {
    try {
        const { token } = req.params;
        const userId = req.user.uid;

        const invite = await inviteQueries.findByToken(token);
        if (!invite) {
            return res.status(404).json({ error: 'Invalid or expired invite link' });
        }

        if (new Date(invite.expires_at) < new Date()) {
            return res.status(410).json({ error: 'This invite link has expired' });
        }

        if (invite.status === 'accepted') {
            return res.status(410).json({ error: 'This invite has already been used' });
        }

        // Use transaction for atomicity
        const client = await getClient();
        try {
            await client.query('BEGIN');

            // Link person to user
            await client.query(
                `UPDATE persons SET user_id = $1, claimed_at = NOW(), claimed_via_invite = true, updated_at = NOW()
                 WHERE id = $2`,
                [userId, invite.person_id]
            );

            // Add user as tree member
            await client.query(
                'INSERT INTO family_tree_members (family_tree_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [invite.tree_id, userId]
            );

            // Update user's primary tree if not set
            await client.query(
                `UPDATE users SET primary_family_tree_id = COALESCE(primary_family_tree_id, $1), updated_at = NOW()
                 WHERE id = $2`,
                [invite.tree_id, userId]
            );

            // Accept the invite
            await client.query(
                `UPDATE invites SET status = 'accepted', accepted_by = $1, accepted_at = NOW()
                 WHERE token = $2`,
                [userId, token]
            );

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        // Log activity
        await adminQueries.logAction('invite_accepted', userId, {
            treeId: invite.tree_id,
            personId: invite.person_id,
            inviteTokenHash: crypto.createHash('sha256').update(token).digest('hex').slice(0, 16)
        }, req.ip);

        res.json({
            success: true,
            treeId: invite.tree_id,
            personId: invite.person_id,
            message: 'Invite accepted successfully'
        });
    } catch (error) {
        console.error('Error accepting invite:', error);
        res.status(500).json({ error: 'Failed to accept invite' });
    }
});

// Revoke invite
router.post('/revoke/:token', verifySession, async (req, res) => {
    try {
        const { token } = req.params;
        const userId = req.user.uid;

        const invite = await inviteQueries.findByToken(token);
        if (!invite) {
            return res.status(404).json({ error: 'Invite not found' });
        }

        // Only creator or admin can revoke
        if (invite.created_by !== userId) {
            const user = await userQueries.findById(userId);
            if (!['admin', 'superadmin'].includes(user?.role)) {
                return res.status(403).json({ error: 'Permission denied' });
            }
        }

        await inviteQueries.revoke(token, userId);

        await adminQueries.logAction('invite_revoked', userId, {
            inviteTokenHash: crypto.createHash('sha256').update(token).digest('hex').slice(0, 16)
        }, req.ip);

        res.json({ success: true, message: 'Invite revoked successfully' });
    } catch (error) {
        console.error('Error revoking invite:', error);
        res.status(500).json({ error: 'Failed to revoke invite' });
    }
});

// List invites for a tree
router.get('/list/:treeId', verifySession, async (req, res) => {
    try {
        const { treeId } = req.params;
        const userId = req.user.uid;

        const hasAccess = await treeQueries.hasAccess(treeId, userId);
        if (!hasAccess) {
            const user = await userQueries.findById(userId);
            if (!['admin', 'superadmin'].includes(user?.role)) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        const invites = await inviteQueries.findByTree(treeId);
        res.json({ success: true, invites });
    } catch (error) {
        console.error('Error listing invites:', error);
        res.status(500).json({ error: 'Failed to list invites' });
    }
});

module.exports = router;
