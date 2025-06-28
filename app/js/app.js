// Main application logic
let currentUser = null;
let userFamilyTreeId = null;
let familyMembers = [];

// Make data globally accessible for PDF export and other modules
window.familyMembers = familyMembers;
window.currentUser = currentUser;
window.userFamilyTreeId = null;

// Redirect cooldown configuration
const REDIRECT_COOLDOWN = 30000; // 30 seconds cooldown between redirects

function canRedirect() {
    const lastRedirect = parseInt(localStorage.getItem('lastRedirectTime') || '0');
    const now = Date.now();
    
    if (now - lastRedirect < REDIRECT_COOLDOWN) {
        console.log(`[Redirect Cooldown] Active - ${Math.round((REDIRECT_COOLDOWN - (now - lastRedirect)) / 1000)}s remaining`);
        const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
        logs.push(`${new Date().toISOString()}: Redirect blocked by cooldown`);
        localStorage.setItem('pyebwaDebugLogs', JSON.stringify(logs.slice(-20)));
        return false;
    }
    
    console.log('[Redirect Cooldown] Ready to redirect');
    localStorage.setItem('lastRedirectTime', now.toString());
    return true;
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Log but don't show error to user for minor issues
    if (event.error && event.error.message && !event.error.message.includes('share-modal')) {
        const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
        logs.push(`${new Date().toISOString()}: ERROR: ${event.error.message}`);
        localStorage.setItem('pyebwaDebugLogs', JSON.stringify(logs.slice(-20)));
    }
    // Prevent default error handling for known issues
    if (event.error && event.error.message && event.error.message.includes('addEventListener')) {
        event.preventDefault();
    }
});

// Listen for auth success event from auth-token-bridge
window.addEventListener('pyebwaAuthSuccess', (event) => {
    console.log('[App] Auth success event received:', event.detail);
    const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
    logs.push(`${new Date().toISOString()}: Auth success event received`);
    localStorage.setItem('pyebwaDebugLogs', JSON.stringify(logs.slice(-20)));
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    initializeEventListeners();
    
    // Restore language preference
    const savedLang = localStorage.getItem('pyebwaLang') || 'ht';
    setLanguage(savedLang);
    updateTranslations();
});

// Debug helper - type this in console to see logs
window.showDebugLogs = () => {
    const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
    console.log('=== Debug Logs ===');
    logs.forEach(log => console.log(log));
    return logs;
};

// Clear debug logs
window.clearDebugLogs = () => {
    localStorage.removeItem('pyebwaDebugLogs');
    console.log('Debug logs cleared');
};

// Debug Firestore to find missing members
window.debugFirestore = async () => {
    console.log('=== DEBUG FIRESTORE - FINDING YOUR 16 MEMBERS ===');
    
    if (!auth.currentUser) {
        console.error('Not authenticated');
        return;
    }
    
    try {
        // Get user document
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        console.log('User document:', userDoc.exists ? userDoc.data() : 'Not found');
        
        const treeId = userDoc.data()?.familyTreeId;
        if (!treeId) {
            console.error('No family tree ID in user document');
            return;
        }
        
        console.log('Family Tree ID:', treeId);
        
        // Check family tree document
        const treeDoc = await db.collection('familyTrees').doc(treeId).get();
        console.log('Family tree exists:', treeDoc.exists);
        if (treeDoc.exists) {
            console.log('Tree data:', treeDoc.data());
        }
        
        // Try multiple query approaches
        console.log('\n=== Attempting different queries ===');
        
        // Query 1: Simple get all
        console.log('\n1. Simple query (no ordering):');
        try {
            const simple = await db.collection('familyTrees').doc(treeId).collection('members').get();
            console.log(`   Found ${simple.size} members`);
            if (simple.size > 0) {
                console.log('   First few members:');
                let count = 0;
                simple.forEach(doc => {
                    if (count < 3) {
                        console.log(`   - ${doc.id}:`, doc.data().firstName, doc.data().lastName);
                        count++;
                    }
                });
            }
        } catch (e) {
            console.error('   Failed:', e.message);
        }
        
        // Query 2: With limit
        console.log('\n2. Limited query (limit 5):');
        try {
            const limited = await db.collection('familyTrees').doc(treeId).collection('members').limit(5).get();
            console.log(`   Found ${limited.size} members (limited to 5)`);
        } catch (e) {
            console.error('   Failed:', e.message);
        }
        
        // Query 3: Direct subcollection path
        console.log('\n3. Direct path query:');
        try {
            const direct = await db.collection(`familyTrees/${treeId}/members`).get();
            console.log(`   Found ${direct.size} members`);
        } catch (e) {
            console.error('   Failed:', e.message);
        }
        
        // Check for other family trees
        console.log('\n=== Checking for other family trees ===');
        const myTrees = await db.collection('familyTrees')
            .where('ownerId', '==', auth.currentUser.uid)
            .get();
        console.log(`Found ${myTrees.size} trees where you are owner`);
        
        myTrees.forEach(async (treeDoc) => {
            console.log(`\nTree ID: ${treeDoc.id}`);
            console.log('Tree name:', treeDoc.data().name);
            const membersSnap = await treeDoc.ref.collection('members').get();
            console.log(`Members in this tree: ${membersSnap.size}`);
        });
        
    } catch (error) {
        console.error('Debug error:', error);
    }
};

