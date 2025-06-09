# Login Loop Analysis and Fix

## Problem Identification

After thorough analysis of the authentication flow, I've identified the root cause of the login loop:

### The Loop Pattern

1. User logs in at `secure.pyebwa.com`
2. Redirects to `www.pyebwa.com` with `auth=success&login=true`
3. `www.pyebwa.com` redirects to `rasin.pyebwa.com/app` with `login=true&auth=success`
4. `rasin.pyebwa.com/app` checks Firebase auth state
5. **PROBLEM**: Auth state is not properly synchronized across domains
6. `rasin.pyebwa.com/app` doesn't find authenticated user
7. Redirects back to `www.pyebwa.com` (line 189 in app.js)
8. Loop continues...

### Root Causes

1. **Cross-Domain Auth State Loss**: Firebase auth state is not properly shared between domains
2. **Timing Issues**: The app checks auth state too quickly before Firebase has time to sync
3. **Incorrect Redirect Logic**: The app redirects to www.pyebwa.com instead of secure.pyebwa.com
4. **Missing Auth Token Handling**: The ID token is not being passed or used for cross-domain auth

## Current Flow Issues

### In `/app/js/app.js` (lines 176-189):

```javascript
// When coming from login but no auth found
if (fromLogin || authSuccess === 'success') {
    // Waits up to 10 seconds checking auth
    // If still no auth, redirects to secure.pyebwa.com
} else {
    // Not from login - redirects to www.pyebwa.com (WRONG!)
    window.location.href = 'https://www.pyebwa.com';
}
```

### In `secure-app.js` (lines 39-42):

```javascript
// Redirects through www.pyebwa.com for cross-domain auth
if (currentDomain !== targetDomain && targetDomain === 'rasin.pyebwa.com') {
    window.location.href = 'https://pyebwa.com/?auth=success&login=true&redirect=' + encodeURIComponent(redirectUrl);
}
```

## The Fix

### 1. Fix Redirect Logic in app.js

The main issue is on line 189 where it redirects to www.pyebwa.com instead of the login page:

```javascript
// WRONG:
window.location.href = 'https://www.pyebwa.com';

// CORRECT:
window.location.href = 'https://secure.pyebwa.com/?redirect=' + encodeURIComponent(window.location.href);
```

### 2. Improve Auth State Detection

Add more robust auth state checking with proper timing:

```javascript
// Give Firebase more time to sync auth state
let authCheckCount = 0;
const maxChecks = 20; // Increase from 10 to 20
const checkInterval = 1500; // Increase from 1000ms to 1500ms
```

### 3. Add Token-Based Authentication

Pass and use the ID token for immediate authentication:

```javascript
// In secure-app.js - pass token
const idToken = await user.getIdToken();
window.location.href = redirectUrl + '&token=' + encodeURIComponent(idToken);

// In app.js - use token
const authToken = urlParams.get('token');
if (authToken) {
    // Sign in with the token
    await auth.signInWithCustomToken(authToken);
}
```

### 4. Add Auth State Persistence

Ensure auth state persists across page loads:

```javascript
// Set persistence before any auth operations
await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
```

## Immediate Fix

The quickest fix is to update line 189 in `/app/js/app.js`:

```javascript
// Change this:
window.location.href = 'https://www.pyebwa.com';

// To this:
window.location.href = 'https://secure.pyebwa.com/?redirect=' + encodeURIComponent(window.location.href);
```

This will ensure users are redirected to the login page instead of creating a loop.

## Testing Steps

1. Clear all browser storage (localStorage, sessionStorage, cookies)
2. Visit `rasin.pyebwa.com/app` directly
3. Should redirect to `secure.pyebwa.com` for login
4. After login, should redirect back to `rasin.pyebwa.com/app`
5. Should stay logged in without looping

## Diagnostic Tool

Use the diagnostic tool at `rasin.pyebwa.com/diagnose-login-loop.html` to:
- Check current auth state
- View redirect parameters
- Monitor the authentication flow
- Test different scenarios