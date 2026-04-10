const { query } = require('../pool');

async function findByToken(token) {
    const result = await query('SELECT * FROM invites WHERE token = $1', [token]);
    return result.rows[0] || null;
}

async function findByTree(treeId) {
    const result = await query(
        'SELECT * FROM invites WHERE tree_id = $1 ORDER BY created_at DESC',
        [treeId]
    );
    return result.rows;
}

async function findPendingByTreeAndEmail(treeId, email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return null;

    const result = await query(
        `SELECT * FROM invites
         WHERE tree_id = $1
           AND LOWER(COALESCE(person_email, '')) = $2
           AND status = 'pending'
           AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [treeId, normalizedEmail]
    );
    return result.rows[0] || null;
}

async function create(data) {
    const result = await query(
        `INSERT INTO invites (token, tree_id, person_id, person_name, person_email, created_by, expires_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
            data.token, data.tree_id, data.person_id,
            data.person_name || '', data.person_email || null,
            data.created_by,
            data.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            data.status || 'pending'
        ]
    );
    return result.rows[0];
}

async function accept(token, userId) {
    const result = await query(
        `UPDATE invites SET status = 'accepted', accepted_by = $1, accepted_at = NOW()
         WHERE token = $2 AND status = 'pending' RETURNING *`,
        [userId, token]
    );
    return result.rows[0] || null;
}

async function revoke(token, userId) {
    const result = await query(
        `UPDATE invites SET status = 'revoked', revoked_by = $1, revoked_at = NOW()
         WHERE token = $2 AND status = 'pending' RETURNING *`,
        [userId, token]
    );
    return result.rows[0] || null;
}

async function isExpired(invite) {
    return new Date(invite.expires_at) < new Date();
}

module.exports = { findByToken, findByTree, findPendingByTreeAndEmail, create, accept, revoke, isExpired };