// Test Firestore access
window.testFirestore = async () => {
    console.log('Testing Firestore access...');
    
    try {
        // Test 1: Read user document
        console.log('Test 1: Reading user document...');
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        console.log('User doc exists:', userDoc.exists);
        if (userDoc.exists) {
            console.log('User data:', userDoc.data());
        }
        
        // Test 2: Try to write to users collection
        console.log('Test 2: Writing to user document...');
        await db.collection('users').doc(auth.currentUser.uid).set({
            testField: 'test',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('Write to users collection: SUCCESS');
        
        // Test 3: Try to create a test collection
        console.log('Test 3: Creating test document...');
        const testRef = await db.collection('test').add({
            test: true,
            uid: auth.currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Created test document:', testRef.id);
        
        // Test 4: Try to read familyTrees
        console.log('Test 4: Reading familyTrees...');
        const treesQuery = await db.collection('familyTrees')
            .where('ownerId', '==', auth.currentUser.uid)
            .get();
        console.log('Found', treesQuery.size, 'family trees');
        
    } catch (error) {
        console.error('Firestore test error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
    }
};

// Start authentication retry logic
function startAuthRetry() {
    // Prevent duplicate retry processes
    if (window.authRetryInProgress) {
        log('Auth retry already in progress, skipping duplicate call');
        return;
    }
    
    window.authRetryInProgress = true;
    log('Starting enhanced auth retry process');
    
    // Show a message to the user
    showLoadingState('Syncing authentication, please wait...');
    const loadingEl = document.querySelector('#loadingView p');
    if (!loadingEl) {
        log('Warning: Loading message element not found');
    }
    
    // Implement enhanced retry logic
    let retryCount = 0;
    const maxRetries = 15;
    let authFound = false;
    
    const retryAuth = async () => {
        retryCount++;
        log(`Enhanced auth retry attempt ${retryCount}/${maxRetries}`);
        
        // Update loading message
        const msgEl = document.querySelector('#loadingView p');
        if (msgEl) {
            msgEl.textContent = `Syncing authentication (${retryCount}/${maxRetries})...`;
        }
        
        // Method 1: Direct check
        let user = auth.currentUser;
        if (user) {
            log(`Method 1 success: Found user ${user.email}`);
            authFound = true;
            onAuthSuccess(user);
            return;
        }
        
        // Method 2: Force reload
        try {
            await auth.currentUser?.reload();
            user = auth.currentUser;
            if (user) {
                log(`Method 2 success: Found user after reload ${user.email}`);
                authFound = true;
                onAuthSuccess(user);
                return;
            }
        } catch (e) {
            log(`Reload attempt ${retryCount} failed: ${e.message}`);
        }
        
        // Method 3: Force persistence check
        try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            user = auth.currentUser;
            if (user) {
                log(`Method 3 success: Found user after persistence ${user.email}`);
                authFound = true;
                onAuthSuccess(user);
                return;
            }
        } catch (e) {
            log(`Persistence check failed: ${e.message}`);
        }
        
        // Method 4: Wait for next auth state change
        const waitForAuth = new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 2000);
            const unsubscribe = auth.onAuthStateChanged((user) => {
                if (user) {
                    clearTimeout(timeout);
                    unsubscribe();
                    resolve(user);
                }
            });
        });
        
        user = await waitForAuth;
        if (user) {
            log(`Method 4 success: Found user from state change ${user.email}`);
            authFound = true;
            onAuthSuccess(user);
            return;
        }
        
        // Continue retrying if not at max
        if (retryCount < maxRetries && !authFound) {
            // Use exponential backoff with jitter
            const baseDelay = Math.min(1000 * Math.pow(1.5, retryCount), 5000);
            const jitter = Math.random() * 500;
            const delay = baseDelay + jitter;
            log(`Waiting ${Math.round(delay)}ms before retry ${retryCount + 1}`);
            setTimeout(retryAuth, delay);
        } else if (!authFound) {
            log('Auth failed after all retries');
            window.authRetryInProgress = false;
            sessionStorage.removeItem('recentLogin');
            hideLoadingState();
            showError('Authentication sync timeout. Please try logging in again.');
            
            // Offer debug options
            const errorEl = document.querySelector('.error-message');
            if (errorEl) {
                errorEl.innerHTML += '<br><br><a href="/auth-debugger.html" style="color: white; text-decoration: underline;">Debug Authentication</a> | <a href="/auth-help.html" style="color: white; text-decoration: underline;">Get Help</a>';
            }
            
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 5000);
        }
    };
    
    // Helper function for successful auth
    const onAuthSuccess = (user) => {
        log(`Authentication successful for ${user.email}`);
        window.authRetryInProgress = false;
        sessionStorage.removeItem('recentLogin');
        currentUser = user;
        window.currentUser = currentUser;
        const userEmailEl = document.querySelector('.user-email');
        if (userEmailEl) {
            userEmailEl.textContent = user.email;
        }
        
        // Check if user is admin and show admin link
        checkAdminStatus(user);
        
        initializeUserFamilyTree().then(() => {
            hideLoadingState();
            showView('dashboard');
            log('App initialized successfully after retry');
        }).catch(error => {
            console.error('Error initializing:', error);
            hideLoadingState();
            showError('Error loading family tree. Please refresh.');
        });
    };
    
    // Start retry process immediately
    retryAuth();
}

// Global debug logging function
const log = (msg) => {
    console.log(msg);
    const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
    logs.push(`${new Date().toISOString()}: ${msg}`);
    localStorage.setItem('pyebwaDebugLogs', JSON.stringify(logs.slice(-20))); // Keep last 20 logs
};

