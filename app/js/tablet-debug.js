// Tablet-specific debug helper
(function() {
    'use strict';
    
    // Only run on tablets
    if (!window.DeviceDetection || !window.DeviceDetection.isTablet()) {
        console.log('[Tablet Debug] Not a tablet device, skipping tablet debug');
        return;
    }
    
    console.log('[Tablet Debug] Tablet detected, initializing debug helpers');
    
    // Create debug info storage
    const debugInfo = {
        authStateChanges: [],
        redirectAttempts: [],
        errors: [],
        deviceInfo: window.DeviceDetection.getDeviceInfo()
    };
    
    // Track auth state changes
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            const entry = {
                time: new Date().toISOString(),
                user: user ? user.email : null,
                uid: user ? user.uid : null
            };
            debugInfo.authStateChanges.push(entry);
            console.log('[Tablet Debug] Auth state change:', entry);
        });
    }
    
    // Override location.href to track redirects
    const originalLocationHref = Object.getOwnPropertyDescriptor(window.location, 'href');
    Object.defineProperty(window.location, 'href', {
        get: function() {
            return originalLocationHref.get.call(this);
        },
        set: function(value) {
            debugInfo.redirectAttempts.push({
                time: new Date().toISOString(),
                from: window.location.href,
                to: value,
                stack: new Error().stack
            });
            console.log('[Tablet Debug] Redirect attempt:', value);
            return originalLocationHref.set.call(this, value);
        }
    });
    
    // Track errors
    window.addEventListener('error', (event) => {
        debugInfo.errors.push({
            time: new Date().toISOString(),
            message: event.message,
            source: event.filename,
            line: event.lineno,
            column: event.colno
        });
    });
    
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
            <h2 style="margin-top: 0;">Tablet Debug Info</h2>
            <button onclick="document.getElementById('tabletDebugPanel').remove()" 
                    style="position: absolute; top: 10px; right: 10px; font-size: 20px; background: none; border: none; cursor: pointer;">✕</button>
            
            <h3>Device Info</h3>
            <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto;">
${JSON.stringify(debugInfo.deviceInfo, null, 2)}
            </pre>
            
            <h3>Current State</h3>
            <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto;">
${JSON.stringify(currentState, null, 2)}
            </pre>
            
            <h3>Auth State Changes (${debugInfo.authStateChanges.length})</h3>
            <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto; max-height: 150px;">
${JSON.stringify(debugInfo.authStateChanges.slice(-5), null, 2)}
            </pre>
            
            <h3>Redirect Attempts (${debugInfo.redirectAttempts.length})</h3>
            <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto; max-height: 150px;">
${JSON.stringify(debugInfo.redirectAttempts.slice(-5).map(r => ({time: r.time, from: r.from, to: r.to})), null, 2)}
            </pre>
            
            <h3>Errors (${debugInfo.errors.length})</h3>
            <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto; max-height: 150px;">
${JSON.stringify(debugInfo.errors.slice(-5), null, 2)}
            </pre>
            
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
            device: debugInfo.deviceInfo,
            authChanges: debugInfo.authStateChanges,
            redirects: debugInfo.redirectAttempts,
            errors: debugInfo.errors,
            currentState: {
                url: window.location.href,
                timestamp: new Date().toISOString(),
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