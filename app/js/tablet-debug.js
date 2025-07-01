// Enhanced Tablet-specific debug helper with comprehensive logging
(function() {
    'use strict';
    
    // Only run on tablets
    if (!window.DeviceDetection || !window.DeviceDetection.isTablet()) {
        console.log('[Tablet Debug] Not a tablet device, skipping tablet debug');
        return;
    }
    
    console.log('[Tablet Debug] Tablet detected, initializing enhanced debug helpers');
    
    // Create debug info storage with more detailed tracking
    const debugInfo = {
        authStateChanges: [],
        redirectAttempts: [],
        errors: [],
        loopDetectionEvents: [],
        cooldownEvents: [],
        storageChanges: [],
        networkRequests: [],
        performanceMetrics: [],
        deviceInfo: window.DeviceDetection.getDeviceInfo(),
        startTime: Date.now(),
        sessionId: 'tablet-debug-' + Date.now()
    };
    
    // Track auth state changes with more detail
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            const entry = {
                time: new Date().toISOString(),
                timestamp: Date.now(),
                user: user ? user.email : null,
                uid: user ? user.uid : null,
                isAnonymous: user ? user.isAnonymous : null,
                providers: user ? user.providerData.map(p => p.providerId) : [],
                pageUrl: window.location.href,
                sessionAge: Date.now() - debugInfo.startTime
            };
            debugInfo.authStateChanges.push(entry);
            console.log('[Tablet Debug] Auth state change:', entry);
            
            // Check for rapid changes (potential loop indicator)
            const recentChanges = debugInfo.authStateChanges.filter(
                change => Date.now() - change.timestamp < 10000
            );
            if (recentChanges.length > 3) {
                console.warn('[Tablet Debug] Rapid auth state changes detected:', recentChanges.length);
                debugInfo.loopDetectionEvents.push({
                    time: new Date().toISOString(),
                    type: 'rapid_auth_changes',
                    count: recentChanges.length,
                    details: recentChanges
                });
            }
        });
    }
    
    // Override location.href to track redirects with enhanced logging
    const originalLocationHref = Object.getOwnPropertyDescriptor(window.location, 'href');
    Object.defineProperty(window.location, 'href', {
        get: function() {
            return originalLocationHref.get.call(this);
        },
        set: function(value) {
            const redirectEntry = {
                time: new Date().toISOString(),
                timestamp: Date.now(),
                from: window.location.href,
                to: value,
                referrer: document.referrer,
                authState: firebase.auth ? (firebase.auth().currentUser ? 'authenticated' : 'unauthenticated') : 'unknown',
                cooldownActive: !canRedirect(),
                cooldownRemaining: getCooldownRemaining(),
                stack: new Error().stack.split('\n').slice(2, 5).join('\n') // First 3 stack frames
            };
            debugInfo.redirectAttempts.push(redirectEntry);
            console.log('[Tablet Debug] Redirect attempt:', redirectEntry);
            
            // Check for redirect loops
            const recentRedirects = debugInfo.redirectAttempts.filter(
                r => Date.now() - r.timestamp < 15000
            );
            if (recentRedirects.length > 5) {
                console.error('[Tablet Debug] Redirect loop detected!', recentRedirects);
                debugInfo.loopDetectionEvents.push({
                    time: new Date().toISOString(),
                    type: 'redirect_loop',
                    count: recentRedirects.length,
                    pattern: detectRedirectPattern(recentRedirects)
                });
            }
            
            return originalLocationHref.set.call(this, value);
        }
    });
    
    // Helper functions for redirect tracking
    function canRedirect() {
        const cooldown = 60000; // 60s for tablets
        const lastRedirect = parseInt(localStorage.getItem('lastRedirectTime') || '0');
        return Date.now() - lastRedirect >= cooldown;
    }
    
    function getCooldownRemaining() {
        const cooldown = 60000;
        const lastRedirect = parseInt(localStorage.getItem('lastRedirectTime') || '0');
        const remaining = cooldown - (Date.now() - lastRedirect);
        return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
    }
    
    function detectRedirectPattern(redirects) {
        const urls = redirects.map(r => r.to);
        const uniqueUrls = [...new Set(urls)];
        return {
            totalRedirects: redirects.length,
            uniqueUrls: uniqueUrls.length,
            pattern: uniqueUrls.length <= 2 ? 'ping-pong' : 'complex',
            urls: uniqueUrls
        };
    }
    
    // Track errors with more context
    window.addEventListener('error', (event) => {
        const errorEntry = {
            time: new Date().toISOString(),
            timestamp: Date.now(),
            message: event.message,
            source: event.filename,
            line: event.lineno,
            column: event.colno,
            error: event.error ? {
                name: event.error.name,
                stack: event.error.stack
            } : null,
            pageUrl: window.location.href,
            authState: firebase.auth ? (firebase.auth().currentUser ? 'authenticated' : 'unauthenticated') : 'unknown'
        };
        debugInfo.errors.push(errorEntry);
        console.error('[Tablet Debug] Error captured:', errorEntry);
    });
    
    // Track storage changes
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
        if (key.includes('pyebwa') || key.includes('auth') || key.includes('redirect') || key.includes('loop')) {
            debugInfo.storageChanges.push({
                time: new Date().toISOString(),
                storage: this === localStorage ? 'local' : 'session',
                action: 'set',
                key: key,
                value: value.substring(0, 100) + (value.length > 100 ? '...' : ''),
                stack: new Error().stack.split('\n')[2]
            });
        }
        return originalSetItem.call(this, key, value);
    };
    
    // Track performance metrics
    function capturePerformanceMetrics() {
        if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            const metrics = {
                time: new Date().toISOString(),
                pageLoadTime: timing.loadEventEnd - timing.navigationStart,
                domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
                redirectTime: timing.redirectEnd - timing.redirectStart,
                memoryUsage: window.performance.memory ? {
                    usedJSHeapSize: Math.round(window.performance.memory.usedJSHeapSize / 1048576) + 'MB',
                    totalJSHeapSize: Math.round(window.performance.memory.totalJSHeapSize / 1048576) + 'MB'
                } : null
            };
            debugInfo.performanceMetrics.push(metrics);
        }
    }
    
    // Capture performance metrics periodically
    setInterval(capturePerformanceMetrics, 30000); // Every 30 seconds
    
    // Monitor network requests for auth endpoints
    if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            if (typeof url === 'string' && (url.includes('auth') || url.includes('firebase'))) {
                const requestInfo = {
                    time: new Date().toISOString(),
                    url: url,
                    method: args[1] ? args[1].method : 'GET'
                };
                debugInfo.networkRequests.push(requestInfo);
                console.log('[Tablet Debug] Network request:', requestInfo);
            }
            return originalFetch.apply(this, args);
        };
    }
    
    // Create debug UI button
    const createDebugUI = () => {
        const debugButton = document.createElement('button');
        debugButton.innerHTML = '🐛';
        debugButton.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #4CAF50;
            color: white;
            border: none;
            font-size: 24px;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        
        debugButton.onclick = () => {
            showDebugPanel();
        };
        
        document.body.appendChild(debugButton);
    };
    
    // Show debug panel
    const showDebugPanel = () => {
        const existingPanel = document.getElementById('tabletDebugPanel');
        if (existingPanel) {
            existingPanel.remove();
            return;
        }
        
        const panel = document.createElement('div');
        panel.id = 'tabletDebugPanel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            background: white;
            border: 2px solid #333;
            border-radius: 10px;
            padding: 20px;
            z-index: 10001;
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        // Gather current state
        const currentState = {
            url: window.location.href,
            timestamp: new Date().toISOString(),
            auth: firebase.auth ? firebase.auth().currentUser : null,
            storage: {
                localStorage: {
                    lastRedirectTime: localStorage.getItem('lastRedirectTime'),
                    pyebwaDebugLogs: localStorage.getItem('pyebwaDebugLogs'),
                    authLoopStopped: localStorage.getItem('authLoopStopped')
                },
                sessionStorage: {
                    pyebwaRedirectData: sessionStorage.getItem('pyebwaRedirectData'),
                    recentLogin: sessionStorage.getItem('recentLogin'),
                    loginTime: sessionStorage.getItem('loginTime'),
                    authWaitSuccess: sessionStorage.getItem('authWaitSuccess')
                }
            },
            cooldown: {
                active: false,
                remaining: 0
            }
        };
        
        // Check cooldown
        const lastRedirect = parseInt(localStorage.getItem('lastRedirectTime') || '0');
        const now = Date.now();
        const cooldownTime = 60000; // 60s for tablets
        if (now - lastRedirect < cooldownTime) {
            currentState.cooldown.active = true;
            currentState.cooldown.remaining = Math.round((cooldownTime - (now - lastRedirect)) / 1000);
        }
        
        panel.innerHTML = `
            <h2 style="margin-top: 0;">Enhanced Tablet Debug Info</h2>
            <button onclick="document.getElementById('tabletDebugPanel').remove()" 
                    style="position: absolute; top: 10px; right: 10px; font-size: 20px; background: none; border: none; cursor: pointer;">✕</button>
            
            <div style="margin-bottom: 10px; padding: 10px; background: ${currentState.cooldown.active ? '#ffebee' : '#e8f5e9'}; border-radius: 5px;">
                <strong>Status:</strong> ${currentState.cooldown.active ? '⚠️ Cooldown Active (' + currentState.cooldown.remaining + 's)' : '✅ Ready'}
                | <strong>Session:</strong> ${Math.round((Date.now() - debugInfo.startTime) / 1000)}s
                | <strong>Auth:</strong> ${currentState.auth ? currentState.auth.email : 'None'}
            </div>
            
            <details open style="margin-bottom: 10px;">
                <summary style="cursor: pointer; font-weight: bold;">Device Info</summary>
                <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto;">
${JSON.stringify(debugInfo.deviceInfo, null, 2)}
                </pre>
            </details>
            
            <details style="margin-bottom: 10px;">
                <summary style="cursor: pointer; font-weight: bold;">Current State</summary>
                <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto;">
${JSON.stringify(currentState, null, 2)}
                </pre>
            </details>
            
            <details ${debugInfo.loopDetectionEvents.length > 0 ? 'open' : ''} style="margin-bottom: 10px;">
                <summary style="cursor: pointer; font-weight: bold; color: ${debugInfo.loopDetectionEvents.length > 0 ? 'red' : 'inherit'};">
                    Loop Detection Events (${debugInfo.loopDetectionEvents.length})
                </summary>
                <pre style="background: #ffebee; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto; max-height: 150px;">
${JSON.stringify(debugInfo.loopDetectionEvents.slice(-5), null, 2)}
                </pre>
            </details>
            
            <details style="margin-bottom: 10px;">
                <summary style="cursor: pointer; font-weight: bold;">Auth State Changes (${debugInfo.authStateChanges.length})</summary>
                <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto; max-height: 150px;">
${JSON.stringify(debugInfo.authStateChanges.slice(-5), null, 2)}
                </pre>
            </details>
            
            <details style="margin-bottom: 10px;">
                <summary style="cursor: pointer; font-weight: bold;">Redirect Attempts (${debugInfo.redirectAttempts.length})</summary>
                <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto; max-height: 150px;">
${JSON.stringify(debugInfo.redirectAttempts.slice(-5), null, 2)}
                </pre>
            </details>
            
            <details style="margin-bottom: 10px;">
                <summary style="cursor: pointer; font-weight: bold;">Storage Changes (${debugInfo.storageChanges.length})</summary>
                <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto; max-height: 150px;">
${JSON.stringify(debugInfo.storageChanges.slice(-10), null, 2)}
                </pre>
            </details>
            
            <details style="margin-bottom: 10px;">
                <summary style="cursor: pointer; font-weight: bold;">Network Requests (${debugInfo.networkRequests.length})</summary>
                <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto; max-height: 150px;">
${JSON.stringify(debugInfo.networkRequests.slice(-10), null, 2)}
                </pre>
            </details>
            
            <details style="margin-bottom: 10px;">
                <summary style="cursor: pointer; font-weight: bold;">Performance Metrics</summary>
                <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto; max-height: 150px;">
${JSON.stringify(debugInfo.performanceMetrics.slice(-3), null, 2)}
                </pre>
            </details>
            
            <details style="margin-bottom: 10px;">
                <summary style="cursor: pointer; font-weight: bold;">Errors (${debugInfo.errors.length})</summary>
                <pre style="background: #ffebee; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto; max-height: 150px;">
${JSON.stringify(debugInfo.errors.slice(-5), null, 2)}
                </pre>
            </details>
            
            <h3>Actions</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="clearAllData()" style="padding: 10px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Clear All Data
                </button>
                <button onclick="clearCooldown()" style="padding: 10px; background: #ff9800; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Clear Cooldown
                </button>
                <button onclick="copyDebugInfo()" style="padding: 10px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Copy Debug Info
                </button>
                <button onclick="exportDebugLog()" style="padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Export Full Log
                </button>
                <button onclick="runQuickTest()" style="padding: 10px; background: #9C27B0; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Run Quick Test
                </button>
            </div>
        `;
        
        document.body.appendChild(panel);
    };
    
    // Helper functions
    window.clearAllData = () => {
        if (confirm('Clear all authentication data?')) {
            localStorage.clear();
            sessionStorage.clear();
            alert('All data cleared. Page will reload.');
            window.location.reload();
        }
    };
    
    window.clearCooldown = () => {
        localStorage.removeItem('lastRedirectTime');
        alert('Cooldown cleared');
        document.getElementById('tabletDebugPanel').remove();
        showDebugPanel();
    };
    
    window.copyDebugInfo = () => {
        const info = {
            sessionId: debugInfo.sessionId,
            device: debugInfo.deviceInfo,
            authChanges: debugInfo.authStateChanges,
            redirects: debugInfo.redirectAttempts,
            loopEvents: debugInfo.loopDetectionEvents,
            storageChanges: debugInfo.storageChanges,
            networkRequests: debugInfo.networkRequests,
            performanceMetrics: debugInfo.performanceMetrics,
            errors: debugInfo.errors,
            currentState: {
                url: window.location.href,
                timestamp: new Date().toISOString(),
                sessionDuration: Date.now() - debugInfo.startTime,
                storage: {
                    localStorage: Object.keys(localStorage).reduce((acc, key) => {
                        acc[key] = localStorage.getItem(key);
                        return acc;
                    }, {}),
                    sessionStorage: Object.keys(sessionStorage).reduce((acc, key) => {
                        acc[key] = sessionStorage.getItem(key);
                        return acc;
                    }, {})
                }
            }
        };
        
        const text = JSON.stringify(info, null, 2);
        navigator.clipboard.writeText(text).then(() => {
            alert('Debug info copied to clipboard');
        }).catch(() => {
            console.log('Debug info:', info);
            alert('Failed to copy. Check console for debug info.');
        });
    };
    
    window.exportDebugLog = () => {
        const fullLog = {
            sessionId: debugInfo.sessionId,
            exportTime: new Date().toISOString(),
            sessionDuration: Date.now() - debugInfo.startTime,
            device: debugInfo.deviceInfo,
            summary: {
                authChanges: debugInfo.authStateChanges.length,
                redirects: debugInfo.redirectAttempts.length,
                loops: debugInfo.loopDetectionEvents.length,
                errors: debugInfo.errors.length,
                storageChanges: debugInfo.storageChanges.length,
                networkRequests: debugInfo.networkRequests.length
            },
            data: debugInfo
        };
        
        const blob = new Blob([JSON.stringify(fullLog, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tablet-debug-${debugInfo.sessionId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    
    window.runQuickTest = () => {
        console.log('[Tablet Debug] Running quick test...');
        
        const testResults = {
            timestamp: new Date().toISOString(),
            tests: []
        };
        
        // Test 1: Auth state
        const authTest = {
            name: 'Authentication State',
            passed: true,
            details: {}
        };
        
        try {
            authTest.details.currentUser = firebase.auth().currentUser ? firebase.auth().currentUser.email : null;
            authTest.details.authStateChanges = debugInfo.authStateChanges.length;
            authTest.passed = true;
        } catch (e) {
            authTest.passed = false;
            authTest.error = e.message;
        }
        testResults.tests.push(authTest);
        
        // Test 2: Cooldown status
        const cooldownTest = {
            name: 'Cooldown Status',
            passed: true,
            details: {}
        };
        
        cooldownTest.details.canRedirect = canRedirect();
        cooldownTest.details.cooldownRemaining = getCooldownRemaining();
        cooldownTest.passed = true;
        testResults.tests.push(cooldownTest);
        
        // Test 3: Loop detection
        const loopTest = {
            name: 'Loop Detection',
            passed: true,
            details: {}
        };
        
        loopTest.details.loopEvents = debugInfo.loopDetectionEvents.length;
        loopTest.details.recentRedirects = debugInfo.redirectAttempts.filter(
            r => Date.now() - r.timestamp < 15000
        ).length;
        loopTest.passed = loopTest.details.recentRedirects < 5;
        testResults.tests.push(loopTest);
        
        // Test 4: Storage
        const storageTest = {
            name: 'Storage Check',
            passed: true,
            details: {}
        };
        
        try {
            const testKey = 'tabletDebugTest';
            localStorage.setItem(testKey, 'test');
            storageTest.details.localStorage = localStorage.getItem(testKey) === 'test';
            localStorage.removeItem(testKey);
            
            sessionStorage.setItem(testKey, 'test');
            storageTest.details.sessionStorage = sessionStorage.getItem(testKey) === 'test';
            sessionStorage.removeItem(testKey);
            
            storageTest.passed = storageTest.details.localStorage && storageTest.details.sessionStorage;
        } catch (e) {
            storageTest.passed = false;
            storageTest.error = e.message;
        }
        testResults.tests.push(storageTest);
        
        // Display results
        const passed = testResults.tests.filter(t => t.passed).length;
        const failed = testResults.tests.filter(t => !t.passed).length;
        
        alert(`Quick Test Complete\n\nPassed: ${passed}\nFailed: ${failed}\n\nCheck console for details.`);
        console.log('[Tablet Debug] Quick test results:', testResults);
        
        // Store in debug info
        debugInfo.quickTests = debugInfo.quickTests || [];
        debugInfo.quickTests.push(testResults);
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createDebugUI);
    } else {
        createDebugUI();
    }
    
    // Export debug info to global scope
    window.tabletDebugInfo = debugInfo;
    
    console.log('[Tablet Debug] Initialization complete. Debug button added.');
})();