// Initialize authentication
async function initializeAuth() {
    
    log('=== App initialization started ===');
    
    // Show loading state
    showLoadingState();
    
    // Log Firebase auth status
    log(`Firebase auth initialized: ${auth ? 'Yes' : 'No'}`);
    log(`Firebase app: ${firebase.app().name}`);
    
    // Check if Firebase Auth is ready
    auth.onAuthStateChanged((user) => {
        log(`[InitCheck] Auth state received: ${user ? user.email : 'null'}`);
    });
    
    // Check if this is a magic link sign-in
    if (auth.isSignInWithEmailLink(window.location.href)) {
        log('Magic link detected in URL');
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            email = window.prompt('Please provide your email for confirmation');
        }
        
        if (email) {
            log(`Attempting magic link sign-in for: ${email}`);
            auth.signInWithEmailLink(email, window.location.href)
                .then(async (result) => {
                    window.localStorage.removeItem('emailForSignIn');
                    log('Magic link sign-in successful');
                    
                    // Check if this is a new user signup
                    const urlParams = new URLSearchParams(window.location.search);
                    const isNewUser = urlParams.get('newUser') === 'true';
                    
                    if (isNewUser) {
                        log('New user signup detected');
                        const pendingUserData = JSON.parse(window.localStorage.getItem('pendingUserData') || '{}');
                        
                        if (pendingUserData.email === email) {
                            try {
                                // Create user profile in Firestore
                                await db.collection('users').doc(result.user.uid).set({
                                    uid: result.user.uid,
                                    email: result.user.email,
                                    fullName: pendingUserData.fullName || '',
                                    displayName: pendingUserData.fullName || '',
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                    language: 'en'
                                });
                                
                                // Update user display name
                                if (pendingUserData.fullName) {
                                    await result.user.updateProfile({
                                        displayName: pendingUserData.fullName
                                    });
                                }
                                
                                log('User profile created successfully');
                                window.localStorage.removeItem('pendingUserData');
                                
                                // Show welcome message
                                showSuccess(`Welcome ${pendingUserData.fullName || email}! Your account has been created.`);
                            } catch (error) {
                                log(`Error creating user profile: ${error.message}`);
                                console.error('Profile creation error:', error);
                            }
                        }
                    }
                    
                    // Clean up URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                })
                .catch((error) => {
                    log(`Magic link sign-in error: ${error.message}`);
                    console.error('Magic link error:', error);
                    hideLoadingState();
                    showError('Invalid or expired sign-in link. Please request a new one.');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 3000);
                });
        }
    }
    
    // Single-domain auth - no URL parameters needed
    log('Using single-domain authentication');
    
    // IMPORTANT: Track if we've already set up auth listener to prevent duplicates
    let authListenerSet = false;
    
    // Add redirect loop prevention with timestamp
    const redirectData = JSON.parse(sessionStorage.getItem('pyebwaRedirectData') || '{}');
    const redirectCount = redirectData.count || 0;
    const lastRedirectTime = redirectData.timestamp || 0;
    const timeSinceLastRedirect = Date.now() - lastRedirectTime;
    
    // Reset redirect count if more than 5 minutes have passed
    if (timeSinceLastRedirect > 300000) { // 5 minutes
        sessionStorage.removeItem('pyebwaRedirectData');
        log('Redirect data expired and cleared');
    } else if (redirectCount > 2) {
        log('Redirect loop detected - stopping redirects');
        sessionStorage.removeItem('pyebwaRedirectData');
        hideLoadingState();
        showError('Authentication loop detected. Please clear your browser cache and try again.');
        return;
    }
    
    // Check for recent login and auth wait success
    const recentLogin = sessionStorage.getItem('recentLogin') === 'true';
    const authWaitSuccess = sessionStorage.getItem('authWaitSuccess') === 'true';
    const loginTime = parseInt(sessionStorage.getItem('loginTime') || '0');
    const timeSinceLogin = Date.now() - loginTime;
    
    log(`Recent login: ${recentLogin}, Auth wait success: ${authWaitSuccess}, Time since login: ${timeSinceLogin}ms`);
    
    // CRITICAL FIX: Wait for auth state to be determined before checking currentUser
    // Firebase needs time to check its persistence and restore the session
    log('Waiting for auth state to be determined...');
    
    // Create a promise that resolves when we know the auth state
    const authStatePromise = new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            log(`Initial auth state determined: ${user ? user.email : 'No user'}`);
            unsubscribe(); // Unsubscribe after first check
            resolve(user);
        });
    });
    
    // Wait for auth state to be determined
    const determinedUser = await authStatePromise;
    
    // Now check the user after auth state is ready
    if (determinedUser) {
        log('User authenticated after auth state check - initializing immediately');
        currentUser = determinedUser;
        window.currentUser = currentUser;
        const userEmailEl = document.querySelector('.user-email');
        if (userEmailEl) {
            userEmailEl.textContent = determinedUser.email;
        }
        
        // Check if user is admin and show admin link
        checkAdminStatus(determinedUser);
        
        // Clear auth wait flags
        sessionStorage.removeItem('authWaitSuccess');
        sessionStorage.removeItem('recentLogin');
        sessionStorage.removeItem('loginTime');
        
        // Initialize family tree asynchronously
        initializeUserFamilyTree().then(() => {
            hideLoadingState();
            showView('dashboard');
            log('App initialized successfully with determined auth');
        }).catch(error => {
            log(`Error initializing app: ${error.message}`);
            console.error('Error initializing app:', error);
            hideLoadingState();
            showError('Error loading your family tree. Please try again.');
        });
        return; // Important: exit early to avoid setting up duplicate auth listeners
    }
    
    // If no user but we came from auth-wait with success, wait a bit more
    if (!determinedUser && authWaitSuccess) {
        log('Auth wait succeeded but no user found yet - waiting for propagation');
        sessionStorage.removeItem('authWaitSuccess');
        
        // Wait up to 3 seconds for auth to propagate
        let authFound = false;
        for (let i = 0; i < 6; i++) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
            const checkUser = auth.currentUser;
            if (checkUser) {
                log(`Found user after ${(i + 1) * 500}ms of waiting`);
                authFound = true;
                window.location.reload(); // Reload to properly initialize with the user
                return;
            }
        }
        
        if (!authFound) {
            log('Still no user after extended wait - redirecting to login');
            window.location.href = '/login.html';
        }
        return;
    }
    
    // Check if we need to start retry logic immediately
    if (!determinedUser && recentLogin && timeSinceLogin < 60000) { // Within 1 minute of login
        log('Recent login detected but no user - may need to wait for propagation');
        // Clear the flags since they didn't help
        sessionStorage.removeItem('recentLogin');
        sessionStorage.removeItem('loginTime');
    }
    
    // Set auth state listener only once
    if (!authListenerSet) {
        authListenerSet = true;
        log('Setting up auth state listener');
        
        // Add timeout to prevent infinite loading
        const authTimeout = setTimeout(() => {
            const loadingView = document.getElementById('loadingView');
            // Check if we're still loading and no user is authenticated
            if (!currentUser && !window.authRetryInProgress && loadingView && loadingView.style.display !== 'none') {
                log('Auth timeout - no user authenticated after 10 seconds');
                log('Loading view display:', loadingView.style.display);
                log('Recent login flag:', sessionStorage.getItem('recentLogin'));
                
                // Don't redirect if we just came from a login
                const recentLogin = sessionStorage.getItem('recentLogin') === 'true';
                const loginTime = parseInt(sessionStorage.getItem('loginTime') || '0');
                const timeSinceLogin = Date.now() - loginTime;
                
                if (recentLogin && timeSinceLogin < 30000) { // Within 30 seconds of login
                    log('Recent login detected, extending timeout');
                    // Give it more time for auth to propagate
                    setTimeout(() => {
                        if (!currentUser) {
                            hideLoadingState();
                            window.location.href = '/login.html';
                        }
                    }, 5000); // Additional 5 seconds
                } else {
                    hideLoadingState();
                    // Small delay before redirect to ensure loading state is hidden
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 100);
                }
            }
        }, 10000); // 10 second initial timeout
        
        // Set auth state listener with proper error handling
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            // Clear the timeout since auth state has resolved
            clearTimeout(authTimeout);
            log(`Auth state changed: ${user ? user.email : 'No user'}`);
            
            if (user) {
                // User is authenticated
                log('User authenticated successfully');
                currentUser = user;
                window.currentUser = currentUser;
                const userEmailEl = document.querySelector('.user-email');
                if (userEmailEl) {
                    userEmailEl.textContent = user.email;
                }
                
                // Check if user is admin and show admin link
                checkAdminStatus(user);
                
                // Clear redirect data and cooldown on successful auth
                sessionStorage.removeItem('pyebwaRedirectData');
                localStorage.removeItem('lastRedirectTime'); // Clear cooldown on successful auth
                localStorage.removeItem('pyebwaVisitCount'); // Clear visit count
                log('Cleared redirect data and cooldown after successful auth');
                
                // Check Firebase Storage configuration
                if (window.firebase && window.firebase.storage) {
                    console.log('Firebase Storage is initialized');
                    const storage = firebase.storage();
                    console.log('Storage bucket:', storage.ref().bucket);
                } else {
                    console.error('Firebase Storage is not initialized');
                }
                
                try {
                    // Get or create user's family tree
                    await initializeUserFamilyTree();
                    
                    // Hide loading and show main view
                    hideLoadingState();
                    
                    // Check if enhanced onboarding is needed
                    const needsOnboarding = await window.shouldShowEnhancedOnboarding();
                    if (needsOnboarding) {
                        window.showEnhancedOnboarding();
                    } else if (window.shouldShowOnboarding && window.shouldShowOnboarding()) {
                        // Fallback to basic onboarding if enhanced onboarding is not needed
                        window.showOnboarding();
                    }
                    
                    // Show dashboard by default
                    showView('dashboard');
                    
                    log('App initialized successfully');
                } catch (error) {
                    log(`Error initializing app: ${error.message}`);
                    console.error('Error initializing app:', error);
                    hideLoadingState();
                    showError('Error loading your family tree. Please try again.');
                }
            } else {
                // No user authenticated in state change
                log('Auth state changed to: No user');
                
                // Check if retry is already running
                if (window.authRetryInProgress) {
                    log('Auth retry already in progress, skipping duplicate');
                    return;
                }
                
                // Check if we just came from auth.html or login (magic link)
                const referrer = document.referrer;
                const fromAuth = referrer.includes('/auth.html');
                const fromLogin = referrer.includes('/login.html');
                const hasAuthParams = window.location.href.includes('apiKey=') || 
                                    window.location.href.includes('oobCode=') ||
                                    window.location.href.includes('mode=');
                
                // Check for recent login in session
                const recentLogin = sessionStorage.getItem('recentLogin') === 'true';
                const loginTime = parseInt(sessionStorage.getItem('loginTime') || '0');
                const timeSinceLogin = Date.now() - loginTime;
                
                if ((fromAuth || hasAuthParams || fromLogin || recentLogin) && timeSinceLogin < 60000) {
                    log('Recent auth detected in state listener - starting retry');
                    startAuthRetry();
                } else {
                    // Normal case - no recent auth attempt
                    log('No recent auth - redirecting to login');
                    hideLoadingState();
                    window.location.href = '/login.html';
                }
                return;
            }
        }, (error) => {
            // Auth error
            log(`Auth error: ${error.message}`);
            console.error('Auth error:', error);
            hideLoadingState();
            showError('Authentication error. Please login again.');
        });
    }
}

