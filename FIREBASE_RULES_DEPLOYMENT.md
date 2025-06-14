# Firebase Security Rules Deployment Guide

## 🚀 Quick Deployment

### Option 1: Using the Script (Recommended)
```bash
chmod +x deploy-firebase-rules.sh
./deploy-firebase-rules.sh
```

### Option 2: Manual Deployment via Firebase Console

1. **Open Firebase Console**
   - Go to https://console.firebase.google.com
   - Select project: `pyebwa-f5960`

2. **Deploy Firestore Rules**
   - Navigate to **Firestore Database** → **Rules**
   - Replace existing rules with contents of `firestore-secure.rules`
   - Click **Publish**

3. **Deploy Storage Rules**
   - Navigate to **Storage** → **Rules**
   - Replace existing rules with contents of `storage-secure.rules`
   - Click **Publish**

### Option 3: Using Firebase CLI Manually

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project (if not done)
firebase init

# Deploy only security rules
firebase deploy --only firestore:rules,storage:rules --project pyebwa-f5960
```

## 📋 What These Rules Do

### Firestore Security Rules
- ✅ **User Authentication**: All operations require authentication
- ✅ **Ownership Validation**: Users can only access their own data
- ✅ **Input Validation**: Validates data types and lengths
- ✅ **Family Tree Access**: Members-only access to tree data
- ✅ **Rate Limiting Ready**: Placeholder for rate limit implementation

### Storage Security Rules
- ✅ **File Type Restrictions**: Only images and documents allowed
- ✅ **Size Limits**: 5MB for images, 10MB for documents
- ✅ **Path Security**: Strict path validation
- ✅ **Metadata Validation**: Prevents malicious metadata
- ✅ **Temporary Files**: Auto-expire after 1 hour

## ⚠️ Testing After Deployment

### 1. Test Authentication
```javascript
// Should succeed for authenticated users
const user = firebase.auth().currentUser;
const doc = await firebase.firestore()
  .collection('users')
  .doc(user.uid)
  .get();
```

### 2. Test Access Control
```javascript
// Should fail - accessing another user's data
const doc = await firebase.firestore()
  .collection('users')
  .doc('other-user-id')
  .get(); // Should throw permission error
```

### 3. Test Input Validation
```javascript
// Should fail - invalid email
await firebase.firestore()
  .collection('users')
  .doc(user.uid)
  .update({ email: 'invalid-email' }); // Should throw validation error
```

### 4. Test File Upload
```javascript
// Should succeed for valid image
const ref = firebase.storage()
  .ref(`users/${user.uid}/profile/profile.jpg`);
await ref.put(imageFile); // Must be < 5MB and valid image type
```

## 🔍 Monitoring

### Check Rule Performance
1. Go to Firebase Console → Firestore → Usage
2. Look for "Security rule evaluations"
3. Monitor denied requests

### Common Issues and Fixes

**Issue: "Permission Denied" for legitimate operations**
- Check if user is authenticated
- Verify the user has access to the resource
- Check if data meets validation requirements

**Issue: "Invalid document data" errors**
- Ensure all required fields are present
- Check data types match rules
- Validate string lengths

**Issue: File upload failures**
- Verify file size is within limits
- Check file type is allowed
- Ensure metadata is properly set

## 📊 Rule Metrics to Monitor

1. **Denial Rate**: Should be < 5% for legitimate users
2. **Evaluation Time**: Should be < 10ms average
3. **Read/Write Ratio**: Monitor for unusual patterns
4. **Failed Validations**: Track which validations fail most

## 🆘 Rollback Plan

If issues arise after deployment:

1. **Quick Rollback via Console**
   - Go to Rules tab
   - Click "History"
   - Select previous version
   - Click "Restore"

2. **Keep Previous Rules**
   - Save current rules before deploying
   - Store in `firestore.rules.backup`
   - Can quickly restore if needed

## 📝 Notes

- New rules are more restrictive than previous version
- Test thoroughly in development first
- Monitor error logs for permission issues
- Consider gradual rollout for large user bases
- Update client code to handle new validation errors

## ✅ Deployment Checklist

- [ ] Backup current rules
- [ ] Deploy new rules
- [ ] Test authentication flows
- [ ] Test data operations
- [ ] Test file uploads
- [ ] Monitor error rates
- [ ] Update client error handling
- [ ] Document any issues
- [ ] Confirm successful deployment