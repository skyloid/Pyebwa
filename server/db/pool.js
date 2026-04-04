const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Fallback to individual vars
    host: process.env.DATABASE_URL ? undefined : (process.env.PG_HOST || 'localhost'),
    port: process.env.DATABASE_URL ? undefined : (process.env.PG_PORT || 5432),
    database: process.env.DATABASE_URL ? undefined : (process.env.PG_DATABASE || 'pyebwa'),
    user: process.env.DATABASE_URL ? undefined : (process.env.PG_USER || 'pyebwa'),
    password: process.env.DATABASE_URL ? undefined : process.env.PG_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
});

async function query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
        console.warn('Slow query:', { text: text.substring(0, 100), duration, rows: res.rowCount });
    }
    return res;
}

async function getClient() {
    return pool.connect();
}

module.exports = { pool, query, getClient };
