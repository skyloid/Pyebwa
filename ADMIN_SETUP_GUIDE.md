# Admin Setup Guide for claude@humanlevel.ai

## Quick Fix: Update Your User Document in Firebase Console

### Step 1: Access Firebase Console
1. Go to: https://console.firebase.google.com/project/pyebwa-f5960/firestore/data/~2Fusers
2. Sign in with your Google account (you'll need access to the pyebwa-f5960 project)

### Step 2: Find Your User Document
1. In the Firestore Database view, you should see the `users` collection
2. Look for a document with your email `claude@humanlevel.ai`
3. The document ID might be your Firebase Auth UID or could be named differently

### Step 3: Add Required Fields
Click on your user document and add/update these fields:

1. **role** (string): `superadmin`
2. **isAdmin** (boolean): `true`
3. **adminPromotedBy** (string): `firebase-console`
4. **adminPromotedAt** (timestamp): Click the clock icon to set current timestamp

### Step 4: Save Changes
1. Click "Save" or "Update" to apply the changes
2. The changes take effect immediately

### Step 5: Verify Access
1. Go back to https://rasin.pyebwa.com/admin
2. Refresh the page (Ctrl+F5 or Cmd+Shift+R)
3. Navigate to Trees or Audit Logs - they should now load without errors

## Alternative: Using Browser Console

If you can't access Firebase Console, try this in your browser console while on the admin dashboard:

```javascript
// First, check if you're authenticated
firebase.auth().currentUser

// If authenticated, try to find your user document
firebase.firestore().collection('users').where('email', '==', 'claude@humanlevel.ai').get().then(snap => {
    if (!snap.empty) {
        const doc = snap.docs[0];
        console.log('Found user document:', doc.id);
        console.log('Current data:', doc.data());
        
        // Try to update (this might fail due to permissions)
        doc.ref.update({
            role: 'superadmin',
            isAdmin: true,
            adminPromotedBy: 'console-command',
            adminPromotedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log('Success! Refresh the page.');
        }).catch(err => {
            console.error('Update failed:', err.message);
            console.log('Use Firebase Console instead.');
        });
    }
});
```

## What This Fixes
- ✅ Family Trees management will load properly
- ✅ Audit logs will be accessible
- ✅ All admin features will work without permission errors
- ✅ The temporary auth bypass won't be needed anymore

## Troubleshooting
- If you can't find your user document, it might not exist yet
- If the document doesn't exist, you may need to create it with your UID as the document ID
- Make sure you're signed in with claude@humanlevel.ai when accessing the admin dashboard