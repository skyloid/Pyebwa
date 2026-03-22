// Emergency Authentication Fix
// Handles critical authentication issues and recovery

(function() {
    'use strict';
    
    console.log('[AuthEmergencyFix] Loading emergency authentication fixes');
    
    const EmergencyFix = {
        retryCount: 0,
        maxRetries: 3,
        
        init() {
            this.checkAuthState();
            this.fixAuthLoops();
            this.setupRecoveryMechanisms();
            console.log('[AuthEmergencyFix] Emergency fixes initialized');
        },
        
        checkAuthState() {
            // Check for auth initialization issues
            if (!window.firebase) {
                console.warn('[AuthEmergencyFix] Firebase not loaded, scheduling retry');
                if (this.retryCount < this.maxRetries) {
                    this.retryCount++;
                    setTimeout(() => this.init(), 2000);
                }
                return false;
            }
            
            // Verify auth module
            if (!firebase.auth) {
                console.error('[AuthEmergencyFix] Firebase Auth module missing');
                this.loadAuthModule();
                return false;
            }
            
            return true;
        },
        
        fixAuthLoops() {
            // Prevent infinite auth redirect loops
            const urlParams = new URLSearchParams(window.location.search);
            const authError = urlParams.get('authError');
            
            if (authError) {
                console.log('[AuthEmergencyFix] Auth error detected in URL:', authError);
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Handle specific errors
                this.handleAuthError(authError);
            }
            
            // Check for rapid redirects
            this.checkRedirectLoop();
        },
        
        checkRedirectLoop() {
            const redirectKey = 'auth_redirect_count';
            const redirectTimestamp = 'auth_redirect_timestamp';
            const now = Date.now();
            
            let count = parseInt(sessionStorage.getItem(redirectKey) || '0');
            const lastRedirect = parseInt(sessionStorage.getItem(redirectTimestamp) || '0');
            
            // Reset count if more than 5 minutes have passed
            if (now - lastRedirect > 300000) {
                count = 0;
            }
            
            // Check for loop
            if (count > 5) {
                console.error('[AuthEmergencyFix] Redirect loop detected, breaking loop');
                sessionStorage.removeItem(redirectKey);
                sessionStorage.removeItem(redirectTimestamp);
                
                // Clear auth state
                if (firebase.auth) {
                    firebase.auth().signOut().catch(() => {});
                }
                
                // Show error message
                this.showEmergencyMessage('Authentication loop detected. Please clear your browser cache and try again.');
                return true;
            }
            
            // Update count for auth pages
            if (window.location.pathname.includes('login') || window.location.pathname.includes('auth')) {
                sessionStorage.setItem(redirectKey, (count + 1).toString());
                sessionStorage.setItem(redirectTimestamp, now.toString());
            }
            
            return false;
        },
        
        setupRecoveryMechanisms() {
            // Add emergency logout button
            this.addEmergencyLogout();
            
            // Monitor for auth errors
            if (window.firebase && firebase.auth) {
                const auth = firebase.auth();
                
                // Override signIn methods to add error handling
                const originalSignIn = auth.signInWithEmailAndPassword;
                auth.signInWithEmailAndPassword = async function(...args) {
                    try {
                        return await originalSignIn.apply(auth, args);
                    } catch (error) {
                        console.error('[AuthEmergencyFix] Sign in error:', error);
                        EmergencyFix.handleAuthError(error.code);
                        throw error;
                    }
                };
            }
        },
        
        handleAuthError(errorCode) {
            const criticalErrors = ['auth/web-storage-unsupported', 'auth/operation-not-supported-in-this-environment'];
            
            if (criticalErrors.includes(errorCode)) {
                this.showEmergencyMessage('Critical authentication error. Some features may not work properly.');
                
                // Try to use memory storage as fallback
                this.setupMemoryStorage();
            }
        },
        
        setupMemoryStorage() {
            console.log('[AuthEmergencyFix] Setting up memory storage fallback');
            
            if (!window.memoryStorage) {
                window.memoryStorage = {
                    data: {},
                    getItem(key) { return this.data[key] || null; },
                    setItem(key, value) { this.data[key] = value; },
                    removeItem(key) { delete this.data[key]; },
                    clear() { this.data = {}; }
                };
            }
            
            // Override localStorage if not available
            if (!window.localStorage) {
                window.localStorage = window.memoryStorage;
            }
        },
        
        addEmergencyLogout() {
            // Add keyboard shortcut for emergency logout (Ctrl+Shift+L)
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && e.key === 'L') {
                    console.log('[AuthEmergencyFix] Emergency logout triggered');
                    this.emergencyLogout();
                }
            });
        },
        
        async emergencyLogout() {
            try {
                // Clear all auth data
                if (firebase.auth) {
                    await firebase.auth().signOut();
                }
                
                // Clear storage
                ['localStorage', 'sessionStorage'].forEach(storage => {
                    if (window[storage]) {
                        const keysToRemove = [];
                        for (let i = 0; i < window[storage].length; i++) {
                            const key = window[storage].key(i);
                            if (key && (key.includes('firebase') || key.includes('auth'))) {
                                keysToRemove.push(key);
                            }
                        }
                        keysToRemove.forEach(key => window[storage].removeItem(key));
                    }
                });
                
                // Clear cookies
                document.cookie.split(";").forEach((c) => {
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
                
                // Redirect to home
                window.location.href = '/';
            } catch (error) {
                console.error('[AuthEmergencyFix] Emergency logout error:', error);
                // Force redirect anyway
                window.location.href = '/';
            }
        },
        
        showEmergencyMessage(message) {
            const div = document.createElement('div');
            div.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #ff6b6b;
                color: white;
                padding: 15px 25px;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 10000;
                font-family: Arial, sans-serif;
            `;
            div.textContent = message;
            document.body.appendChild(div);
            
            setTimeout(() => div.remove(), 10000);
        },
        
        loadAuthModule() {
            // Attempt to load auth module if missing
            const script = document.createElement('script');
            script.src = 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js';
            script.onload = () => {
                console.log('[AuthEmergencyFix] Auth module loaded');
                this.init();
            };
            script.onerror = () => {
                console.error('[AuthEmergencyFix] Failed to load auth module');
            };
            document.head.appendChild(script);
        }
    };
    
    // Initialize emergency fixes
    EmergencyFix.init();
    window.AuthEmergencyFix = EmergencyFix;
    
})();