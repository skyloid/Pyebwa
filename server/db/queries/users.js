const { query } = require('../pool');

async function findById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
}

async function findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
}

async function create(data) {
    const result = await query(
        `INSERT INTO users (email, password_hash, display_name, role, photo_url, primary_family_tree_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [data.email, data.password_hash, data.display_name, data.role || 'member', data.photo_url || null, data.primary_family_tree_id || null]
    );
    return result.rows[0];
}

async function update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['display_name', 'role', 'photo_url', 'primary_family_tree_id',
        'email_verified', 'notifications_enabled', 'email_notifications_enabled',
        'notification_preferences', 'password_hash', 'reset_token', 'reset_token_expires',
        'last_active'];

    for (const [key, value] of Object.entries(data)) {
        if (allowedFields.includes(key)) {
            fields.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        }
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
    );
    return result.rows[0] || null;
}

async function findAll() {
    const result = await query('SELECT id, email, display_name, role, photo_url, last_active, created_at FROM users ORDER BY created_at DESC');
    return result.rows;
}

async function findByResetToken(token) {
    const result = await query(
        'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
        [token]
    );
    return result.rows[0] || null;
}

async function findActiveUsers(daysSince = 30) {
    const result = await query(
        'SELECT * FROM users WHERE last_active >= NOW() - $1::interval',
        [`${daysSince} days`]
    );
    return result.rows;
}

async function findNewUsers(daysSince = 7) {
    const result = await query(
        'SELECT * FROM users WHERE created_at >= NOW() - $1::interval',
        [`${daysSince} days`]
    );
    return result.rows;
}

async function findByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const result = await query(
        'SELECT * FROM users WHERE id = ANY($1)',
        [ids]
    );
    return result.rows;
}

module.exports = { findById, findByEmail, create, update, findAll, findByResetToken, findActiveUsers, findNewUsers, findByIds };
