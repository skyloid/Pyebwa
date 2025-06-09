// Enhanced authentication synchronization helper
// This module helps ensure Firebase auth state is properly synchronized across domains

const AuthSync = {
    // Maximum time to wait for auth sync (in milliseconds)
    MAX_WAIT_TIME: 10000,
    
    // Check interval (in milliseconds)
    CHECK_INTERVAL: 500,
    
    // Debug mode
    debug: true,
    
    // Log helper
    log: function(message, type = 'info') {
        if (this.debug) {
            console.log(`[AuthSync] ${type.toUpperCase()}: ${message}`);
            
            // Store in localStorage for debugging
            const logs = JSON.parse(localStorage.getItem('authSyncLogs') || '[]');
            logs.push({
                timestamp: new Date().toISOString(),
                message: message,
                type: type
            });
            localStorage.setItem('authSyncLogs', JSON.stringify(logs.slice(-50)));
        }
    },
    
    // Wait for auth state with enhanced checking
    waitForAuth: function(auth, timeout = this.MAX_WAIT_TIME) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let checkCount = 0;
            
            this.log('Starting auth sync wait...');
            
            // First, check immediate auth state
            if (auth.currentUser) {
                this.log(`Immediate auth found: ${auth.currentUser.email}`, 'success');
                resolve(auth.currentUser);
                return;
            }
            
            // Set up auth state listener
            const unsubscribe = auth.onAuthStateChanged((user) => {
                if (user) {
                    this.log(`Auth state changed: User ${user.email} authenticated`, 'success');
                    unsubscribe();
                    resolve(user);
                }
            });
            
            // Periodic check with progressive delays
            const checkAuth = () => {
                checkCount++;
                const elapsed = Date.now() - startTime;
                
                this.log(`Auth check #${checkCount} at ${elapsed}ms`);
                
                // Check current auth state
                if (auth.currentUser) {
                    this.log(`Auth found on check #${checkCount}: ${auth.currentUser.email}`, 'success');
                    unsubscribe();
                    resolve(auth.currentUser);
                    return;
                }
                
                // Check if we've exceeded timeout
                if (elapsed >= timeout) {
                    this.log(`Auth sync timeout after ${elapsed}ms`, 'error');
                    unsubscribe();
                    resolve(null);
                    return;
                }
                
                // Progressive delay: start fast, then slow down
                let nextDelay = this.CHECK_INTERVAL;
                if (checkCount > 5) nextDelay = 1000;
                if (checkCount > 10) nextDelay = 2000;
                
                setTimeout(checkAuth, nextDelay);
            };
            
            // Start checking after a brief initial delay
            setTimeout(checkAuth, 100);
        });
    },
    
    // Check if coming from login
    isFromLogin: function() {
        const urlParams = new URLSearchParams(window.location.search);
        const fromLogin = urlParams.get('login') === 'true';
        const authSuccess = urlParams.get('auth') === 'success';
        
        this.log(`URL params - login: ${fromLogin}, auth: ${authSuccess}`);
        
        return fromLogin || authSuccess;
    },
    
    // Get clean redirect URL
    getCleanRedirectUrl: function() {
        return window.location.origin + window.location.pathname;
    },
    
    // Handle authentication redirect
    redirectToLogin: function(redirectUrl = null) {
        const targetUrl = redirectUrl || this.getCleanRedirectUrl();
        const loginUrl = 'https://secure.pyebwa.com/?redirect=' + encodeURIComponent(targetUrl);
        
        this.log(`Redirecting to login: ${loginUrl}`);
        window.location.href = loginUrl;
    },
    
    // Clear auth sync logs
    clearLogs: function() {
        localStorage.removeItem('authSyncLogs');
        this.log('Auth sync logs cleared');
    },
    
    // Get auth sync logs
    getLogs: function() {
        return JSON.parse(localStorage.getItem('authSyncLogs') || '[]');
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSync;
}