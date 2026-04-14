# Pyebwa Auth Route Inventory

This inventory captures the current auth route surface in `rasin.pyebwa.com` after Pyebwa was moved onto the isolated stack.

## Live Entry Routes

### Login

- Public URL: `https://rasin.pyebwa.com/login`
- Source file: [login.html](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/login.html:1)
- Current behavior:
  - renders the magic-link login UI
  - initializes a Supabase client against `window.location.origin + '/supabase'`
  - completes session pickup client-side
  - redirects successful sessions to `/app/?lang=...`
  - legacy `/login.html` now 302s to `/login`

### Password Reset

- Public URL: `https://rasin.pyebwa.com/reset-password`
- Source file: [app/reset-password.html](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/app/reset-password.html:1)
- Current behavior:
  - serves the password reset page
  - links back to `/login`
  - legacy `/reset-password.html` now 302s to `/reset-password`

### Public-Site Login Redirect

- Public URL: `https://pyebwa.com/login/`
- Source file: [pyebwa.com/login/index.html](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/login/index.html:1)
- Current behavior:
  - redirects to `https://rasin.pyebwa.com/login`

## Auth Redirect Targets

### Magic Link Redirect Targets

Current clean-route targets are wired through:

- [app/js/api-client.js](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/app/js/api-client.js:48)
- [server/api/auth-secure.js](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/api/auth-secure.js:180)
- [server/api/auth-secure.js](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/api/auth-secure.js:515)
- [app/auth-templates/magic-link.html](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/app/auth-templates/magic-link.html:2)

### Password Reset Redirect Target

Hard-coded to `reset-password.html` in:

- [app/js/api-client.js](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/app/js/api-client.js:120)

## Auth Helper Endpoints

### External Auth Proxy Base

- Env var: `PYEBWA_AUTH_EXTERNAL_URL`
- Current value in `.env`: `https://rasin.pyebwa.com/supabase`
- Used by: [server/api/auth-secure.js](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/api/auth-secure.js:180)

### Direct Auth Admin URL

- Env var: `PYEBWA_SUPABASE_AUTH_ADMIN_URL`
- Current value in `.env`: `http://127.0.0.1:10998`
- Used by: [server/api/auth-secure.js](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/api/auth-secure.js:213)

### Session/User Validation

- App endpoint: `/api/auth/me`
- Used by:
  - [login.html](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/login.html:456)
  - [app/js/api-client.js](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/app/js/api-client.js:91)

### Magic-Link Send Endpoint

- App endpoint: `/api/auth/magic-link`
- Used by: [login.html](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/login.html:579)

## Client Auth Runtime

### Browser Supabase Base URL

- `window.location.origin + '/supabase'`
- Used in:
  - [login.html](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/login.html:533)
  - [app/js/supabase-client.js](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/app/js/supabase-client.js:5)

### Current Callback/Session Pickup Logic

- Initial session check: [login.html](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/login.html:536)
- Auth state listener: [login.html](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/login.html:555)

This page currently acts as both:

- the login UI
- the magic-link return target
- the session finalization page

## Redirects To Login

The following runtime paths now redirect users to `/login`:

- [app/js/app.js](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/app/js/app.js:641)
- [app/js/admin/auth-guard.js](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/app/js/admin/auth-guard.js:45)
- [app/admin/js/simple-admin.js](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/app/admin/js/simple-admin.js:2152)
- [pyebwa.com/js/app.js](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/app.js:113)

## Service Worker Interaction

- Service worker registration: [app/js/sw-register.js](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/app/js/sw-register.js:41)
- Service worker file: [sw.js](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/sw.js:1)

Auth-sensitive routes that must be treated as uncached:

- `/login`
- `/signup`
- `/register`
- `/forgot-password`
- `/reset-password`
- OAuth callback routes are out of scope for Pyebwa's isolated target state.
- `/supabase/auth/v1/*`

## Cutover Notes

- Magic Link returns through `/login`.
- Legacy `.html` auth routes remain only as compatibility shims.
- The live app and `/supabase` routing now point at the isolated Pyebwa stack.
