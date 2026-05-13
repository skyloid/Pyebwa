const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { verifySession } = require('../db/auth');
const treeQueries = require('../db/queries/family-trees');
const discoveryQueries = require('../db/queries/discovery');
const personQueries = require('../db/queries/persons');
const inviteQueries = require('../db/queries/invites');
const userQueries = require('../db/queries/users');
const adminQueries = require('../db/queries/admin');
const emailService = require('../services/email');

function splitRequestedName(fullName, fallbackSurname = '') {
    const normalized = String(fullName || '').trim().replace(/\s+/g, ' ');
    const parts = normalized ? normalized.split(' ') : [];
    const firstName = parts.shift() || fallbackSurname || 'Family';
    const remainingLastName = parts.join(' ').trim();

    return {
        firstName,
        lastName: remainingLastName || String(fallbackSurname || '').trim()
    };
}

async function inviteDiscoveryRequester({ tree, request, invitedBy }) {
    const { firstName, lastName } = splitRequestedName(request.requester_name, request.searched_surname);
    let person = await personQueries.findByTreeAndEmail(tree.id, request.requester_email);

    if (!person) {
        person = await personQueries.create({
            family_tree_id: tree.id,
            first_name: firstName,
            last_name: lastName,
            biography: `Discovery request submitted on ${new Date(request.created_at || Date.now()).toLocaleDateString('en-US')}.`,
            email: request.requester_email
        });
    }

    let invite = await inviteQueries.findPendingByTreeAndEmail(tree.id, request.requester_email);
    let inviteToken = invite?.token || null;
    let expiresAt = invite?.expires_at ? new Date(invite.expires_at) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (!invite) {
        inviteToken = crypto.randomBytes(32).toString('hex');
        invite = await inviteQueries.create({
            token: inviteToken,
            tree_id: tree.id,
            person_id: person.id,
            person_name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
            person_email: request.requester_email,
            created_by: invitedBy.uid,
            expires_at: expiresAt
        });
    }

    const inviter = await userQueries.findById(invitedBy.uid);
    const inviterName = inviter?.display_name || inviter?.email?.split('@')[0] || 'A family member';
    const baseUrl = process.env.APP_URL || 'https://rasin.pyebwa.com';
    const inviteUrl = `${baseUrl}/app/invite/${inviteToken}`;

    const emailResult = await emailService.sendInviteEmail(request.requester_email, {
        personName: invite.person_name,
        familyName: tree.name || 'Family',
        inviterName,
        inviteUrl,
        expiresAt: expiresAt.toLocaleDateString(),
        lang: request.requester_language || 'en'
    });

    return {
        person,
        invite,
        inviteUrl,
        emailSent: emailResult?.success === true,
        emailResult
    };
}

router.get('/search', async (req, res) => {
    try {
        const surname = String(req.query.surname || '').trim();
        const origin = String(req.query.origin || '').trim();

        if (!surname) {
            return res.status(400).json({ error: 'Surname is required' });
        }

        const results = await discoveryQueries.searchTreesBySurnameAndOrigin(surname, origin);
        res.json({ success: true, results });
    } catch (error) {
        console.error('Error searching discoverable trees:', error);
        res.status(500).json({ error: 'Failed to search family matches' });
    }
});

router.post('/request', async (req, res) => {
    try {
        const treeId = String(req.body.treeId || '').trim();
        const surname = String(req.body.surname || '').trim();
        const requesterName = String(req.body.requesterName || '').trim();
        const requesterEmail = String(req.body.requesterEmail || '').trim();
        const requesterOrigin = String(req.body.requesterOrigin || '').trim();
        const requesterMessage = String(req.body.requesterMessage || '').trim();
        const requesterLanguage = String(req.body.requesterLanguage || 'en').trim() || 'en';

        if (!treeId || !surname || !requesterName || !requesterEmail) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const tree = await treeQueries.findById(treeId);
        if (!tree) {
            return res.status(404).json({ error: 'Family match not found' });
        }

        const discoverySettings = discoveryQueries.normalizeDiscoverySettings(tree.settings);
        if (!discoverySettings.enabled) {
            return res.status(403).json({ error: 'This family tree is not discoverable' });
        }

        const created = await discoveryQueries.createRequest({
            tree_id: treeId,
            searched_surname: surname,
            requester_name: requesterName,
            requester_email: requesterEmail,
            requester_origin: requesterOrigin,
            requester_message: requesterMessage,
            requester_language: requesterLanguage
        });

        await adminQueries.logAction('discovery_request_created', null, {
            treeId,
            surname,
            requesterEmail
        });

        res.status(201).json({
            success: true,
            request: {
                id: created.id,
                status: created.status
            }
        });
    } catch (error) {
        console.error('Error creating discovery request:', error);
        res.status(500).json({ error: 'Failed to submit your request' });
    }
});

router.get('/trees/:treeId/requests', verifySession, async (req, res) => {
    try {
        const { treeId } = req.params;
        const hasWriteAccess = await treeQueries.hasWriteAccess(treeId, req.user.uid);
        if (!hasWriteAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const requests = await discoveryQueries.listByTree(treeId);
        res.json({ success: true, requests });
    } catch (error) {
        console.error('Error listing discovery requests:', error);
        res.status(500).json({ error: 'Failed to load discovery requests' });
    }
});

router.put('/trees/:treeId/requests/:requestId', verifySession, async (req, res) => {
    try {
        const { treeId, requestId } = req.params;
        const status = String(req.body.status || '').trim();
        const allowedStatuses = ['new', 'reviewed', 'contacted', 'invited', 'declined', 'archived'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid request status' });
        }

        const hasWriteAccess = await treeQueries.hasWriteAccess(treeId, req.user.uid);
        if (!hasWriteAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const tree = await treeQueries.findById(treeId);
        if (!tree) {
            return res.status(404).json({ error: 'Family tree not found' });
        }

        const updated = await discoveryQueries.updateStatus(requestId, status, req.user.uid);
        if (!updated || updated.tree_id !== treeId) {
            return res.status(404).json({ error: 'Request not found' });
        }

        let invitation = null;
        if (status === 'invited') {
            invitation = await inviteDiscoveryRequester({
                tree,
                request: updated,
                invitedBy: req.user
            });
        }

        await adminQueries.logAction('discovery_request_updated', req.user.uid, {
            treeId,
            requestId,
            status,
            invitationEmailSent: invitation?.emailSent === true
        });

        res.json({
            success: true,
            request: updated,
            invitation: invitation ? {
                inviteUrl: invitation.inviteUrl,
                emailSent: invitation.emailSent,
                personId: invitation.person.id,
                inviteId: invitation.invite.id
            } : null
        });
    } catch (error) {
        console.error('Error updating discovery request:', error);
        res.status(500).json({ error: 'Failed to update request' });
    }
});

module.exports = router;
