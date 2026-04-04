const { query } = require('../pool');

async function findById(id) {
    const result = await query('SELECT * FROM persons WHERE id = $1', [id]);
    return result.rows[0] || null;
}

async function findByTree(treeId) {
    const result = await query(
        'SELECT * FROM persons WHERE family_tree_id = $1 ORDER BY created_at DESC',
        [treeId]
    );
    return result.rows;
}

async function findByTreePaginated(treeId, limit = 20, offset = 0) {
    const result = await query(
        'SELECT * FROM persons WHERE family_tree_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [treeId, limit, offset]
    );
    const countResult = await query(
        'SELECT COUNT(*) FROM persons WHERE family_tree_id = $1',
        [treeId]
    );
    return {
        persons: result.rows,
        total: parseInt(countResult.rows[0].count),
        hasMore: offset + limit < parseInt(countResult.rows[0].count)
    };
}

async function create(data) {
    const searchTerms = buildSearchTerms(data);
    const result = await query(
        `INSERT INTO persons (family_tree_id, first_name, last_name, birth_date, death_date,
            biography, email, phone, gender, photos, relationships, search_terms, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
            data.family_tree_id, data.first_name, data.last_name || '',
            data.birth_date || null, data.death_date || null,
            data.biography || '', data.email || null, data.phone || null,
            data.gender || null,
            JSON.stringify(data.photos || []),
            JSON.stringify(data.relationships || []),
            JSON.stringify(searchTerms),
            data.user_id || null
        ]
    );
    return result.rows[0];
}

async function update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['first_name', 'last_name', 'birth_date', 'death_date',
        'biography', 'email', 'phone', 'gender', 'photos', 'relationships',
        'user_id', 'claimed_at', 'claimed_via_invite'];

    for (const [key, value] of Object.entries(data)) {
        if (allowedFields.includes(key)) {
            fields.push(`${key} = $${paramIndex}`);
            values.push(['photos', 'relationships'].includes(key) ? JSON.stringify(value) : value);
            paramIndex++;
        }
    }

    if (fields.length === 0) return null;

    // Rebuild search terms if name changed
    if (data.first_name || data.last_name) {
        const existing = await findById(id);
        const merged = { ...existing, ...data };
        const searchTerms = buildSearchTerms(merged);
        fields.push(`search_terms = $${paramIndex}`);
        values.push(JSON.stringify(searchTerms));
        paramIndex++;
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
        `UPDATE persons SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
    );
    return result.rows[0] || null;
}

async function remove(id) {
    await query('DELETE FROM persons WHERE id = $1', [id]);
}

async function search(treeId, searchQuery) {
    const pattern = `%${searchQuery}%`;
    const result = await query(
        `SELECT * FROM persons
         WHERE family_tree_id = $1
           AND (first_name ILIKE $2 OR last_name ILIKE $2 OR
                (first_name || ' ' || last_name) ILIKE $2)
         ORDER BY first_name, last_name
         LIMIT 20`,
        [treeId, pattern]
    );
    return result.rows;
}

async function linkToUser(personId, userId) {
    const result = await query(
        `UPDATE persons SET user_id = $1, claimed_at = NOW(), claimed_via_invite = true, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [userId, personId]
    );
    return result.rows[0] || null;
}

async function countByTree(treeId) {
    const result = await query('SELECT COUNT(*) FROM persons WHERE family_tree_id = $1', [treeId]);
    return parseInt(result.rows[0].count);
}

function buildSearchTerms(data) {
    const terms = [];
    if (data.first_name) {
        terms.push(data.first_name.toLowerCase());
    }
    if (data.last_name) {
        terms.push(data.last_name.toLowerCase());
    }
    if (data.first_name && data.last_name) {
        terms.push(`${data.first_name} ${data.last_name}`.toLowerCase());
    }
    return terms;
}

module.exports = { findById, findByTree, findByTreePaginated, create, update, remove, search, linkToUser, countByTree };
