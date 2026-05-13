const { query, getClient } = require('../pool');

async function findById(id) {
    const result = await query('SELECT * FROM family_trees WHERE id = $1', [id]);
    return result.rows[0] || null;
}

async function findByOwner(userId) {
    const result = await query('SELECT * FROM family_trees WHERE owner_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows;
}

async function findByMember(userId) {
    const result = await query(
        `SELECT ft.* FROM family_trees ft
         INNER JOIN family_tree_members ftm ON ft.id = ftm.family_tree_id
         WHERE ftm.user_id = $1
         ORDER BY ft.created_at DESC`,
        [userId]
    );
    return result.rows;
}

async function findAllForUser(userId) {
    // Trees where user is owner OR member
    const result = await query(
        `SELECT DISTINCT ft.* FROM family_trees ft
         LEFT JOIN family_tree_members ftm ON ft.id = ftm.family_tree_id
         WHERE ft.owner_id = $1 OR ftm.user_id = $1
         ORDER BY ft.created_at DESC`,
        [userId]
    );
    return result.rows;
}

async function create(data) {
    const client = await getClient();
    try {
        await client.query('BEGIN');

        const treeResult = await client.query(
            `INSERT INTO family_trees (name, description, owner_id, is_public, settings)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [data.name, data.description || '', data.owner_id, data.is_public || false,
             JSON.stringify(data.settings || { allowMemberInvites: true, moderateContent: false })]
        );
        const tree = treeResult.rows[0];

        // Add owner as member
        await client.query(
            `INSERT INTO family_tree_members (family_tree_id, user_id, role)
             VALUES ($1, $2, 'owner')
             ON CONFLICT (family_tree_id, user_id) DO UPDATE SET role = 'owner'`,
            [tree.id, data.owner_id]
        );

        await client.query('COMMIT');
        return tree;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['name', 'description', 'is_public', 'settings'];
    for (const [key, value] of Object.entries(data)) {
        if (allowedFields.includes(key)) {
            fields.push(`${key} = $${paramIndex}`);
            values.push(key === 'settings' ? JSON.stringify(value) : value);
            paramIndex++;
        }
    }

    if (fields.length === 0) return null;

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
        `UPDATE family_trees SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
    );
    return result.rows[0] || null;
}

async function addMember(treeId, userId) {
    await query(
        `INSERT INTO family_tree_members (family_tree_id, user_id, role)
         VALUES ($1, $2, 'viewer')
         ON CONFLICT DO NOTHING`,
        [treeId, userId]
    );
}

async function removeMember(treeId, userId) {
    await query(
        'DELETE FROM family_tree_members WHERE family_tree_id = $1 AND user_id = $2',
        [treeId, userId]
    );
}

async function getMembers(treeId) {
    const result = await query(
        `SELECT u.id, u.email, u.display_name, u.photo_url, u.role, ftm.role AS tree_role
         FROM users u
         INNER JOIN family_tree_members ftm ON u.id = ftm.user_id
         WHERE ftm.family_tree_id = $1`,
        [treeId]
    );
    return result.rows;
}

async function getMemberIds(treeId) {
    const result = await query(
        'SELECT user_id FROM family_tree_members WHERE family_tree_id = $1',
        [treeId]
    );
    return result.rows.map(r => r.user_id);
}

async function isMember(treeId, userId) {
    const result = await query(
        'SELECT 1 FROM family_tree_members WHERE family_tree_id = $1 AND user_id = $2',
        [treeId, userId]
    );
    return result.rows.length > 0;
}

async function hasAccess(treeId, userId) {
    const tree = await findById(treeId);
    if (!tree) return false;
    if (tree.owner_id === userId) return true;
    return isMember(treeId, userId);
}

async function hasWriteAccess(treeId, userId) {
    const tree = await findById(treeId);
    if (!tree) return false;
    if (tree.owner_id === userId) return true;

    const result = await query(
        `SELECT 1
         FROM family_tree_members
         WHERE family_tree_id = $1
           AND user_id = $2
           AND role IN ('owner', 'editor')
         LIMIT 1`,
        [treeId, userId]
    );
    return result.rows.length > 0;
}

async function updateMemberRole(treeId, userId, role) {
    const result = await query(
        `UPDATE family_tree_members
         SET role = $3
         WHERE family_tree_id = $1
           AND user_id = $2
         RETURNING family_tree_id, user_id, role`,
        [treeId, userId, role]
    );
    return result.rows[0] || null;
}

async function deleteTree(id) {
    await query('DELETE FROM family_trees WHERE id = $1', [id]);
}

module.exports = {
    findById, findByOwner, findByMember, findAllForUser,
    create, update, addMember, removeMember, getMembers, getMemberIds,
    isMember, hasAccess, hasWriteAccess, updateMemberRole, deleteTree
};
