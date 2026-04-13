# Pyebwa Environment Extraction Implementation Plan

## Scope

This plan translates `docs/PYEBWA_ENV_EXTRACTION_HANDOFF.md` into a concrete implementation sequence for the current `rasin.pyebwa.com` codebase and runtime.

The target outcome is an isolated Pyebwa-only Supabase environment that no longer depends on the shared default auth/network/DB/JWT boundary after cutover.

## Current-State Audit Summary

### Current auth shape

- Auth is still centered on `https://rasin.pyebwa.com/login.html`, not clean app routes.
- Magic-link login returns to `login.html` and that page completes session pickup client-side.
- Password reset returns to `reset-password.html`.
- Public-site login links still point to `https://rasin.pyebwa.com/login.html`.

### Concrete route and file inventory

- Live login page: `login.html`
- Password reset page: `app/reset-password.html`
- Public redirect shim: `pyebwa.com/login/index.html`
- Auth email template: `app/auth-templates/magic-link.html`
- Auth server landing redirect: `auth-server/public/index.html`

### Auth client/runtime findings

- Magic-link redirect target is hard-coded in:
  - `app/js/api-client.js`
  - `server/api/auth-secure.js`
  - `app/auth-templates/magic-link.html`
- Auth admin direct URL is currently shared-env shaped:
  - `.env`: `SUPABASE_AUTH_ADMIN_URL=http://127.0.0.1:9998`
- External auth URL is currently shared-env shaped:
  - `.env`: `AUTH_EXTERNAL_URL=https://rasin.pyebwa.com/supabase`
- Login callback/session pickup currently happens inside `login.html` using:
  - `supabase.createClient(window.location.origin + '/supabase', anonKey)`
  - `_sb.auth.getSession()`
  - `_sb.auth.onAuthStateChange(...)`

### Duplicate callback handling risk

- `login.html` processes auth state in two paths:
  - initial `_sb.auth.getSession()`
  - `_sb.auth.onAuthStateChange(...)`
- There is some guard logic (`window.__pyebwaLoginRedirectInFlight`), but callback processing is still page-local and should be simplified before cutover.

### Static-page hijack risk

- The live auth entrypoint is itself a static file: `login.html`.
- The public site contains a redirecting login directory entrypoint: `pyebwa.com/login/index.html`.
- This is not the exact Hub stale-file failure mode, but it is still a static auth surface that can drift independently of backend fixes.

### Service worker findings

- Service worker registers at `/sw.js` from `app/js/sw-register.js`.
- `sw.js` uses network-first but caches any successful versioned `style`, `script`, `image`, or `font` response.
- `version.json` is explicitly `no-store`, but auth pages are not explicitly excluded in the service worker.
- Auth routes are HTML and therefore not cached by destination rule today, but any auth-related versioned JS loaded by those pages can remain stale across deployments.

### Reverse-proxy and cache findings

- Root `.htaccess` sets:
  - HTML to `no-cache, must-revalidate`
  - `sw.js` and `version.json` to `no-cache`
  - CSS/JS to immutable long-cache
- `pyebwa.com/.htaccess` also applies long-cache headers for static assets.
- No clean-route auth rewrite layer is currently present in the Apache config checked into this repo.

## Migration Principles For This Repo

1. Do not cut over by changing only Docker infra.
   The auth routes, email redirect targets, and helper endpoints in this repo must be repointed together.

2. Do not keep `login.html` as an accidental callback sink without explicitly deciding to.
   Either:
   - keep it intentionally for cutover phase 1 and proxy it cleanly to the new stack, or
   - replace it with a clean route and leave `login.html` as a no-cache shim.

3. Treat service-worker and cached JS behavior as part of the auth migration.

4. Validate magic-link flows against the new auth stack before any public proxy cutover.

## Recommended Delivery Plan

## Phase 0: Freeze The Auth Surface

Goal:
- stop auth-route drift while infra work is underway

Tasks:
- inventory all links and redirects that point to `login.html`
- inventory all auth email redirect targets
- inventory all direct auth admin URLs and external auth URLs
- identify every place that assumes old direct auth debug port `9998`

