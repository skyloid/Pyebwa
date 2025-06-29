const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const emailService = require('../services/email');
const { admin, db } = require('../services/firebase-admin');

// Middleware to verify Firebase ID token
async function verifyToken(req, res, next) {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    
    if (!idToken) {
        return res.status(401).json({ error: 'No authorization token provided' });
    }
    
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ error: 'Invalid authorization token' });
    }
}

// Generate invite link for a family member
router.post('/generate', verifyToken, async (req, res) => {
    try {
        console.log('Invite generation request received');
        console.log('Admin instance:', !!admin);
        console.log('DB instance:', !!db);
        console.log('Request body:', req.body);
        
        const { treeId, personId } = req.body;
        const userId = req.user.uid;
        
        if (!treeId || !personId) {
            return res.status(400).json({ error: 'Tree ID and Person ID are required' });
        }
        
        console.log('Accessing Firestore for tree:', treeId);
        console.log('User ID from token:', userId);
        
        // Verify user has access to this tree
        const treeDoc = await db.collection('familyTrees').doc(treeId).get();
        if (!treeDoc.exists) {
            console.log('Tree not found:', treeId);
            return res.status(404).json({ error: 'Family tree not found' });
        }
        
        const treeData = treeDoc.data();
        console.log('Full tree document data:', JSON.stringify(treeData, null, 2));
        
        // Check access using the correct field names: ownerId and memberIds
        const isOwner = treeData.ownerId === userId;
        const isMember = treeData.memberIds?.includes(userId);
        
        console.log('Tree data access check:', {
            ownerId: treeData.ownerId,
            memberIds: treeData.memberIds,
            userId: userId,
            isOwner: isOwner,
            isMember: isMember
        });
        
        if (!isOwner && !isMember) {
            console.log('Access denied - user is not owner or member');
            return res.status(403).json({ error: 'Access denied to this family tree' });
        }
        
        // Get person data - try both 'members' and 'persons' collections
        let personDoc = await db.collection('familyTrees').doc(treeId)
            .collection('members').doc(personId).get();
        
        if (!personDoc.exists) {
            // Try persons collection as fallback
            personDoc = await db.collection('familyTrees').doc(treeId)
                .collection('persons').doc(personId).get();
        }
        
        if (!personDoc.exists) {
            return res.status(404).json({ error: 'Person not found' });
        }
        
        const personData = personDoc.data();
        
        // Generate a unique invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        
        // Create invite document
        const inviteData = {
            token: inviteToken,
            treeId: treeId,
            personId: personId,
            personName: `${personData.firstName || ''} ${personData.lastName || ''}`.trim(),
            personEmail: personData.email || null,
            createdBy: userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            ),
            status: 'pending',
            acceptedBy: null,
            acceptedAt: null
        };
        
        // Save invite to database
        await db.collection('invites').doc(inviteToken).set(inviteData);
        
        // Generate the invite URL
        const baseUrl = process.env.APP_URL || 'https://rasin.pyebwa.com';
        const inviteUrl = `${baseUrl}/app/invite/${inviteToken}`;
        
        // Log the activity
        await db.collection('admin_logs').add({
            action: 'invite_generated',
            userId: userId,
            treeId: treeId,
            personId: personId,
            inviteToken: inviteToken,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Send invite email if person has email address
        if (personData.email) {
            try {
                // Get inviter's name
                const inviterDoc = await db.collection('users').doc(userId).get();
                const inviterData = inviterDoc.data();
                const inviterName = inviterData?.displayName || inviterData?.email?.split('@')[0] || 'A family member';
                
                await emailService.sendInviteEmail(personData.email, {
                    personName: inviteData.personName,
                    familyName: treeData.name || 'Family',
                    inviterName: inviterName,
                    inviteUrl: inviteUrl,
                    expiresAt: inviteData.expiresAt.toDate().toLocaleDateString()
                });
                
                console.log(`Invite email sent to ${personData.email}`);
            } catch (emailError) {
                console.error('Failed to send invite email:', emailError);
                // Don't fail the whole request if email fails
            }
        }
        
        res.json({
            success: true,
            inviteUrl: inviteUrl,
            token: inviteToken,
            expiresAt: inviteData.expiresAt.toDate(),
            personName: inviteData.personName,
            emailSent: !!personData.email
        });
        
    } catch (error) {
        console.error('Error generating invite:', error);
        res.status(500).json({ error: 'Failed to generate invite link' });
    }
});

// Get invite details (public endpoint for invite recipients)
router.get('/details/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        const inviteDoc = await db.collection('invites').doc(token).get();
        
        if (!inviteDoc.exists) {
            return res.status(404).json({ error: 'Invalid or expired invite link' });
        }
        
        const inviteData = inviteDoc.data();
        
        // Check if invite is expired
        if (inviteData.expiresAt.toDate() < new Date()) {
            return res.status(410).json({ error: 'This invite link has expired' });
        }
        
        // Check if already accepted
        if (inviteData.status === 'accepted') {
            return res.status(410).json({ error: 'This invite has already been used' });
        }
        
        // Get tree and person details
        const treeDoc = await db.collection('familyTrees').doc(inviteData.treeId).get();
        
        // Try members collection first
        let personDoc = await db.collection('familyTrees').doc(inviteData.treeId)
            .collection('members').doc(inviteData.personId).get();
        
        if (!personDoc.exists) {
            // Try persons collection as fallback
            personDoc = await db.collection('familyTrees').doc(inviteData.treeId)
                .collection('persons').doc(inviteData.personId).get();
        }
        
        if (!treeDoc.exists || !personDoc.exists) {
            return res.status(404).json({ error: 'Family tree or person no longer exists' });
        }
        
        const treeData = treeDoc.data();
        const personData = personDoc.data();
        
        res.json({
            success: true,
            invite: {
                personName: inviteData.personName,
                personId: inviteData.personId,
                treeName: treeData.name || 'Family Tree',
                treeId: inviteData.treeId,
                expiresAt: inviteData.expiresAt.toDate()
            }
        });
        
    } catch (error) {
        console.error('Error getting invite details:', error);
        res.status(500).json({ error: 'Failed to retrieve invite details' });
    }
});

