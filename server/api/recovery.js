const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { verifySession } = require('../db/auth');
const { getClient } = require('../db/pool');
const userQueries = require('../db/queries/users');
const treeQueries = require('../db/queries/family-trees');
const personQueries = require('../db/queries/persons');

router.use(verifySession);

function asString(value, fallback = '') {
    return typeof value === 'string' ? value.trim() : fallback;
}

function asNullableString(value) {
    const normalized = asString(value, '');
    return normalized || null;
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeDate(value) {
    if (!value) return null;

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return trimmed;
        }

        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString().slice(0, 10);
        }
        return null;
    }

    if (typeof value === 'object') {
        if (typeof value.toDate === 'function') {
            const converted = value.toDate();
            if (converted instanceof Date && !Number.isNaN(converted.getTime())) {
                return converted.toISOString().slice(0, 10);
            }
        }

        if (typeof value.seconds === 'number') {
            return new Date(value.seconds * 1000).toISOString().slice(0, 10);
        }

        if (typeof value._seconds === 'number') {
            return new Date(value._seconds * 1000).toISOString().slice(0, 10);
        }
    }

    return null;
}

function normalizePhotos(photos, memberId, photoUrl) {
    const normalized = [];
    const seen = new Set();

    if (photoUrl) {
        normalized.push({
            url: photoUrl,
            caption: 'Profile Photo',
            isProfile: true,
            taggedMemberIds: [memberId]
        });
        seen.add(photoUrl);
    }

    for (const photo of asArray(photos)) {
        if (!photo || !photo.url || seen.has(photo.url)) continue;
        seen.add(photo.url);
        normalized.push({
            ...photo,
            taggedMemberIds: asArray(photo.taggedMemberIds).length > 0
                ? asArray(photo.taggedMemberIds)
                : [memberId]
        });
    }

    return normalized;
}

function rewriteRelationships(relationships, memberIdMap) {
    return asArray(relationships)
        .map((relationship) => {
            if (!relationship || typeof relationship !== 'object') return null;

            const targetId = relationship.personId || relationship.relatedTo || relationship.targetId;
            if (!targetId || !memberIdMap[targetId]) return null;

            return {
                ...relationship,
                personId: memberIdMap[targetId],
                relatedTo: memberIdMap[targetId]
            };
        })
        .filter(Boolean);
}

router.post('/legacy-import', async (req, res) => {
    const payload = req.body || {};
    const legacyTree = asObject(payload.tree);
    const legacyMembers = asArray(payload.members);

    if (!legacyTree || legacyMembers.length === 0) {
        return res.status(400).json({ error: 'Legacy tree payload is required' });
    }

    try {
        const currentUser = await userQueries.findById(req.user.uid);
        const existingTrees = await treeQueries.findAllForUser(req.user.uid);
        if (existingTrees.length > 0) {
            for (const tree of existingTrees) {
                const count = await personQueries.countByTree(tree.id);
                if (count > 0) {
                    return res.status(409).json({ error: 'This account already has family tree data' });
                }
            }
        }

        const client = await getClient();
        try {
            await client.query('BEGIN');

            if (!currentUser) {
                await client.query(
                    `INSERT INTO users (id, email, password_hash, display_name, role, status)
                     VALUES ($1, $2, $3, $4, 'member', 'active')`,
                    [
                        req.user.uid,
                        req.user.email,
                        'supabase-managed',
                        req.user.displayName || asString(payload.displayName, '')
                    ]
                );
            } else if (req.user.displayName && req.user.displayName !== currentUser.display_name) {
                await client.query(
                    'UPDATE users SET display_name = $1, updated_at = NOW() WHERE id = $2',
                    [req.user.displayName, req.user.uid]
                );
            }

            const newTreeId = crypto.randomUUID();
            const treeName = asString(legacyTree.name, 'Recovered Family Tree');
            const treeDescription = asString(
                legacyTree.description,
                `Recovered from legacy Firebase tree ${asString(payload.legacyTreeId || legacyTree.id, 'unknown')}`
            );

            await client.query(
                `INSERT INTO family_trees (id, name, description, owner_id, is_public, settings)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    newTreeId,
                    treeName,
                    treeDescription,
                    req.user.uid,
                    Boolean(legacyTree.isPublic),
                    JSON.stringify(asObject(legacyTree.settings))
                ]
            );

            await client.query(
                `INSERT INTO family_tree_members (family_tree_id, user_id, role)
                 VALUES ($1, $2, 'owner')
                 ON CONFLICT (family_tree_id, user_id) DO UPDATE SET role = 'owner'`,
                [newTreeId, req.user.uid]
            );

            const memberIdMap = {};
            for (const member of legacyMembers) {
                const legacyId = asString(member.id || member._id || member.docId);
                if (!legacyId) continue;
                memberIdMap[legacyId] = crypto.randomUUID();
            }

            for (const member of legacyMembers) {
                const legacyId = asString(member.id || member._id || member.docId);
                const newPersonId = memberIdMap[legacyId];
                if (!newPersonId) continue;

                const firstName = asString(member.firstName || member.first_name || member.name, 'Unknown');
                const lastName = asString(member.lastName || member.last_name, '');
                const nickname = asString(member.nickname, '');
                const email = asNullableString(member.email);
                const photoUrl = asNullableString(member.photoUrl || member.photoURL);
                const userId = email && req.user.email && email.toLowerCase() === req.user.email.toLowerCase()
                    ? req.user.uid
                    : null;

                await client.query(
                    `INSERT INTO persons (
                        id, family_tree_id, first_name, last_name, nickname, use_nickname,
                        birth_date, death_date, biography, email, phone, gender, photos,
                        relationships, events, stories, documents, video_messages,
                        related_stories, privacy, search_terms, user_id, claimed_at, claimed_via_invite
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6,
                        $7, $8, $9, $10, $11, $12, $13,
                        $14, $15, $16, $17, $18,
                        $19, $20, $21, $22, $23, $24
                    )`,
                    [
                        newPersonId,
                        newTreeId,
                        firstName,
                        lastName,
                        nickname,
                        Boolean(member.useNickname || member.use_nickname),
                        normalizeDate(member.birthDate || member.birth_date),
                        normalizeDate(member.deathDate || member.death_date),
                        asString(member.biography),
                        email,
                        asNullableString(member.phone),
                        asNullableString(member.gender),
                        JSON.stringify(normalizePhotos(member.photos, newPersonId, photoUrl)),
                        JSON.stringify(rewriteRelationships(member.relationships, memberIdMap)),
                        JSON.stringify(asArray(member.events)),
                        JSON.stringify(asArray(member.stories)),
                        JSON.stringify(asArray(member.documents)),
                        JSON.stringify(asArray(member.videoMessages || member.video_messages)),
                        JSON.stringify(asArray(member.relatedStories || member.related_stories)),
                        JSON.stringify(asObject(member.privacy)),
                        JSON.stringify(
                            [firstName, lastName, nickname, `${firstName} ${lastName}`]
                                .map((value) => asString(value).toLowerCase())
                                .filter(Boolean)
                        ),
                        userId,
                        userId ? new Date() : null,
                        Boolean(userId)
                    ]
                );
            }

            await client.query(
                'UPDATE users SET primary_family_tree_id = $1, updated_at = NOW() WHERE id = $2',
                [newTreeId, req.user.uid]
            );

            await client.query('COMMIT');
            return res.json({
                success: true,
                treeId: newTreeId,
                importedMembers: Object.keys(memberIdMap).length
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Legacy recovery import failed:', error);
        res.status(500).json({ error: 'Failed to import legacy family tree' });
    }
});

module.exports = router;
