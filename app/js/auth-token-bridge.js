// Auth Token Bridge - Handles cross-domain authentication
console.log('[Auth Token Bridge] Initializing...');

(function() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get('token');
    const authSuccess = urlParams.get('auth');
    const fromLogin = urlParams.get('login');
    
    console.log('[Auth Token Bridge] URL params:', {
        token: authToken ? 'present' : 'missing',
        auth: authSuccess,
        login: fromLogin
    });
    
    // If we have a token, try to authenticate with it
    if (authToken && (authSuccess === 'success' || fromLogin === 'true')) {
        console.log('[Auth Token Bridge] Token received, attempting authentication...');
        
        // Store token temporarily
        sessionStorage.setItem('pyebwaAuthToken', authToken);
        
        // Clean URL immediately
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        // Wait for Firebase to load
        const checkFirebase = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                clearInterval(checkFirebase);
                
                console.log('[Auth Token Bridge] Firebase loaded, signing in with token...');
                
                // Sign in with custom token
                firebase.auth().signInWithCustomToken(authToken)
                    .then((result) => {
                        console.log('[Auth Token Bridge] Successfully authenticated with token');
                        sessionStorage.removeItem('pyebwaAuthToken');
                        
                        // Set a flag to indicate successful auth
                        sessionStorage.setItem('pyebwaJustAuthenticated', 'true');
                        
                        // Dispatch a custom event instead of reloading
                        window.dispatchEvent(new CustomEvent('pyebwaAuthSuccess', { 
                            detail: { user: result.user }
                        }));
                        
                        // Only reload if absolutely necessary (let app.js handle it)
                        // window.location.reload();
                    })
                    .catch((error) => {
                        console.error('[Auth Token Bridge] Token authentication failed:', error);
                        
                        // Try email link authentication as fallback
                        if (error.code === 'auth/invalid-custom-token') {
                            console.log('[Auth Token Bridge] Trying email link authentication...');
                            
                            // Construct sign-in link
                            const signInUrl = window.location.href;
                            
                            if (firebase.auth().isSignInWithEmailLink(signInUrl)) {
                                // Get email from storage or prompt
                                let email = window.localStorage.getItem('emailForSignIn');
                                
                                if (!email) {
                                    email = window.prompt('Please provide your email for confirmation');
                                }
                                
                                firebase.auth().signInWithEmailLink(email, signInUrl)
                                    .then((result) => {
                                        console.log('[Auth Token Bridge] Email link auth successful');
                                        window.localStorage.removeItem('emailForSignIn');
                                        window.location.reload();
                                    })
                                    .catch((error) => {
                                        console.error('[Auth Token Bridge] Email link auth failed:', error);
                                    });
                            }
                        }
                        
                        sessionStorage.removeItem('pyebwaAuthToken');
                    });
            }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(checkFirebase);
            console.error('[Auth Token Bridge] Timeout waiting for Firebase');
        }, 10000);
    } else if ((authSuccess === 'success' || fromLogin === 'true') && !authToken) {
        // We have auth success but no token - this might be a cookie-based auth
        console.log('[Auth Token Bridge] Auth success without token - checking Firebase auth state...');
        
        // Wait for Firebase to initialize and check if user is already authenticated
        const checkAuthState = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().onAuthStateChanged((user) => {
                    clearInterval(checkAuthState);
                    if (user) {
                        console.log('[Auth Token Bridge] User already authenticated via session:', user.email);
                        // Dispatch success event
                        window.dispatchEvent(new CustomEvent('pyebwaAuthSuccess', { 
                            detail: { user: user }
                        }));
                    } else {
                        console.log('[Auth Token Bridge] No authenticated user found despite auth success flag');
                        // Set a flag to prevent redirect loops
                        sessionStorage.setItem('pyebwaAuthAttempted', 'true');
                    }
                });
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(checkAuthState);
        }, 5000);
    }
    
    // Alternative: Check for auth state in sessionStorage
    const authState = sessionStorage.getItem('pyebwaAuth');
    if (authState && !authToken) {
        console.log('[Auth Token Bridge] Found auth state in session storage');
        
        try {
            const authData = JSON.parse(authState);
            console.log('[Auth Token Bridge] Auth data:', { email: authData.email, uid: authData.uid });
            
            // Wait for Firebase and try to restore session
            const waitForAuth = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.auth) {
                    const currentUser = firebase.auth().currentUser;
                    
                    if (!currentUser) {
                        console.log('[Auth Token Bridge] No current user, auth state may need manual restoration');
                        
                        // Set flag for app.js to handle
                        window.needsAuthRestore = true;
                        window.authRestoreData = authData;
                    } else {
                        console.log('[Auth Token Bridge] User already authenticated:', currentUser.email);
                    }
                    
                    clearInterval(waitForAuth);
                }
            }, 100);
            
            // Clear after 5 seconds
            setTimeout(() => {
                clearInterval(waitForAuth);
            }, 5000);
            
        } catch (e) {
            console.error('[Auth Token Bridge] Failed to parse auth state:', e);
        }
    }
})();

// Helper function to manually trigger auth check
window.checkAuthBridge = function() {
    const token = sessionStorage.getItem('pyebwaAuthToken');
    const authState = sessionStorage.getItem('pyebwaAuth');
    
    console.log('[Auth Token Bridge] Manual check:');
    console.log('- Token:', token ? 'Present' : 'None');
    console.log('- Auth State:', authState ? 'Present' : 'None');
    console.log('- Firebase User:', firebase.auth().currentUser ? firebase.auth().currentUser.email : 'None');
    
    return {
        hasToken: !!token,
        hasAuthState: !!authState,
        currentUser: firebase.auth().currentUser
    };
};