// Show loading state
function showLoadingState(message = 'Loading...') {
    const loadingView = document.getElementById('loadingView');
    if (loadingView) {
        loadingView.style.display = 'flex';
        const messageEl = loadingView.querySelector('p');
        if (messageEl && message !== 'Loading...') {
            messageEl.textContent = message;
        }
    }
    // Hide other views
    document.querySelectorAll('.view-container').forEach(view => {
        if (view.id !== 'loadingView') {
            view.style.display = 'none';
        }
    });
}

// Hide loading state
function hideLoadingState() {
    const loadingView = document.getElementById('loadingView');
    if (loadingView) {
        loadingView.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    // Create or update error element
    let errorEl = document.getElementById('errorMessage');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id = 'errorMessage';
        errorEl.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 1000;';
        document.body.appendChild(errorEl);
    }
    
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}

// Check if user is admin and show admin link
async function checkAdminStatus(user) {
    try {
        // List of admin emails - in production, this should come from the database
        const adminEmails = [
            'claude@humanlevel.ai',
            'admin@pyebwa.com'
        ];
        
        const adminLink = document.getElementById('adminLink');
        if (adminLink) {
            if (adminEmails.includes(user.email)) {
                adminLink.style.display = 'flex';
                adminLink.style.alignItems = 'center';
                console.log('Admin user detected, showing admin link');
            } else {
                adminLink.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
}

// Initialize or get user's family tree
async function initializeUserFamilyTree() {
    try {
        console.log('Initializing family tree for user:', currentUser.uid);
        
        // Check if user has a family tree
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        console.log('User document exists:', userDoc.exists);
        
        if (userDoc.exists && userDoc.data().familyTreeId) {
            userFamilyTreeId = userDoc.data().familyTreeId;
            window.userFamilyTreeId = userFamilyTreeId;
            console.log('Found existing family tree:', userFamilyTreeId);
        } else {
            console.log('No family tree found, creating new one...');
            
            // First, ensure user document exists
            if (!userDoc.exists) {
                console.log('User document does not exist, creating...');
                await db.collection('users').doc(currentUser.uid).set({
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Create new family tree
            const treeData = {
                name: `${currentUser.displayName || currentUser.email}'s Family Tree`,
                ownerId: currentUser.uid,
                memberIds: [currentUser.uid],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            console.log('Creating family tree with data:', treeData);
            const treeRef = await db.collection('familyTrees').add(treeData);
            userFamilyTreeId = treeRef.id;
            window.userFamilyTreeId = userFamilyTreeId;
            console.log('Created family tree with ID:', userFamilyTreeId);
            
            // Update user document with family tree ID
            await db.collection('users').doc(currentUser.uid).update({
                familyTreeId: userFamilyTreeId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Updated user document with family tree ID');
        }
        
        // Load family members
        await loadFamilyMembers();
        
    } catch (error) {
        console.error('Error initializing family tree:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        // Don't show error to user during initialization
        // Just log it and continue
        userFamilyTreeId = null;
        window.userFamilyTreeId = null;
    }
}

// Load family members
async function loadFamilyMembers() {
    try {
        console.log('=== STARTING LOAD FAMILY MEMBERS ===');
        console.log('User ID:', currentUser?.uid);
        console.log('Family Tree ID:', userFamilyTreeId);
        
        if (!userFamilyTreeId) {
            console.error('No family tree ID available');
            return;
        }
        
        // First, verify the family tree document exists
        const treeDoc = await db.collection('familyTrees').doc(userFamilyTreeId).get();
        console.log('Family tree document exists:', treeDoc.exists);
        if (treeDoc.exists) {
            console.log('Family tree data:', treeDoc.data());
        }
        
        // Try to load members
        console.log('Attempting to load members from path:', `familyTrees/${userFamilyTreeId}/members`);
        
        // Try to get members - first attempt without orderBy in case createdAt field is missing
        let snapshot;
        try {
            snapshot = await db.collection('familyTrees')
                .doc(userFamilyTreeId)
                .collection('members')
                .orderBy('createdAt', 'desc')
                .get();
        } catch (orderError) {
            console.warn('OrderBy createdAt failed, trying without ordering:', orderError);
            // Fallback to query without ordering
            snapshot = await db.collection('familyTrees')
                .doc(userFamilyTreeId)
                .collection('members')
                .get();
        }
        
        console.log('Query completed. Snapshot empty:', snapshot.empty);
        console.log('Number of documents returned:', snapshot.size);
        
        familyMembers = [];
        window.familyMembers = familyMembers;
        const memberIds = new Set(); // Track unique IDs to prevent duplicates
        
        snapshot.forEach(doc => {
            console.log('Processing member document:', doc.id);
            console.log('Member data:', doc.data());
            
            if (!memberIds.has(doc.id)) {
                memberIds.add(doc.id);
                familyMembers.push({
                    id: doc.id,
                    ...doc.data()
                });
            }
        });
        
        console.log('=== LOAD COMPLETE ===');
        console.log('Total members loaded:', familyMembers.length);
        console.log('Members array:', familyMembers);
        
        // Make familyMembers globally accessible for PDF export
        window.familyMembers = familyMembers;
        
        // Update current view
        const activeView = document.querySelector('.nav-item.active')?.getAttribute('data-view') || 'dashboard';
        showView(activeView);
        
        // If members were loaded and we're on the tree view, ensure it renders
        if (familyMembers.length > 0 && activeView === 'tree') {
            console.log('Members loaded, rendering tree view');
            renderFamilyTree();
        }
        
    } catch (error) {
        console.error('=== ERROR LOADING FAMILY MEMBERS ===');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Full error object:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    console.log('Initializing event listeners...');
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const view = e.currentTarget.getAttribute('data-view');
            showView(view);
        });
    });
    
    // Language selector
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lang = e.currentTarget.getAttribute('data-lang');
            setLanguage(lang);
        });
    });
    
    // User menu
    const userMenuBtn = document.querySelector('.user-menu-btn');
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', () => {
            const userMenu = document.querySelector('.user-menu');
            if (userMenu) {
                userMenu.classList.toggle('active');
            }
        });
    }
    
    // Close user menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu')) {
            document.querySelector('.user-menu').classList.remove('active');
        }
    });
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            try {
                // Show loading state
                showLoadingState('Signing out...');
                
                // Sign out from Firebase
                await auth.signOut();
                
                // Clear any local storage
                localStorage.removeItem('emailForSignIn');
                localStorage.removeItem('pendingUserData');
                sessionStorage.clear();
                
                console.log('Logout successful');
                
                // Redirect to login page
                window.location.href = '/login.html';
            } catch (error) {
                console.error('Logout error:', error);
                hideLoadingState();
                showError('Error signing out. Please try again.');
            }
        });
    } else {
        console.error('Logout button not found');
    }
    
    // Add member button
    const addMemberBtn = document.getElementById('addMemberBtn');
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => {
            showAddMemberModal();
        });
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const modal = btn.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                // Reset form if it's the add member modal
                if (modal.id === 'addMemberModal') {
                    const form = modal.querySelector('form');
                    if (form) form.reset();
                    editingMemberId = null;
                }
            }
        });
    });
    
    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Add member form
    const addMemberForm = document.getElementById('addMemberForm');
    if (addMemberForm) {
        addMemberForm.addEventListener('submit', handleAddMember);
    }
    
    // Cancel button in form
    const cancelBtn = document.querySelector('#addMemberForm .btn-secondary');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('addMemberModal').classList.remove('active');
            editingMemberId = null;
        });
    }
    
    // Relationship field change
    const relationshipField = document.querySelector('[name="relationship"]');
    if (relationshipField) {
        relationshipField.addEventListener('change', (e) => {
            const relatedToGroup = document.getElementById('relatedToGroup');
            if (relatedToGroup) {
                if (e.target.value && e.target.value !== 'parent') {
                    relatedToGroup.style.display = 'block';
                    populateRelatedToOptions();
                } else {
                    relatedToGroup.style.display = 'none';
                }
            }
        });
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Show view
function showView(viewName) {
    // Stop dashboard slideshow when leaving dashboard
    if (viewName !== 'dashboard' && window.stopDashboardSlideshow) {
        window.stopDashboardSlideshow();
    }
    
    // Hide all views
    document.querySelectorAll('.view-container').forEach(view => {
        view.style.display = 'none';
    });
    
    // Show selected view
    const viewElement = document.getElementById(`${viewName}View`);
    if (viewElement) {
        viewElement.style.display = 'block';
    }
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });
    
    // Load view-specific data
    switch (viewName) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'tree':
            renderFamilyTree();
            break;
        case 'members':
            renderMembersList();
            break;
        case 'stories':
            loadStories();
            break;
    }
}

