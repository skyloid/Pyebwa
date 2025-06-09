# Firebase Final Setup - Action Required

## ✅ Completed:
1. Updated firebase-config.js on www.pyebwa.com with your real Firebase configuration
2. Updated auth-handler.html on rasin.pyebwa.com with the same configuration

## 🔴 Critical: Add Authorized Domains in Firebase Console

You MUST add these domains to Firebase or authentication will fail:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **pyebwa-f5960**
3. Navigate to: **Authentication → Settings → Authorized domains**
4. Add these domains:
   - `www.pyebwa.com`
   - `pyebwa.com`
   - `rasin.pyebwa.com`
   - `localhost` (for testing)

## 🔴 Enable Authentication Methods

1. In Firebase Console, go to: **Authentication → Sign-in method**
2. Enable **Email/Password** authentication
3. Save

## 🔴 Enable Firestore Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Choose production mode
4. Select your preferred location
5. Apply these security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow users to read/write their family trees
    match /familyTrees/{treeId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.memberIds;
      
      match /{subcollection}/{document=**} {
        allow read, write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/familyTrees/$(treeId)).data.memberIds;
      }
    }
    
    // Block all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Testing Your Setup

1. Clear your browser cache
2. Visit https://www.pyebwa.com
3. Try signing up with a test email
4. Check Firebase Console → Authentication to see if the user was created

## Troubleshooting

If you get errors:
- **"unauthorized domain"**: Add domains in Firebase Console
- **"auth/project-not-authorized"**: Enable Email/Password authentication
- **"firestore not initialized"**: Create Firestore database