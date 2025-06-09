# Path Fix Summary for Pyebwa App

## Issue
After implementing single-domain authentication, the app page loads but all CSS and JavaScript files return 404 errors because they use relative paths.

## Root Cause
The app is served from `/app/` URL, but the HTML contains relative paths like:
- `href="css/app.css"` → Browser looks for `/css/app.css` (wrong)
- Should be: `href="/app/css/app.css"` (correct)

## Files Fixed

### 1. `/app/index.html`
Changed all relative paths to absolute paths:
- CSS files: `css/*.css` → `/app/css/*.css`
- JS files: `js/*.js` → `/app/js/*.js`

### 2. `/login/index.html`
Added a button to return to homepage for better navigation.

## Manual Upload Instructions

If FTP is not working, you can manually update these files:

1. **app/index.html** - Line 9-11:
   ```html
   <link rel="stylesheet" href="/app/css/app.css?v=3">
   <link rel="stylesheet" href="/app/css/tree.css?v=3">
   <link rel="stylesheet" href="/app/css/footer.css?v=3">
   ```

2. **app/index.html** - Line 207-213:
   ```html
   <script src="/app/js/firebase-config.js?v=3"></script>
   <script src="/app/js/translations.js?v=3"></script>
   <script src="/app/js/app.js?v=20250109-single-domain"></script>
   <script src="/app/js/tree.js"></script>
   <script src="/app/js/members.js"></script>
   <script src="/app/js/stories.js"></script>
   <script src="/app/js/share-modal.js"></script>
   ```

3. **login/index.html** - Added after line 168:
   ```html
   <button onclick="window.location.href='/'" style="background: #374151; margin-top: 10px;">Go to Homepage</button>
   ```

## Testing
After deployment, verify:
1. Go to https://rasin.pyebwa.com/login/
2. Login with your credentials
3. You should be redirected to /app/ with proper styling
4. Check browser console - no more 404 errors

## Alternative Quick Fix
If you need an immediate workaround while FTP is down, you can:
1. Copy all files from `/app/css/` to `/css/`
2. Copy all files from `/app/js/` to `/js/`
This creates duplicates but ensures the app works with relative paths.