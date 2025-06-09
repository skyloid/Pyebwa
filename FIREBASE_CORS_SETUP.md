# Firebase CORS Setup for www.pyebwa.com

Since www.pyebwa.com is hosted on a different server than rasin.pyebwa.com, you need to configure Firebase to allow cross-origin requests.

## 1. Firebase Console - Authorized Domains

Go to [Firebase Console](https://console.firebase.google.com) and add these domains:

1. **Authentication → Settings → Authorized domains**:
   - Add `www.pyebwa.com`
   - Add `pyebwa.com` 
   - Add `rasin.pyebwa.com`
   - Keep `localhost` for testing

2. **Click "Add domain"** for each one and save.

## 2. Update Firebase Configuration

In your `firebase-config.js` file on www.pyebwa.com, make sure you have:

```javascript
// Add auth domain that matches your Firebase project
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR-PROJECT.firebaseapp.com", // This should be your Firebase auth domain
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## 3. CORS Configuration for rasin.pyebwa.com

Since users will be redirected from www.pyebwa.com to rasin.pyebwa.com, you need to handle the authentication state transfer.