Deliverable:
- checked-in route inventory and migration checklist

## Phase 1: Build Isolated Pyebwa Supabase Stack

Goal:
- create the new environment without touching production routing

Tasks:
- create a new infra directory for the Pyebwa-only stack
- create compose project `pyebwasupabase`
- create network `pyebwasupabase_default`
- provision:
  - `pyebwa-db`
  - `pyebwa-auth`
  - `pyebwa-rest`
  - `pyebwa-realtime`
  - `pyebwa-storage`
  - `pyebwa-kong`
  - `pyebwa-meta`
  - `pyebwa-imgproxy`
  - `pyebwa-studio`
- bind:
  - `127.0.0.1:8201 -> 8000` for Kong
  - optional `127.0.0.1:10998 -> 9999` for auth debug
  - optional `127.0.0.1:14939 -> 3000` for REST debug
- generate new secrets:
  - `POSTGRES_PASSWORD`
  - `JWT_SECRET`
  - `ANON_KEY`
  - `SERVICE_KEY`

Validation:
- new Kong healthy
- new auth healthy
- new REST healthy
- `GET /auth/v1/settings` returns `200` through the new stack

## Phase 2: Seed And Validate The New Pyebwa DB

Goal:
- ensure the new DB is compatible with the running GoTrue version before traffic is switched

Tasks:
- export/import only Pyebwa-required auth and app data
- validate schema and data for:
  - `auth.users`
  - `auth.identities`
  - `auth.flow_state`
  - `auth.oauth_client_states`
  - `auth.saml_relay_states`
- explicitly check:
  - `uuid` vs `text` compatibility for state IDs
  - `auth.identities.id` type
  - `auth.identities.provider_id` nullability
- confirm new auth writes land only in the new DB

Validation:
- no GoTrue schema/type errors at startup or during test auth flows

## Phase 3: Repoint Repo Config To The New Auth Stack

Goal:
- make the app and helper endpoints capable of using the new stack before proxy cutover

Tasks:
- change env/config references from old shared auth debug/admin targets to the new Pyebwa auth targets
- update:
  - `AUTH_EXTERNAL_URL`
  - `SUPABASE_AUTH_ADMIN_URL`
  - any Supabase client config using the old shared boundary
- review and tighten `GOTRUE_URI_ALLOW_LIST`

Required real allow-list targets to validate:
- `https://rasin.pyebwa.com/login.html`
- `https://rasin.pyebwa.com/reset-password.html` or actual reset target in production
- if introduced during migration:
  - `https://rasin.pyebwa.com/login`
  - `https://rasin.pyebwa.com/register`
- Pyebwa target state is Magic Link only; OAuth callback routes are intentionally excluded.

Repo touchpoints:
- `.env`
- `app/js/api-client.js`
- `server/api/auth-secure.js`
- `app/auth-templates/magic-link.html`

## Phase 4: Normalize Auth Entry Routes

Goal:
- eliminate stale/static auth ambiguity before cutover

Recommended approach:
- introduce clean routes:
  - `/login`
  - `/signup`
  - `/reset-password`
- keep existing `.html` routes as explicit no-cache shims during migration

Tasks:
- decide whether `login.html` remains the callback landing route temporarily or is replaced by `/login`
- if moving to clean routes:
  - update all email redirects and app links
  - keep `.html` entrypoints as 302/301 shims during transition
- ensure no Apache/static file takes precedence over the intended live route behavior

Repo touchpoints:
- `login.html`
- `app/reset-password.html`
- `pyebwa.com/login/index.html`
- `pyebwa.com/js/app.js`
- `app/js/admin/auth-guard.js`
- `app/js/app.js`
- `app/admin/js/simple-admin.js`

## Phase 5: Simplify Login Callback Handling

Goal:
- remove mixed/duplicated session processing before cutover

Tasks:
- isolate callback/session pickup logic in one code path
- keep only one redirect-finalization path per page load
- remove ad hoc timestamp shifting and duplicated redirect checks if they are no longer needed
- ensure logout intent handling remains intact

