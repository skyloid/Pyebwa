# Firebase Setup Instructions for pyebwa.com

## 1. Update Firebase Configuration

Edit `/js/firebase-config.js` and replace the placeholder values with your actual Firebase configuration:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## 2. Firebase Console Setup

1. **Enable Authentication**:
   - Go to Firebase Console → Authentication
   - Click "Get started"
   - Enable "Email/Password" provider
   - Save

2. **Set up Firestore Database**:
   - Go to Firestore Database
   - Click "Create database"
   - Start in production mode
   - Choose your region
   - Apply these security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Block all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. **Configure Authorized Domains**:
   - Go to Authentication → Settings
   - Add your domains:
     - `pyebwa.com`
     - `rasin.pyebwa.com`
     - `localhost` (for testing)

## 3. Testing Locally

1. Open `index.html` in a web browser
2. Test the signup flow:
   - Click "Enskri" (Sign Up)
   - Fill in the form
   - Submit
3. Check Firebase Console:
   - Authentication tab should show new user
   - Firestore should have a `users` collection with user profile

## 4. Features Implemented

- ✅ Multi-language support (EN/FR/HT)
- ✅ User registration with Firebase Auth
- ✅ User login with Firebase Auth
- ✅ Error handling with localized messages
- ✅ User profiles stored in Firestore
- ✅ Automatic redirect to rasin.pyebwa.com after login
- ✅ Session management

## 5. Security Notes

- Never commit your Firebase config with real API keys to public repos
- Use environment variables in production
- Enable Firebase App Check for additional security
- Consider adding reCAPTCHA to prevent abuse