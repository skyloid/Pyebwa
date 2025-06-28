#!/usr/bin/env node
/**
 * Configuration Tester for Pyebwa Platform
 * Tests all environment variables and API connections
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log(`
🧪 Pyebwa Configuration Tester
==============================
`);

let allTestsPassed = true;
const results = {
    environment: false,
    firebase: false,
    sendgrid: false,
    fcm: false
};

// Test Environment Variables
function testEnvironmentVariables() {
    console.log('📋 Testing Environment Variables...');
    
    const required = [
        'NODE_ENV',
        'PORT', 
        'FIREBASE_PROJECT_ID',
        'FIREBASE_DATABASE_URL',
        'APP_URL'
    ];
    
    const optional = [
        'SENDGRID_API_KEY',
        'SENDER_EMAIL',
        'FCM_SERVER_KEY',
        'VAPID_KEY'
    ];
    
    console.log('   Required variables:');
    let allRequired = true;
    required.forEach(varName => {
        const value = process.env[varName];
        const status = value ? '✅' : '❌';
        console.log(`   ${status} ${varName}: ${value ? 'Set' : 'Missing'}`);
        if (!value) allRequired = false;
    });
    
    console.log('   Optional variables (needed for full functionality):');
    optional.forEach(varName => {
        const value = process.env[varName];
        const isConfigured = value && !value.includes('your_') && !value.includes('_here');
        const status = isConfigured ? '✅' : '⚠️';
        console.log(`   ${status} ${varName}: ${isConfigured ? 'Configured' : 'Not configured'}`);
    });
    
    results.environment = allRequired;
    return allRequired;
}

// Test Firebase Service Account
function testFirebaseServiceAccount() {
    console.log('\n🔥 Testing Firebase Service Account...');
    
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
        console.log('   ❌ serviceAccountKey.json not found');
        console.log('   📝 Download from: https://console.firebase.google.com/project/pyebwa-f5960/settings/serviceaccounts/adminsdk');
        return false;
    }
    
    try {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        
        const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
        const missingFields = requiredFields.filter(field => !serviceAccount[field]);
        
        if (missingFields.length > 0) {
            console.log('   ❌ Service account missing fields:', missingFields.join(', '));
            return false;
        }
        
        if (serviceAccount.project_id !== 'pyebwa-f5960') {
            console.log(`   ❌ Wrong project ID: ${serviceAccount.project_id} (expected: pyebwa-f5960)`);
            return false;
        }
        
        console.log('   ✅ Service account file is valid');
        console.log(`   📝 Project ID: ${serviceAccount.project_id}`);
        console.log(`   📝 Client Email: ${serviceAccount.client_email}`);
        
        // Test Firebase connection
        try {
            const admin = require('firebase-admin');
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: process.env.FIREBASE_DATABASE_URL
                });
            }
            console.log('   ✅ Firebase Admin SDK initialized successfully');
            results.firebase = true;
            return true;
        } catch (error) {
            console.log('   ❌ Firebase initialization failed:', error.message);
            return false;
        }
        
    } catch (error) {
        console.log('   ❌ Invalid JSON in service account file:', error.message);
        return false;
    }
}

// Test SendGrid Configuration
function testSendGridConfiguration() {
    console.log('\n📧 Testing SendGrid Configuration...');
    
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey || apiKey.includes('your_')) {
        console.log('   ⚠️  SendGrid API key not configured');
        console.log('   📝 Get from: https://app.sendgrid.com/settings/api_keys');
        return false;
    }
    
    if (!apiKey.startsWith('SG.')) {
        console.log('   ❌ Invalid SendGrid API key format (should start with "SG.")');
        return false;
    }
    
    console.log('   ✅ SendGrid API key format is valid');
    console.log(`   📝 Sender Email: ${process.env.SENDER_EMAIL || 'Not set'}`);
    
    // Test SendGrid connection (basic validation)
    try {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(apiKey);
        console.log('   ✅ SendGrid client initialized');
        results.sendgrid = true;
        return true;
    } catch (error) {
        console.log('   ❌ SendGrid client error:', error.message);
        return false;
    }
}

// Test FCM Configuration
function testFCMConfiguration() {
    console.log('\n🔔 Testing Firebase Cloud Messaging...');
    
    const vapidKey = process.env.VAPID_KEY;
    
    if (!vapidKey || vapidKey.includes('your_')) {
        console.log('   ⚠️  VAPID Key not configured');
        console.log('   📝 Generate from: https://console.firebase.google.com/project/pyebwa-f5960/settings/cloudmessaging');
        return false;
    }
    
    // Basic validation for VAPID key
    if (vapidKey.length < 60) {
        console.log('   ❌ VAPID Key seems too short');
        return false;
    }
    
    console.log('   ✅ Using Service Account authentication (more secure)');
    console.log('   ✅ VAPID Key configured for web push');
    console.log('   📝 FCM notifications will use Firebase Admin SDK with Service Account');
    results.fcm = true;
    return true;
}

// Test Server Startup
function testServerStartup() {
    console.log('\n🚀 Testing Server Configuration...');
    
    const port = process.env.PORT || 9111;
    console.log(`   📝 Server will run on port: ${port}`);
    console.log(`   📝 App URL: ${process.env.APP_URL}`);
    
    // Check if port is available (basic check)
    const net = require('net');
    const server = net.createServer();
    
    return new Promise((resolve) => {
        server.listen(port, () => {
            console.log(`   ✅ Port ${port} is available`);
            server.close();
            resolve(true);
        });
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`   ⚠️  Port ${port} is already in use`);
                console.log('   📝 This might be normal if the server is already running');
            } else {
                console.log(`   ❌ Port error:`, err.message);
            }
            resolve(false);
        });
    });
}

// Main test runner
async function runAllTests() {
    const envTest = testEnvironmentVariables();
    const firebaseTest = testFirebaseServiceAccount();
    const sendgridTest = testSendGridConfiguration();
    const fcmTest = testFCMConfiguration();
    const serverTest = await testServerStartup();
    
    console.log(`
📊 Test Results Summary
=======================
Environment Variables: ${envTest ? '✅ Pass' : '❌ Fail'}
Firebase Service Account: ${firebaseTest ? '✅ Pass' : '❌ Fail'}
SendGrid Email Service: ${sendgridTest ? '✅ Pass' : '⚠️  Not configured'}
FCM Push Notifications: ${fcmTest ? '✅ Pass' : '⚠️  Not configured'}
Server Configuration: ${serverTest ? '✅ Pass' : '⚠️  Port issue'}
`);

    const criticalTests = envTest && firebaseTest;
    const optionalTests = sendgridTest && fcmTest;
    
    if (criticalTests) {
        console.log('🎉 Critical configuration is working! You can start the server.');
        console.log('   Run: npm start');
        
        if (!optionalTests) {
            console.log('\n⚠️  Optional services not configured:');
            if (!sendgridTest) console.log('   - Email notifications will not work');
            if (!fcmTest) console.log('   - Push notifications will not work');
            console.log('\n   These can be configured later following the setup guide.');
        }
    } else {
        console.log('❌ Critical configuration issues found. Please fix before starting server.');
        allTestsPassed = false;
    }
    
    console.log(`
📚 Next Steps
=============
1. Fix any failed tests above
2. Start server: npm start
3. Access admin: https://rasin.pyebwa.com/admin
4. Test notifications through admin dashboard

📖 Documentation
================
- Setup Guide: SETUP_GUIDE.md
- API Configuration: configure-apis.md
- Environment Reference: ENV_CONFIGURATION_REQUIRED.md
`);
    
    process.exit(allTestsPassed ? 0 : 1);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n👋 Test cancelled by user');
    process.exit(0);
});

// Run tests
runAllTests().catch(error => {
    console.error('\n❌ Test runner failed:', error.message);
    process.exit(1);
});