#!/usr/bin/env node

/**
 * Automated Authentication Test Suite for Pyebwa
 * 
 * This script runs comprehensive tests on the authentication flow
 * across all Pyebwa domains to ensure proper functionality.
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Test configuration
const TEST_CONFIG = {
    domains: {
        main: 'https://pyebwa.com',
        app: 'https://rasin.pyebwa.com/app',
        secure: 'https://secure.pyebwa.com'
    },
    localPaths: {
        pyebwaApp: path.join(__dirname, 'pyebwa.com/js/app.js'),
        rasinApp: path.join(__dirname, 'app/js/app.js'),
        secureApp: path.join(__dirname, 'auth-server/public/js/secure-app.js'),
        firebaseConfig: path.join(__dirname, 'app/js/firebase-config.js')
    }
};

// Test results storage
const testResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

// Utility functions
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: '📘',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    }[type] || '📘';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
}

function addTestResult(name, status, message = '') {
    testResults.tests.push({
        name,
        status,
        message,
        timestamp: new Date().toISOString()
    });
    
    if (status === 'passed') {
        testResults.passed++;
    } else if (status === 'failed') {
        testResults.failed++;
    } else if (status === 'warning') {
        testResults.warnings++;
    }
}

// Test functions
async function testFileExists(filePath, testName) {
    try {
        await fs.access(filePath);
        log(`✓ ${testName}: File exists`, 'success');
        addTestResult(testName, 'passed');
        return true;
    } catch (error) {
        log(`✗ ${testName}: File not found - ${filePath}`, 'error');
        addTestResult(testName, 'failed', 'File not found');
        return false;
    }
}

async function testAuthenticationFlow() {
    log('=== Testing Authentication Flow ===', 'info');
    
    // Test 1: Check pyebwa.com login redirect
    try {
        const pyebwaContent = await fs.readFile(TEST_CONFIG.localPaths.pyebwaApp, 'utf8');
        
        // Check for secure.pyebwa.com redirects
        const hasSecureRedirect = /window\.location\.href\s*=\s*['"]https:\/\/secure\.pyebwa\.com\/\?redirect=/.test(pyebwaContent);
        const includesReturnUrl = /encodeURIComponent\(window\.location\.href\)/.test(pyebwaContent);
        
        if (hasSecureRedirect && includesReturnUrl) {
            log('✓ pyebwa.com redirects to secure.pyebwa.com with return URL', 'success');
            addTestResult('pyebwa.com login redirect', 'passed');
        } else {
            log('✗ pyebwa.com redirect issues detected', 'error');
            addTestResult('pyebwa.com login redirect', 'failed', 'Missing proper redirect');
        }
        
        // Check that old modal code is disabled
        const hasDisabledModals = /\/\*[\s\S]*loginForm\.addEventListener[\s\S]*\*\//.test(pyebwaContent);
        if (hasDisabledModals) {
            log('✓ Old authentication modals are disabled', 'success');
            addTestResult('Modal code disabled', 'passed');
        } else {
            log('⚠ Check if old modal code is still active', 'warning');
            addTestResult('Modal code disabled', 'warning', 'May still have active modal code');
        }
    } catch (error) {
        log(`✗ Error testing pyebwa.com: ${error.message}`, 'error');
        addTestResult('pyebwa.com tests', 'failed', error.message);
    }
    
    // Test 2: Check rasin.pyebwa.com/app authentication
    try {
        const appContent = await fs.readFile(TEST_CONFIG.localPaths.rasinApp, 'utf8');
        
        // Check for auth state handling
        const hasAuthListener = /auth\.onAuthStateChanged/.test(appContent);
        const hasSecureRedirect = /window\.location\.href\s*=\s*['"]https:\/\/secure\.pyebwa\.com\//.test(appContent);
        const hasRedirectLoopPrevention = /pyebwaRedirectData/.test(appContent);
        const checksImmediateAuth = /const immediateUser = auth\.currentUser/.test(appContent);
        
        if (hasAuthListener) {
            log('✓ App has Firebase auth state listener', 'success');
            addTestResult('Auth state listener', 'passed');
        } else {
            log('✗ Missing auth state listener', 'error');
            addTestResult('Auth state listener', 'failed');
        }
        
        if (hasSecureRedirect) {
            log('✓ App redirects unauthenticated users to secure.pyebwa.com', 'success');
            addTestResult('Unauthenticated redirect', 'passed');
        } else {
            log('✗ Missing redirect for unauthenticated users', 'error');
            addTestResult('Unauthenticated redirect', 'failed');
        }
        
        if (hasRedirectLoopPrevention) {
            log('✓ App has redirect loop prevention', 'success');
            addTestResult('Redirect loop prevention', 'passed');
        } else {
            log('✗ Missing redirect loop prevention', 'error');
            addTestResult('Redirect loop prevention', 'failed');
        }
        
        if (checksImmediateAuth) {
            log('✓ App checks immediate auth state', 'success');
            addTestResult('Immediate auth check', 'passed');
        } else {
            log('⚠ App may not check immediate auth state', 'warning');
            addTestResult('Immediate auth check', 'warning');
        }
    } catch (error) {
        log(`✗ Error testing rasin app: ${error.message}`, 'error');
        addTestResult('rasin app tests', 'failed', error.message);
    }
    
    // Test 3: Check secure.pyebwa.com authentication handler
    try {
        const secureContent = await fs.readFile(TEST_CONFIG.localPaths.secureApp, 'utf8');
        
        // Check for proper auth handling
        const hasAuthSuccess = /handleAuthSuccess/.test(secureContent);
        const hasRedirectParam = /urlParams\.get\(['"]redirect['"]\)/.test(secureContent);
        const hasDirectRedirect = /window\.location\.href\s*=\s*redirectUrl/.test(secureContent);
        const avoidsAuthBridge = !/auth-bridge\.html/.test(secureContent);
        const addsAuthParams = /auth=success.*login=true/.test(secureContent);
        
        if (hasAuthSuccess && hasRedirectParam && hasDirectRedirect) {
            log('✓ Secure auth handler properly configured', 'success');
            addTestResult('Secure auth handler', 'passed');
        } else {
            log('✗ Secure auth handler configuration issues', 'error');
            addTestResult('Secure auth handler', 'failed');
        }
        
        if (avoidsAuthBridge) {
            log('✓ Avoids auth-bridge.html intermediate page', 'success');
            addTestResult('No auth-bridge redirect', 'passed');
        } else {
            log('✗ Still uses auth-bridge.html', 'error');
            addTestResult('No auth-bridge redirect', 'failed');
        }
        
        if (addsAuthParams) {
            log('✓ Adds auth success parameters to redirect', 'success');
            addTestResult('Auth success parameters', 'passed');
        } else {
            log('✗ Missing auth success parameters', 'error');
            addTestResult('Auth success parameters', 'failed');
        }
    } catch (error) {
        log(`✗ Error testing secure app: ${error.message}`, 'error');
        addTestResult('secure app tests', 'failed', error.message);
    }
}

async function testCrossDomainAuth() {
    log('\n=== Testing Cross-Domain Authentication ===', 'info');
    
    // Test Firebase configuration
    try {
        const firebaseConfig = await fs.readFile(TEST_CONFIG.localPaths.firebaseConfig, 'utf8');
        
        const hasFirebaseInit = /firebase\.initializeApp/.test(firebaseConfig);
        const hasAuthExport = /const auth = firebase\.auth\(\)/.test(firebaseConfig);
        const hasDbExport = /const db = firebase\.firestore\(\)/.test(firebaseConfig);
        
        if (hasFirebaseInit && hasAuthExport && hasDbExport) {
            log('✓ Firebase properly configured', 'success');
            addTestResult('Firebase configuration', 'passed');
        } else {
            log('✗ Firebase configuration issues', 'error');
            addTestResult('Firebase configuration', 'failed');
        }
    } catch (error) {
        log(`✗ Error testing Firebase config: ${error.message}`, 'error');
        addTestResult('Firebase config test', 'failed', error.message);
    }
    
    // Test language persistence
    try {
        const appContent = await fs.readFile(TEST_CONFIG.localPaths.rasinApp, 'utf8');
        
        const hasLanguageStorage = /localStorage\.setItem.*pyebwaLang/.test(appContent);
        const hasLanguageRestore = /localStorage\.getItem.*pyebwaLang/.test(appContent);
        
        if (hasLanguageStorage && hasLanguageRestore) {
            log('✓ Language preference persistence implemented', 'success');
            addTestResult('Language persistence', 'passed');
        } else {
            log('⚠ Language persistence may be incomplete', 'warning');
            addTestResult('Language persistence', 'warning');
        }
    } catch (error) {
        log(`⚠ Could not test language persistence: ${error.message}`, 'warning');
        addTestResult('Language persistence test', 'warning', error.message);
    }
}

async function testRedirectURLs() {
    log('\n=== Testing Redirect URLs ===', 'info');
    
    const files = [
        { path: TEST_CONFIG.localPaths.pyebwaApp, name: 'pyebwa.com/js/app.js' },
        { path: TEST_CONFIG.localPaths.rasinApp, name: 'app/js/app.js' },
        { path: TEST_CONFIG.localPaths.secureApp, name: 'secure-app.js' }
    ];
    
    for (const file of files) {
        try {
            const content = await fs.readFile(file.path, 'utf8');
            const redirectMatches = content.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/g) || [];
            
            let hasIssues = false;
            for (const match of redirectMatches) {
                const url = match.match(/['"]([^'"]+)['"]/)[1];
                
                // Check for problematic patterns
                if (url.includes('auth-bridge.html')) {
                    log(`✗ ${file.name}: Found auth-bridge.html redirect`, 'error');
                    hasIssues = true;
                } else if (url.includes('localhost') && !url.includes('location.hostname')) {
                    log(`⚠ ${file.name}: Found hardcoded localhost URL`, 'warning');
                    hasIssues = true;
                }
            }
            
            if (!hasIssues) {
                log(`✓ ${file.name}: All redirects appear correct`, 'success');
                addTestResult(`${file.name} redirects`, 'passed');
            } else {
                addTestResult(`${file.name} redirects`, 'failed', 'Found problematic redirects');
            }
        } catch (error) {
            log(`✗ Error checking ${file.name}: ${error.message}`, 'error');
            addTestResult(`${file.name} redirect test`, 'failed', error.message);
        }
    }
}

async function testEdgeCases() {
    log('\n=== Testing Edge Cases ===', 'info');
    
    // Test redirect loop prevention
    try {
        const appContent = await fs.readFile(TEST_CONFIG.localPaths.rasinApp, 'utf8');
        
        const hasRedirectCounter = /redirectCount/i.test(appContent);
        const hasRedirectLimit = /redirectCount\s*>\s*\d+/.test(appContent);
        const hasTimestamp = /timestamp.*Date\.now\(\)/.test(appContent);
        const hasSessionStorage = /sessionStorage.*pyebwaRedirectData/.test(appContent);
        const hasTimeExpiry = /timeSinceLastRedirect\s*>\s*\d+/.test(appContent);
        
        const redirectLoopScore = [
            hasRedirectCounter,
            hasRedirectLimit,
            hasTimestamp,
            hasSessionStorage,
            hasTimeExpiry
        ].filter(Boolean).length;
        
        if (redirectLoopScore >= 4) {
            log('✓ Strong redirect loop prevention implemented', 'success');
            addTestResult('Redirect loop prevention', 'passed');
        } else if (redirectLoopScore >= 2) {
            log('⚠ Basic redirect loop prevention found', 'warning');
            addTestResult('Redirect loop prevention', 'warning', 'Could be improved');
        } else {
            log('✗ Insufficient redirect loop prevention', 'error');
            addTestResult('Redirect loop prevention', 'failed');
        }
    } catch (error) {
        log(`✗ Error testing edge cases: ${error.message}`, 'error');
        addTestResult('Edge case tests', 'failed', error.message);
    }
    
    // Test auth state synchronization timing
    try {
        const appContent = await fs.readFile(TEST_CONFIG.localPaths.rasinApp, 'utf8');
        
        const hasAuthWait = /setTimeout.*5000.*auth/i.test(appContent);
        const hasImmediateCheck = /auth\.currentUser.*immediateUser/i.test(appContent);
        
        if (hasAuthWait) {
            log('✓ Has auth synchronization wait logic', 'success');
            addTestResult('Auth sync timing', 'passed');
        } else {
            log('⚠ May not wait for auth synchronization', 'warning');
            addTestResult('Auth sync timing', 'warning');
        }
        
        if (hasImmediateCheck) {
            log('✓ Checks auth state immediately', 'success');
            addTestResult('Immediate auth check', 'passed');
        } else {
            log('⚠ May not check auth state immediately', 'warning');
            addTestResult('Immediate auth check', 'warning');
        }
    } catch (error) {
        log(`⚠ Could not fully test auth timing: ${error.message}`, 'warning');
        addTestResult('Auth timing tests', 'warning', error.message);
    }
}

async function generateReport() {
    log('\n=== AUTHENTICATION TEST REPORT ===', 'info');
    log(`Total Tests: ${testResults.tests.length}`, 'info');
    log(`Passed: ${testResults.passed} ✅`, 'success');
    log(`Failed: ${testResults.failed} ❌`, testResults.failed > 0 ? 'error' : 'info');
    log(`Warnings: ${testResults.warnings} ⚠️`, testResults.warnings > 0 ? 'warning' : 'info');
    
    const successRate = (testResults.passed / testResults.tests.length * 100).toFixed(1);
    log(`Success Rate: ${successRate}%`, 'info');
    
    if (testResults.failed > 0) {
        log('\n=== FAILED TESTS ===', 'error');
        testResults.tests
            .filter(t => t.status === 'failed')
            .forEach(test => {
                log(`❌ ${test.name}: ${test.message}`, 'error');
            });
    }
    
    if (testResults.warnings > 0) {
        log('\n=== WARNINGS ===', 'warning');
        testResults.tests
            .filter(t => t.status === 'warning')
            .forEach(test => {
                log(`⚠️ ${test.name}: ${test.message || 'Check implementation'}`, 'warning');
            });
    }
    
    // Save report to file
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            total: testResults.tests.length,
            passed: testResults.passed,
            failed: testResults.failed,
            warnings: testResults.warnings,
            successRate: successRate
        },
        tests: testResults.tests
    };
    
    try {
        await fs.writeFile(
            path.join(__dirname, 'auth-test-report.json'),
            JSON.stringify(report, null, 2)
        );
        log('\nDetailed report saved to auth-test-report.json', 'info');
    } catch (error) {
        log(`Could not save report: ${error.message}`, 'warning');
    }
}

async function runCurlTests() {
    log('\n=== Running CURL Tests ===', 'info');
    
    const curlTests = [
        {
            name: 'pyebwa.com accessibility',
            command: 'curl -s -o /dev/null -w "%{http_code}" https://pyebwa.com'
        },
        {
            name: 'secure.pyebwa.com accessibility',
            command: 'curl -s -o /dev/null -w "%{http_code}" https://secure.pyebwa.com'
        },
        {
            name: 'rasin.pyebwa.com/app accessibility',
            command: 'curl -s -o /dev/null -w "%{http_code}" https://rasin.pyebwa.com/app/'
        }
    ];
    
    for (const test of curlTests) {
        try {
            const { stdout } = await execPromise(test.command);
            const statusCode = stdout.trim();
            
            if (statusCode === '200') {
                log(`✓ ${test.name}: HTTP ${statusCode}`, 'success');
                addTestResult(test.name, 'passed');
            } else if (statusCode === '302' || statusCode === '301') {
                log(`✓ ${test.name}: HTTP ${statusCode} (redirect)`, 'success');
                addTestResult(test.name, 'passed');
            } else {
                log(`✗ ${test.name}: HTTP ${statusCode}`, 'error');
                addTestResult(test.name, 'failed', `HTTP ${statusCode}`);
            }
        } catch (error) {
            log(`✗ ${test.name}: ${error.message}`, 'error');
            addTestResult(test.name, 'failed', error.message);
        }
    }
}

// Main execution
async function main() {
    log('🚀 Starting Pyebwa Authentication Test Suite', 'info');
    log(`Test started at: ${new Date().toISOString()}`, 'info');
    
    try {
        // Check if all required files exist
        log('\n=== Checking Required Files ===', 'info');
        for (const [key, filePath] of Object.entries(TEST_CONFIG.localPaths)) {
            await testFileExists(filePath, `${key} file exists`);
        }
        
        // Run test suites
        await testAuthenticationFlow();
        await testCrossDomainAuth();
        await testRedirectURLs();
        await testEdgeCases();
        
        // Run curl tests if available
        try {
            await runCurlTests();
        } catch (error) {
            log('⚠ Skipping CURL tests (curl may not be available)', 'warning');
        }
        
        // Generate final report
        await generateReport();
        
        // Exit with appropriate code
        process.exit(testResults.failed > 0 ? 1 : 0);
        
    } catch (error) {
        log(`Fatal error: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Run the tests
if (require.main === module) {
    main();
}

module.exports = { runTests: main };