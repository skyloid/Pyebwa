# Plan: Consolidate All Authentication on rasin.pyebwa.com

## Current Situation Analysis

### What We Have:
1. **pyebwa.com** - Main website with homepage
2. **rasin.pyebwa.com** - Subdomain for the app
3. **Shared directory** - Both domains share the same public_html
4. **Multiple login pages**:
   - pyebwa.com/login/index.html
   - pyebwa.com/simple-login.html
   - Various test login pages

### Problems:
1. Authentication is split between domains
2. Redirect loops due to cross-domain issues
3. rasin.pyebwa.com files return 404 (different document root)
4. Confusion about which login page to use

## Proposed Solution: Single-Domain Authentication on rasin.pyebwa.com

### Step-by-Step Plan:

#### Phase 1: Discovery (Steps 1-3)
**Goal**: Understand the exact server configuration for rasin.pyebwa.com

1. **Check rasin.pyebwa.com server configuration**
   - Find the actual document root for the subdomain
   - Check if it has a separate directory or special nginx/Apache config
   - Test file accessibility paths

2. **Map current authentication flow**
   - Document all redirects
   - Identify all login-related files
   - List all authentication scripts

3. **Test Firebase auth domain configuration**
   - Verify rasin.pyebwa.com is authorized in Firebase
   - Check auth persistence across subdomains

#### Phase 2: Preparation (Steps 4-6)
**Goal**: Prepare the new authentication system

4. **Create dedicated login page for rasin.pyebwa.com**
   - Design login.html specifically for the subdomain
   - Ensure it redirects to /app/ after login
   - Add proper error handling

5. **Update app.js authentication logic**
   - Change all redirects to use rasin.pyebwa.com/login.html
   - Remove references to pyebwa.com for auth
   - Add fallback mechanisms

6. **Update homepage buttons**
   - Change pyebwa.com login/signup buttons
   - Point to rasin.pyebwa.com/login.html
   - Ensure proper redirect handling

#### Phase 3: Implementation (Steps 7-10)
**Goal**: Deploy the new authentication system

7. **Upload login page to correct location**
   - Find the right directory for rasin.pyebwa.com
   - Upload login.html
   - Verify accessibility via browser

8. **Update all JavaScript files**
   - Deploy updated app.js files
   - Remove cross-domain auth scripts
   - Update redirect logic

9. **Remove old login pages**
   - Delete pyebwa.com/login/
   - Delete pyebwa.com/simple-login.html
   - Remove test authentication pages

10. **Clean up authentication scripts**
    - Remove auth.js from pyebwa.com
    - Remove auth-bridge.js
    - Remove any cross-domain auth handlers

#### Phase 4: Testing & Verification (Steps 11-12)
**Goal**: Ensure everything works correctly

11. **Test complete authentication flow**
    - Test login from homepage
    - Test direct app access
    - Test logout functionality
    - Verify no redirect loops

12. **Clean up and document**
    - Remove temporary files
    - Document final authentication flow
    - Create troubleshooting guide

## Expected Final Flow:
1. User visits pyebwa.com
2. Clicks login → redirected to rasin.pyebwa.com/login.html
3. Logs in with Firebase Auth
4. Redirected to rasin.pyebwa.com/app/
5. All authentication stays on rasin.pyebwa.com

## Benefits:
- No cross-domain token issues
- Simpler authentication flow
- Single source of truth for auth
- Easier to maintain and debug

## Files to Create:
- rasin.pyebwa.com/login.html (new dedicated login page)

## Files to Update:
- pyebwa.com/js/app.js (redirect to rasin subdomain)
- rasin.pyebwa.com/app/js/app.js (use local login)

## Files to Remove:
- pyebwa.com/login/
- pyebwa.com/simple-login.html
- pyebwa.com/js/auth.js
- pyebwa.com/js/auth-bridge.js
- All test authentication pages

## Potential Challenges:
1. Finding correct document root for rasin.pyebwa.com
2. Ensuring Firebase accepts auth from subdomain
3. Handling existing user sessions
4. Browser caching of old redirects