#!/usr/bin/env node
/**
 * Create storage bucket and apply CORS configuration
 */

const { Storage } = require('@google-cloud/storage');
const fs = require('fs');

async function setupStorageBucket(serviceAccountPath) {
    try {
        // Read service account key
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        
        // Initialize Storage client
        const storage = new Storage({
            projectId: serviceAccount.project_id,
            keyFilename: serviceAccountPath
        });
        
        const bucketName = `${serviceAccount.project_id}.appspot.com`;
        console.log(`Setting up bucket: ${bucketName}\n`);
        
        let bucket;
        
        // Check if bucket exists, create if not
        try {
            bucket = storage.bucket(bucketName);
            const [exists] = await bucket.exists();
            
            if (!exists) {
                console.log('Creating bucket...');
                [bucket] = await storage.createBucket(bucketName, {
                    location: 'US',
                    storageClass: 'STANDARD'
                });
                console.log('✓ Bucket created successfully');
            } else {
                console.log('✓ Bucket already exists');
            }
        } catch (error) {
            console.error('Error checking/creating bucket:', error.message);
            return false;
        }
        
        // CORS configuration
        const corsConfiguration = [{
            origin: [
                'https://www.pyebwa.com',
                'https://pyebwa.com',
                'https://rasin.pyebwa.com',
                'http://localhost:3000'
            ],
            method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
            responseHeader: [
                'Content-Type',
                'Authorization',
                'Content-Length',
                'X-Requested-With',
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Headers',
                'Access-Control-Allow-Methods',
                'x-goog-resumable'
            ],
            maxAgeSeconds: 3600
        }];
        
        // Apply CORS configuration
        console.log('\nApplying CORS configuration...');
        await bucket.setCorsConfiguration(corsConfiguration);
        
        console.log('✓ CORS configuration applied successfully');
        console.log('\nCORS Configuration:');
        console.log(JSON.stringify(corsConfiguration, null, 2));
        
        // Set bucket to be publicly readable (for uploaded images)
        console.log('\nSetting bucket permissions...');
        await bucket.makePublic({
            includeFiles: false // Don't make existing files public
        });
        console.log('✓ Bucket configured for public read access');
        
        return true;
        
    } catch (error) {
        console.error('✗ Error setting up storage:', error.message);
        if (error.code === 403) {
            console.error('\nPermission denied. Make sure the service account has:');
            console.error('1. Storage Admin role');
            console.error('2. Storage Object Admin role');
        }
        return false;
    }
}

async function main() {
    console.log('Firebase Storage Setup Tool');
    console.log('===========================\n');
    
    const serviceAccountPath = process.argv[2] || './service-account-key.json';
    
    if (!fs.existsSync(serviceAccountPath)) {
        console.error(`Service account file not found: ${serviceAccountPath}`);
        process.exit(1);
    }
    
    const success = await setupStorageBucket(serviceAccountPath);
    
    if (success) {
        console.log('\n✓ Storage bucket setup complete!');
        console.log('\nNext steps:');
        console.log('1. Clear your browser cache');
        console.log('2. Reload the app at https://rasin.pyebwa.com/app/');
        console.log('3. Try uploading a photo again');
    } else {
        console.log('\n✗ Failed to setup storage bucket');
    }
}

// Run the script
main().catch(console.error);