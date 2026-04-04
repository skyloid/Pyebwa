const { pool, query } = require('./db/pool');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const { createWriteStream } = require('fs');

class BackupService {
    constructor() {
        this.backupDir = path.join(__dirname, '../backups');
        this.ensureBackupDir();
    }

    async ensureBackupDir() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
        } catch (error) {
            console.error('Error creating backup directory:', error);
        }
    }

    async createBackup(tables, format = 'json') {
        const backupId = `backup_${Date.now()}`;
        const timestamp = new Date();

        try {
            const data = {};
            let totalSize = 0;

            // Collect data from selected tables
            for (const table of tables) {
                console.log(`Backing up table: ${table}`);
                const result = await query(`SELECT * FROM ${table}`);
                data[table] = result.rows;
                console.log(`Table ${table}: ${result.rows.length} rows`);
            }

            let filePath;
            let fileSize;

            if (format === 'json') {
                const jsonData = JSON.stringify(data, null, 2);
                filePath = path.join(this.backupDir, `${backupId}.json`);
                await fs.writeFile(filePath, jsonData);
                fileSize = Buffer.byteLength(jsonData);
            } else {
                filePath = await this.createCSVBackup(data, backupId);
                const stats = await fs.stat(filePath);
                fileSize = stats.size;
            }

            // Save backup metadata to content table
            await query(
                `INSERT INTO content (id, key, value, updated_at) VALUES (gen_random_uuid(), $1, $2, NOW())
                 ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
                [`backup:${backupId}`, JSON.stringify({
                    id: backupId,
                    created: timestamp.toISOString(),
                    tables,
                    format,
                    size: fileSize,
                    status: 'completed',
                    type: 'manual',
                    filePath
                })]
            );

            console.log(`Backup ${backupId} created successfully`);
            return { success: true, backupId, data: format === 'json' ? data : null };

        } catch (error) {
            console.error('Error creating backup:', error);

            await query(
                `INSERT INTO content (id, key, value, updated_at) VALUES (gen_random_uuid(), $1, $2, NOW())
                 ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
                [`backup:${backupId}`, JSON.stringify({
                    id: backupId,
                    created: timestamp.toISOString(),
                    tables,
                    format,
                    size: 0,
                    status: 'failed',
                    type: 'manual',
                    error: error.message
                })]
            );

            throw error;
        }
    }

    async createCSVBackup(data, backupId) {
        const zipPath = path.join(this.backupDir, `${backupId}.zip`);
        const output = createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
            output.on('close', () => resolve(zipPath));
            archive.on('error', reject);

            archive.pipe(output);

            Object.entries(data).forEach(([table, rows]) => {
                if (rows.length > 0) {
                    const csv = this.convertToCSV(rows);
                    archive.append(csv, { name: `${table}.csv` });
                }
            });

            archive.finalize();
        });
    }

    convertToCSV(documents) {
        if (documents.length === 0) return '';

        const allKeys = new Set();
        documents.forEach(doc => {
            Object.keys(doc).forEach(key => allKeys.add(key));
        });

        const headers = Array.from(allKeys);
        const csvRows = [headers.join(',')];

        documents.forEach(doc => {
            const values = headers.map(header => {
                let value = doc[header];

                if (value === null || value === undefined) {
                    return '';
                } else if (typeof value === 'object') {
                    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                } else if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                } else {
                    return value;
                }
            });
            csvRows.push(values.join(','));
        });

        return csvRows.join('\n');
    }

    async getBackupHistory() {
        try {
            const result = await query(
                `SELECT value FROM content WHERE key LIKE 'backup:%' ORDER BY updated_at DESC LIMIT 50`
            );
            return result.rows.map(r => {
                const data = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
                return { ...data, created: new Date(data.created) };
            });
        } catch (error) {
            console.error('Error getting backup history:', error);
            throw error;
        }
    }

    async downloadBackup(backupId) {
        try {
            const result = await query(
                `SELECT value FROM content WHERE key = $1`,
                [`backup:${backupId}`]
            );

            if (result.rows.length === 0) {
                throw new Error('Backup not found');
            }

            const backup = typeof result.rows[0].value === 'string'
                ? JSON.parse(result.rows[0].value)
                : result.rows[0].value;
            const filePath = backup.filePath;

            try {
                await fs.access(filePath);
                return filePath;
            } catch {
                throw new Error('Backup file not found on disk');
            }
        } catch (error) {
            console.error('Error downloading backup:', error);
            throw error;
        }
    }

    async deleteBackup(backupId) {
        try {
            const result = await query(
                `SELECT value FROM content WHERE key = $1`,
                [`backup:${backupId}`]
            );

            if (result.rows.length === 0) {
                throw new Error('Backup not found');
            }

            const backup = typeof result.rows[0].value === 'string'
                ? JSON.parse(result.rows[0].value)
                : result.rows[0].value;

            try {
                await fs.unlink(backup.filePath);
            } catch (error) {
                console.warn('Backup file not found on disk:', error.message);
            }

            await query(`DELETE FROM content WHERE key = $1`, [`backup:${backupId}`]);

            console.log(`Backup ${backupId} deleted successfully`);
            return { success: true };
        } catch (error) {
            console.error('Error deleting backup:', error);
            throw error;
        }
    }

    async getScheduleConfig() {
        try {
            const result = await query(
                `SELECT value FROM content WHERE key = 'backup_schedule'`
            );

            if (result.rows.length === 0) {
                return {
                    frequency: 'disabled',
                    time: '02:00',
                    day: '0',
                    date: '1',
                    retention: '30'
                };
            }

            return typeof result.rows[0].value === 'string'
                ? JSON.parse(result.rows[0].value)
                : result.rows[0].value;
        } catch (error) {
            console.error('Error getting schedule config:', error);
            throw error;
        }
    }

    async saveScheduleConfig(config) {
        try {
            await query(
                `INSERT INTO content (id, key, value, updated_at) VALUES (gen_random_uuid(), 'backup_schedule', $1, NOW())
                 ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
                [JSON.stringify({ ...config, updatedAt: new Date().toISOString() })]
            );

            if (config.frequency !== 'disabled') {
                this.setupScheduledBackup(config);
            }

            return { success: true };
        } catch (error) {
            console.error('Error saving schedule config:', error);
            throw error;
        }
    }

    setupScheduledBackup(config) {
        console.log('Scheduled backup configured:', config);
    }

    async cleanupOldBackups(retentionDays = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const result = await query(
                `SELECT key, value FROM content WHERE key LIKE 'backup:%'`
            );

            const toDelete = [];
            for (const row of result.rows) {
                const backup = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
                if (new Date(backup.created) < cutoffDate) {
                    toDelete.push({ key: row.key, filePath: backup.filePath });
                }
            }

            for (const item of toDelete) {
                try {
                    await fs.unlink(item.filePath);
                } catch (error) {
                    console.warn('Error deleting backup file:', item.filePath, error.message);
                }
                await query(`DELETE FROM content WHERE key = $1`, [item.key]);
            }

            console.log(`Cleaned up ${toDelete.length} old backups`);
            return { deleted: toDelete.length };
        } catch (error) {
            console.error('Error cleaning up old backups:', error);
            throw error;
        }
    }
}

module.exports = BackupService;
