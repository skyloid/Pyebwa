# Upload Instructions for rasin.pyebwa.com VPS

## Files to Upload

I've prepared the following files that need to be uploaded to your rasin.pyebwa.com VPS:

1. **login.html** - The new login page
2. **app/js/app.js** - Updated to redirect to local login

These files are packaged in: `rasin-vps-files.tar`

## Upload Methods

### Option 1: Using SCP (Recommended)
```bash
# From your local machine, run:
scp rasin-vps-files.tar your-username@rasin.pyebwa.com:/tmp/

# Then SSH into the server:
ssh your-username@rasin.pyebwa.com

# Extract the files:
cd /var/www/html  # or your document root
tar -xf /tmp/rasin-vps-files.tar

# Verify the files:
ls -la login.html
ls -la app/js/app.js
```

### Option 2: Manual Upload via FTP
1. Upload `login.html` to the document root (where index.html is)
2. Upload `app/js/app.js` to the existing app/js/ directory

### Option 3: Copy and Paste
If you have direct access to the VPS:

1. Create `/var/www/html/login.html` (or your document root)
2. Copy the contents from the login.html file in this directory
3. Update `/var/www/html/app/js/app.js` with the new version

## Verification

After uploading, test the following:

1. **Login page loads**: https://rasin.pyebwa.com/login.html
2. **App redirects when not logged in**: https://rasin.pyebwa.com/app/
3. **Login works and redirects to app**

## What Changed

### pyebwa.com (Already deployed)
- Login/signup buttons now redirect to `https://rasin.pyebwa.com/login.html`

### rasin.pyebwa.com (Needs manual upload)
- New `login.html` page for authentication
- Updated `app/js/app.js` to redirect to `/login.html` instead of cross-domain

## Final Authentication Flow
1. User visits pyebwa.com
2. Clicks login → redirected to rasin.pyebwa.com/login.html
3. Logs in (Firebase auth on rasin VPS)
4. Redirected to rasin.pyebwa.com/app/
5. All authentication stays on rasin.pyebwa.com!

## Troubleshooting

If login.html returns 404:
- Check if it's in the correct document root
- Verify file permissions (should be readable by web server)
- Check nginx/Apache configuration for the domain

If authentication doesn't work:
- Verify Firebase is configured to accept rasin.pyebwa.com
- Check browser console for errors
- Ensure HTTPS is working on rasin.pyebwa.com