// Accept invite and create/link user account
router.post('/accept/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { userId } = req.body; // User ID if already logged in
        
        const inviteDoc = await db.collection('invites').doc(token).get();
        
        if (!inviteDoc.exists) {
            return res.status(404).json({ error: 'Invalid or expired invite link' });
        }
        
        const inviteData = inviteDoc.data();
        
        // Check if invite is expired
        if (inviteData.expiresAt.toDate() < new Date()) {
            return res.status(410).json({ error: 'This invite link has expired' });
        }
        
        // Check if already accepted
        if (inviteData.status === 'accepted') {
            return res.status(410).json({ error: 'This invite has already been used' });
        }
        
        // Start a batch write
        const batch = db.batch();
        
        // Update person document to link with user - check both collections
        let personRef = db.collection('familyTrees').doc(inviteData.treeId)
            .collection('members').doc(inviteData.personId);
        
        // Check if document exists in members collection
        const memberDoc = await personRef.get();
        if (!memberDoc.exists) {
            // Try persons collection
            personRef = db.collection('familyTrees').doc(inviteData.treeId)
                .collection('persons').doc(inviteData.personId);
        }
        
        batch.update(personRef, {
            userId: userId,
            claimedAt: admin.firestore.FieldValue.serverTimestamp(),
            claimedViaInvite: true
        });
        
        // Add user as a member to the tree (using memberIds field)
        const treeRef = db.collection('familyTrees').doc(inviteData.treeId);
        batch.update(treeRef, {
            memberIds: admin.firestore.FieldValue.arrayUnion(userId)
        });
        
        // Update user document to add this tree
        const userRef = db.collection('users').doc(userId);
        batch.update(userRef, {
            familyTrees: admin.firestore.FieldValue.arrayUnion(inviteData.treeId),
            lastTreeAccessed: inviteData.treeId
        });
        
        // Update invite status
        batch.update(inviteDoc.ref, {
            status: 'accepted',
            acceptedBy: userId,
            acceptedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Commit all changes
        await batch.commit();
        
        // Log the activity
        await db.collection('admin_logs').add({
            action: 'invite_accepted',
            userId: userId,
            treeId: inviteData.treeId,
            personId: inviteData.personId,
            inviteToken: token,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({
            success: true,
            treeId: inviteData.treeId,
            personId: inviteData.personId,
            message: 'Invite accepted successfully'
        });
        
    } catch (error) {
        console.error('Error accepting invite:', error);
        res.status(500).json({ error: 'Failed to accept invite' });
    }
});

// Revoke an invite
router.post('/revoke/:token', verifyToken, async (req, res) => {
    try {
        const { token } = req.params;
        const userId = req.user.uid;
        
        const inviteDoc = await db.collection('invites').doc(token).get();
        
        if (!inviteDoc.exists) {
            return res.status(404).json({ error: 'Invite not found' });
        }
        
        const inviteData = inviteDoc.data();
        
        // Verify user has permission to revoke
        if (inviteData.createdBy !== userId) {
            // Check if user is admin
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            if (!userData?.isAdmin) {
                return res.status(403).json({ error: 'Permission denied' });
            }
        }
        
        // Update invite status
        await inviteDoc.ref.update({
            status: 'revoked',
            revokedBy: userId,
            revokedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Log the activity
        await db.collection('admin_logs').add({
            action: 'invite_revoked',
            userId: userId,
            inviteToken: token,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({
            success: true,
            message: 'Invite revoked successfully'
        });
        
    } catch (error) {
        console.error('Error revoking invite:', error);
        res.status(500).json({ error: 'Failed to revoke invite' });
    }
});

// List invites for a tree
router.get('/list/:treeId', verifyToken, async (req, res) => {
    try {
        const { treeId } = req.params;
        const userId = req.user.uid;
        
        // Verify user has access to this tree
        const treeDoc = await db.collection('familyTrees').doc(treeId).get();
        if (!treeDoc.exists) {
            return res.status(404).json({ error: 'Family tree not found' });
        }
        
        const treeData = treeDoc.data();
        // Check access using the correct field names: ownerId and memberIds
        if (treeData.ownerId !== userId && !treeData.memberIds?.includes(userId)) {
            // Check if user is admin
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            if (!userData?.isAdmin) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }
        
        // Get all invites for this tree
        const invitesSnapshot = await db.collection('invites')
            .where('treeId', '==', treeId)
            .orderBy('createdAt', 'desc')
            .get();
        
        const invites = [];
        invitesSnapshot.forEach(doc => {
            const data = doc.data();
            invites.push({
                token: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                expiresAt: data.expiresAt?.toDate(),
                acceptedAt: data.acceptedAt?.toDate()
            });
        });
        
        res.json({
            success: true,
            invites: invites
        });
        
    } catch (error) {
        console.error('Error listing invites:', error);
        res.status(500).json({ error: 'Failed to list invites' });
    }
});

module.exports = router;