# Firebase Authentication Fixed

## Problem
The login page was showing error: "auth/api-key-not-valid"

## Root Cause
The login.html file was using a different Firebase project configuration than the main app:
- Login.html had: `pyebwa-8f81f` project
- App uses: `pyebwa-f5960` project

## Solution
Updated login.html to use the same Firebase configuration as the app:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyApTHhm_Ia0sz63YDw2mYXiXp_qED7NdOQ",
    authDomain: "pyebwa-f5960.firebaseapp.com",
    projectId: "pyebwa-f5960",
    storageBucket: "pyebwa-f5960.firebasestorage.app",
    messagingSenderId: "1042887343749",
    appId: "1:1042887343749:web:c276bf69b6c0895111f3ec",
    measurementId: "G-ZX92K1TMM3"
};
```

## Files Modified
- `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/login.html` - Updated Firebase config
- `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server.js` - Added routes for login and test pages

## Authentication Flow Now Working
1. Visit: https://rasin.pyebwa.com/app/
2. Redirected to: https://rasin.pyebwa.com/login.html
3. Login with Firebase credentials
4. Redirected back to: https://rasin.pyebwa.com/app/

## Test URLs
- Verify Firebase: https://rasin.pyebwa.com/verify-firebase-auth.html
- Test Auth Flow: https://rasin.pyebwa.com/test-auth-flow-final.html

## Important Notes
- Make sure rasin.pyebwa.com is in Firebase authorized domains
- The app and login page now use the same Firebase project
- Authentication persistence is set to LOCAL (survives browser restarts)