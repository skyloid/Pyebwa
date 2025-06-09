# Firebase Configuration Required

## 1. Firestore Security Rules

The current error "Missing or insufficient permissions" means the Firestore security rules need to be updated.

Go to Firebase Console → Firestore Database → Rules and update to:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to create family trees
    match /familyTrees/{treeId} {
      allow read: if request.auth != null && 
        (resource.data.ownerId == request.auth.uid || 
         request.auth.uid in resource.data.memberIds);
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (resource.data.ownerId == request.auth.uid || 
         request.auth.uid in resource.data.memberIds);
      allow delete: if request.auth != null && 
        resource.data.ownerId == request.auth.uid;
      
      // Allow access to subcollections
      match /{subcollection=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

## 2. Firebase Storage CORS Configuration

The storage upload is failing due to CORS. You need to:

1. Install Google Cloud SDK on your local machine
2. Create a cors.json file:

```json
[
  {
    "origin": ["https://www.pyebwa.com", "https://rasin.pyebwa.com"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"]
  }
]
```

3. Run:
```bash
gsutil cors set cors.json gs://pyebwa-f5960.firebasestorage.app
```

## 3. Storage Security Rules

Go to Firebase Console → Storage → Rules and update to:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /familyTrees/{treeId}/photos/{photoId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

## 4. Add Authorized Domains

Go to Firebase Console → Authentication → Settings → Authorized domains and ensure both domains are added:
- www.pyebwa.com
- rasin.pyebwa.com

## Current Status

- ✅ Authentication is working
- ❌ Firestore rules need updating (permission denied)
- ❌ Storage CORS needs configuration
- ✅ Domains are authorized (you mentioned this earlier)

Once you update the Firestore rules, the app should start working for adding family members (without photos). The photo upload will work after configuring Storage CORS.