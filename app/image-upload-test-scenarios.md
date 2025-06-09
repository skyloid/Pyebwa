# Pyebwa Application - Image Upload Test Scenarios

## Overview
This document outlines comprehensive test scenarios for the image upload functionality in the Pyebwa application.

## Current Implementation Analysis

### Upload Infrastructure
- **Storage Service**: Firebase Storage (initialized in `firebase-config.js`)
- **Storage Bucket**: `pyebwa-f5960.firebasestorage.app`
- **Upload Function**: `uploadPhoto()` in `app.js` (lines 617-625)
- **File Input**: Located in member form with `accept="image/*"`
- **Storage Path**: `familyTrees/${userFamilyTreeId}/photos/${timestamp}_${filename}`

### Key Findings
1. **Authentication Required**: User must be logged in (checks `currentUser.uid`)
2. **Family Tree Context**: Uploads are organized by family tree ID
3. **Timestamp Naming**: Files are prefixed with timestamp to avoid conflicts
4. **No Size Validation**: Currently no client-side file size validation
5. **No Type Validation**: Relies only on HTML `accept` attribute
6. **Error Handling**: Basic try-catch with console logging

## Test Scenarios

### 1. Basic Upload Tests
- **Test 1.1**: Upload standard JPEG image (< 1MB)
  - Expected: Success, URL returned and saved to member record
- **Test 1.2**: Upload PNG image with transparency
  - Expected: Success, transparency preserved
- **Test 1.3**: Upload GIF image
  - Expected: Success (static or animated)

### 2. File Size Tests
- **Test 2.1**: Small image (< 100KB)
  - Expected: Quick upload success
- **Test 2.2**: Medium image (1-5MB)
  - Expected: Success with progress indication
- **Test 2.3**: Large image (> 10MB)
  - Expected: Check Firebase Storage limits (default 5GB per file)

### 3. File Type Validation Tests
- **Test 3.1**: Valid image formats (JPEG, PNG, GIF, WebP)
  - Expected: All accepted
- **Test 3.2**: Invalid file types (PDF, DOC, TXT)
  - Expected: Rejected by browser file picker
- **Test 3.3**: Disguised file (PDF renamed to .jpg)
  - Expected: May upload but won't display properly

### 4. Special Characters & Naming Tests
- **Test 4.1**: Filename with spaces
  - Expected: Handled correctly
- **Test 4.2**: Filename with special characters (é, è, ç, ñ)
  - Expected: Handled correctly
- **Test 4.3**: Very long filename
  - Expected: Should work up to system limits

### 5. Network & Error Handling Tests
- **Test 5.1**: Slow network upload
  - Expected: Progress indication, eventual success
- **Test 5.2**: Network interruption during upload
  - Expected: Error caught and logged
- **Test 5.3**: Firebase Storage quota exceeded
  - Expected: Appropriate error message

### 6. Security Tests
- **Test 6.1**: Upload without authentication
  - Expected: Rejected (no currentUser)
- **Test 6.2**: Upload to unauthorized family tree
  - Expected: Depends on Firebase Storage rules
- **Test 6.3**: Cross-site upload attempt
  - Expected: CORS protection

### 7. User Experience Tests
- **Test 7.1**: Multiple rapid uploads
  - Expected: Each handled independently
- **Test 7.2**: Cancel upload in progress
  - Expected: Currently no cancel mechanism
- **Test 7.3**: Re-upload same image
  - Expected: New timestamp prevents overwrite

### 8. Integration Tests
- **Test 8.1**: Upload and immediate display
  - Expected: Photo URL saved and displayed in member card
- **Test 8.2**: Upload and edit member
  - Expected: Existing photo URL preserved
- **Test 8.3**: Delete member with photo
  - Expected: Orphaned photos in storage (cleanup needed?)

## Identified Issues & Recommendations

### Current Limitations
1. **No file size validation** - Could lead to long uploads or quota issues
2. **No image compression** - Large photos stored as-is
3. **No progress indication** - Users don't see upload progress
4. **Limited error feedback** - Errors only logged to console
5. **No cleanup mechanism** - Orphaned photos remain in storage

### Recommended Improvements
1. **Add client-side validation**:
   ```javascript
   // Check file size
   if (file.size > 5 * 1024 * 1024) {
     throw new Error('File too large. Maximum size is 5MB');
   }
   
   // Validate file type
   if (!file.type.startsWith('image/')) {
     throw new Error('Only image files are allowed');
   }
   ```

2. **Implement progress tracking**:
   ```javascript
   const uploadTask = photoRef.put(file);
   uploadTask.on('state_changed', 
     (snapshot) => {
       const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
       updateProgressBar(progress);
     }
   );
   ```

3. **Add image compression**:
   - Resize large images before upload
   - Convert to WebP for better compression

4. **Implement storage rules**:
   ```
   service firebase.storage {
     match /b/{bucket}/o {
       match /familyTrees/{treeId}/photos/{photo} {
         allow read: if request.auth != null;
         allow write: if request.auth != null 
           && request.resource.size < 5 * 1024 * 1024
           && request.resource.contentType.matches('image/.*');
       }
     }
   }
   ```

## Test Execution Instructions

1. **Setup**:
   - Login to the application
   - Navigate to the member form
   - Open browser developer console

2. **Test Images Preparation**:
   - Small JPEG (< 100KB)
   - Medium PNG (1-2MB)
   - Large photo (> 5MB)
   - Non-image file (PDF)
   - Image with special characters in name

3. **Use Test Suite**:
   - Open `/app/test-image-upload.html`
   - Run through each test case
   - Document results

4. **Manual Testing**:
   - Test through actual member form
   - Verify photos appear in member listings
   - Check Firebase Storage console

## Success Criteria
- All valid images upload successfully
- Invalid files are rejected gracefully
- Uploads complete within reasonable time
- Photos display correctly in the application
- No security vulnerabilities exposed
- Error cases handled with user feedback