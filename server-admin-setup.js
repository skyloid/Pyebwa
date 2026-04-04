const { query } = require('./server/db/pool');
const userQueries = require('./server/db/queries/users');
const adminQueries = require('./server/db/queries/admin');

async function setupAdminEndpoint(req, res) {
    try {
        const { email, secretKey } = req.body;

        if (!process.env.ADMIN_SETUP_KEY) {
            return res.status(500).json({ error: 'ADMIN_SETUP_KEY not configured' });
        }
        if (secretKey !== process.env.ADMIN_SETUP_KEY) {
            return res.status(403).json({ error: 'Invalid secret key' });
        }

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        console.log(`Setting up admin for: ${email}`);

        const user = await userQueries.findByEmail(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found. They must register first.' });
        }

        await userQueries.update(user.id, { role: 'superadmin' });

        console.log(`Successfully promoted ${email} to superadmin`);

        await adminQueries.logAction('admin_promoted', user.id, {
            targetUser: email,
            role: 'superadmin',
            method: 'server-endpoint'
        }, req.ip);

        res.json({
            success: true,
            message: `Successfully promoted ${email} to superadmin`,
            userId: user.id
        });
    } catch (error) {
        console.error('Error setting up admin:', error);
        res.status(500).json({ error: 'Failed to setup admin', details: error.message });
    }
}

module.exports = { setupAdminEndpoint };
