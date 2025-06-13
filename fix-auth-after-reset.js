// Quick fix for authentication issues after password reset
// This script ensures proper Firebase auth state handling

// Add this to handle auth persistence issues
if (typeof firebase !== 'undefined' && firebase.auth) {
    const auth = firebase.auth();
    
    // Force refresh auth state
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                // Reload user to get fresh token
                await user.reload();
                console.log('User auth refreshed:', user.email);
                
                // Get fresh ID token
                const token = await user.getIdToken(true);
                console.log('Fresh token obtained');
                
            } catch (error) {
                console.error('Error refreshing auth:', error);
                
                // If token refresh fails, sign out and require fresh login
                if (error.code === 'auth/user-token-expired' || 
                    error.code === 'auth/invalid-user-token') {
                    console.log('Token expired, signing out...');
                    await auth.signOut();
                    window.location.href = '/login.html';
                }
            }
        }
    });
    
    // Handle network issues
    auth.settings.experimentalForceLongPolling = true;
    
    // Ensure persistence is set correctly
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .catch((error) => {
            console.error('Persistence error:', error);
        });
}

// Function to force re-authentication
window.forceReauth = async function(email, password) {
    try {
        const auth = firebase.auth();
        
        // Sign out first
        await auth.signOut();
        console.log('Signed out');
        
        // Clear any cached credentials
        if (auth.currentUser) {
            await auth.currentUser.delete();
        }
        
        // Sign in fresh
        const result = await auth.signInWithEmailAndPassword(email, password);
        console.log('Re-authenticated successfully:', result.user.email);
        
        return result;
    } catch (error) {
        console.error('Re-auth error:', error);
        throw error;
    }
};