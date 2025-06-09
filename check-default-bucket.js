#!/usr/bin/env node
/**
 * Check for default Firebase Storage bucket
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync(process.argv[2] || './service-account-key.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.appspot.com`
});

const bucket = admin.storage().bucket();

console.log('Firebase Storage Configuration');
console.log('==============================\n');
console.log(`Project ID: ${serviceAccount.project_id}`);
console.log(`Default bucket: ${bucket.name}`);
console.log('\nNote: The default Firebase Storage bucket should be automatically created when you enable Storage in Firebase Console.');
console.log('\nTo fix the storage issue:');
console.log('1. Go to Firebase Console: https://console.firebase.google.com');
console.log('2. Select your project: pyebwa-f5960');
console.log('3. Go to Storage in the left menu');
console.log('4. Click "Get Started" if you haven\'t already');
console.log('5. The default bucket will be created automatically');
console.log('\nAfter the bucket is created, you can apply CORS using:');
console.log('- Google Cloud Console');
console.log('- Or gsutil command line tool');