# URGENT: Login Loop Fix Instructions

## The Problem
The app is stuck in a fast redirect loop because:
1. `/app/js/app.js` redirects to `/login/` when not authenticated
2. `/login/` directory doesn't exist on the server (404 error)
3. This causes an infinite loop

## Immediate Fix Options

### Option 1: Create the login directory (Recommended)
Via FTP or hosting panel:
1. Create directory `/htdocs/login/`
2. Upload `login/index.html` from your local copy
3. The loop will stop immediately

### Option 2: Upload simple-login.html
The app.js has been updated to use `/simple-login.html` as fallback:
1. Upload the `simple-login.html` file to `/htdocs/`
2. This file already exists locally and has all login functionality

### Option 3: Emergency inline fix
If you can't upload files, edit `/htdocs/app/js/app.js` directly:
- Find line 227: `window.location.href = '/simple-login.html';`
- Change to: `window.location.href = 'https://secure.pyebwa.com?redirect=' + encodeURIComponent(window.location.href);`

## Files that need uploading:

1. **CRITICAL - Stops the loop**:
   - `/simple-login.html` OR `/login/index.html`

2. **For proper styling**:
   - `/app/index.html` (updated with absolute paths for CSS/JS)

3. **Already updated**:
   - `/app/js/app.js` (redirects to simple-login.html instead of /login/)

## Testing after fix:
1. Clear browser cache
2. Visit https://rasin.pyebwa.com/app/
3. You should see the login page (not a loop)
4. After login, you should see the app with proper styling

## Long-term solution:
Once FTP is working, run:
```bash
python3 deploy-fix-app-paths.py
```

This will upload all necessary files to implement the single-domain authentication properly.