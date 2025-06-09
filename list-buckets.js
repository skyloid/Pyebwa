#!/usr/bin/env node
/**
 * List all storage buckets in the project
 */

const { Storage } = require('@google-cloud/storage');
const fs = require('fs');

async function listBuckets(serviceAccountPath) {
    try {
        // Read service account key
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        
        // Initialize Storage client
        const storage = new Storage({
            projectId: serviceAccount.project_id,
            keyFilename: serviceAccountPath
        });
        
        // List all buckets
        const [buckets] = await storage.getBuckets();
        
        console.log('Available Storage Buckets:');
        console.log('========================\n');
        
        if (buckets.length === 0) {
            console.log('No buckets found in this project.');
        } else {
            buckets.forEach(bucket => {
                console.log(`- ${bucket.name}`);
            });
        }
        
        return buckets;
        
    } catch (error) {
        console.error('Error listing buckets:', error.message);
        return [];
    }
}

// Run the script
const serviceAccountPath = process.argv[2] || './service-account-key.json';
listBuckets(serviceAccountPath).catch(console.error);