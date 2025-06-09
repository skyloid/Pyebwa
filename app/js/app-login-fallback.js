// Enhanced app.js with login fallback handling
// This version checks for login page availability and falls back gracefully

// Main application logic
let currentUser = null;
let userFamilyTreeId = null;
let familyMembers = [];

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

// Check if a login page exists
async function findLoginPage() {
    const loginPages = [
        '/login/',
        '/simple-login.html',
        '/manual-login.html',
        'https://secure.pyebwa.com' // Last resort fallback
    ];
    
    for (const page of loginPages) {
        try {
            // For external URLs, just return them
            if (page.startsWith('https://')) {
                return page + '?redirect=' + encodeURIComponent(window.location.href);
            }
            
            // For local pages, check if they exist
            const response = await fetch(page, { method: 'HEAD', cache: 'no-cache' });
            if (response.ok) {
                console.log(`[Auth] Found login page at: ${page}`);
                return page;
            }
        } catch (error) {
            console.log(`[Auth] Login page ${page} not accessible`);
        }
    }
    
    // If no login page found, show error
    return null;
}

// Initialize authentication with fallback
async function initializeAuthWithFallback() {
    const log = (msg) => {
        console.log(msg);
        const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
        logs.push(`${new Date().toISOString()}: ${msg}`);
        localStorage.setItem('pyebwaDebugLogs', JSON.stringify(logs.slice(-20)));
    };
    
    log('=== App initialization with fallback started ===');
    
    // Show loading state
    showLoadingState();
    
    // Check current auth state
    const immediateUser = auth.currentUser;
    log(`Immediate auth user: ${immediateUser ? immediateUser.email : 'null'}`);
    
    if (immediateUser) {
        log('User already authenticated - initializing immediately');
        currentUser = immediateUser;
        const userEmailEl = document.querySelector('.user-email');
        if (userEmailEl) {
            userEmailEl.textContent = immediateUser.email;
        }
        
        // Initialize family tree
        initializeUserFamilyTree().then(() => {
            hideLoadingState();
            showView('tree');
            log('App initialized successfully with immediate auth');
        }).catch(error => {
            log(`Error initializing app: ${error.message}`);
            console.error('Error initializing app:', error);
            hideLoadingState();
            showError('Error loading your family tree. Please try again.');
        });
        return;
    }
    
    // Set up auth state listener
    auth.onAuthStateChanged(async (user) => {
        log(`Auth state changed: ${user ? user.email : 'No user'}`);
        
        if (user) {
            // User is authenticated
            log('User authenticated successfully');
            currentUser = user;
            const userEmailEl = document.querySelector('.user-email');
            if (userEmailEl) {
                userEmailEl.textContent = user.email;
            }
            
            // Clear redirect data
            sessionStorage.removeItem('pyebwaRedirectData');
            localStorage.removeItem('lastRedirectTime');
            localStorage.removeItem('pyebwaVisitCount');
            
            try {
                await initializeUserFamilyTree();
                hideLoadingState();
                showView('tree');
                log('App initialized successfully');
            } catch (error) {
                log(`Error initializing app: ${error.message}`);
                console.error('Error initializing app:', error);
                hideLoadingState();
                showError('Error loading your family tree. Please try again.');
            }
        } else {
            // No user authenticated - find and redirect to login
            log('No user authenticated - searching for login page');
            
            if (!canRedirect()) {
                hideLoadingState();
                showError('Too many redirects. Please clear your browser cache and try again.');
                return;
            }
            
            const loginPage = await findLoginPage();
            if (loginPage) {
                log(`Redirecting to login page: ${loginPage}`);
                window.location.href = loginPage;
            } else {
                log('No login page found - showing error');
                hideLoadingState();
                showError('Login page not found. Please contact support or try again later.');
            }
        }
    }, (error) => {
        // Auth error
        log(`Auth error: ${error.message}`);
        console.error('Auth error:', error);
        hideLoadingState();
        showError('Authentication error. Please try again later.');
    });
}

// Replace the old initializeAuth with the new one
window.initializeAuth = initializeAuthWithFallback;

// Export for debugging
window.findLoginPage = findLoginPage;