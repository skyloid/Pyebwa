// Authentication Loop Fix Script
// This script diagnoses and fixes authentication loops

console.log('[Auth Loop Fix] Script loaded');

// Function to check and fix authentication issues
function fixAuthLoop() {
    console.log('[Auth Loop Fix] Checking for authentication issues...');
    
    // 1. Check redirect data
    const redirectData = sessionStorage.getItem('pyebwaRedirectData');
    if (redirectData) {
        const data = JSON.parse(redirectData);
        console.log('[Auth Loop Fix] Redirect data found:', data);
        
        if (data.count > 2) {
            console.log('[Auth Loop Fix] Loop detected! Clearing redirect data...');
            sessionStorage.removeItem('pyebwaRedirectData');
        }
    }
    
    // 2. Check Firebase auth state
    if (typeof firebase !== 'undefined' && firebase.auth) {
        const auth = firebase.auth();
        
        // Add a one-time auth state listener
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('[Auth Loop Fix] User authenticated:', user.email);
                
                // Ensure we're not in a redirect loop
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('auth') || urlParams.has('login')) {
                    console.log('[Auth Loop Fix] Cleaning URL parameters...');
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
                
                // Clear any redirect data
                sessionStorage.removeItem('pyebwaRedirectData');
            } else {
                console.log('[Auth Loop Fix] No user authenticated');
                
                // Check if we're already on the login page
                if (window.location.hostname === 'secure.pyebwa.com') {
                    console.log('[Auth Loop Fix] Already on login page');
                } else {
                    // Check redirect count
                    const redirectData = sessionStorage.getItem('pyebwaRedirectData');
                    if (redirectData) {
                        const data = JSON.parse(redirectData);
                        if (data.count > 2) {
                            console.log('[Auth Loop Fix] Too many redirects, stopping');
                            return;
                        }
                    }
                }
            }
            
            // Unsubscribe after first check
            unsubscribe();
        });
    }
    
    // 3. Add emergency stop button
    if (document.body) {
        const stopButton = document.createElement('button');
        stopButton.textContent = 'Stop Auth Loop';
        stopButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: red;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            z-index: 9999;
            display: none;
        `;
        
        stopButton.onclick = () => {
            console.log('[Auth Loop Fix] Emergency stop activated');
            sessionStorage.clear();
            localStorage.setItem('authLoopStopped', 'true');
            window.location.href = '/';
        };
        
        document.body.appendChild(stopButton);
        
        // Show button if loop detected
        const redirectData = sessionStorage.getItem('pyebwaRedirectData');
        if (redirectData) {
            const data = JSON.parse(redirectData);
            if (data.count > 1) {
                stopButton.style.display = 'block';
            }
        }
    }
}

// Run fix when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixAuthLoop);
} else {
    fixAuthLoop();
}

// Export for testing
window.authLoopFix = {
    checkRedirectCount: () => {
        const data = sessionStorage.getItem('pyebwaRedirectData');
        return data ? JSON.parse(data).count : 0;
    },
    clearRedirectData: () => {
        sessionStorage.removeItem('pyebwaRedirectData');
        console.log('[Auth Loop Fix] Redirect data cleared');
    },
    forceStopLoop: () => {
        sessionStorage.clear();
        window.location.href = '/';
    }
};