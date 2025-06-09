# Authentication Flow Test Scenarios

## Current Authentication Flow Analysis

### 1. **pyebwa.com Homepage Flow**
- Login button redirects to: `https://secure.pyebwa.com/?redirect=[current_url]`
- After successful auth, secure.pyebwa.com redirects to: `https://pyebwa.com/?auth=success&login=true&redirect=[final_destination]`
- pyebwa.com then redirects to the final destination with auth parameters

### 2. **Potential Issues Identified**

#### Issue 1: Redirect Loop Risk
- The app uses `sessionStorage` to track redirect counts
- If redirect count > 2 within 5 minutes, it stops redirecting
- However, there's a potential loop between pyebwa.com and rasin.pyebwa.com

#### Issue 2: Auth State Synchronization
- Firebase auth state may not sync immediately across domains
- The app implements exponential backoff (up to 10 checks) to wait for auth
- Maximum wait time: ~15 seconds before redirecting to login

#### Issue 3: Double Redirect Through pyebwa.com
- When going to rasin.pyebwa.com, it goes through pyebwa.com first
- This adds complexity and potential failure points

## Test Scenarios

### Test 1: Direct Login from pyebwa.com
**Steps:**
1. Visit pyebwa.com
2. Click login button
3. Complete authentication on secure.pyebwa.com
4. Verify redirect back to pyebwa.com
5. Check no redirect loop occurs

**Expected Result:** User stays on pyebwa.com after login

### Test 2: Login with Redirect to rasin.pyebwa.com
**Steps:**
1. Visit pyebwa.com
2. Click login button
3. Complete authentication
4. Should redirect through pyebwa.com to rasin.pyebwa.com/app

**Expected Result:** User ends up on rasin.pyebwa.com/app without loops

### Test 3: Direct Access to rasin.pyebwa.com/app (Not Logged In)
**Steps:**
1. Clear all cookies/storage
2. Visit rasin.pyebwa.com/app directly
3. Should redirect to secure.pyebwa.com
4. Complete authentication
5. Should return to rasin.pyebwa.com/app

**Expected Result:** Successful auth and return to app

### Test 4: Already Logged In - Cross Domain
**Steps:**
1. Login on pyebwa.com
2. Visit rasin.pyebwa.com/app directly
3. Check if auth state is recognized

**Expected Result:** No redirect, app loads immediately

### Test 5: Redirect Loop Prevention
**Steps:**
1. Simulate failed auth state sync
2. Let the app redirect 3 times
3. Check if loop prevention activates

**Expected Result:** Error message shown, no more redirects

## Fixes to Implement

### Fix 1: Simplify Redirect Flow
Remove the double redirect through pyebwa.com when going to rasin.pyebwa.com:

```javascript
// In secure-app.js, line 39-47
if (currentDomain !== targetDomain && targetDomain === 'rasin.pyebwa.com') {
    // Direct redirect to rasin.pyebwa.com instead of going through pyebwa.com
    const separator = redirectUrl.includes('?') ? '&' : '?';
    window.location.href = redirectUrl + separator + 'auth=success&login=true';
} else {
    // Direct redirect for same domain or pyebwa.com
    const separator = redirectUrl.includes('?') ? '&' : '?';
    window.location.href = redirectUrl + separator + 'auth=success&login=true';
}
```

### Fix 2: Improve Auth State Detection
Add immediate auth state check before redirect:

```javascript
// In rasin.pyebwa.com/app/js/app.js
// Add this before the auth state listener
const immediateUser = auth.currentUser;
if (immediateUser) {
    log('Immediate auth state found');
    currentUser = immediateUser;
    // Continue with initialization
}
```

### Fix 3: Add Auth State Persistence
Use Firebase auth persistence to maintain state across domains:

```javascript
// In firebase-config.js
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log('Auth persistence set to LOCAL');
    })
    .catch((error) => {
        console.error('Error setting persistence:', error);
    });
```

### Fix 4: Add Clear Debug Messages
Show user-friendly messages during auth flow:

```javascript
// In app.js
showLoadingState('Verifying authentication...');
// Instead of generic "Loading..."
```

## Testing Implementation

### Manual Test Script
```bash
# Test 1: Clear state and test login
# 1. Open browser dev tools
# 2. Clear all site data: Application > Storage > Clear site data
# 3. Visit pyebwa.com
# 4. Open console and run: localStorage.setItem('pyebwaDebugLogs', '[]')
# 5. Click login and complete auth
# 6. Check logs: window.showDebugLogs()

# Test 2: Test cross-domain auth
# 1. After login on pyebwa.com
# 2. Open new tab, visit rasin.pyebwa.com/app
# 3. Check if redirected or loads immediately
# 4. Check logs for auth state

# Test 3: Test redirect loop prevention
# 1. Block Firebase auth (using dev tools network blocking)
# 2. Try to access rasin.pyebwa.com/app
# 3. Let it redirect 3 times
# 4. Verify error message appears
```

### Automated Test Helpers
Add these to the console for testing:

```javascript
// Force auth state change
window.forceLogout = () => {
    auth.signOut();
    sessionStorage.clear();
    localStorage.removeItem('pyebwaDebugLogs');
    location.reload();
};

// Check redirect data
window.checkRedirectData = () => {
    const data = JSON.parse(sessionStorage.getItem('pyebwaRedirectData') || '{}');
    console.log('Redirect count:', data.count);
    console.log('Last redirect:', new Date(data.timestamp || 0).toLocaleString());
};

// Simulate auth delay
window.simulateAuthDelay = () => {
    const originalCurrentUser = Object.getOwnPropertyDescriptor(auth, 'currentUser');
    Object.defineProperty(auth, 'currentUser', {
        get: function() {
            console.log('Simulating auth delay...');
            return null;
        }
    });
    setTimeout(() => {
        Object.defineProperty(auth, 'currentUser', originalCurrentUser);
        console.log('Auth delay ended');
    }, 5000);
};
```

## Monitoring and Logging

### Add Analytics Events
Track auth flow success/failure:

```javascript
// Add to app.js
function logAuthEvent(event, data = {}) {
    console.log(`[AUTH_EVENT] ${event}`, data);
    // Could also send to analytics service
}

// Usage:
logAuthEvent('auth_redirect_start', { from: 'pyebwa.com', to: 'secure.pyebwa.com' });
logAuthEvent('auth_success', { method: 'email' });
logAuthEvent('auth_redirect_loop_prevented', { count: redirectCount });
```