// Store current editing member
let editingMemberId = null;

// Show add member modal
function showAddMemberModal(member = null) {
    const modal = document.getElementById('addMemberModal');
    const form = document.getElementById('addMemberForm');
    const modalTitle = modal.querySelector('.modal-header h3');
    const submitBtn = form.querySelector('[type="submit"]');
    
    // Reset form
    form.reset();
    
    // Privacy controls removed - privacy is handled at document level only
    
    // If editing, populate form
    if (member) {
        editingMemberId = member.id;
        modalTitle.textContent = t('editFamilyMember') || 'Edit Family Member';
        submitBtn.textContent = t('update') || 'Update';
        
        form.firstName.value = member.firstName || '';
        form.lastName.value = member.lastName || '';
        form.gender.value = member.gender || '';
        form.birthDate.value = member.birthDate || '';
        form.deathDate.value = member.deathDate || '';
        form.email.value = member.email || '';
        form.biography.value = member.biography || '';
        form.relationship.value = member.relationship || '';
        
        if (member.relatedTo) {
            document.getElementById('relatedToGroup').style.display = 'block';
            populateRelatedToOptions();
            form.relatedTo.value = member.relatedTo;
        }
        
        // Privacy settings removed - handled at document level only
    } else {
        editingMemberId = null;
        modalTitle.textContent = t('addFamilyMember') || 'Add Family Member';
        submitBtn.textContent = t('save') || 'Save';
        
        // Privacy defaults removed - handled at document level only
    }
    
    modal.classList.add('active');
}

