// Authentication Test Helpers
// Load this file in the browser console to access testing utilities

// Force logout and clear all auth data
window.forceLogout = async () => {
    try {
        await auth.signOut();
        sessionStorage.clear();
        localStorage.removeItem('pyebwaDebugLogs');
        localStorage.removeItem('pyebwaUser');
        console.log('✅ Logged out and cleared all auth data');
        setTimeout(() => location.reload(), 1000);
    } catch (error) {
        console.error('❌ Logout error:', error);
    }
};

// Check redirect data
window.checkRedirectData = () => {
    const data = JSON.parse(sessionStorage.getItem('pyebwaRedirectData') || '{}');
    console.log('=== Redirect Data ===');
    console.log('Redirect count:', data.count || 0);
    console.log('Last redirect:', data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Never');
    console.log('Time since last:', data.timestamp ? `${Math.floor((Date.now() - data.timestamp) / 1000)}s ago` : 'N/A');
    return data;
};

// Simulate auth delay
window.simulateAuthDelay = (delayMs = 5000) => {
    const originalCurrentUser = Object.getOwnPropertyDescriptor(auth.constructor.prototype, 'currentUser');
    let delayActive = true;
    
    Object.defineProperty(auth, 'currentUser', {
        get: function() {
            if (delayActive) {
                console.log('🕐 Simulating auth delay...');
                return null;
            }
            return originalCurrentUser.get.call(this);
        },
        configurable: true
    });
    
    console.log(`⏱️ Auth delay started for ${delayMs}ms`);
    
    setTimeout(() => {
        delayActive = false;
        console.log('✅ Auth delay ended');
        // Trigger a state change
        auth.onAuthStateChanged(() => {});
    }, delayMs);
};

// Show current auth state
window.showAuthState = () => {
    console.log('=== Current Auth State ===');
    console.log('Firebase User:', auth.currentUser ? {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName
    } : 'Not authenticated');
    
    console.log('Session Storage:', sessionStorage.getItem('pyebwaUser') || 'No user data');
    console.log('Redirect Data:', sessionStorage.getItem('pyebwaRedirectData') || 'No redirect data');
    
    return auth.currentUser;
};

// Test redirect loop prevention
window.testRedirectLoop = () => {
    console.log('🔄 Testing redirect loop prevention...');
    
    // Set redirect count to 2 (one more will trigger prevention)
    sessionStorage.setItem('pyebwaRedirectData', JSON.stringify({
        count: 2,
        timestamp: Date.now()
    }));
    
    console.log('✅ Set redirect count to 2. Next redirect will trigger loop prevention.');
    console.log('Reload the page to test.');
};

// Clear redirect loop data
window.clearRedirectLoop = () => {
    sessionStorage.removeItem('pyebwaRedirectData');
    console.log('✅ Redirect loop data cleared');
};

// Monitor auth state changes
window.monitorAuth = () => {
    console.log('👁️ Starting auth state monitoring...');
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
        const timestamp = new Date().toLocaleTimeString();
        if (user) {
            console.log(`[${timestamp}] 🟢 Auth state: Signed in as ${user.email}`);
        } else {
            console.log(`[${timestamp}] 🔴 Auth state: Not signed in`);
        }
    });
    
    // Store unsubscribe function
    window._authMonitorUnsubscribe = unsubscribe;
    console.log('To stop monitoring, run: window.stopAuthMonitor()');
};

// Stop auth monitoring
window.stopAuthMonitor = () => {
    if (window._authMonitorUnsubscribe) {
        window._authMonitorUnsubscribe();
        delete window._authMonitorUnsubscribe;
        console.log('✅ Auth monitoring stopped');
    } else {
        console.log('❌ No auth monitoring active');
    }
};

