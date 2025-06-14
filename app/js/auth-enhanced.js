// Enhanced Authentication Handler with Better Error Handling and Persistence
(function() {
    'use strict';
    
    console.log('[AuthEnhanced] Initializing enhanced authentication');
    
    // Configuration
    const AUTH_CONFIG = {
        MAX_RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000, // 1 second
        TOKEN_REFRESH_INTERVAL: 3300000, // 55 minutes (tokens expire at 60)
        PERSISTENCE_CHECK_INTERVAL: 5000, // 5 seconds
        AUTH_TIMEOUT: 10000 // 10 seconds
    };
    
    // State management
    let authState = {
        isInitialized: false,
        isAuthenticating: false,
        retryCount: 0,
        tokenRefreshInterval: null,
        persistenceCheckInterval: null,
        lastAuthTime: null
    };
    
    // Enhanced authentication initialization
    async function initializeAuth() {
        if (authState.isInitialized) {
            console.log('[AuthEnhanced] Already initialized');
            return;
        }
        
        try {
            console.log('[AuthEnhanced] Setting up enhanced authentication');
            
            // Ensure Firebase is initialized
            if (!window.firebase || !window.firebase.auth) {
                throw new Error('Firebase not initialized');
            }
            
            // Set persistence to LOCAL for cross-session persistence
            await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            console.log('[AuthEnhanced] Persistence set to LOCAL');
            
            // Set up auth state listener with enhanced error handling
            setupAuthStateListener();
            
            // Set up token refresh mechanism
            setupTokenRefresh();
            
            // Set up persistence checker
            setupPersistenceChecker();
            
            // Check for existing auth state
            await checkExistingAuth();
            
            authState.isInitialized = true;
            console.log('[AuthEnhanced] Initialization complete');
            
        } catch (error) {
            console.error('[AuthEnhanced] Initialization error:', error);
            handleAuthError(error);
        }
    }
    
    // Enhanced auth state listener
    function setupAuthStateListener() {
        const auth = firebase.auth();
        
        auth.onAuthStateChanged(async (user) => {
            console.log('[AuthEnhanced] Auth state changed:', user ? user.email : 'No user');
            
            if (user) {
                // User is signed in
                authState.lastAuthTime = Date.now();
                
                // Store auth state in multiple places for redundancy
                storeAuthState(user);
                
                // Emit custom event
                window.dispatchEvent(new CustomEvent('pyebwaAuthStateChange', {
                    detail: { user, isAuthenticated: true }
                }));
                
                // Ensure token is fresh
                try {
                    const token = await user.getIdToken(true);
                    console.log('[AuthEnhanced] Token refreshed successfully');
                } catch (error) {
                    console.error('[AuthEnhanced] Token refresh error:', error);
                }
                
            } else {
                // No user signed in
                clearAuthState();
                
                // Emit custom event
                window.dispatchEvent(new CustomEvent('pyebwaAuthStateChange', {
                    detail: { user: null, isAuthenticated: false }
                }));
                
                // Check if we should attempt to restore auth
                if (!authState.isAuthenticating) {
                    attemptAuthRestore();
                }
            }
        }, (error) => {
            console.error('[AuthEnhanced] Auth state listener error:', error);
            handleAuthError(error);
        });
    }
    
    // Store auth state in multiple locations for redundancy
    function storeAuthState(user) {
        const authData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            lastAuth: Date.now()
        };
        
        // Store in localStorage
        try {
            localStorage.setItem('pyebwaAuthState', JSON.stringify(authData));
        } catch (e) {
            console.warn('[AuthEnhanced] localStorage unavailable');
        }
        
        // Store in sessionStorage
        try {
            sessionStorage.setItem('pyebwaAuthState', JSON.stringify(authData));
        } catch (e) {
            console.warn('[AuthEnhanced] sessionStorage unavailable');
        }
        
        // Store in memory
        window.pyebwaAuthData = authData;
    }
    
    // Clear auth state from all locations
    function clearAuthState() {
        try {
            localStorage.removeItem('pyebwaAuthState');
            sessionStorage.removeItem('pyebwaAuthState');
            delete window.pyebwaAuthData;
        } catch (e) {
            console.warn('[AuthEnhanced] Error clearing auth state:', e);
        }
    }
    
    // Check for existing authentication
    async function checkExistingAuth() {
        console.log('[AuthEnhanced] Checking for existing authentication');
        
        const auth = firebase.auth();
        
        // Check current user
        if (auth.currentUser) {
            console.log('[AuthEnhanced] Found current user:', auth.currentUser.email);
            return true;
        }
        
        // Check stored auth state
        const storedAuth = getStoredAuthState();
        if (storedAuth && (Date.now() - storedAuth.lastAuth < 3600000)) { // 1 hour
            console.log('[AuthEnhanced] Found recent auth state');
            // Auth state will be restored by Firebase automatically
            return true;
        }
        
        // Wait briefly for auth to initialize
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve(false);
            }, AUTH_CONFIG.AUTH_TIMEOUT);
            
            const unsubscribe = auth.onAuthStateChanged((user) => {
                clearTimeout(timeout);
                unsubscribe();
                resolve(!!user);
            });
        });
    }
    
    // Get stored auth state from any available location
    function getStoredAuthState() {
        // Check memory first
        if (window.pyebwaAuthData) {
            return window.pyebwaAuthData;
        }
        
        // Check sessionStorage
        try {
            const sessionAuth = sessionStorage.getItem('pyebwaAuthState');
            if (sessionAuth) {
                return JSON.parse(sessionAuth);
            }
        } catch (e) {}
        
        // Check localStorage
        try {
            const localAuth = localStorage.getItem('pyebwaAuthState');
            if (localAuth) {
                return JSON.parse(localAuth);
            }
        } catch (e) {}
        
        return null;
    }
    
    // Attempt to restore authentication
    async function attemptAuthRestore() {
        if (authState.isAuthenticating || authState.retryCount >= AUTH_CONFIG.MAX_RETRY_ATTEMPTS) {
            return;
        }
        
        authState.isAuthenticating = true;
        authState.retryCount++;
        
        console.log(`[AuthEnhanced] Attempting auth restore (attempt ${authState.retryCount})`);
        
        try {
            // Check if we have stored credentials
            const storedAuth = getStoredAuthState();
            if (!storedAuth) {
                console.log('[AuthEnhanced] No stored auth state found');
                return;
            }
            
            // Wait for Firebase to restore auth state
            await new Promise((resolve) => {
                setTimeout(resolve, AUTH_CONFIG.RETRY_DELAY);
            });
            
            // Check if auth was restored
            if (firebase.auth().currentUser) {
                console.log('[AuthEnhanced] Auth restored successfully');
                authState.retryCount = 0;
            }
            
        } catch (error) {
            console.error('[AuthEnhanced] Auth restore error:', error);
        } finally {
            authState.isAuthenticating = false;
        }
    }
    
    // Set up automatic token refresh
    function setupTokenRefresh() {
        if (authState.tokenRefreshInterval) {
            clearInterval(authState.tokenRefreshInterval);
        }
        
        authState.tokenRefreshInterval = setInterval(async () => {
            const user = firebase.auth().currentUser;
            if (user) {
                try {
                    await user.getIdToken(true);
                    console.log('[AuthEnhanced] Token refreshed automatically');
                } catch (error) {
                    console.error('[AuthEnhanced] Auto token refresh error:', error);
                }
            }
        }, AUTH_CONFIG.TOKEN_REFRESH_INTERVAL);
    }
    
    // Set up persistence checker
    function setupPersistenceChecker() {
        if (authState.persistenceCheckInterval) {
            clearInterval(authState.persistenceCheckInterval);
        }
        
        authState.persistenceCheckInterval = setInterval(() => {
            const user = firebase.auth().currentUser;
            const storedAuth = getStoredAuthState();
            
            if (user && !storedAuth) {
                // User is authenticated but state not stored
                console.log('[AuthEnhanced] Restoring missing auth state');
                storeAuthState(user);
            } else if (!user && storedAuth && (Date.now() - storedAuth.lastAuth < 3600000)) {
                // No user but recent auth state exists
                console.log('[AuthEnhanced] Detected auth state mismatch');
                attemptAuthRestore();
            }
        }, AUTH_CONFIG.PERSISTENCE_CHECK_INTERVAL);
    }
    
    // Enhanced error handler
    function handleAuthError(error) {
        console.error('[AuthEnhanced] Auth error:', error);
        
        const errorData = {
            code: error.code || 'unknown',
            message: error.message || 'Unknown error',
            timestamp: Date.now()
        };
        
        // Store error for debugging
        try {
            const errors = JSON.parse(localStorage.getItem('pyebwaAuthErrors') || '[]');
            errors.push(errorData);
            localStorage.setItem('pyebwaAuthErrors', JSON.stringify(errors.slice(-10)));
        } catch (e) {}
        
        // Emit error event
        window.dispatchEvent(new CustomEvent('pyebwaAuthError', { detail: errorData }));
        
        // Handle specific errors
        switch (error.code) {
            case 'auth/network-request-failed':
                console.log('[AuthEnhanced] Network error - will retry');
                setTimeout(() => attemptAuthRestore(), 5000);
                break;
            case 'auth/user-token-expired':
                console.log('[AuthEnhanced] Token expired - refreshing');
                if (firebase.auth().currentUser) {
                    firebase.auth().currentUser.getIdToken(true);
                }
                break;
            default:
                // For other errors, clear auth state if severe
                if (error.code && error.code.includes('auth/')) {
                    clearAuthState();
                }
        }
    }
    
    // Public API
    window.pyebwaAuth = {
        initialize: initializeAuth,
        getAuthState: () => ({
            user: firebase.auth().currentUser,
            isAuthenticated: !!firebase.auth().currentUser,
            ...authState
        }),
        refreshToken: async () => {
            const user = firebase.auth().currentUser;
            if (user) {
                return await user.getIdToken(true);
            }
            return null;
        },
        signOut: async () => {
            try {
                await firebase.auth().signOut();
                clearAuthState();
                console.log('[AuthEnhanced] Signed out successfully');
            } catch (error) {
                console.error('[AuthEnhanced] Sign out error:', error);
                throw error;
            }
        }
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAuth);
    } else {
        initializeAuth();
    }
    
})();