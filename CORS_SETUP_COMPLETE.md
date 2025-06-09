# CORS Setup Complete - Action Items

## 1. Firebase Console Configuration

Go to [Firebase Console](https://console.firebase.google.com) and add these authorized domains:

- `www.pyebwa.com`
- `pyebwa.com`
- `rasin.pyebwa.com`
- `localhost` (for testing)

Navigate to: **Authentication → Settings → Authorized domains**

## 2. Update Files on www.pyebwa.com

### In `app.js`, update both redirect URLs:

```javascript
// In loginForm handler:
window.location.href = 'https://rasin.pyebwa.com/auth-handler.html';

// In signupForm handler:
window.location.href = 'https://rasin.pyebwa.com/auth-handler.html';
```

### In `firebase-config.js`, ensure you have the correct Firebase configuration.

## 3. Files Created on rasin.pyebwa.com

- **`/auth-handler.html`** - Handles authentication verification when users arrive from www.pyebwa.com
- **`/.htaccess`** - Configured CORS headers to allow requests from www.pyebwa.com

## 4. Important Notes

- Both sites MUST use the same Firebase project configuration
- The `auth-handler.html` file needs your actual Firebase config values
- Users will flow like this:
  1. Visit www.pyebwa.com
  2. Sign up/Login
  3. Redirect to rasin.pyebwa.com/auth-handler.html
  4. Auth verified → redirect to main app
  5. Auth failed → redirect back to www.pyebwa.com

## 5. Testing

1. Clear browser cache and cookies
2. Visit www.pyebwa.com
3. Try signing up or logging in
4. Verify redirect to rasin.pyebwa.com works
5. Check browser console for any CORS errors

## 6. Troubleshooting

If you get CORS errors:
- Verify domains are added in Firebase Console
- Check that both sites use HTTPS
- Ensure Firebase config matches on both sites
- Check browser console for specific error messages