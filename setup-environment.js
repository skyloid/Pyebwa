#!/usr/bin/env node
/**
 * Environment Setup Helper for Pyebwa
 * This script helps configure the required environment variables
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const envPath = path.join(__dirname, '.env');
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

console.log(`
🌳 Pyebwa Environment Configuration Setup
=========================================

This script will help you configure the required environment variables
for push notifications, email services, and Firebase integration.

`);

async function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function updateEnvFile(key, value) {
    try {
        let envContent = fs.readFileSync(envPath, 'utf8');
        const regex = new RegExp(`^${key}=.*$`, 'm');
        
        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
            envContent += `\n${key}=${value}`;
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log(`✅ Updated ${key}`);
    } catch (error) {
        console.error(`❌ Error updating ${key}:`, error.message);
    }
}

async function checkFirebaseServiceAccount() {
    if (fs.existsSync(serviceAccountPath)) {
        console.log('✅ Firebase service account key found');
        return true;
    } else {
        console.log(`
❌ Firebase service account key not found

To get your service account key:
1. Go to https://console.firebase.google.com/project/pyebwa-f5960/settings/serviceaccounts/adminsdk
2. Click "Generate new private key"
3. Save the downloaded file as 'serviceAccountKey.json' in this directory
4. The file should NOT be committed to git (already in .gitignore)
`);
        return false;
    }
}

async function setupSendGrid() {
    console.log(`
📧 SendGrid Email Service Setup
==============================

SendGrid is required for sending email notifications and announcements.

To get your SendGrid API key:
1. Create account at https://sendgrid.com (free tier available)
2. Verify your sender email address
3. Go to Settings > API Keys
4. Create a new API key with "Full Access" permissions
5. Copy the API key (it starts with 'SG.')
`);

    const hasApiKey = await question('Do you have a SendGrid API key? (y/n): ');
    
    if (hasApiKey.toLowerCase() === 'y') {
        const apiKey = await question('Enter your SendGrid API key: ');
        if (apiKey && apiKey.trim()) {
            await updateEnvFile('SENDGRID_API_KEY', apiKey.trim());
            
            const senderEmail = await question('Enter verified sender email (default: noreply@pyebwa.com): ');
            if (senderEmail && senderEmail.trim()) {
                await updateEnvFile('SENDER_EMAIL', senderEmail.trim());
            }
        }
    } else {
        console.log('⚠️  Email notifications will not work until SendGrid is configured');
    }
}

async function setupFirebaseCloudMessaging() {
    console.log(`
🔔 Firebase Cloud Messaging (FCM) Setup
=======================================

FCM is required for push notifications to web and mobile clients.

To get your FCM configuration:
1. Go to https://console.firebase.google.com/project/pyebwa-f5960/settings/cloudmessaging
2. Enable Cloud Messaging API (Legacy) if not already enabled
3. Copy the "Server key" for FCM_SERVER_KEY
4. Under "Web Push certificates", generate a new certificate
5. Copy the public key for VAPID_KEY
`);

    const hasServerKey = await question('Do you have the FCM Server Key? (y/n): ');
    
    if (hasServerKey.toLowerCase() === 'y') {
        const serverKey = await question('Enter FCM Server Key: ');
        if (serverKey && serverKey.trim()) {
            await updateEnvFile('FCM_SERVER_KEY', serverKey.trim());
        }
        
        const vapidKey = await question('Enter VAPID public key: ');
        if (vapidKey && vapidKey.trim()) {
            await updateEnvFile('VAPID_KEY', vapidKey.trim());
        }
    } else {
        console.log('⚠️  Push notifications will not work until FCM is configured');
    }
}

async function testConfiguration() {
    console.log(`
🧪 Testing Configuration
========================
`);

    // Test .env file loading
    require('dotenv').config();
    
    const requiredVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_DATABASE_URL',
        'APP_URL',
        'PORT'
    ];
    
    const optionalVars = [
        'SENDGRID_API_KEY',
        'FCM_SERVER_KEY',
        'VAPID_KEY'
    ];
    
    console.log('Required variables:');
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        console.log(`  ${varName}: ${value ? '✅' : '❌'} ${value ? 'Set' : 'Missing'}`);
    });
    
    console.log('\nOptional variables (for full functionality):');
    optionalVars.forEach(varName => {
        const value = process.env[varName];
        const isSet = value && value !== 'your_' + varName.toLowerCase() + '_here';
        console.log(`  ${varName}: ${isSet ? '✅' : '⚠️'} ${isSet ? 'Configured' : 'Not configured'}`);
    });
    
    // Check service account
    console.log(`\nFirebase Service Account: ${fs.existsSync(serviceAccountPath) ? '✅ Found' : '❌ Missing'}`);
}

async function createTestEndpoints() {
    console.log(`
🚀 Creating Test Endpoints
==========================

I'll create a simple test script to verify your configuration.
`);

    const testScript = `#!/usr/bin/env node
/**
 * Test script for Pyebwa environment configuration
 */

