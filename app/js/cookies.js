// Cookie utility functions for Pyebwa app

// Set a cookie
function setCookie(name, value, days = 365) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    // Set cookie for both current domain and parent domain
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
    // Also try to set for parent domain to share across subdomains
    document.cookie = `${name}=${value};${expires};path=/;domain=.pyebwa.com;SameSite=Lax`;
}

// Get a cookie
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Delete a cookie
function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.pyebwa.com;`;
}

// Store user preferences
function storeUserPreference(key, value) {
    // Store in cookie for cross-domain access
    setCookie(`pyebwa_${key}`, value);
    // Also store in localStorage for faster access
    localStorage.setItem(`pyebwa${key.charAt(0).toUpperCase() + key.slice(1)}`, value);
}

// Get user preference (check cookie first, then localStorage)
function getUserPreference(key, defaultValue) {
    // Check cookie first
    const cookieValue = getCookie(`pyebwa_${key}`);
    if (cookieValue) return cookieValue;
    
    // Check localStorage
    const localValue = localStorage.getItem(`pyebwa${key.charAt(0).toUpperCase() + key.slice(1)}`);
    if (localValue) return localValue;
    
    return defaultValue;
}

// Export functions
window.setCookie = setCookie;
window.getCookie = getCookie;
window.deleteCookie = deleteCookie;
window.storeUserPreference = storeUserPreference;
window.getUserPreference = getUserPreference;