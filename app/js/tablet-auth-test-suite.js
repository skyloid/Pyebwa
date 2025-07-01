/**
 * Automated Tablet Authentication Test Suite
 * Tests device detection, authentication flow, loop prevention, and cooldowns
 */

class TabletAuthTestSuite {
    constructor(firebase) {
        this.firebase = firebase;
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.testResults = [];
        this.currentTest = null;
    }

    // Device Detection Tests
    async testDeviceDetection() {
        const tests = [
            {
                name: 'iPad Detection',
                userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                expected: { isTablet: true, deviceType: 'tablet' }
            },
            {
                name: 'Android Tablet Detection',
                userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-T510) AppleWebKit/537.36',
                expected: { isTablet: true, deviceType: 'tablet' }
            },
            {
                name: 'iPhone Detection',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                expected: { isTablet: false, deviceType: 'mobile' }
            },
            {
                name: 'Desktop Detection',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                expected: { isTablet: false, deviceType: 'desktop' }
            }
        ];

        for (const test of tests) {
            await this.runTest(test.name, async () => {
                // Mock user agent
                const originalUA = navigator.userAgent;
                Object.defineProperty(navigator, 'userAgent', {
                    value: test.userAgent,
                    writable: true,
                    configurable: true
                });

                // Run detection
                const result = this.detectDevice();

                // Restore original
                Object.defineProperty(navigator, 'userAgent', {
                    value: originalUA,
                    writable: true,
                    configurable: true
                });

                // Validate
                this.assert(result.isTablet === test.expected.isTablet, 
                    `Expected isTablet: ${test.expected.isTablet}, got: ${result.isTablet}`);
                this.assert(result.deviceType === test.expected.deviceType,
                    `Expected deviceType: ${test.expected.deviceType}, got: ${result.deviceType}`);
            });
        }
    }

    // Authentication Flow Tests
    async testAuthenticationFlow() {
        // Test 1: Login Flow
        await this.runTest('Login Flow', async () => {
            // Ensure logged out
            if (this.auth.currentUser) {
                await this.auth.signOut();
            }

            // Track auth state changes
            let authChanges = 0;
            const unsubscribe = this.auth.onAuthStateChanged(() => {
                authChanges++;
            });

            // Attempt login
            try {
                await this.auth.signInWithEmailAndPassword('test@example.com', 'testpassword123');
                this.assert(this.auth.currentUser !== null, 'User should be logged in');
                this.assert(authChanges >= 1, 'Auth state should have changed');
            } catch (error) {
                // Create test user if doesn't exist
                if (error.code === 'auth/user-not-found') {
                    await this.auth.createUserWithEmailAndPassword('test@example.com', 'testpassword123');
                    this.assert(this.auth.currentUser !== null, 'User should be created and logged in');
                } else {
                    throw error;
                }
            } finally {
                unsubscribe();
            }
        });

        // Test 2: Logout Flow
        await this.runTest('Logout Flow', async () => {
            if (!this.auth.currentUser) {
                await this.auth.signInWithEmailAndPassword('test@example.com', 'testpassword123');
            }

            await this.auth.signOut();
            this.assert(this.auth.currentUser === null, 'User should be logged out');
        });

        // Test 3: Persistence
        await this.runTest('Auth Persistence', async () => {
            // Set persistence
            await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            
            // Login
            await this.auth.signInWithEmailAndPassword('test@example.com', 'testpassword123');
            const uid = this.auth.currentUser.uid;
            
            // Simulate page reload by checking persistence
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.assert(this.auth.currentUser !== null, 'User should remain logged in');
            this.assert(this.auth.currentUser.uid === uid, 'User ID should match');
        });
    }

    // Loop Prevention Tests
    async testLoopPrevention() {
        const isTablet = this.detectDevice().isTablet;
        const threshold = isTablet ? 5 : 3;
        const timeWindow = isTablet ? 15000 : 10000;

        // Test 1: Normal visits (no loop)
        await this.runTest('Normal Visits - No Loop', async () => {
            this.clearLoopData();
            
            // Simulate normal visits with delays
            for (let i = 0; i < threshold - 1; i++) {
                this.simulateVisit();
                await new Promise(resolve => setTimeout(resolve, timeWindow / threshold + 100));
            }
            
            const loopDetected = this.checkLoop();
            this.assert(!loopDetected, 'No loop should be detected for normal visits');
        });

        // Test 2: Rapid visits (loop detected)
        await this.runTest('Rapid Visits - Loop Detection', async () => {
            this.clearLoopData();
            
            // Simulate rapid visits
            for (let i = 0; i < threshold + 1; i++) {
                this.simulateVisit();
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            const loopDetected = this.checkLoop();
            this.assert(loopDetected, 'Loop should be detected for rapid visits');
        });

        // Test 3: Time window expiry
        await this.runTest('Time Window Expiry', async () => {
            this.clearLoopData();
            
            // Add visits
            for (let i = 0; i < threshold; i++) {
                this.simulateVisit();
            }
            
            // Wait for time window to expire
            await new Promise(resolve => setTimeout(resolve, timeWindow + 1000));
            
            // Add one more visit
            this.simulateVisit();
            
            const loopDetected = this.checkLoop();
            this.assert(!loopDetected, 'Loop should not be detected after time window expiry');
        });
    }

    // Cooldown Tests
    async testCooldowns() {
        const isTablet = this.detectDevice().isTablet;
        const cooldownDuration = isTablet ? 60000 : 30000;

        // Test 1: Initial redirect (no cooldown)
        await this.runTest('Initial Redirect - No Cooldown', async () => {
            this.clearCooldown();
            
            const canRedirect = this.canRedirect();
            this.assert(canRedirect, 'Should be able to redirect initially');
        });

        // Test 2: Cooldown enforcement
        await this.runTest('Cooldown Enforcement', async () => {
            this.clearCooldown();
            
            // Set redirect time
            this.setLastRedirect();
            
            // Immediate check should fail
            const canRedirect = this.canRedirect();
            this.assert(!canRedirect, 'Should not be able to redirect during cooldown');
        });

        // Test 3: Cooldown expiry
        await this.runTest('Cooldown Expiry', async () => {
            this.clearCooldown();
            
            // Set redirect time in the past
            const pastTime = Date.now() - cooldownDuration - 1000;
            localStorage.setItem('lastRedirectTime', pastTime.toString());
            
            const canRedirect = this.canRedirect();
            this.assert(canRedirect, 'Should be able to redirect after cooldown expiry');
        });
    }

    // Storage Tests
    async testStorage() {
        // Test 1: Session storage
        await this.runTest('Session Storage', async () => {
            const testKey = 'pyebwaTestSession';
            const testValue = 'test-' + Date.now();
            
            sessionStorage.setItem(testKey, testValue);
            const retrieved = sessionStorage.getItem(testKey);
            
            this.assert(retrieved === testValue, 'Session storage should work');
            sessionStorage.removeItem(testKey);
        });

        // Test 2: Local storage
        await this.runTest('Local Storage', async () => {
            const testKey = 'pyebwaTestLocal';
            const testValue = 'test-' + Date.now();
            
            localStorage.setItem(testKey, testValue);
            const retrieved = localStorage.getItem(testKey);
            
            this.assert(retrieved === testValue, 'Local storage should work');
            localStorage.removeItem(testKey);
        });

        // Test 3: Storage limits
        await this.runTest('Storage Size Calculation', async () => {
            const size = this.calculateStorageSize();
            this.assert(size >= 0, 'Storage size should be calculable');
            this.assert(size < 5 * 1024 * 1024, 'Storage should be under 5MB limit');
        });
    }

    // Cross-domain Tests
    async testCrossDomain() {
        // Test 1: Auth token generation
        await this.runTest('Auth Token Generation', async () => {
            if (!this.auth.currentUser) {
                await this.auth.signInWithEmailAndPassword('test@example.com', 'testpassword123');
            }
            
            const token = await this.auth.currentUser.getIdToken();
            this.assert(token && token.length > 0, 'Should generate auth token');
            
            // Verify token structure
            const parts = token.split('.');
            this.assert(parts.length === 3, 'Token should have 3 parts');
        });

        // Test 2: Token expiry check
        await this.runTest('Token Expiry Check', async () => {
            if (!this.auth.currentUser) {
                await this.auth.signInWithEmailAndPassword('test@example.com', 'testpassword123');
            }
            
            const token = await this.auth.currentUser.getIdToken();
            const payload = JSON.parse(atob(token.split('.')[1]));
            
            this.assert(payload.exp > Date.now() / 1000, 'Token should not be expired');
            this.assert(payload.exp - payload.iat === 3600, 'Token should be valid for 1 hour');
        });
    }

    // Helper Methods
    detectDevice() {
        const ua = navigator.userAgent.toLowerCase();
        let isTablet = false;
        let deviceType = 'desktop';

        if (/ipad|macintosh/i.test(ua) && 'ontouchend' in document) {
            isTablet = true;
            deviceType = 'tablet';
        } else if (/android/i.test(ua) && !/mobile/i.test(ua)) {
            isTablet = true;
            deviceType = 'tablet';
        } else if (/android.*mobile|iphone|ipod/i.test(ua)) {
            deviceType = 'mobile';
        }

        return { isTablet, deviceType };
    }

    simulateVisit() {
        const now = Date.now();
        const visitCount = parseInt(localStorage.getItem('pyebwaVisitCount') || '0') + 1;
        localStorage.setItem('pyebwaVisitCount', visitCount.toString());
        localStorage.setItem('pyebwaLastVisit', now.toString());
    }

    checkLoop() {
        const device = this.detectDevice();
        const threshold = device.isTablet ? 5 : 3;
        const timeWindow = device.isTablet ? 15000 : 10000;
        
        const visitCount = parseInt(localStorage.getItem('pyebwaVisitCount') || '0');
        const lastVisit = parseInt(localStorage.getItem('pyebwaLastVisit') || '0');
        const now = Date.now();
        
        if (now - lastVisit > timeWindow) {
            return false;
        }
        
        return visitCount > threshold;
    }

    clearLoopData() {
        localStorage.removeItem('pyebwaVisitCount');
        localStorage.removeItem('pyebwaLastVisit');
        localStorage.removeItem('pyebwaLoopDetected');
    }

    canRedirect() {
        const device = this.detectDevice();
        const cooldown = device.isTablet ? 60000 : 30000;
        const lastRedirect = parseInt(localStorage.getItem('lastRedirectTime') || '0');
        const now = Date.now();
        
        return now - lastRedirect >= cooldown;
    }

    setLastRedirect() {
        localStorage.setItem('lastRedirectTime', Date.now().toString());
    }

    clearCooldown() {
        localStorage.removeItem('lastRedirectTime');
    }

    calculateStorageSize() {
        let size = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                size += localStorage[key].length + key.length;
            }
        }
        return size;
    }

    // Test execution helpers
    async runTest(name, testFn) {
        this.currentTest = {
            name,
            startTime: Date.now(),
            status: 'running',
            error: null
        };

        try {
            await testFn();
            this.currentTest.status = 'passed';
            this.currentTest.duration = Date.now() - this.currentTest.startTime;
            console.log(`✅ ${name} - PASSED (${this.currentTest.duration}ms)`);
        } catch (error) {
            this.currentTest.status = 'failed';
            this.currentTest.error = error.message;
            this.currentTest.duration = Date.now() - this.currentTest.startTime;
            console.error(`❌ ${name} - FAILED: ${error.message}`);
        }

        this.testResults.push({...this.currentTest});
        this.currentTest = null;
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    // Run all tests
    async runAll() {
        console.log('🚀 Starting Tablet Authentication Test Suite...\n');
        this.testResults = [];
        const startTime = Date.now();

        try {
            console.log('📱 Running Device Detection Tests...');
            await this.testDeviceDetection();

            console.log('\n🔐 Running Authentication Flow Tests...');
            await this.testAuthenticationFlow();

            console.log('\n🔄 Running Loop Prevention Tests...');
            await this.testLoopPrevention();

            console.log('\n⏱️ Running Cooldown Tests...');
            await this.testCooldowns();

            console.log('\n💾 Running Storage Tests...');
            await this.testStorage();

            console.log('\n🌐 Running Cross-Domain Tests...');
            await this.testCrossDomain();
        } catch (error) {
            console.error('Test suite error:', error);
        }

        const duration = Date.now() - startTime;
        const passed = this.testResults.filter(r => r.status === 'passed').length;
        const failed = this.testResults.filter(r => r.status === 'failed').length;

        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${this.testResults.length}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ❌`);
        console.log(`Duration: ${duration}ms`);
        console.log('='.repeat(50));

        if (failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults.filter(r => r.status === 'failed').forEach(test => {
                console.log(`- ${test.name}: ${test.error}`);
            });
        }

        return {
            results: this.testResults,
            summary: {
                total: this.testResults.length,
                passed,
                failed,
                duration
            }
        };
    }

    // Export results
    exportResults() {
        const report = {
            timestamp: new Date().toISOString(),
            device: this.detectDevice(),
            results: this.testResults,
            summary: {
                total: this.testResults.length,
                passed: this.testResults.filter(r => r.status === 'passed').length,
                failed: this.testResults.filter(r => r.status === 'failed').length
            }
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tablet-auth-test-results-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TabletAuthTestSuite;
} else {
    window.TabletAuthTestSuite = TabletAuthTestSuite;
}