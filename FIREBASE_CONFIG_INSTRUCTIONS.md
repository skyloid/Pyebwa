# Firebase Configuration Setup Instructions

## The Issue
Your website is trying to use Firebase with placeholder values (`YOUR_API_KEY`), which is why authentication is failing.

## How to Fix It

### Step 1: Get Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create one if you haven't)
3. Click the gear icon ⚙️ → **Project settings**
4. Scroll down to **Your apps** section
5. If you don't have a web app:
   - Click **Add app** → Web icon 🌐
   - Register your app with a nickname (e.g., "Pyebwa Web")
   - Copy the configuration object

### Step 2: Your Config Should Look Like This

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDOCAbC123dEf456GhI789jKl012-MnO",
  authDomain: "pyebwa-app.firebaseapp.com",
  projectId: "pyebwa-app",
  storageBucket: "pyebwa-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345"
};
```

### Step 3: Update the File on Your Server

You need to update `/js/firebase-config.js` on www.pyebwa.com with your actual configuration.

#### Option A: Direct FTP Update
1. Download the current `firebase-config.js` from your FTP
2. Replace the placeholder values with your real Firebase config
3. Upload it back to `/js/firebase-config.js`

#### Option B: Let Me Update It
If you provide your Firebase configuration values, I can create an updated file and upload it via FTP.

### Step 4: Also Update on rasin.pyebwa.com

Don't forget to update the same configuration in:
- `/auth-handler.html` on rasin.pyebwa.com

Both sites MUST use the same Firebase project configuration.

## Quick Checklist

- [ ] Get Firebase configuration from Firebase Console
- [ ] Update firebase-config.js on www.pyebwa.com
- [ ] Update auth-handler.html on rasin.pyebwa.com
- [ ] Add authorized domains in Firebase Console:
  - www.pyebwa.com
  - pyebwa.com
  - rasin.pyebwa.com
- [ ] Enable Email/Password authentication in Firebase Console

## Still Having Issues?

Common problems:
1. **Wrong API key format**: Make sure you copied the entire key
2. **Domain not authorized**: Add your domains in Firebase Console → Authentication → Settings
3. **Authentication not enabled**: Enable Email/Password in Authentication → Sign-in method