# Manual Login Instructions

Since the FTP upload isn't working to update www.pyebwa.com, here's how to manually access the app:

## Option 1: Direct Access (Recommended)
1. Login at www.pyebwa.com
2. Once logged in, manually navigate to: https://rasin.pyebwa.com/app/auth-bridge.html
3. This bridge page will verify your authentication and redirect you to the app

## Option 2: Using Browser Console
1. Login at www.pyebwa.com
2. Open browser console (F12)
3. Run this command:
   ```javascript
   window.location.href = 'https://rasin.pyebwa.com/app/?login=true';
   ```

## Option 3: Bookmark
Create a bookmark with this URL:
```
javascript:window.location.href='https://rasin.pyebwa.com/app/auth-bridge.html';
```

After logging in at www.pyebwa.com, click the bookmark.

## Why This Happens
The JavaScript files on www.pyebwa.com need to be updated via FTP to include the correct redirect URL. The files are ready in `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/` but haven't been uploaded to the live server.

## Files That Need FTP Upload
- `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/index.html` (autocomplete attributes)
- `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/app.js` (correct redirect URL)

Once these files are uploaded to www.pyebwa.com, the automatic redirect will work properly.