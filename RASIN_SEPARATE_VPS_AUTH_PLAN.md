# Revised Plan: Authentication on Separate VPS (rasin.pyebwa.com)

## Critical Update: Architecture
- **pyebwa.com** - Main website (Server A)
- **rasin.pyebwa.com** - App on separate VPS (Server B)
- **No shared files** - Each domain has its own file system

## Simplified Plan for Single-Domain Authentication

### Phase 1: Setup Login on rasin.pyebwa.com

#### Step 1: Create Login Page
Create a dedicated login page for rasin.pyebwa.com that will be uploaded to the VPS.

**File: `/login.html`**
- Self-contained login page
- Firebase authentication
- Redirects to `/app/` after successful login
- No dependencies on pyebwa.com

#### Step 2: Update App Authentication
**File: `/app/js/app.js`**
- Change redirect from `https://pyebwa.com/login/` to `/login.html`
- Keep all authentication on rasin.pyebwa.com
- Remove any cross-domain references

#### Step 3: Update Homepage Redirects
**File: `pyebwa.com/js/app.js`**
- Change login button to redirect to `https://rasin.pyebwa.com/login.html`
- Update signup button to redirect to `https://rasin.pyebwa.com/login.html`
- Update CTA button to redirect to `https://rasin.pyebwa.com/login.html`

### Phase 2: Deploy to Separate Servers

#### Step 4: Deploy to rasin.pyebwa.com VPS
Upload to rasin.pyebwa.com server:
- `/login.html` - New login page
- `/app/js/app.js` - Updated to use local login

#### Step 5: Deploy to pyebwa.com
Upload to pyebwa.com server:
- `/js/app.js` - Updated to redirect to rasin.pyebwa.com

### Phase 3: Cleanup

#### Step 6: Remove Old Login Pages from pyebwa.com
Delete from pyebwa.com:
- `/login/` directory
- `/simple-login.html`
- `/js/auth.js`
- `/js/auth-bridge.js`
- Any test authentication files

## Final Authentication Flow:
1. User visits `pyebwa.com`
2. Clicks login → redirected to `https://rasin.pyebwa.com/login.html`
3. Logs in with Firebase Auth (on rasin VPS)
4. Redirected to `https://rasin.pyebwa.com/app/`
5. All authentication happens on rasin.pyebwa.com VPS

## Benefits of Separate VPS:
- Complete isolation of app and authentication
- No cross-domain issues
- No shared file confusion
- Cleaner architecture
- Better security (app isolated from main site)

## Server Requirements:
- rasin.pyebwa.com must serve static files
- Firebase authentication must work from rasin.pyebwa.com domain
- HTTPS must be enabled on rasin.pyebwa.com

Would you like me to proceed with this plan?