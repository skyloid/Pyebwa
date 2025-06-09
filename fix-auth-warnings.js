#!/usr/bin/env node

/**
 * Script to fix authentication warnings identified in tests
 * This addresses:
 * 1. Language persistence across domains
 * 2. Auth sync timing optimization
 * 3. Immediate auth check enhancement
 */

const fs = require('fs').promises;
const path = require('path');

async function fixLanguagePersistence() {
    console.log('🔧 Fixing language persistence...');
    
    // Update app.js to better handle language persistence
    const appJsPath = path.join(__dirname, 'app/js/app.js');
    let appContent = await fs.readFile(appJsPath, 'utf8');
    
    // Add language sync to auth success
    const languageSyncCode = `
    // Sync language preference from localStorage
    const savedLang = localStorage.getItem('pyebwaLang');
    if (savedLang) {
        // Ensure language is preserved across domain switches
        sessionStorage.setItem('pyebwaLangSync', savedLang);
    }`;
    
    // Insert after currentUser assignment
    if (!appContent.includes('pyebwaLangSync')) {
        appContent = appContent.replace(
            'currentUser = user;',
            `currentUser = user;${languageSyncCode}`
        );
        
        await fs.writeFile(appJsPath, appContent);
        console.log('✅ Added language sync to authentication flow');
    } else {
        console.log('ℹ️  Language sync already implemented');
    }
}

async function optimizeAuthSyncTiming() {
    console.log('🔧 Optimizing auth sync timing...');
    
    const appJsPath = path.join(__dirname, 'app/js/app.js');
    let appContent = await fs.readFile(appJsPath, 'utf8');
    
    // Replace fixed 5-second wait with exponential backoff
    const optimizedAuthSync = `
                    // Exponential backoff for auth sync
                    let authCheckAttempts = 0;
                    const maxAttempts = 4;
                    const checkAuthSync = () => {
                        authCheckAttempts++;
                        
                        if (auth.currentUser) {
                            log('Auth synced successfully after ' + authCheckAttempts + ' attempts');
                            // Clear redirect data on successful auth
                            sessionStorage.removeItem('pyebwaRedirectData');
                            window.location.reload();
                        } else if (authCheckAttempts < maxAttempts) {
                            // Exponential backoff: 500ms, 1s, 2s, 4s
                            const delay = Math.pow(2, authCheckAttempts - 1) * 500;
                            log('Auth check attempt ' + authCheckAttempts + ', waiting ' + delay + 'ms');
                            setTimeout(checkAuthSync, delay);
                        } else {
                            log('Auth sync failed after ' + maxAttempts + ' attempts - redirecting to login');
                            // Update redirect data
                            sessionStorage.setItem('pyebwaRedirectData', JSON.stringify({
                                count: redirectCount + 1,
                                timestamp: Date.now()
                            }));
                            
                            // Use clean URL without query parameters for redirect
                            const cleanRedirectUrl = window.location.origin + window.location.pathname;
                            window.location.href = 'https://secure.pyebwa.com/?redirect=' + encodeURIComponent(cleanRedirectUrl);
                        }
                    };
                    
                    // Start checking with short delay
                    setTimeout(checkAuthSync, 500);`;
    
    // Replace the existing setTimeout block
    const oldPattern = /setTimeout\(\(\) => \{[\s\S]*?\}, 5000\); \/\/ Wait 5 seconds max/;
    
    if (oldPattern.test(appContent)) {
        appContent = appContent.replace(oldPattern, optimizedAuthSync);
        await fs.writeFile(appJsPath, appContent);
        console.log('✅ Implemented exponential backoff for auth sync');
    } else {
        console.log('⚠️  Could not find auth sync timeout to replace');
    }
}

async function enhanceImmediateAuthCheck() {
    console.log('🔧 Enhancing immediate auth check...');
    
    const appJsPath = path.join(__dirname, 'app/js/app.js');
    let appContent = await fs.readFile(appJsPath, 'utf8');
    
    // Add more prominent immediate auth check
    const enhancedCheck = `
    // PRIORITY: Check for immediate auth state to avoid unnecessary waits
    const immediateUser = auth.currentUser;
    log(\`Immediate auth check: \${immediateUser ? 'User found - ' + immediateUser.email : 'No user'}\`);
    
    // If user is already authenticated, skip the auth state listener wait
    if (immediateUser) {
        log('🚀 Fast path: User already authenticated - initializing immediately');
        currentUser = immediateUser;`;
    
    // Ensure the immediate check is more prominent
    if (appContent.includes('const immediateUser = auth.currentUser;')) {
        appContent = appContent.replace(
            /\/\/ First, check current auth state immediately[\s\S]*?const immediateUser = auth\.currentUser;[\s\S]*?if \(immediateUser\) \{/,
            enhancedCheck + '\n        // Fast initialization path'
        );
        
        await fs.writeFile(appJsPath, appContent);
        console.log('✅ Enhanced immediate auth check visibility');
    } else {
        console.log('ℹ️  Immediate auth check already implemented');
    }
}

async function addAuthMetrics() {
    console.log('🔧 Adding authentication metrics...');
    
    const appJsPath = path.join(__dirname, 'app/js/app.js');
    let appContent = await fs.readFile(appJsPath, 'utf8');
    
    // Add timing metrics
    const metricsCode = `
    // Authentication timing metrics
    const authStartTime = Date.now();
    log('Authentication flow started at: ' + new Date(authStartTime).toISOString());
    
    // Track auth completion
    window.logAuthComplete = () => {
        const authEndTime = Date.now();
        const authDuration = authEndTime - authStartTime;
        log(\`Authentication completed in \${authDuration}ms\`);
        
        // Store metrics for analysis
        const metrics = JSON.parse(localStorage.getItem('pyebwaAuthMetrics') || '[]');
        metrics.push({
            timestamp: new Date().toISOString(),
            duration: authDuration,
            method: fromLogin ? 'redirect' : 'direct'
        });
        // Keep last 10 metrics
        localStorage.setItem('pyebwaAuthMetrics', JSON.stringify(metrics.slice(-10)));
    };`;
    
    // Add metrics at the beginning of initializeAuth
    if (!appContent.includes('authStartTime')) {
        appContent = appContent.replace(
            'log(\'=== App initialization started ===\');',
            `log('=== App initialization started ===');${metricsCode}`
        );
        
        // Add completion logging
        appContent = appContent.replace(
            'log(\'App initialized successfully\');',
            `log('App initialized successfully');
                    window.logAuthComplete && window.logAuthComplete();`
        );
        
        await fs.writeFile(appJsPath, appContent);
        console.log('✅ Added authentication metrics tracking');
    } else {
        console.log('ℹ️  Auth metrics already implemented');
    }
}

async function main() {
    console.log('🚀 Starting authentication warning fixes...\n');
    
    try {
        await fixLanguagePersistence();
        await optimizeAuthSyncTiming();
        await enhanceImmediateAuthCheck();
        await addAuthMetrics();
        
        console.log('\n✅ All fixes applied successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Test the authentication flow again');
        console.log('2. Run: node test-auth-automated.js');
        console.log('3. Check auth metrics in browser console: localStorage.getItem("pyebwaAuthMetrics")');
        
    } catch (error) {
        console.error('❌ Error applying fixes:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}