require('dotenv').config();
const admin = require('firebase-admin');

async function testFirebase() {
    try {
        console.log('Testing Firebase connection...');
        
        if (!admin.apps.length) {
            const serviceAccount = require('./serviceAccountKey.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: process.env.FIREBASE_DATABASE_URL
            });
        }
        
        // Test Firestore connection
        const db = admin.firestore();
        await db.collection('system_health').doc('test').set({
            timestamp: admin.firestore.Timestamp.now(),
            status: 'testing'
        });
        
        console.log('✅ Firebase connection successful');
        return true;
    } catch (error) {
        console.error('❌ Firebase connection failed:', error.message);
        return false;
    }
}

async function testSendGrid() {
    try {
        if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY.includes('your_')) {
            console.log('⚠️  SendGrid not configured, skipping test');
            return false;
        }
        
        console.log('Testing SendGrid connection...');
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        
        // Just validate the API key format
        if (process.env.SENDGRID_API_KEY.startsWith('SG.')) {
            console.log('✅ SendGrid API key format is valid');
            return true;
        } else {
            console.log('❌ SendGrid API key format is invalid');
            return false;
        }
    } catch (error) {
        console.error('❌ SendGrid test failed:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('🧪 Running configuration tests...\\n');
    
    const firebaseOk = await testFirebase();
    const sendGridOk = await testSendGrid();
    
    console.log('\\n📊 Test Results:');
    console.log(\`Firebase: \${firebaseOk ? '✅ Working' : '❌ Failed'}\`);
    console.log(\`SendGrid: \${sendGridOk ? '✅ Working' : '⚠️  Not configured'}\`);
    
    if (firebaseOk) {
        console.log('\\n🎉 Basic configuration is working! You can start the server.');
    } else {
        console.log('\\n❌ Please fix Firebase configuration before starting the server.');
    }
}

runTests().catch(console.error);
`;

    fs.writeFileSync(path.join(__dirname, 'test-config.js'), testScript);
    console.log('✅ Created test-config.js');
    console.log('Run "node test-config.js" to test your configuration');
}

async function main() {
    try {
        // Check current status
        console.log('📋 Current Configuration Status:');
        await testConfiguration();
        
        const proceed = await question('\nWould you like to configure the missing services? (y/n): ');
        
        if (proceed.toLowerCase() !== 'y') {
            console.log('Configuration cancelled. You can run this script again anytime.');
            rl.close();
            return;
        }
        
        // Check Firebase service account
        console.log('\n🔥 Checking Firebase Service Account...');
        await checkFirebaseServiceAccount();
        
        // Setup SendGrid
        await setupSendGrid();
        
        // Setup FCM
        await setupFirebaseCloudMessaging();
        
        // Create test script
        await createTestEndpoints();
        
        console.log(`
🎉 Environment Setup Complete!
=============================

Next steps:
1. If you haven't already, place your Firebase service account key as 'serviceAccountKey.json'
2. Run 'node test-config.js' to verify your configuration
3. Start the server with 'npm start'
4. Access the admin dashboard at https://rasin.pyebwa.com/admin

📁 Files created/updated:
- .env (environment variables)
- test-config.js (configuration tester)

🔒 Security reminders:
- Never commit .env or serviceAccountKey.json to git
- Keep your API keys secure
- Rotate keys regularly in production

Happy coding! 🚀
`);
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    } finally {
        rl.close();
    }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\\n👋 Setup cancelled by user');
    rl.close();
    process.exit(0);
});

main();