// Test cross-domain auth
window.testCrossDomainAuth = async () => {
    console.log('🌐 Testing cross-domain authentication...');
    
    const domains = [
        'https://pyebwa.com',
        'https://secure.pyebwa.com',
        'https://rasin.pyebwa.com/app'
    ];
    
    console.log('Current domain:', window.location.origin);
    console.log('Current auth state:', auth.currentUser ? `Signed in as ${auth.currentUser.email}` : 'Not signed in');
    
    console.log('\nTo test cross-domain auth:');
    domains.forEach((domain, i) => {
        if (!window.location.href.startsWith(domain)) {
            console.log(`${i + 1}. Open ${domain} in a new tab`);
            console.log(`   Then run: window.showAuthState()`);
        }
    });
};

// Inject debug UI
window.injectDebugUI = () => {
    const debugPanel = document.createElement('div');
    debugPanel.id = 'auth-debug-panel';
    debugPanel.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1f2937;
        color: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
        max-width: 300px;
    `;
    
    const updatePanel = () => {
        const user = auth.currentUser;
        const redirectData = JSON.parse(sessionStorage.getItem('pyebwaRedirectData') || '{}');
        
        debugPanel.innerHTML = `
            <h4 style="margin: 0 0 10px 0;">🔍 Auth Debug Panel</h4>
            <div style="margin-bottom: 5px;">
                <strong>Status:</strong> ${user ? '🟢 Authenticated' : '🔴 Not authenticated'}
            </div>
            ${user ? `<div style="margin-bottom: 5px;"><strong>User:</strong> ${user.email}</div>` : ''}
            <div style="margin-bottom: 5px;">
                <strong>Domain:</strong> ${window.location.hostname}
            </div>
            <div style="margin-bottom: 5px;">
                <strong>Redirect Count:</strong> ${redirectData.count || 0}
            </div>
            <div style="margin-top: 10px;">
                <button onclick="window.forceLogout()" style="margin-right: 5px;">Logout</button>
                <button onclick="window.showDebugLogs()">Show Logs</button>
                <button onclick="document.getElementById('auth-debug-panel').remove()">Close</button>
            </div>
        `;
    };
    
    updatePanel();
    document.body.appendChild(debugPanel);
    
    // Update panel on auth state changes
    auth.onAuthStateChanged(updatePanel);
    
    console.log('✅ Debug panel injected');
};

// Log auth event
window.logAuthEvent = (event, data = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        event,
        data,
        domain: window.location.hostname,
        user: auth.currentUser ? auth.currentUser.email : null
    };
    
    console.log(`[AUTH_EVENT] ${event}`, data);
    
    // Store in localStorage for persistence
    const logs = JSON.parse(localStorage.getItem('pyebwaAuthEvents') || '[]');
    logs.push(logEntry);
    // Keep last 50 events
    localStorage.setItem('pyebwaAuthEvents', JSON.stringify(logs.slice(-50)));
};

// Show auth events
window.showAuthEvents = () => {
    const logs = JSON.parse(localStorage.getItem('pyebwaAuthEvents') || '[]');
    console.log('=== Auth Events Log ===');
    logs.forEach(log => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        console.log(`[${time}] ${log.event} @ ${log.domain}`, log.data);
    });
    return logs;
};

// Clear auth events
window.clearAuthEvents = () => {
    localStorage.removeItem('pyebwaAuthEvents');
    console.log('✅ Auth events cleared');
};

console.log('🧪 Auth test helpers loaded!');
console.log('Available commands:');
console.log('  window.showAuthState() - Show current auth state');
console.log('  window.forceLogout() - Force logout and clear data');
console.log('  window.checkRedirectData() - Check redirect loop data');
console.log('  window.simulateAuthDelay(ms) - Simulate auth delay');
console.log('  window.testRedirectLoop() - Test redirect loop prevention');
console.log('  window.monitorAuth() - Monitor auth state changes');
console.log('  window.testCrossDomainAuth() - Test cross-domain auth');
console.log('  window.injectDebugUI() - Show debug panel');
console.log('  window.showDebugLogs() - Show debug logs');
console.log('  window.showAuthEvents() - Show auth event history');