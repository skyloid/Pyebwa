// Enhanced Authentication Module - Supabase-based
(function() {
    'use strict';

    console.log('[AuthEnhanced] Loading enhanced authentication module');

    const AuthEnhanced = {
        currentUser: null,
        authStateListeners: [],

        async init() {
            await this.checkSession();
            this.setupErrorHandling();
            this.setupSupabaseListener();
            console.log('[AuthEnhanced] Enhanced authentication initialized');
        },

        async checkSession() {
            try {
                const client = window.supabaseClient;
                if (!client) {
                    this.currentUser = null;
                    this.notifyListeners('unauthenticated', null);
                    return;
                }

                const { data: { session } } = await client.auth.getSession();
                if (session) {
                    this.currentUser = {
                        uid: session.user.id,
                        email: session.user.email,
                        displayName: session.user.user_metadata?.display_name || '',
                        role: session.user.user_metadata?.role || 'member'
                    };
                    console.log('[AuthEnhanced] User authenticated:', session.user.email);
                    this.notifyListeners('authenticated', this.currentUser);
                } else {
                    this.currentUser = null;
                    console.log('[AuthEnhanced] User not authenticated');
                    this.notifyListeners('unauthenticated', null);
                }
            } catch (error) {
                console.error('[AuthEnhanced] Session check error:', error);
                this.currentUser = null;
                this.notifyListeners('unauthenticated', null);
            }
        },

        setupSupabaseListener() {
            const client = window.supabaseClient;
            if (!client) return;

            client.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_OUT') {
                    this.currentUser = null;
                    this.notifyListeners('unauthenticated', null);
                } else if (session) {
                    this.currentUser = {
                        uid: session.user.id,
                        email: session.user.email,
                        displayName: session.user.user_metadata?.display_name || '',
                        role: session.user.user_metadata?.role || 'member'
                    };
                    this.notifyListeners('authenticated', this.currentUser);
                }
            });
        },

        setupErrorHandling() {
            window.addEventListener('unhandledrejection', (event) => {
                if (event.reason && event.reason.message && event.reason.message.includes('Authentication required')) {
                    console.error('[AuthEnhanced] Auth error caught:', event.reason);
                    this.handleAuthError('session_expired');
                    event.preventDefault();
                }
            });
        },

        handleAuthError(errorCode) {
            const errorMessages = {
                'session_expired': 'Session expired. Please sign in again.',
                'network_error': 'Network error. Please check your connection.',
                'invalid_credentials': 'Invalid email or password.',
                'account_disabled': 'This account has been disabled.'
            };
            const message = errorMessages[errorCode] || 'Authentication error occurred.';
            this.notifyListeners('error', { code: errorCode, message });
        },

        addAuthStateListener(callback) {
            this.authStateListeners.push(callback);
            if (this.currentUser !== undefined) {
                callback(this.currentUser ? 'authenticated' : 'unauthenticated', this.currentUser);
            }
        },

        notifyListeners(event, data) {
            this.authStateListeners.forEach(callback => {
                try { callback(event, data); } catch (error) {
                    console.error('[AuthEnhanced] Error in auth state listener:', error);
                }
            });
        },

        async signOut() {
            try {
                const client = window.supabaseClient;
                if (client) await client.auth.signOut();
                this.currentUser = null;
                this.notifyListeners('unauthenticated', null);
                console.log('[AuthEnhanced] User signed out successfully');
            } catch (error) {
                console.error('[AuthEnhanced] Sign out error:', error);
                throw error;
            }
        },

        async getCurrentUser(forceRefresh = false) {
            if (!forceRefresh && this.currentUser) return this.currentUser;
            await this.checkSession();
            return this.currentUser;
        }
    };

    AuthEnhanced.init();
    window.AuthEnhanced = AuthEnhanced;
})();
