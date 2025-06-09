// Auth Persistence Fix - Ensures authentication persists across page loads
console.log('[Auth Persistence] Loading fix...');

// Override the auth check in app.js
window.authPersistenceFix = {
    // Force authentication state
    forceAuth: async function() {
        console.log('[Auth Persistence] Forcing authentication check...');
        
        // Check if we just came from login
        const urlParams = new URLSearchParams(window.location.search);
        const fromLogin = urlParams.get('login') === 'true' || urlParams.get('auth') === 'success';
        
        if (fromLogin) {
            console.log('[Auth Persistence] User just logged in, waiting for auth sync...');
            
            // Clear URL parameters
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            
            // Set a flag to indicate we're waiting for auth
            sessionStorage.setItem('waitingForAuth', 'true');
            sessionStorage.setItem('authWaitStart', Date.now().toString());
            
            // Show loading message
            if (window.showLoadingState) {
                window.showLoadingState('Syncing authentication...');
            }
            
            // Start checking for auth
            let checkCount = 0;
            const maxChecks = 30; // 15 seconds (30 * 500ms)
            
            const authCheckInterval = setInterval(async () => {
                checkCount++;
                console.log(`[Auth Persistence] Auth check ${checkCount}/${maxChecks}`);
                
                // Force Firebase to check auth state
                if (window.firebase && window.firebase.auth) {
                    try {
                        // Try to get current user
                        const auth = window.firebase.auth();
                        const user = auth.currentUser;
                        
                        if (user) {
                            console.log('[Auth Persistence] User found:', user.email);
                            clearInterval(authCheckInterval);
                            sessionStorage.removeItem('waitingForAuth');
                            sessionStorage.removeItem('authWaitStart');
                            
                            // Trigger app initialization
                            if (window.handleAuthenticatedUser) {
                                window.handleAuthenticatedUser(user);
                            } else {
                                // Reload to trigger normal auth flow
                                window.location.reload();
                            }
                            return;
                        }
                        
                        // Try to refresh auth state
                        await auth.updateCurrentUser(auth.currentUser);
                        
                    } catch (error) {
                        console.error('[Auth Persistence] Error checking auth:', error);
                    }
                }
                
                // Check if we've exceeded max attempts
                if (checkCount >= maxChecks) {
                    console.error('[Auth Persistence] Auth sync timeout');
                    clearInterval(authCheckInterval);
                    sessionStorage.removeItem('waitingForAuth');
                    sessionStorage.removeItem('authWaitStart');
                    
                    // Show error
                    if (window.showError) {
                        window.showError('Authentication sync failed. Please try logging in again.');
                    }
                    
                    // Redirect to login after delay
                    setTimeout(() => {
                        window.location.href = 'https://secure.pyebwa.com/?redirect=' + encodeURIComponent(window.location.href);
                    }, 3000);
                }
            }, 500); // Check every 500ms
        }
    },
    
    // Check if we're waiting for auth
    isWaitingForAuth: function() {
        const waiting = sessionStorage.getItem('waitingForAuth') === 'true';
        if (waiting) {
            const startTime = parseInt(sessionStorage.getItem('authWaitStart') || '0');
            const elapsed = Date.now() - startTime;
            
            // If waiting for more than 20 seconds, stop waiting
            if (elapsed > 20000) {
                sessionStorage.removeItem('waitingForAuth');
                sessionStorage.removeItem('authWaitStart');
                return false;
            }
        }
        return waiting;
    },
    
    // Initialize the fix
    init: function() {
        console.log('[Auth Persistence] Initializing...');
        
        // Check if we need to force auth
        const urlParams = new URLSearchParams(window.location.search);
        const fromLogin = urlParams.get('login') === 'true' || urlParams.get('auth') === 'success';
        
        if (fromLogin || this.isWaitingForAuth()) {
            this.forceAuth();
        }
        
        // Listen for Firebase auth state changes
        document.addEventListener('DOMContentLoaded', () => {
            if (window.firebase && window.firebase.auth) {
                window.firebase.auth().onAuthStateChanged((user) => {
                    if (user && this.isWaitingForAuth()) {
                        console.log('[Auth Persistence] Auth state changed, user authenticated');
                        sessionStorage.removeItem('waitingForAuth');
                        sessionStorage.removeItem('authWaitStart');
                    }
                });
            }
        });
    }
};

// Auto-initialize
window.authPersistenceFix.init();

// Make it available globally for debugging
window.checkAuthPersistence = function() {
    console.log('[Auth Persistence] Status:');
    console.log('- Waiting for auth:', window.authPersistenceFix.isWaitingForAuth());
    console.log('- Current user:', window.firebase?.auth()?.currentUser?.email || 'None');
    console.log('- Session storage:', {
        waitingForAuth: sessionStorage.getItem('waitingForAuth'),
        authWaitStart: sessionStorage.getItem('authWaitStart'),
        pyebwaAuth: sessionStorage.getItem('pyebwaAuth'),
        pyebwaRedirectData: sessionStorage.getItem('pyebwaRedirectData')
    });
};