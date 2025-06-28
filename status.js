#!/usr/bin/env node
/**
 * Quick Configuration Status Checker
 */

require('dotenv').config();
const fs = require('fs');

console.log(`
🌳 Pyebwa Configuration Status
==============================
`);

// Check service account
const hasServiceAccount = fs.existsSync('./serviceAccountKey.json');
console.log(`Firebase Service Account: ${hasServiceAccount ? '✅ Ready' : '❌ Missing'}`);

// Check SendGrid
const hasSendGrid = process.env.SENDGRID_API_KEY && !process.env.SENDGRID_API_KEY.includes('your_');
console.log(`SendGrid Email Service: ${hasSendGrid ? '✅ Ready' : '⚠️  Not configured'}`);

// Check FCM (using Service Account + VAPID)
const hasVAPID = process.env.VAPID_KEY && !process.env.VAPID_KEY.includes('your_');
console.log(`FCM Push Notifications: ${hasVAPID ? '✅ Ready (Service Account + VAPID)' : '⚠️  Not configured'}`);

console.log(`
📋 What you need to do:
======================`);

if (!hasServiceAccount) {
    console.log(`
1. 🔥 Get Firebase Service Account Key:
   - Go to: https://console.firebase.google.com/project/pyebwa-f5960/settings/serviceaccounts/adminsdk
   - Click "Generate new private key"
   - Save as "serviceAccountKey.json" in this directory`);
}

if (!hasSendGrid) {
    console.log(`
2. 📧 Configure SendGrid (for email notifications):
   - Sign up at: https://sendgrid.com
   - Verify sender email: noreply@pyebwa.com
   - Get API key from: https://app.sendgrid.com/settings/api_keys
   - Update SENDGRID_API_KEY in .env file`);
}

if (!hasVAPID) {
    console.log(`
3. 🔔 Configure Push Notifications:
   - Go to: https://console.firebase.google.com/project/pyebwa-f5960/settings/cloudmessaging
   - Generate Web Push certificate → Copy public key → Update VAPID_KEY in .env
   - Note: Using Service Account authentication (more secure than server key)`);
}

const readyToStart = hasServiceAccount;
if (readyToStart) {
    console.log(`
🚀 Ready to start!
==================
Basic Firebase is configured. You can start the server:

    npm start

Optional services (email/push) can be configured later.
`);
} else {
    console.log(`
⚠️  Not ready to start
=====================
Please complete the Firebase Service Account setup first.
Then run: npm start
`);
}

console.log(`
🧪 Test your configuration anytime:
    node test-config.js

📖 Full setup guide:
    SETUP_GUIDE.md
`);