// Cross-domain authentication bridge
// This handles passing authentication state between domains

// Function to securely pass auth state to another domain
async function bridgeAuthToSubdomain(user, targetDomain) {
    try {
        // Get the ID token
        const idToken = await user.getIdToken();
        
        // Get additional user info
        const userInfo = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified
        };
        
        // Create a temporary bridge token in sessionStorage
        const bridgeData = {
            idToken: idToken,
            userInfo: userInfo,
            timestamp: Date.now(),
            origin: window.location.origin
        };
        
        // Store in sessionStorage (will be cleared after use)
        sessionStorage.setItem('pyebwaAuthBridge', JSON.stringify(bridgeData));
        
        // Redirect with a bridge flag
        window.location.href = `${targetDomain}?authBridge=true`;
        
    } catch (error) {
        console.error('Error bridging auth:', error);
        throw error;
    }
}

// Function to receive auth state from another domain
async function receiveBridgedAuth() {
    try {
        // Check if we have bridge data
        const bridgeDataStr = sessionStorage.getItem('pyebwaAuthBridge');
        if (!bridgeDataStr) {
            return null;
        }
        
        const bridgeData = JSON.parse(bridgeDataStr);
        
        // Validate timestamp (max 5 minutes old)
        if (Date.now() - bridgeData.timestamp > 5 * 60 * 1000) {
            sessionStorage.removeItem('pyebwaAuthBridge');
            return null;
        }
        
        // Clear the bridge data immediately
        sessionStorage.removeItem('pyebwaAuthBridge');
        
        return bridgeData;
        
    } catch (error) {
        console.error('Error receiving bridged auth:', error);
        return null;
    }
}

// Function to sign in with bridged credentials
async function signInWithBridgedAuth(bridgeData) {
    try {
        // Try to sign in with the ID token
        // This requires a backend function or Firebase Admin SDK
        // For now, we'll return the data for manual sign-in
        return {
            success: true,
            idToken: bridgeData.idToken,
            userInfo: bridgeData.userInfo
        };
        
    } catch (error) {
        console.error('Error signing in with bridged auth:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Export functions for use in other scripts
window.authBridge = {
    bridgeAuthToSubdomain,
    receiveBridgedAuth,
    signInWithBridgedAuth
};