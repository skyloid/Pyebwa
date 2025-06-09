# Firebase Storage Setup Instructions

## Current Issue
The Firebase Storage bucket hasn't been created yet. This is why you're getting CORS errors - the storage service isn't initialized.

## Solution

### Step 1: Enable Firebase Storage
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **pyebwa-f5960**
3. Click on **Storage** in the left menu
4. Click **"Get Started"**
5. Accept the default security rules for now
6. Choose a location (select the same region as your other Firebase services)
7. Click **"Done"**

This will automatically create the default storage bucket: `pyebwa-f5960.appspot.com`

### Step 2: Apply CORS Configuration

After the bucket is created, apply the CORS configuration using ONE of these methods:

#### Option A: Google Cloud Console (Easiest)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: **pyebwa-f5960**
3. Go to **Cloud Storage** → **Buckets**
4. Click on `pyebwa-f5960.appspot.com`
5. Click on **Configuration** tab
6. Find **CORS configuration** and click **EDIT**
7. Paste this configuration:

```json
[
  {
    "origin": ["https://www.pyebwa.com", "https://pyebwa.com", "https://rasin.pyebwa.com", "http://localhost:3000"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type",
      "Authorization",
      "Content-Length",
      "X-Requested-With",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Headers",
      "Access-Control-Allow-Methods",
      "x-goog-resumable"
    ]
  }
]
```

#### Option B: Using gsutil
```bash
# Install Google Cloud SDK first
# Then:
gsutil cors set cors.json gs://pyebwa-f5960.appspot.com
```

### Step 3: Update Storage Rules (Important!)

In Firebase Console → Storage → Rules, update to:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /familyTrees/{treeId}/photos/{photoId} {
      allow read: if true;  // Public read for photos
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

## What We Fixed in Your Code
- ✅ Changed storage bucket URL from `.firebasestorage.app` to `.appspot.com`
- ✅ Fixed CSS syntax error
- ✅ Prepared CORS configuration

## After Setup
1. Clear browser cache
2. Try uploading a photo again at https://rasin.pyebwa.com/app/
3. The upload should work!

## Note
The billing error we encountered suggests your Firebase project is on the free Spark plan. Firebase Storage should still work for basic usage on the free plan, but you'll have these limits:
- 5GB storage
- 1GB/day bandwidth
- 20K/day upload operations

This should be sufficient for your family tree application.