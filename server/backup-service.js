const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const { createReadStream, createWriteStream } = require('fs');

class BackupService {
    constructor() {
        this.db = admin.firestore();
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

    async createBackup(collections, format = 'json') {
        const backupId = `backup_${Date.now()}`;
        const timestamp = new Date();
        
        try {
            const data = {};
            let totalSize = 0;

            // Collect data from selected collections
            for (const collection of collections) {
                console.log(`Backing up collection: ${collection}`);
                const snapshot = await this.db.collection(collection).get();
                
                data[collection] = [];
                snapshot.forEach(doc => {
                    const docData = { id: doc.id, ...doc.data() };
                    
                    // Convert timestamps to ISO strings
                    this.convertTimestamps(docData);
                    
                    data[collection].push(docData);
                });

                console.log(`Collection ${collection}: ${data[collection].length} documents`);
            }

            let filePath;
            let fileSize;

            if (format === 'json') {
                // Create JSON backup
                const jsonData = JSON.stringify(data, null, 2);
                filePath = path.join(this.backupDir, `${backupId}.json`);
                await fs.writeFile(filePath, jsonData);
                fileSize = Buffer.byteLength(jsonData);
            } else {
                // Create CSV backup (zipped)
                filePath = await this.createCSVBackup(data, backupId);
                const stats = await fs.stat(filePath);
                fileSize = stats.size;
            }

            // Save backup metadata
            const backupRecord = {
                id: backupId,
                created: admin.firestore.Timestamp.fromDate(timestamp),
                collections,
                format,
                size: fileSize,
                status: 'completed',
                type: 'manual',
                filePath
            };

            await this.db.collection('backups').doc(backupId).set(backupRecord);

            console.log(`Backup ${backupId} created successfully`);
            return { success: true, backupId, data: format === 'json' ? data : null };

        } catch (error) {
            console.error('Error creating backup:', error);
            
            // Save failed backup record
            await this.db.collection('backups').doc(backupId).set({
                id: backupId,
                created: admin.firestore.Timestamp.fromDate(timestamp),
                collections,
                format,
                size: 0,
                status: 'failed',
                type: 'manual',
                error: error.message
            });

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

            // Convert each collection to CSV
            Object.entries(data).forEach(([collection, documents]) => {
                if (documents.length > 0) {
                    const csv = this.convertToCSV(documents);
                    archive.append(csv, { name: `${collection}.csv` });
                }
            });

            archive.finalize();
        });
    }

    convertToCSV(documents) {
        if (documents.length === 0) return '';

        // Get all unique keys from all documents
        const allKeys = new Set();
        documents.forEach(doc => {
            Object.keys(doc).forEach(key => allKeys.add(key));
        });

        const headers = Array.from(allKeys);
        const csvRows = [headers.join(',')];

        documents.forEach(doc => {
            const values = headers.map(header => {
                let value = doc[header];
                
                // Handle different data types
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

    convertTimestamps(obj) {
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            if (value && typeof value === 'object') {
                if (value._seconds !== undefined && value._nanoseconds !== undefined) {
                    // Firestore timestamp
                    obj[key] = new Date(value._seconds * 1000 + value._nanoseconds / 1000000).toISOString();
                } else if (value.seconds !== undefined && value.nanoseconds !== undefined) {
                    // Another timestamp format
                    obj[key] = new Date(value.seconds * 1000 + value.nanoseconds / 1000000).toISOString();
                } else if (Array.isArray(value)) {
                    value.forEach(item => this.convertTimestamps(item));
                } else {
                    this.convertTimestamps(value);
                }
            }
        });
    }

    async getBackupHistory() {
        try {
            const snapshot = await this.db.collection('backups')
                .orderBy('created', 'desc')
                .limit(50)
                .get();

            const backups = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                backups.push({
                    id: doc.id,
                    ...data,
                    created: data.created.toDate()
                });
            });

            return backups;
        } catch (error) {
            console.error('Error getting backup history:', error);
            throw error;
        }
    }

    async downloadBackup(backupId) {
        try {
            const backupDoc = await this.db.collection('backups').doc(backupId).get();
            
            if (!backupDoc.exists) {
                throw new Error('Backup not found');
            }

            const backup = backupDoc.data();
            const filePath = backup.filePath;

            // Check if file exists
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
            const backupDoc = await this.db.collection('backups').doc(backupId).get();
            
            if (!backupDoc.exists) {
                throw new Error('Backup not found');
            }

            const backup = backupDoc.data();
            
            // Delete file from disk
            try {
                await fs.unlink(backup.filePath);
            } catch (error) {
                console.warn('Backup file not found on disk:', error.message);
            }

            // Delete from database
            await this.db.collection('backups').doc(backupId).delete();

            console.log(`Backup ${backupId} deleted successfully`);
            return { success: true };
        } catch (error) {
            console.error('Error deleting backup:', error);
            throw error;
        }
    }

    async getScheduleConfig() {
        try {
            const configDoc = await this.db.collection('system_config').doc('backup_schedule').get();
            
            if (!configDoc.exists) {
                return {
                    frequency: 'disabled',
                    time: '02:00',
                    day: '0',
                    date: '1',
                    retention: '30'
                };
            }

            return configDoc.data();
        } catch (error) {
            console.error('Error getting schedule config:', error);
            throw error;
        }
    }

    async saveScheduleConfig(config) {
        try {
            await this.db.collection('system_config').doc('backup_schedule').set({
                ...config,
                updatedAt: admin.firestore.Timestamp.now()
            });

            // If backup is enabled, set up the schedule
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
        // In a production environment, you would use a job scheduler like node-cron
        // For now, we'll just log the configuration
        console.log('Scheduled backup configured:', config);
        
        // TODO: Implement actual scheduling with node-cron or similar
        // This would create recurring backups based on the schedule
    }

    async cleanupOldBackups(retentionDays = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const snapshot = await this.db.collection('backups')
                .where('created', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
                .get();

            const batch = this.db.batch();
            const filesToDelete = [];

            snapshot.forEach(doc => {
                const backup = doc.data();
                filesToDelete.push(backup.filePath);
                batch.delete(doc.ref);
            });

            await batch.commit();

            // Delete files from disk
            for (const filePath of filesToDelete) {
                try {
                    await fs.unlink(filePath);
                } catch (error) {
                    console.warn('Error deleting backup file:', filePath, error.message);
                }
            }

            console.log(`Cleaned up ${filesToDelete.length} old backups`);
            return { deleted: filesToDelete.length };
        } catch (error) {
            console.error('Error cleaning up old backups:', error);
            throw error;
        }
    }
}

module.exports = BackupService;