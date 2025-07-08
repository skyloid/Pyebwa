// Simplified Authentication Handler for Pyebwa
// Removes complex redirect loop prevention and device-specific workarounds

(function() {
    'use strict';
    
    console.log('[AuthSimple] Initializing simplified authentication');
    
    // Configuration
    const AUTH_CONFIG = {
        LOGIN_URL: '/login.html',
        APP_URL: '/app/',
        LANDING_URL: '/',
        SESSION_TIMEOUT: 3600000 // 1 hour
    };
    
    // Initialize authentication
    function initializeAuth() {
        if (!window.firebase || !window.firebase.auth) {
            console.error('[AuthSimple] Firebase not initialized');
            setTimeout(initializeAuth, 100);
            return;
        }
        
        // Set up auth state listener
        firebase.auth().onAuthStateChanged(handleAuthStateChange);
    }
    
    // Handle authentication state changes
    function handleAuthStateChange(user) {
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.includes('login.html') || currentPath.includes('signup.html');
        const isAppPage = currentPath.startsWith('/app');
        
        console.log('[AuthSimple] Auth state changed:', {
            user: user ? user.email : null,
            currentPath,
            isAuthPage,
            isAppPage
        });
        
        if (user) {
            // User is signed in
            handleSignedInUser(user, isAuthPage, isAppPage);
        } else {
            // User is signed out
            handleSignedOutUser(isAuthPage, isAppPage);
        }
    }
    
    // Handle signed-in user
    function handleSignedInUser(user, isAuthPage, isAppPage) {
        // Store user info
        window.currentUser = user;
        
        // If on auth page, redirect to app
        if (isAuthPage) {
            console.log('[AuthSimple] User signed in on auth page, redirecting to app');
            window.location.href = AUTH_CONFIG.APP_URL;
            return;
        }
        
        // If on app page, initialize app
        if (isAppPage) {
            console.log('[AuthSimple] User signed in on app page, initializing app');
            initializeApp(user);
        }
    }
    
    // Handle signed-out user
    function handleSignedOutUser(isAuthPage, isAppPage) {
        // Clear user info
        window.currentUser = null;
        
        // If on app page, redirect to login
        if (isAppPage && !isAuthPage) {
            console.log('[AuthSimple] User signed out on app page, redirecting to login');
            window.location.href = AUTH_CONFIG.LOGIN_URL;
            return;
        }
    }
    
    // Initialize app for authenticated user
    async function initializeApp(user) {
        try {
            // Get user's family tree ID
            const userDoc = await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                window.userFamilyTreeId = userData.familyTreeId;
                
                // Dispatch event for app initialization
                window.dispatchEvent(new CustomEvent('authReady', {
                    detail: { user, familyTreeId: userData.familyTreeId }
                }));
            } else {
                console.log('[AuthSimple] User document not found, creating...');
                await createUserDocument(user);
            }
        } catch (error) {
            console.error('[AuthSimple] Error initializing app:', error);
        }
    }
    
    // Create user document if it doesn't exist
    async function createUserDocument(user) {
        try {
            const familyTreeId = `tree_${user.uid}`;
            
            await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .set({
                    email: user.email,
                    displayName: user.displayName || '',
                    familyTreeId: familyTreeId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            window.userFamilyTreeId = familyTreeId;
            
            // Dispatch event for app initialization
            window.dispatchEvent(new CustomEvent('authReady', {
                detail: { user, familyTreeId }
            }));
        } catch (error) {
            console.error('[AuthSimple] Error creating user document:', error);
        }
    }
    
    // Public methods
    window.AuthSimple = {
        // Sign in with email and password
        signIn: async function(email, password) {
            try {
                const result = await firebase.auth().signInWithEmailAndPassword(email, password);
                console.log('[AuthSimple] Sign in successful');
                return { success: true, user: result.user };
            } catch (error) {
                console.error('[AuthSimple] Sign in error:', error);
                return { success: false, error: error.message };
            }
        },
        
        // Sign up with email and password
        signUp: async function(email, password) {
            try {
                const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
                console.log('[AuthSimple] Sign up successful');
                return { success: true, user: result.user };
            } catch (error) {
                console.error('[AuthSimple] Sign up error:', error);
                return { success: false, error: error.message };
            }
        },
        
        // Sign out
        signOut: async function() {
            try {
                await firebase.auth().signOut();
                console.log('[AuthSimple] Sign out successful');
                return { success: true };
            } catch (error) {
                console.error('[AuthSimple] Sign out error:', error);
                return { success: false, error: error.message };
            }
        },
        
        // Get current user
        getCurrentUser: function() {
            return firebase.auth().currentUser;
        },
        
        // Check if user is authenticated
        isAuthenticated: function() {
            return !!firebase.auth().currentUser;
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAuth);
    } else {
        initializeAuth();
    }
    
})();