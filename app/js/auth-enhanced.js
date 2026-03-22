// Enhanced Authentication Module
// Provides additional authentication features and fixes

(function() {
    'use strict';
    
    console.log('[AuthEnhanced] Loading enhanced authentication module');
    
    // Check if Firebase is loaded
    if (!window.firebase || !window.firebase.auth) {
        console.error('[AuthEnhanced] Firebase not loaded. Retrying in 1 second...');
        setTimeout(arguments.callee, 1000);
        return;
    }
    
    const auth = firebase.auth();
    
    // Enhanced auth state management
    const AuthEnhanced = {
        currentUser: null,
        authStateListeners: [],
        
        init() {
            this.setupAuthStateListener();
            this.enhanceAuthPersistence();
            this.setupErrorHandling();
            console.log('[AuthEnhanced] Enhanced authentication initialized');
        },
        
        setupAuthStateListener() {
            auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                
                if (user) {
                    console.log('[AuthEnhanced] User authenticated:', user.email);
                    this.notifyListeners('authenticated', user);
                } else {
                    console.log('[AuthEnhanced] User not authenticated');
                    this.notifyListeners('unauthenticated', null);
                }
            });
        },
        
        enhanceAuthPersistence() {
            // Ensure auth persistence is properly set
            auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((error) => {
                console.error('[AuthEnhanced] Error setting persistence:', error);
            });
        },
        
        setupErrorHandling() {
            // Global error handler for auth operations
            window.addEventListener('unhandledrejection', (event) => {
                if (event.reason && event.reason.code && event.reason.code.startsWith('auth/')) {
                    console.error('[AuthEnhanced] Auth error caught:', event.reason);
                    this.handleAuthError(event.reason);
                    event.preventDefault();
                }
            });
        },
        
        handleAuthError(error) {
            const errorMessages = {
                'auth/network-request-failed': 'Network error. Please check your connection.',
                'auth/too-many-requests': 'Too many requests. Please try again later.',
                'auth/user-token-expired': 'Session expired. Please sign in again.',
                'auth/invalid-email': 'Invalid email address.',
                'auth/user-disabled': 'This account has been disabled.',
                'auth/user-not-found': 'User not found.',
                'auth/wrong-password': 'Incorrect password.'
            };
            
            const message = errorMessages[error.code] || 'Authentication error occurred.';
            this.notifyListeners('error', { code: error.code, message });
        },
        
        addAuthStateListener(callback) {
            this.authStateListeners.push(callback);
            // Immediately notify with current state
            if (this.currentUser !== undefined) {
                callback(this.currentUser ? 'authenticated' : 'unauthenticated', this.currentUser);
            }
        },
        
        notifyListeners(event, data) {
            this.authStateListeners.forEach(callback => {
                try {
                    callback(event, data);
                } catch (error) {
                    console.error('[AuthEnhanced] Error in auth state listener:', error);
                }
            });
        },
        
        // Enhanced sign out with cleanup
        async signOut() {
            try {
                await auth.signOut();
                // Clear any cached data
                if (window.localStorage) {
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && (key.startsWith('firebase:') || key.startsWith('user:'))) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => localStorage.removeItem(key));
                }
                console.log('[AuthEnhanced] User signed out successfully');
            } catch (error) {
                console.error('[AuthEnhanced] Sign out error:', error);
                throw error;
            }
        },
        
        // Get current user with token refresh
        async getCurrentUser(forceRefresh = false) {
            const user = auth.currentUser;
            if (!user) return null;
            
            try {
                if (forceRefresh) {
                    await user.getIdToken(true);
                }
                return user;
            } catch (error) {
                console.error('[AuthEnhanced] Error refreshing token:', error);
                if (error.code === 'auth/user-token-expired') {
                    await this.signOut();
                }
                return null;
            }
        }
    };
    
    // Initialize and expose globally
    AuthEnhanced.init();
    window.AuthEnhanced = AuthEnhanced;
    
})();