// Social Authentication Handler for Pyebwa
(function() {
    'use strict';
    
    console.log('[SocialAuth] Initializing social authentication module');
    
    // Configuration
    const SOCIAL_CONFIG = {
        providers: {
            google: {
                name: 'Google',
                icon: 'google',
                color: '#4285F4',
                scope: ['email', 'profile', 'https://www.googleapis.com/auth/photoslibrary.readonly']
            },
            facebook: {
                name: 'Facebook',
                icon: 'facebook',
                color: '#1877F2',
                scope: ['email', 'public_profile', 'user_photos', 'user_birthday']
            }
        },
        defaultProfilePhoto: '/app/images/default-avatar.svg'
    };
    
    // Social Authentication Manager
    class SocialAuthManager {
        constructor() {
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.currentProvider = null;
            this.isProcessing = false;
        }
        
        // Initialize social auth providers
        async initialize() {
            try {
                // Set up Google provider
                this.googleProvider = new firebase.auth.GoogleAuthProvider();
                SOCIAL_CONFIG.providers.google.scope.forEach(scope => {
                    if (!scope.includes('googleapis')) {
                        this.googleProvider.addScope(scope);
                    }
                });
                this.googleProvider.setCustomParameters({
                    'prompt': 'select_account',
                    'access_type': 'offline'
                });
                
                // Set up Facebook provider
                this.facebookProvider = new firebase.auth.FacebookAuthProvider();
                SOCIAL_CONFIG.providers.facebook.scope.forEach(scope => {
                    this.facebookProvider.addScope(scope);
                });
                this.facebookProvider.setCustomParameters({
                    'display': 'popup',
                    'auth_type': 'rerequest'
                });
                
                console.log('[SocialAuth] Providers initialized');
                
                // Set up auth state observer
                this.setupAuthObserver();
                
                // Check for redirect result
                await this.checkRedirectResult();
                
            } catch (error) {
                console.error('[SocialAuth] Initialization error:', error);
                throw error;
            }
        }
        
        // Set up authentication state observer
        setupAuthObserver() {
            this.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('[SocialAuth] User authenticated:', user.email);
                    
                    // Check if this is a social login
                    const provider = user.providerData[0]?.providerId;
                    if (provider && provider !== 'password') {
                        await this.handleSocialUser(user, provider);
                    }
                }
            });
        }
        
        // Check for redirect result (for mobile compatibility)
        async checkRedirectResult() {
            try {
                const result = await this.auth.getRedirectResult();
                if (result.user) {
                    console.log('[SocialAuth] Redirect login successful');
                    await this.processSocialLogin(result);
                }
            } catch (error) {
                console.error('[SocialAuth] Redirect result error:', error);
                this.handleAuthError(error);
            }
        }
        
        // Sign in with Google
        async signInWithGoogle(useRedirect = false) {
            if (this.isProcessing) return;
            
            this.isProcessing = true;
            this.currentProvider = 'google';
            
            try {
                console.log('[SocialAuth] Starting Google sign-in');
                
                let result;
                if (useRedirect || this.isMobileDevice()) {
                    // Use redirect for mobile devices
                    await this.auth.signInWithRedirect(this.googleProvider);
                    return; // Will be handled by checkRedirectResult
                } else {
                    // Use popup for desktop
                    result = await this.auth.signInWithPopup(this.googleProvider);
                }
                
                await this.processSocialLogin(result);
                
            } catch (error) {
                console.error('[SocialAuth] Google sign-in error:', error);
                this.handleAuthError(error);
            } finally {
                this.isProcessing = false;
            }
        }
        
        // Sign in with Facebook
        async signInWithFacebook(useRedirect = false) {
            if (this.isProcessing) return;
            
            this.isProcessing = true;
            this.currentProvider = 'facebook';
            
            try {
                console.log('[SocialAuth] Starting Facebook sign-in');
                
                let result;
                if (useRedirect || this.isMobileDevice()) {
                    // Use redirect for mobile devices
                    await this.auth.signInWithRedirect(this.facebookProvider);
                    return; // Will be handled by checkRedirectResult
                } else {
                    // Use popup for desktop
                    result = await this.auth.signInWithPopup(this.facebookProvider);
                }
                
                await this.processSocialLogin(result);
                
            } catch (error) {
                console.error('[SocialAuth] Facebook sign-in error:', error);
                this.handleAuthError(error);
            } finally {
                this.isProcessing = false;
            }
        }
        
        // Process social login result
        async processSocialLogin(result) {
            try {
                const user = result.user;
                const credential = result.credential;
                const additionalUserInfo = result.additionalUserInfo;
                
                console.log('[SocialAuth] Processing social login for:', user.email);
                
                // Extract profile information
                const profile = additionalUserInfo?.profile || {};
                const isNewUser = additionalUserInfo?.isNewUser || false;
                
                // Store access token for API access (if needed)
                if (credential?.accessToken) {
                    sessionStorage.setItem(`${this.currentProvider}_access_token`, credential.accessToken);
                }
                
                // Create or update user profile
                const userData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || profile.name || '',
                    photoURL: user.photoURL || profile.picture || SOCIAL_CONFIG.defaultProfilePhoto,
                    provider: this.currentProvider,
                    providers: user.providerData.map(p => p.providerId),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    profile: {
                        ...profile,
                        socialConnections: {
                            [this.currentProvider]: {
                                id: profile.id || user.uid,
                                connected: true,
                                connectedAt: firebase.firestore.FieldValue.serverTimestamp()
                            }
                        }
                    }
                };
                
                // If new user, create profile
                if (isNewUser) {
                    userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    userData.familyTreeId = null; // Will be created on first tree creation
                    
                    // Extract additional info based on provider
                    if (this.currentProvider === 'google') {
                        userData.profile.locale = profile.locale;
                    } else if (this.currentProvider === 'facebook') {
                        userData.profile.locale = profile.locale;
                        if (profile.birthday) {
                            userData.profile.birthday = profile.birthday;
                        }
                    }
                }
                
                // Save to Firestore
                await this.saveUserData(userData, isNewUser);
                
                // Emit success event
                window.dispatchEvent(new CustomEvent('socialAuthSuccess', {
                    detail: {
                        user: userData,
                        provider: this.currentProvider,
                        isNewUser
                    }
                }));
                
                // Redirect to app or onboarding
                setTimeout(() => {
                    if (isNewUser) {
                        window.location.href = '/app/?onboarding=true';
                    } else {
                        window.location.href = '/app/';
                    }
                }, 1000);
                
            } catch (error) {
                console.error('[SocialAuth] Processing error:', error);
                throw error;
            }
        }
        
        // Handle social user (for existing sessions)
        async handleSocialUser(user, provider) {
            try {
                // Update last login
                const userRef = this.db.collection('users').doc(user.uid);
                await userRef.update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    'profile.lastProvider': provider
                });
                
                console.log('[SocialAuth] Updated social user login time');
                
            } catch (error) {
                console.error('[SocialAuth] Error handling social user:', error);
            }
        }
        
        // Save user data to Firestore
        async saveUserData(userData, isNewUser) {
            try {
                const userRef = this.db.collection('users').doc(userData.uid);
                
                if (isNewUser) {
                    await userRef.set(userData);
                    console.log('[SocialAuth] Created new user profile');
                } else {
                    // Update existing user
                    await userRef.set(userData, { merge: true });
                    console.log('[SocialAuth] Updated existing user profile');
                }
                
            } catch (error) {
                console.error('[SocialAuth] Error saving user data:', error);
                throw error;
            }
        }
        
        // Link existing account with social provider
        async linkWithProvider(provider) {
            try {
                const user = this.auth.currentUser;
                if (!user) {
                    throw new Error('No authenticated user');
                }
                
                let authProvider;
                if (provider === 'google') {
                    authProvider = this.googleProvider;
                } else if (provider === 'facebook') {
                    authProvider = this.facebookProvider;
                } else {
                    throw new Error('Invalid provider');
                }
                
                const result = await user.linkWithPopup(authProvider);
                console.log('[SocialAuth] Account linked successfully');
                
                // Update user profile with new provider
                await this.updateSocialConnection(user.uid, provider, result.additionalUserInfo?.profile);
                
                return result;
                
            } catch (error) {
                console.error('[SocialAuth] Link error:', error);
                throw error;
            }
        }
        
        // Unlink social provider
        async unlinkProvider(provider) {
            try {
                const user = this.auth.currentUser;
                if (!user) {
                    throw new Error('No authenticated user');
                }
                
                // Check if user has other auth methods
                if (user.providerData.length <= 1) {
                    throw new Error('Cannot unlink the only authentication method');
                }
                
                await user.unlink(provider);
                console.log('[SocialAuth] Provider unlinked successfully');
                
                // Update user profile
                await this.removeSocialConnection(user.uid, provider);
                
            } catch (error) {
                console.error('[SocialAuth] Unlink error:', error);
                throw error;
            }
        }
        
        // Update social connection in user profile
        async updateSocialConnection(uid, provider, profile = {}) {
            try {
                const userRef = this.db.collection('users').doc(uid);
                
                const updateData = {
                    [`profile.socialConnections.${provider}`]: {
                        id: profile.id || provider,
                        connected: true,
                        connectedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        profile: profile
                    }
                };
                
                await userRef.update(updateData);
                console.log('[SocialAuth] Social connection updated');
                
            } catch (error) {
                console.error('[SocialAuth] Error updating social connection:', error);
                throw error;
            }
        }
        
        // Remove social connection from user profile
        async removeSocialConnection(uid, provider) {
            try {
                const userRef = this.db.collection('users').doc(uid);
                
                await userRef.update({
                    [`profile.socialConnections.${provider}`]: firebase.firestore.FieldValue.delete()
                });
                
                console.log('[SocialAuth] Social connection removed');
                
            } catch (error) {
                console.error('[SocialAuth] Error removing social connection:', error);
                throw error;
            }
        }
        
        // Get access token for API calls
        getAccessToken(provider) {
            return sessionStorage.getItem(`${provider}_access_token`);
        }
        
        // Check if device is mobile
        isMobileDevice() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }
        
        // Handle authentication errors
        handleAuthError(error) {
            let message = 'Authentication failed. Please try again.';
            
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    message = 'Sign-in popup was closed. Please try again.';
                    break;
                case 'auth/cancelled-popup-request':
                    message = 'Another sign-in popup is already open.';
                    break;
                case 'auth/popup-blocked':
                    message = 'Sign-in popup was blocked. Please allow popups for this site.';
                    break;
                case 'auth/account-exists-with-different-credential':
                    message = 'An account already exists with the same email but different sign-in credentials. Try signing in with a different method.';
                    break;
                case 'auth/network-request-failed':
                    message = 'Network error. Please check your connection and try again.';
                    break;
                case 'auth/too-many-requests':
                    message = 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/user-disabled':
                    message = 'This account has been disabled.';
                    break;
                case 'auth/operation-not-allowed':
                    message = 'This sign-in method is not enabled. Please contact support.';
                    break;
            }
            
            // Emit error event
            window.dispatchEvent(new CustomEvent('socialAuthError', {
                detail: {
                    code: error.code,
                    message: message,
                    provider: this.currentProvider
                }
            }));
            
            this.isProcessing = false;
        }
    }
    
    // Create and export singleton instance
    window.socialAuth = new SocialAuthManager();
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.socialAuth.initialize();
        });
    } else {
        window.socialAuth.initialize();
    }
    
})();