// Populate related to options
function populateRelatedToOptions() {
    const select = document.getElementById('relatedToSelect');
    select.innerHTML = '<option value="">' + (t('selectPerson') || 'Select person') + '</option>';
    
    familyMembers.forEach(member => {
        // Don't include the member being edited
        if (editingMemberId && member.id === editingMemberId) {
            return;
        }
        
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = `${member.firstName} ${member.lastName}`;
        select.appendChild(option);
    });
}

// Handle add member form submission
async function handleAddMember(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = t('loading');
    
    try {
        // Prepare member data
        const memberData = {
            firstName: form.firstName.value,
            lastName: form.lastName.value,
            gender: form.gender.value,
            birthDate: form.birthDate.value || null,
            deathDate: form.deathDate.value || null,
            email: form.email.value || null,
            biography: form.biography.value || '',
            relationship: form.relationship.value,
            relatedTo: form.relatedTo?.value || null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            // Privacy removed from add form - only documents have privacy settings
        };
        
        // Only add these fields for new members
        if (!editingMemberId) {
            memberData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            memberData.addedBy = currentUser.uid;
        }
        
        // Handle photo upload if provided
        const photoFile = form.photo.files[0];
        if (photoFile && userFamilyTreeId) {
            try {
                const photoUrl = await uploadPhoto(photoFile);
                memberData.photoUrl = photoUrl;
            } catch (photoError) {
                console.error('Photo upload failed:', photoError);
                // Continue without photo
                console.log('Continuing without photo upload');
            }
        }
        
        // Add or update in Firestore
        let memberId;
        if (editingMemberId) {
            // Update existing member
            memberId = editingMemberId;
            await db.collection('familyTrees')
                .doc(userFamilyTreeId)
                .collection('members')
                .doc(editingMemberId)
                .update(memberData);
            
            showSuccess(t('updatedSuccessfully') || 'Updated successfully!');
        } else {
            // Add new member
            const docRef = await db.collection('familyTrees')
                .doc(userFamilyTreeId)
                .collection('members')
                .add(memberData);
            memberId = docRef.id;
            
            showSuccess(t('savedSuccessfully'));
        }
        
        // Update search index
        if (window.pyebwaSearch && memberId) {
            try {
                const memberWithId = { ...memberData, id: memberId };
                await window.pyebwaSearch.updateSearchIndex(memberWithId, userFamilyTreeId);
                console.log('Search index updated for member:', memberWithId.firstName, memberWithId.lastName);
            } catch (searchError) {
                console.error('Failed to update search index:', searchError);
                // Don't fail the operation if search indexing fails
            }
        }
        
        // Close modal and reload members
        const modal = document.getElementById('addMemberModal');
        if (modal) {
            modal.classList.remove('active');
            // Reset form
            form.reset();
        }
        editingMemberId = null;
        await loadFamilyMembers();
        
    } catch (error) {
        console.error('Error adding member:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            familyTreeId: userFamilyTreeId,
            currentUser: currentUser?.uid
        });
        
        // Show more specific error message
        if (error.code === 'permission-denied') {
            showError('Permission denied. Please check Firestore rules.');
        } else if (!userFamilyTreeId) {
            showError('No family tree found. Please refresh the page.');
        } else {
            showError(t('errorSaving') + ': ' + error.message);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = t('save');
    }
}

