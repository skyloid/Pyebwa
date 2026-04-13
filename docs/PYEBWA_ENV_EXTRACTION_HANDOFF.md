# Pyebwa Environment Extraction Handoff

## Purpose

This document is for the Pyebwa Codex agent.

It is not a generic migration outline. It is the Pyebwa-specific runbook written after the Hub isolation work exposed the failure modes that matter in practice.

Use this document to migrate `rasin.pyebwa.com` and related Pyebwa properties out of the shared default environment into a fully isolated Pyebwa-only environment.

Important:

- Do not use this document to modify Hub.
- Do not remove Pyebwa from the current default environment until the new Pyebwa environment is fully built, validated, and serving production traffic correctly.
- Do not force the Pyebwa agent to rediscover the Hub migration issues. This handoff is intended to prevent that.

## Current Shared-State Problem

At the time this handoff was written, Pyebwa auth is running as:

- `pyebwa-supabase-auth`

and is sharing the following with the default environment:

- Docker network: `supabase_default`
- Postgres host alias: `db`
- Postgres DB: `postgres`
- schema search path: `auth,public`
- JWT signing secret shared with the default stack

Live Pyebwa auth env currently includes:

- `API_EXTERNAL_URL=https://rasin.pyebwa.com/supabase`
- `GOTRUE_SITE_URL=https://rasin.pyebwa.com`
- `GOTRUE_URI_ALLOW_LIST=https://pyebwa.com,https://www.pyebwa.com,https://rasin.pyebwa.com/login.html`

The current auth container is bound on:

- `127.0.0.1:9998 -> 9999`

## What Actually Went Wrong During Hub Migration

These were the real failure classes during Hub isolation. The Pyebwa migration must explicitly avoid them.

### 1. OAuth start and callback hit different auth services

This caused:

- `OAuth state is invalid: signature is invalid`

Root cause:

- OAuth `/authorize` was being sent to the old shared auth service
- OAuth `/callback` was being handled by the new isolated auth service
- state was signed by one service and verified by another

Pyebwa rule:

- OAuth start and OAuth callback must both point to the new Pyebwa auth stack before production cutover
- any helper route like `/api/auth/oauth-authorize` must use the new Pyebwa auth direct URL, not the old default auth URL

### 2. Stale static auth pages hijacked the live app

This caused:

- redirects to the wrong domain
- old login bundles running after server fixes
- callback routes hitting stale static exports instead of live Next routes

Root cause:

- old `login.html`, `register.html`, `auth/callback.html`, localized variants, and `*-shadcn.html` pages existed on disk
- Apache served those files before proxying to Next

Pyebwa rule:

- audit for stale exported auth pages before cutover
- either remove them from the runtime path or replace them with no-cache redirect shims
- proxy both clean routes and `.html` variants through the live app for:
  - `/login`
  - `/register`
  - `/forgot-password`
  - `/auth/callback`
  - `/oauth-callback`
  - any new callback route introduced during migration

### 3. Callback route allow-list gaps broke otherwise-correct redirects

This caused:

- successful provider auth followed by redirect back to login
- callback routes that looked valid but were not allowed by GoTrue

Pyebwa rule:

- every real callback URL must exist in `GOTRUE_URI_ALLOW_LIST`
- do not leave the allow list in a legacy shape
- if Pyebwa introduces a fresh callback path during migration, add it before testing

### 4. The auth schema in the shared DB did not match the running GoTrue code

These caused:

- `operator does not exist: uuid = text`
- `invalid input syntax for type uuid: "100366414004841515196"`
- `null value in column "provider_id" of relation "identities" violates not-null constraint`

Actual Hub fixes required:

- convert some auth state IDs from `uuid` to `text`
- convert `auth.identities.id` from `uuid` to `text`
- allow `auth.identities.provider_id` to be nullable

Pyebwa rule:

- do not assume the current shared DB auth schema is internally consistent
- inspect the new Pyebwa DB schema after bootstrap and before cutover
- compare the running GoTrue expectations with actual column types/nullability
- if Pyebwa is seeded from the old shared DB, validate these tables explicitly:
  - `auth.identities`
  - `auth.flow_state`
  - `auth.oauth_client_states`
  - `auth.saml_relay_states`

