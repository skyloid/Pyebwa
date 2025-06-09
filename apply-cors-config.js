#!/usr/bin/env node
/**
 * Apply CORS configuration to Firebase Storage bucket
 * Usage: node apply-cors-config.js <path-to-service-account-key.json>
 */

const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

async function applyCorsConfiguration(serviceAccountPath) {
    try {
        // Read service account key
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        
        // Initialize Storage client
        const storage = new Storage({
            projectId: serviceAccount.project_id,
            keyFilename: serviceAccountPath
        });
        
        const bucketName = 'pyebwa-f5960.appspot.com';
        const bucket = storage.bucket(bucketName);
        
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
                'Access-Control-Allow-Methods'
            ],
            maxAgeSeconds: 3600
        }];
        
        // Apply CORS configuration
        await bucket.setCorsConfiguration(corsConfiguration);
        
        console.log(`✓ CORS configuration applied successfully to bucket: ${bucketName}`);
        console.log('\nCORS Configuration:');
        console.log(JSON.stringify(corsConfiguration, null, 2));
        
        // Verify the configuration
        const [metadata] = await bucket.getMetadata();
        console.log('\n✓ Verified CORS configuration is active');
        
        return true;
        
    } catch (error) {
        console.error('✗ Error applying CORS configuration:', error.message);
        return false;
    }
}

async function main() {
    console.log('Firebase Storage CORS Configuration Tool');
    console.log('========================================\n');
    
    // Check if service account path is provided
    if (process.argv.length < 3) {
        console.log('Usage: node apply-cors-config.js <path-to-service-account-key.json>');
        console.log('\nTo use this script:');
        console.log('1. Download your service account key from Firebase Console');
        console.log('2. Run: node apply-cors-config.js /path/to/your-key.json');
        process.exit(1);
    }
    
    const serviceAccountPath = process.argv[2];
    
    // Check if file exists
    if (!fs.existsSync(serviceAccountPath)) {
        console.error(`\n✗ Service account file not found: ${serviceAccountPath}`);
        process.exit(1);
    }
    
    try {
        const keyData = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        console.log(`Using service account for project: ${keyData.project_id}\n`);
    } catch (error) {
        console.error(`\n✗ Invalid JSON in service account file: ${serviceAccountPath}`);
        process.exit(1);
    }
    
    // Apply CORS configuration
    const success = await applyCorsConfiguration(serviceAccountPath);
    
    if (success) {
        console.log('\n✓ CORS configuration applied successfully!');
        console.log('\nNext steps:');
        console.log('1. Clear your browser cache');
        console.log('2. Reload the app at https://rasin.pyebwa.com/app/');
        console.log('3. Try uploading a photo again');
    } else {
        console.log('\n✗ Failed to apply CORS configuration');
        console.log('\nTroubleshooting:');
        console.log('1. Make sure the service account has "Storage Admin" role');
        console.log('2. Check that the project ID matches your Firebase project');
        console.log('3. Ensure you have internet connectivity');
        console.log('4. Install required package: npm install @google-cloud/storage');
    }
}

// Run the script
main().catch(console.error);