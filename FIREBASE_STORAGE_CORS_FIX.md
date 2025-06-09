# Firebase Storage CORS Configuration Fix

## Issues Fixed

1. **CSS Syntax Error** - Removed invalid "EOF < /dev/null" line from app.css
2. **Storage Bucket URL** - Changed from `.firebasestorage.app` to `.appspot.com`
3. **CORS Configuration** - Updated cors.json file

## To Apply CORS Configuration

You need to apply the CORS configuration to your Firebase Storage bucket. There are two ways:

### Option 1: Using Google Cloud Console (Easiest)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: `pyebwa-f5960`
3. Go to Storage → Browser
4. Find your bucket: `pyebwa-f5960.appspot.com`
5. Click on the bucket
6. Go to the "Configuration" tab
7. Click "Edit CORS configuration"
8. Paste the contents of the `cors.json` file

### Option 2: Using gsutil (Command Line)

1. Install Google Cloud SDK if you haven't already
2. Authenticate: `gcloud auth login`
3. Set your project: `gcloud config set project pyebwa-f5960`
4. Apply CORS configuration:
   ```bash
   gsutil cors set cors.json gs://pyebwa-f5960.appspot.com
   ```

## Verify CORS is Working

After applying the CORS configuration:
1. Clear your browser cache
2. Reload the app
3. Try uploading a photo again

## What Changed

- **Storage Bucket URL**: Changed from `pyebwa-f5960.firebasestorage.app` to `pyebwa-f5960.appspot.com`
- **CORS Methods**: Added OPTIONS method (required for preflight requests)
- **CORS Headers**: Added Access-Control headers
- **Origins**: Added both www and non-www versions of pyebwa.com

## Files Modified

- `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/app/css/app.css` - Fixed CSS syntax error
- `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/app/js/firebase-config.js` - Updated storage bucket URL
- `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/cors.json` - Updated CORS configuration

The storage bucket URL change should resolve the 404 errors, and the CORS configuration will allow uploads from rasin.pyebwa.com.