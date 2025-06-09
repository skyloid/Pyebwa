# Firebase Cross-Domain Authentication Fix

## Problem
Firebase Authentication is not persisting across www.pyebwa.com and rasin.pyebwa.com because they are different domains.

## Solution
You need to add both domains to Firebase Console as authorized domains:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (pyebwa-f5960)
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add these domains:
   - `www.pyebwa.com`
   - `rasin.pyebwa.com`
5. Save the changes

## Alternative Solution (Temporary)
While waiting for domain authorization, users can:
1. Login at www.pyebwa.com
2. Open rasin.pyebwa.com in the SAME browser tab/window
3. The authentication should persist

## Technical Details
- Firebase Auth uses cookies tied to the authDomain
- Cross-domain authentication requires authorized domains in Firebase Console
- The app is configured to wait up to 5 seconds for auth to sync
- If auth fails, it redirects back to www.pyebwa.com

## Current Implementation
- Login at www.pyebwa.com works correctly
- App at rasin.pyebwa.com checks for authenticated user
- Without authorized domains, auth state doesn't transfer between domains

Once you add both domains to Firebase authorized domains list, the authentication will work seamlessly across both sites.