### 5. Browser-side callback logic was processing auth state more than once

This caused:

- token lock conflicts
- duplicate callback handling
- transient `403 /auth/v1/user`

Pyebwa rule:

- callback pages must execute session handling once per page load
- if Pyebwa has both implicit-flow and PKCE-era callback code, clean that up before cutover
- do not allow old and new callback logic to coexist on the same route

### 6. The service worker and cached auth routes amplified stale behavior

This caused:

- browsers continuing to hit old auth routes after server fixes
- stale callback behavior surviving deploys

Pyebwa rule:

- auth routes must not be cached by the service worker
- if the current Pyebwa PWA/service-worker setup touches login or callback routes, exclude them before cutover
- auth pages should be `no-store` / `no-cache`

### 7. Storage and Studio do not have to block auth/REST cutover

Hub isolation succeeded for live auth/API cutover while:

- `hub-storage` was still incomplete
- `hub-studio` was still unhealthy

Pyebwa rule:

- do not block Pyebwa auth/REST cutover on Studio
- do not block Pyebwa auth/REST cutover on Storage unless Pyebwa production login or core app flows actually depend on it immediately
- treat storage bootstrap as a separate validation track if necessary

## Constraint

Pyebwa extraction must happen without depending on the old shared default environment after cutover.

Do not leave Pyebwa attached to:

- `supabase_default`
- `db`
- the old shared JWT secret
- the old shared Kong or auth service

## Target Pyebwa Topology

Recommended compose project:

- `pyebwasupabase`

Recommended containers:

- `pyebwa-db`
- `pyebwa-auth`
- `pyebwa-rest`
- `pyebwa-realtime`
- `pyebwa-storage`
- `pyebwa-kong`
- `pyebwa-meta`
- `pyebwa-imgproxy`
- `pyebwa-studio`

Recommended network:

- `pyebwasupabase_default`

Recommended ports:

- Pyebwa Kong HTTP proxy: `127.0.0.1:8201 -> 8000`
- Pyebwa auth direct debug port: optional `127.0.0.1:10998 -> 9999`
- Pyebwa REST direct debug port: optional `127.0.0.1:14939 -> 3000`

Do not reuse:

- `8001`
- `9998`
- shared default service names

## Secrets To Regenerate

Generate new Pyebwa-only values:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `ANON_KEY`
- `SERVICE_KEY`

Do not reuse any secret from:

- Hub isolated environment
- the old shared default environment

## Required Pyebwa Config

Pyebwa-specific values should remain:

- `GOTRUE_SITE_URL=https://rasin.pyebwa.com`
- `API_EXTERNAL_URL=https://rasin.pyebwa.com/supabase`

Review and update allow list to include only intended Pyebwa URLs.

The current allow list is legacy-shaped:

- `https://pyebwa.com`
- `https://www.pyebwa.com`
- `https://rasin.pyebwa.com/login.html`

The new allow list must include the actual live Pyebwa callback and auth entrypoints, for example:

- `https://rasin.pyebwa.com/login`
- `https://rasin.pyebwa.com/register`
- `https://rasin.pyebwa.com/auth/callback`
- `https://rasin.pyebwa.com/oauth-callback`

Adjust those paths to match the real Pyebwa app before cutover.

## Mandatory Pre-Cutover Audit

Before switching any production traffic:

1. Audit all Pyebwa auth entrypoints on disk
- `login.html`
- `register.html`
- `forgot-password*.html`
- localized auth callback pages
- any `*-shadcn.html` pages

2. Audit all Pyebwa reverse-proxy rules
- clean routes
- `.html` routes
- auth/API rewrites

3. Audit all Pyebwa service-worker behavior
- confirm auth routes are not cached
- confirm callback routes are not cached

4. Audit all OAuth helper paths
- provider authorize route
- callback route
- any app-side helper like `/api/auth/oauth-authorize`

5. Audit auth schema in the new Pyebwa DB
- verify the auth tables and column types are compatible with the GoTrue version you are actually running

## Migration Sequence

### Phase 1: Build New Pyebwa Environment

