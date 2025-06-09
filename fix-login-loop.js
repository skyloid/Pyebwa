// Login Loop Fix for rasin.pyebwa.com/app/js/app.js

// This script fixes the login loop issue by:
// 1. Correcting the redirect URL when not authenticated
// 2. Improving auth state detection timing
// 3. Adding better error handling

// The main fix is changing line 189 from:
// window.location.href = 'https://www.pyebwa.com';
// To:
// window.location.href = 'https://secure.pyebwa.com/?redirect=' + encodeURIComponent(window.location.href);

// Here's the corrected initializeAuth function:

function initializeAuth() {
    // Debug logging to localStorage (persists across redirects)
    const log = (msg) => {
        console.log(msg);
        const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
        logs.push(`${new Date().toISOString()}: ${msg}`);
        localStorage.setItem('pyebwaDebugLogs', JSON.stringify(logs.slice(-20))); // Keep last 20 logs
    };
    
    log('=== App initialization started ===');
    
    // Show loading state
    showLoadingState();
    
    // Check if coming from login
    const urlParams = new URLSearchParams(window.location.search);
    const fromLogin = urlParams.get('login');
    const authSuccess = urlParams.get('auth');
    const authToken = urlParams.get('token');
    log(`From login: ${fromLogin}, Auth success: ${authSuccess}, Token: ${authToken ? 'present' : 'none'}`);
    
    // IMPORTANT: Don't redirect immediately - always wait for auth state
    let hasCheckedAuth = false;
    
    // If we have a token, try to sign in with it first
    if (authToken) {
        log('Attempting to sign in with token...');
        (async () => {
            try {
                // The token is already an ID token from the other domain
                // We need to verify it and sign in the user
                const credential = firebase.auth.GoogleAuthProvider.credential(null, authToken);
                await auth.signInWithCredential(credential);
                log('Successfully signed in with token');
            } catch (error) {
                log(`Token sign-in failed: ${error.message}`);
                // Token might be for a different provider or invalid
                // Continue with normal auth flow
            }
        })();
    }
    
    // First, check current auth state
    log(`Current auth user: ${auth.currentUser ? auth.currentUser.email : 'null'}`);
    
    // Set auth state listener with proper error handling
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
        log(`Auth state changed: ${user ? user.email : 'No user'}`);
        hasCheckedAuth = true;
        
        if (user) {
            // User is authenticated
            log('User authenticated successfully');
            currentUser = user;
            document.querySelector('.user-email').textContent = user.email;
            
            try {
                // Get or create user's family tree
                await initializeUserFamilyTree();
                
                // Hide loading and show main view
                hideLoadingState();
                showView('tree');
                
                // Clean URL
                if (fromLogin) {
                    window.history.replaceState({}, document.title, '/app/');
                }
                
                log('App initialized successfully');
            } catch (error) {
                log(`Error initializing app: ${error.message}`);
                console.error('Error initializing app:', error);
                hideLoadingState();
                showError('Error loading your family tree. Please try again.');
            }
        } else {
            // No user authenticated
            log('No user authenticated');
            
            if (fromLogin || authSuccess === 'success') {
                // Just came from login, wait longer
                log('User just logged in - waiting for auth to sync...');
                showLoadingState('Completing login...');
                
                // Give Firebase more time to sync auth state across domains
                let authCheckCount = 0;
                const maxChecks = 20; // Increased from 10 to 20
                const checkInterval = 1500; // Increased from 1000ms to 1500ms
                
                const checkAuthInterval = setInterval(() => {
                    authCheckCount++;
                    log(`Auth check ${authCheckCount}/${maxChecks}: ${auth.currentUser ? 'User found' : 'No user yet'}`);
                    
                    if (auth.currentUser) {
                        // User is authenticated, stop checking
                        clearInterval(checkAuthInterval);
                        log('Authentication successful!');
                    } else if (authCheckCount >= maxChecks) {
                        // Max checks reached, redirect to login
                        clearInterval(checkAuthInterval);
                        log('Auth sync timeout - redirecting to login');
                        
                        // For debugging, show what happened
                        const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
                        console.log('Debug logs:', logs);
                        
                        // FIX: Redirect to secure.pyebwa.com for login
                        window.location.href = 'https://secure.pyebwa.com/?redirect=' + encodeURIComponent(window.location.href);
                    }
                }, checkInterval); // Check every 1.5 seconds
            } else {
                // Not from login
                log('Not from login - checking if should redirect');
                
                // Wait a bit to ensure auth state is final
                setTimeout(() => {
                    if (!auth.currentUser) {
                        log('No auth and not from login - redirecting to login');
                        
                        // FIX: Redirect to secure.pyebwa.com instead of www.pyebwa.com
                        // This prevents the login loop
                        window.location.href = 'https://secure.pyebwa.com/?redirect=' + encodeURIComponent(window.location.href);
                        
                        // Show debug info
                        const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
                        console.log('Debug logs:', logs);
                    }
                }, 3000); // Increased from 2000ms to 3000ms
            }
        }
    }, (error) => {
        // Auth error
        log(`Auth error: ${error.message}`);
        console.error('Auth error:', error);
        hideLoadingState();
        showError('Authentication error. Please login again.');
    });
}