Repo touchpoints:
- `login.html`

Validation:
- magic link clicked on same device lands once
- no double redirect
- no transient bad session state

## Phase 6: Service Worker Hardening For Auth

Goal:
- ensure auth behavior does not survive deploys incorrectly

Tasks:
- exclude auth entrypoints and callback surfaces from service-worker caching logic
- consider bypassing all requests whose pathname matches:
  - `/login`
  - `/login.html`
  - `/signup`
  - `/signup.html`
  - `/reset-password`
  - `/reset-password.html`
- Magic Link routes only; no OAuth callback paths should be required for cutover.
  - `/supabase/auth/`
- ensure auth pages and callback pages are served with `no-store` where possible

Repo touchpoints:
- `sw.js`
- `app/js/sw-register.js`
- `.htaccess`
- Express security middleware if route-specific cache headers are added there

## Phase 7: Repoint Reverse Proxy To New Kong

Goal:
- shift production auth/API traffic to the isolated environment

Tasks:
- update `rasin.pyebwa.com` proxying so `/supabase` and any auth helper endpoints hit the new Pyebwa Kong on `127.0.0.1:8201`
- verify both authorize and callback are reaching the same new stack
- keep old shared env running until validation completes

Infrastructure checks:
- no Pyebwa traffic routed to `supabase_default`
- no auth helper path still targeting old `127.0.0.1:9998`

## Phase 8: End-To-End Validation

Required tests:
- magic-link login from `login.html` or the new clean login route
- password reset flow
- `GET /auth/v1/user`
- logout
- fresh login again
- admin auth guard redirect behavior
- public-site login redirects from `pyebwa.com`

Must confirm:
- no redirect to another domain/environment
- no stale auth UI served
- no auth redirects to non-Magic-Link callback paths
- no callback hang/spinner hang
- no wrong-domain redirect
- new auth writes appear only in the new Pyebwa DB

## Phase 9: Remove Pyebwa From Shared Default Env

Only after Phase 8 is green.

Tasks:
- stop `pyebwa-supabase-auth`
- remove Pyebwa routing from the shared environment
- remove Pyebwa secrets from shared locations
- detach remaining Pyebwa services from `supabase_default`

## Concrete Work Breakdown

### Track A: Infra

- create `infra/pyebwasupabase/`
- add compose, env template, volumes, secrets notes
- bootstrap isolated services

### Track B: Auth route cleanup

- replace `.html` auth entrypoints with clean routes or explicit shims
- update links and redirects across app/public/admin

### Track C: Auth helper/config repoint

- update server-side helper URLs and auth admin URL
- move all helper traffic to the new auth backend

### Track D: Service worker/cache hardening

- add route exclusions
- test stale-client behavior after deploy

### Track E: Data migration/schema validation

- export/import Pyebwa auth/app data
- validate GoTrue compatibility against new DB

## First Implementation Tasks

1. Create the isolated infra directory and compose files.
2. Add a checked-in auth route inventory for current `.html` entrypoints and helper URLs.
3. Update the service worker to bypass auth routes.
4. Decide whether cutover phase 1 keeps `login.html` as the return target or introduces `/login`.
5. Repoint auth helper env/config to the new isolated stack in a non-production test configuration.

## Open Decisions

1. Whether Pyebwa should keep `.html` auth routes long-term or migrate to clean routes during this project.
2. Whether password reset should remain on `reset-password.html` or move to `/reset-password`.
3. Confirm Pyebwa remains Magic Link only during cutover; do not expand the route surface for OAuth providers.
4. Whether storage should be included in the first cutover wave or validated as a separate track after auth/REST isolation.

## Success Criteria

- Pyebwa auth/API traffic runs entirely through `pyebwasupabase`
- Pyebwa no longer depends on:
  - `supabase_default`
  - `db`
  - shared JWT secret
  - old shared auth/admin ports
- auth routes are not vulnerable to stale static/runtime mismatches
- service worker does not preserve stale auth behavior across deployments
- live login and reset flows pass end-to-end against the new isolated environment
