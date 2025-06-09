// Clean up URL parameters to prevent loops
(function() {
    // Check if URL has auth parameters
    const url = new URL(window.location.href);
    const hasAuthParams = url.searchParams.has('auth') || 
                         url.searchParams.has('login') || 
                         url.searchParams.has('authBridge');
    
    if (hasAuthParams) {
        console.log('Cleaning auth parameters from URL');
        // Remove all auth-related parameters
        url.searchParams.delete('auth');
        url.searchParams.delete('login');
        url.searchParams.delete('authBridge');
        url.searchParams.delete('redirect');
        
        // Replace the URL without reloading the page
        window.history.replaceState({}, document.title, url.pathname + url.search);
    }
})();