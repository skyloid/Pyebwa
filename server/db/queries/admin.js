const { query } = require('../pool');

async function logAction(action, userId, details = {}, ipAddress = null) {
    const result = await query(
        `INSERT INTO admin_logs (action, user_id, details, ip_address)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [action, userId, JSON.stringify(details), ipAddress]
    );
    return result.rows[0];
}

async function getLogs(limit = 100, offset = 0) {
    const result = await query(
        'SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
    );
    return result.rows;
}

async function clearLogs() {
    const result = await query('DELETE FROM admin_logs RETURNING id');
    return { cleared: result.rowCount };
}

async function getAnnouncements(activeOnly = true) {
    let sql = 'SELECT * FROM announcements';
    if (activeOnly) sql += ' WHERE active = true';
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql);
    return result.rows;
}

async function getAnnouncementById(id) {
    const result = await query('SELECT * FROM announcements WHERE id = $1', [id]);
    return result.rows[0] || null;
}

async function createAnnouncement(data) {
    const result = await query(
        `INSERT INTO announcements (title, subject, content, tree_id, author_id, active, status, recipients, options)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
            data.title, data.subject, data.content,
            data.tree_id || null, data.author_id || null,
            data.active !== false, data.status || 'draft',
            JSON.stringify(data.recipients || {}),
            JSON.stringify(data.options || {})
        ]
    );
    return result.rows[0];
}

async function updateAnnouncement(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
        if (['title', 'subject', 'content', 'active', 'status', 'recipients', 'options', 'stats', 'sent_at', 'sent_by'].includes(key)) {
            fields.push(`${key} = $${paramIndex}`);
            values.push(['recipients', 'options', 'stats'].includes(key) ? JSON.stringify(value) : value);
            paramIndex++;
        }
    }

    if (fields.length === 0) return null;
    values.push(id);

    const result = await query(
        `UPDATE announcements SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
    );
    return result.rows[0] || null;
}

async function getContent(key) {
    const result = await query('SELECT * FROM content WHERE key = $1', [key]);
    return result.rows[0] || null;
}

async function setContent(key, value) {
    const result = await query(
        `INSERT INTO content (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
         RETURNING *`,
        [key, JSON.stringify(value)]
    );
    return result.rows[0];
}

module.exports = {
    logAction, getLogs, clearLogs,
    getAnnouncements, getAnnouncementById, createAnnouncement, updateAnnouncement,
    getContent, setContent
};
