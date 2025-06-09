# Authentication Testing Guide

## Overview
This guide provides step-by-step instructions for testing the authentication flow across pyebwa.com domains.

## Setup

### 1. Load Test Helpers
Open browser console on any pyebwa domain and run:
```javascript
// Load test helpers
const script = document.createElement('script');
script.src = '/test-auth-helpers.js';
document.head.appendChild(script);
```

### 2. Enable Debug UI
```javascript
window.injectDebugUI();
```

## Test Scenarios

### Test 1: Clean Login from pyebwa.com
**Purpose:** Verify basic login flow without redirect loops

1. **Clear all data:**
   ```javascript
   window.forceLogout();
   ```

2. **Visit pyebwa.com**

3. **Start monitoring:**
   ```javascript
   window.monitorAuth();
   localStorage.setItem('pyebwaDebugLogs', '[]');
   ```

4. **Click "Login" button**
   - Should redirect to: `secure.pyebwa.com/?redirect=https://pyebwa.com/`

5. **Complete authentication**

6. **Verify redirect:**
   - Should return to: `pyebwa.com/?auth=success&login=true`
   - URL should clean to just `pyebwa.com`

7. **Check auth state:**
   ```javascript
   window.showAuthState();
   ```

**Expected Result:** User authenticated on pyebwa.com, no loops

---

### Test 2: Cross-Domain Authentication
**Purpose:** Verify auth state persists across domains

1. **Ensure logged in on pyebwa.com** (from Test 1)

2. **Open new tab, visit rasin.pyebwa.com/app**

3. **Check immediate auth:**
   ```javascript
   window.showAuthState();
   window.showDebugLogs();
   ```

**Expected Result:** App loads without redirect, user already authenticated

---

### Test 3: Direct App Access (Not Logged In)
**Purpose:** Verify redirect to login when accessing app directly

1. **Clear all auth:**
   ```javascript
   window.forceLogout();
   ```

2. **Visit rasin.pyebwa.com/app directly**

3. **Monitor redirect:**
   - Should see "Verifying authentication..." message
   - After ~3 seconds, should redirect to secure.pyebwa.com

4. **Complete login**

5. **Verify return:**
   - Should come back to rasin.pyebwa.com/app
   - App should load successfully

**Expected Result:** Smooth login and return to app

---

### Test 4: Redirect Loop Prevention
**Purpose:** Verify loop prevention mechanism works

1. **Set up loop condition:**
   ```javascript
   window.testRedirectLoop();
   ```

2. **Simulate auth failure:**
   ```javascript
   window.simulateAuthDelay(30000); // 30 second delay
   ```

3. **Reload the page**

4. **Observe behavior:**
   - Should see redirect attempts in console
   - After 3rd redirect, should show error message

**Expected Result:** "Authentication loop detected" error shown

---

### Test 5: Login with Specific Redirect
**Purpose:** Test login with intent to reach specific page

1. **Clear auth:**
   ```javascript
   window.forceLogout();
   ```

2. **Visit pyebwa.com**

3. **Manually navigate to login with redirect:**
   ```javascript
   window.location.href = 'https://secure.pyebwa.com/?redirect=' + 
     encodeURIComponent('https://rasin.pyebwa.com/app/');
   ```

4. **Complete authentication**

5. **Verify final destination:**
   - Should end up at rasin.pyebwa.com/app

**Expected Result:** Direct navigation to intended destination

---

## Debugging Tools

### Check Current State
```javascript
// Show all auth info
window.showAuthState();

// Check redirect data
window.checkRedirectData();

// Show debug logs
window.showDebugLogs();

// Show auth event history
window.showAuthEvents();
```

### Simulate Issues
```javascript
// Simulate slow auth sync
window.simulateAuthDelay(5000);

// Force redirect loop scenario
window.testRedirectLoop();

// Clear all data and start fresh
window.forceLogout();
```

### Monitor in Real-Time
```javascript
// Start monitoring auth changes
window.monitorAuth();

// Stop monitoring
window.stopAuthMonitor();

// Watch redirect data
setInterval(() => {
  console.log('Redirect count:', window.checkRedirectData().count);
}, 1000);
```

## Common Issues and Solutions

### Issue: Stuck in redirect loop
**Solution:**
1. Check redirect count:
   ```javascript
   window.checkRedirectData();
   ```
2. Clear redirect data:
   ```javascript
   window.clearRedirectLoop();
   ```
3. Force logout and retry:
   ```javascript
   window.forceLogout();
   ```

### Issue: Auth state not syncing
**Solution:**
1. Check Firebase persistence:
   ```javascript
   firebase.auth().currentUser
   ```
2. Verify same Firebase project across domains
3. Check browser console for errors

### Issue: "Authentication loop detected" error
**Solution:**
1. Clear browser cache and cookies
2. Check if third-party cookies are blocked
3. Verify Firebase auth domain settings

## Performance Metrics

### Measure Auth Flow Time
```javascript
// Start timer when clicking login
console.time('auth-flow');

// Stop timer when app loads
console.timeEnd('auth-flow');
```

### Check Redirect Count
```javascript
// After successful login
const redirectData = window.checkRedirectData();
console.log('Total redirects:', redirectData.count || 0);
```

## Automated Test Script
Run this to perform basic auth flow test:

```javascript
async function runAuthTest() {
  console.log('🧪 Starting automated auth test...');
  
  // Step 1: Clear state
  console.log('1️⃣ Clearing auth state...');
  await window.forceLogout();
  
  // Step 2: Check initial state
  console.log('2️⃣ Initial state:');
  window.showAuthState();
  
  // Step 3: Log events
  console.log('3️⃣ Monitoring auth events...');
  window.monitorAuth();
  
  console.log('✅ Test setup complete!');
  console.log('👉 Now manually click login and complete authentication');
  console.log('👉 Then run: window.showAuthEvents()');
}

// Run the test
runAuthTest();
```

## Success Criteria

✅ **Test passes if:**
- No redirect loops occur
- Auth state persists across domains
- Login completes in < 5 seconds
- No console errors
- Clean URLs after auth (no lingering parameters)

❌ **Test fails if:**
- More than 2 redirects occur
- Auth state lost between domains
- Errors in console
- User stuck on loading screen
- URL parameters remain after auth