// Upload photo to Firebase Storage
async function uploadPhoto(file) {
    const storageRef = storage.ref();
    const photoRef = storageRef.child(`familyTrees/${userFamilyTreeId}/photos/${Date.now()}_${file.name}`);
    
    // Add metadata required by security rules
    const metadata = {
        customMetadata: {
            uploadedBy: auth.currentUser.uid
        }
    };
    
    const snapshot = await photoRef.put(file, metadata);
    const downloadUrl = await snapshot.ref.getDownloadURL();
    
    return downloadUrl;
}

// Show success message
function showSuccess(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'toast-notification success';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Fade in
    setTimeout(() => toast.style.opacity = '1', 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Show error message
function showError(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'toast-notification error';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #f44336;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Fade in
    setTimeout(() => toast.style.opacity = '1', 10);
    
    // Remove after 5 seconds (longer for errors)
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Render dashboard view
function renderDashboard() {
    const container = document.getElementById('dashboardView');
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create dashboard using the dashboard component
    if (window.createDashboard) {
        const dashboard = window.createDashboard();
        container.appendChild(dashboard);
    } else {
        // Fallback if dashboard.js hasn't loaded yet
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <h3>Loading Dashboard...</h3>
            </div>
        `;
    }
}

// Helper function to close all modals
function closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
        const form = modal.querySelector('form');
        if (form) form.reset();
    });
    editingMemberId = null;
}

// Update family member in Firestore
async function updateFamilyMember(memberId, updateData) {
    if (!userFamilyTreeId || !memberId) {
        throw new Error('Missing family tree ID or member ID');
    }
    
    // Add timestamp
    updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    
    // Update in Firestore
    await db.collection('familyTrees')
        .doc(userFamilyTreeId)
        .collection('members')
        .doc(memberId)
        .update(updateData);
    
    // Update local data
    const memberIndex = familyMembers.findIndex(m => m.id === memberId);
    if (memberIndex !== -1) {
        familyMembers[memberIndex] = { ...familyMembers[memberIndex], ...updateData };
        window.familyMembers = familyMembers;
    }
    
    // Update search index if available
    if (window.pyebwaSearch && familyMembers[memberIndex]) {
        try {
            await window.pyebwaSearch.updateSearchIndex(familyMembers[memberIndex], userFamilyTreeId);
        } catch (searchError) {
            console.error('Failed to update search index:', searchError);
        }
    }
}

// Privacy control functions - REMOVED
// Privacy settings are now only available for documents in the member profile
/*
function ensurePrivacyControls(form) {
    // Function removed - privacy controls no longer in add member form
}

function createPrivacyField(fieldName, label, defaultValue) {
    // Function removed - privacy fields no longer needed in add member form
}
*/

/*
function setDefaultPrivacyValues(form) {
    // Function removed - privacy defaults no longer needed in add member form
}
*/

// Check if user has permission to view field
window.canViewField = function(member, fieldName, viewerId = null) {
    // If no privacy settings, default to showing
    if (!member.privacy || !member.privacy[fieldName]) {
        return true;
    }
    
    const privacy = member.privacy[fieldName];
    const currentUserId = currentUser?.uid;
    
    // Owner can always see their own data
    if (member.addedBy === currentUserId) {
        return true;
    }
    
    // Check privacy level
    switch (privacy) {
        case 'public':
            return true;
        case 'family':
            // Check if viewer is in the same family tree
            return viewerId ? isFamilyMember(viewerId) : (currentUserId && isFamilyMember(currentUserId));
        case 'private':
            return false;
        default:
            return true;
    }
};

// Check if user is a family member
function isFamilyMember(userId) {
    // For now, anyone with access to the family tree is considered family
    // This could be enhanced to check specific relationships
    return currentUser && currentUser.uid === userId;
}

// Update family member
async function updateFamilyMember(memberId, updateData) {
    if (!userFamilyTreeId) {
        throw new Error('No family tree ID available');
    }
    
    try {
        // Add timestamp
        updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Update in Firestore
        await db.collection('familyTrees')
            .doc(userFamilyTreeId)
            .collection('members')
            .doc(memberId)
            .update(updateData);
        
        // Update local cache
        const memberIndex = familyMembers.findIndex(m => m.id === memberId);
        if (memberIndex !== -1) {
            familyMembers[memberIndex] = {
                ...familyMembers[memberIndex],
                ...updateData
            };
            window.familyMembers = familyMembers; // Update global reference
        }
        
        console.log('Member updated successfully:', memberId);
        return familyMembers[memberIndex];
    } catch (error) {
        console.error('Error updating member:', error);
        throw error;
    }
}

// Logout function
async function logout() {
    try {
        console.log('Logout function called');
        showLoadingState('Signing out...');
        
        await auth.signOut();
        
        // Clear any local storage
        localStorage.removeItem('emailForSignIn');
        localStorage.removeItem('pendingUserData');
        sessionStorage.clear();
        
        console.log('Logout successful, redirecting...');
        
        // Redirect to login page
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        hideLoadingState();
        showError('Error signing out. Please try again.');
    }
}

// Make functions globally accessible
window.showView = showView;
window.closeAllModals = closeAllModals;
window.showAddMemberModal = showAddMemberModal;
window.showSuccess = showSuccess;
window.showError = showError;
window.updateFamilyMember = updateFamilyMember;
// Privacy controls removed - no longer needed
// window.ensurePrivacyControls = ensurePrivacyControls;
window.logout = logout;

// Global function to show member details
window.showMemberDetails = function(member) {
    // Show the enhanced member profile
    if (window.viewMemberProfile && member.id) {
        window.viewMemberProfile(member.id);
    } else {
        // Fallback to edit modal if profile viewer not available
        showAddMemberModal(member);
    }
};

// Debug function to inspect Firestore data
window.debugFirestore = async function() {
    console.log('=== FIRESTORE DEBUG ===');
    console.log('Current User:', currentUser);
    console.log('User Family Tree ID:', userFamilyTreeId);
    
    if (!userFamilyTreeId) {
        console.error('No family tree ID available');
        return;
    }
    
    try {
        // Check family tree document
        const treeDoc = await db.collection('familyTrees').doc(userFamilyTreeId).get();
        console.log('Family Tree Document Exists:', treeDoc.exists);
        if (treeDoc.exists) {
            console.log('Family Tree Data:', JSON.stringify(treeDoc.data(), null, 2));
        }
        
        // Try different query approaches
        console.log('\n--- Attempting basic members query ---');
        const basicQuery = await db.collection('familyTrees')
            .doc(userFamilyTreeId)
            .collection('members')
            .get();
        console.log('Basic query - Document count:', basicQuery.size);
        
        console.log('\n--- Attempting members query without orderBy ---');
        const noOrderQuery = await db.collection('familyTrees')
            .doc(userFamilyTreeId)
            .collection('members')
            .limit(5)
            .get();
        console.log('No orderBy query - Document count:', noOrderQuery.size);
        
        if (noOrderQuery.size > 0) {
            console.log('Sample member documents:');
            noOrderQuery.forEach(doc => {
                console.log('Document ID:', doc.id);
                console.log('Document data:', JSON.stringify(doc.data(), null, 2));
            });
        }
        
        // Check permissions by trying to read a specific path
        console.log('\n--- Testing permissions ---');
        try {
            const testPath = `familyTrees/${userFamilyTreeId}/members`;
            console.log('Testing read access to:', testPath);
            const testQuery = await db.collection(testPath).limit(1).get();
            console.log('Permission test successful');
        } catch (permError) {
            console.error('Permission test failed:', permError);
        }
        
    } catch (error) {
        console.error('Debug error:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details
        });
    }
    
    console.log('=== END FIRESTORE DEBUG ===');
};