1. Create a new Pyebwa-only infra directory.
2. Create a new compose project and network.
3. Create a new Pyebwa-only Postgres instance.
4. Create new Pyebwa-only JWT and API keys.
5. Start the new environment without changing production traffic.

Minimum validation before moving on:

- `pyebwa-kong` healthy
- `pyebwa-auth` healthy
- `pyebwa-rest` healthy
- Kong responds internally
- `/auth/v1/settings` returns `200`

### Phase 2: Prepare The New Pyebwa DB Correctly

1. Seed the DB.
2. Validate auth schema compatibility before cutover.
3. Apply any required auth migrations before traffic switch.
4. Import only the Pyebwa-required auth and app data.

Minimum checks:

- `auth.users`
- `auth.identities`
- `auth.flow_state`
- `auth.oauth_client_states`
- `auth.saml_relay_states`

If schema mismatches are found, fix them before cutover, not after.

### Phase 3: Repoint Pyebwa OAuth Internals Before Public Cutover

This is the most important migration lesson.

Before public traffic hits the new Pyebwa environment:

1. point provider authorize flow at the new Pyebwa auth service
2. point callback verification at the same new Pyebwa auth service
3. point Pyebwa Kong/auth proxy to the new Pyebwa stack
4. ensure any internal helper endpoint also uses the new Pyebwa auth direct URL

Do not allow:

- authorize on old auth + callback on new auth
- helper routes still pointing at old shared auth

### Phase 4: Clean Auth Route Surface

Before cutover:

1. replace or bypass stale `.html` auth pages
2. ensure Apache/Nginx does not serve old auth files directly
3. make auth entrypoints resolve to the live app
4. make auth pages non-cacheable
5. exclude auth routes from service-worker caching

### Phase 5: Repoint Reverse Proxy

1. change `rasin.pyebwa.com` auth/API proxying to the new Pyebwa Kong
2. keep the old environment untouched until validation completes

### Phase 6: Validate End-To-End

Required tests:

1. login on `rasin.pyebwa.com`
2. OAuth authorize path
3. OAuth callback path
4. `GET /auth/v1/user`
5. logout
6. fresh login again
7. any locale-specific login routes if Pyebwa has them

Specifically verify:

- no redirect to Hub
- no stale static auth page served
- no bad OAuth state/signature error
- no callback timeout/spinner hang
- no wrong-domain callback

### Phase 7: Remove Pyebwa From Default Environment

Only after Pyebwa is confirmed stable:

1. stop `pyebwa-supabase-auth`
2. remove Pyebwa-specific routing to the default environment
3. remove any remaining Pyebwa secrets from shared locations
4. remove any Pyebwa containers from `supabase_default`

Do not do Phase 7 before successful validation.

## Validation Checklist

Infrastructure:

- Pyebwa containers are not on `supabase_default`
- Pyebwa DB is not Hub DB
- Pyebwa JWT secret is unique
- Pyebwa Kong points only to Pyebwa services
- Pyebwa auth direct URL is not the old shared auth port

OAuth:

- authorize and callback hit the same Pyebwa auth stack
- all real callback URLs are in `GOTRUE_URI_ALLOW_LIST`
- no stale static auth pages are reachable
- auth pages are not service-worker cached

Data:

- Pyebwa login no longer depends on shared DB state
- Pyebwa auth writes land only in the new Pyebwa DB
- required user/profile data exists in the new Pyebwa DB

## Rollback

If the new Pyebwa environment fails:

1. revert reverse proxy to the old default-backed path
2. keep the new Pyebwa environment for debugging
3. do not touch Hub

Do not:

- partially remove Pyebwa from default during rollback
- rotate Hub secrets during Pyebwa rollback

## Expected End State

After both migrations are complete:

- Hub runs in its own isolated environment
- Pyebwa runs in its own isolated environment
- neither domain shares:
  - Docker network
  - Postgres auth DB
  - JWT secret
  - Kong/API gateway
  - auth trust boundary

## Direct Instruction To The Pyebwa Agent

Do not treat this as a greenfield migration.

The Hub migration already proved that the dangerous parts are:

- mixed authorize/callback auth backends
- stale static auth pages
- incomplete allow-list coverage
- auth schema drift
- cached auth routes

Solve those intentionally before cutover. Do not wait for production login failures to reveal them.
