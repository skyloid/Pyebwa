#!/usr/bin/env node

/**
 * Script to securely manage Firebase configuration
 * This script helps move Firebase credentials from code to environment variables
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔒 Firebase Security Configuration Tool');
console.log('=====================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file from .env.example...');
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ .env file created. Please update it with your Firebase credentials.\n');
    } else {
        console.error('❌ .env.example not found. Please create it first.');
        process.exit(1);
    }
}

// Check for serviceAccountKey.json
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const secureServiceAccountPath = path.join(__dirname, '..', 'secure', 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
    console.log('⚠️  Found serviceAccountKey.json in root directory!');
    console.log('This is a CRITICAL security vulnerability.\n');
    
    // Create secure directory
    const secureDir = path.join(__dirname, '..', 'secure');
    if (!fs.existsSync(secureDir)) {
        fs.mkdirSync(secureDir, { recursive: true });
        
        // Create .htaccess to block web access
        fs.writeFileSync(path.join(secureDir, '.htaccess'), 'Deny from all');
    }
    
    console.log('Moving serviceAccountKey.json to secure location...');
    
    // Read the service account key
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    // Move file to secure location
    fs.renameSync(serviceAccountPath, secureServiceAccountPath);
    console.log('✅ Moved to:', secureServiceAccountPath);
    
    // Update .env file
    console.log('\n📝 Updating .env file...');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent = envContent.replace(
        /FIREBASE_SERVICE_ACCOUNT_PATH=.*/,
        `FIREBASE_SERVICE_ACCOUNT_PATH=${secureServiceAccountPath}`
    );
    
    // Also add individual credentials as backup
    envContent = envContent.replace(
        /FIREBASE_ADMIN_PROJECT_ID=.*/,
        `FIREBASE_ADMIN_PROJECT_ID=${serviceAccount.project_id}`
    );
    
    envContent = envContent.replace(
        /FIREBASE_ADMIN_CLIENT_EMAIL=.*/,
        `FIREBASE_ADMIN_CLIENT_EMAIL=${serviceAccount.client_email}`
    );
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env file with secure path\n');
}

// Generate secure session secret if not set
console.log('🔐 Checking session secrets...');
let envContent = fs.readFileSync(envPath, 'utf8');

if (envContent.includes('SESSION_SECRET=generate_a_secure_random_string_here')) {
    const sessionSecret = crypto.randomBytes(64).toString('hex');
    envContent = envContent.replace(
        'SESSION_SECRET=generate_a_secure_random_string_here',
        `SESSION_SECRET=${sessionSecret}`
    );
    console.log('✅ Generated secure session secret');
}

if (envContent.includes('JWT_SECRET=generate_another_secure_random_string_here')) {
    const jwtSecret = crypto.randomBytes(64).toString('hex');
    envContent = envContent.replace(
        'JWT_SECRET=generate_another_secure_random_string_here',
        `JWT_SECRET=${jwtSecret}`
    );
    console.log('✅ Generated secure JWT secret');
}

fs.writeFileSync(envPath, envContent);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('\n✅ Created logs directory');
}

// Security checklist
console.log('\n📋 Security Checklist:');
console.log('====================');

const checks = [
    {
        name: 'Environment file exists',
        check: () => fs.existsSync(envPath)
    },
    {
        name: 'Service account not in root',
        check: () => !fs.existsSync(serviceAccountPath)
    },
    {
        name: 'Secure directory protected',
        check: () => fs.existsSync(path.join(__dirname, '..', 'secure', '.htaccess'))
    },
    {
        name: 'Session secret configured',
        check: () => !fs.readFileSync(envPath, 'utf8').includes('generate_a_secure_random_string_here')
    },
    {
        name: 'Logs directory exists',
        check: () => fs.existsSync(logsDir)
    }
];

let allPassed = true;
checks.forEach(({ name, check }) => {
    const passed = check();
    console.log(`${passed ? '✅' : '❌'} ${name}`);
    if (!passed) allPassed = false;
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
    console.log('✅ All security checks passed!\n');
    console.log('Next steps:');
    console.log('1. Update Firebase configuration in .env file');
    console.log('2. Ensure .env is in .gitignore');
    console.log('3. Run: npm install');
    console.log('4. Run: npm run start:secure');
} else {
    console.log('⚠️  Some security checks failed. Please address them.\n');
}

// Show current Firebase config status
console.log('\n📊 Firebase Configuration Status:');
console.log('================================');

const requiredEnvVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID'
];

requiredEnvVars.forEach(varName => {
    const value = process.env[varName] || '';
    const isSet = value && !value.includes('your-') && !value.includes('your_');
    console.log(`${isSet ? '✅' : '❌'} ${varName}: ${isSet ? 'Configured' : 'Not configured'}`);
});

console.log('\n✨ Done!');