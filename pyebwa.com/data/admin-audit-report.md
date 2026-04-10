# Rasin Application Security and Reliability Audit

Generated: 2026-04-10T11:21:46.543Z
Updated: 2026-04-10T11:21:46.543Z
Target: https://rasin.pyebwa.com

## Executive summary

- The active application in this repository is an Express server plus static frontend assets using Supabase Auth and a proxied Supabase gateway. It is not a Next.js application.
- The highest-risk findings are committed secrets, over-broad authorization, service_role-backed storage actions reachable from user-controlled flows, an unsafe signup path, and multiple stored XSS paths.
- This report is persisted in admin so findings can be tracked and converted into tickets over time.

## Top 10 risks

1. Committed live secrets and privileged Supabase credentials
2. Moderators are granted broad admin access
3. Service-role storage operations are reachable from user-controlled flows
4. Any tree member can email the entire tree
5. Public signup endpoint creates email-confirmed users and logs credentials
6. Stored XSS through unsanitized innerHTML rendering
7. Invite and discovery actions are too broadly available
8. Intended security middleware is not active
9. Admin list endpoints do full-table reads and filter in memory
10. No Supabase RLS or storage policy definitions are present in this repo

## Critical

### Committed live secrets and privileged Supabase credentials

- Severity: Critical
- File/path: /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/.env
- Issue: The repository contains a committed .env with live-looking database credentials, Supabase service_role, VAPID private key, Resend API key, and webhook secret.
- Why it matters: Anyone with repository access can impersonate the backend, bypass storage and database protections via service_role, send email as the application, and forge webhook requests.
- Evidence:
  - .env contains DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PRIVATE_KEY, RESEND_API_KEY, and SEND_EMAIL_HOOK_SECRET.
  - server/services/supabase.js constructs a privileged Supabase client from SUPABASE_SERVICE_ROLE_KEY.
- Recommended fix: Rotate all exposed secrets immediately, remove .env from version control, replace it with .env.example, and audit systems for misuse.
- Actions:
  - Rotate exposed secrets and remove committed .env (P0, owner: platform)

## High

### Moderators are granted broad admin access

- Severity: High
- File/path: /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/db/auth.js
- Issue: requireAdmin() allows moderator, admin, and superadmin, and sensitive /api/admin routes depend on that middleware.
- Why it matters: A lower-privilege role can access cross-tenant data and destructive admin operations.
- Evidence:
  - server/db/auth.js includes moderator in requireAdmin().
  - server/api/admin.js uses requireAdmin for /summary, /users, /audit, and tree deletion.
- Recommended fix: Split moderator privileges from admin privileges and gate sensitive routes behind admin or superadmin only.
- Actions:
  - Restrict sensitive admin routes to admin and superadmin (P1, owner: backend)

### Service-role storage operations are reachable from user-controlled flows

- Severity: High
- File/path: /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/api/uploads.js
- Issue: Upload and delete endpoints accept caller-controlled storage parameters and use a service_role storage client without verifying ownership.
- Why it matters: Any authenticated user can write into another tree namespace or delete files they do not own.
- Evidence:
  - server/api/uploads.js trusts treeId, personId, category, and url/path from the request.
  - server/services/file-storage.js uploads and removes objects through supabaseAdmin.
- Recommended fix: Derive storage paths on the server from verified ownership, persist file ownership metadata, and authorize deletes against that metadata.
- Actions:
  - Enforce server-side ownership checks for upload and delete paths (P1, owner: backend)

### Any tree member can email the entire tree

- Severity: High
- File/path: /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/api/notifications.js
- Issue: The family-update route only checks tree membership before emailing every other member.
- Why it matters: An invited member can spam the whole tree, generate cost, and send misleading messages under the application identity.
- Evidence:
  - server/api/notifications.js only checks hasAccess(treeId, userId).
  - The same route sends email to all recipientIds derived from the tree member list.
- Recommended fix: Restrict bulk family notifications to tree owner or delegated admins and add route-level rate limits.
- Actions:
  - Limit family-update email actions to authorized tree admins (P1, owner: backend)

### Public signup endpoint creates email-confirmed users and logs credentials

- Severity: High
- File/path: /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/api/auth-secure.js
- Issue: The unauthenticated signup path creates users with email_confirm set true and logs temporary passwords on email failure.
- Why it matters: This bypasses normal verification and risks credential disclosure in logs.
- Evidence:
  - server/api/auth-secure.js uses supabaseAdmin.auth.admin.createUser with email_confirm: true.
  - The same route logs temp passwords when email is not configured or fails.
- Recommended fix: Remove or heavily restrict this route and use OTP or verified-email signup only. Never log credentials.
- Actions:
  - Retire public temp-password signup and eliminate credential logging (P1, owner: auth)

## Medium

### Stored XSS through unsanitized innerHTML rendering

- Severity: Medium
- File/path: /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/app/js/member-profile.js
- Issue: User-controlled values like biographies, tree names, descriptions, and discovery messages are rendered via innerHTML without sanitization.
- Why it matters: Malicious content can execute in other users’ browsers, including admin sessions.
- Evidence:
  - app/js/member-profile.js injects member.biography into HTML.
  - app/js/app.js injects tree and discovery request fields into HTML templates.
- Recommended fix: Escape all untrusted content or render through text nodes. Only allow sanitized rich text where explicitly needed.
- Actions:
  - Sanitize persisted user content before HTML rendering (P2, owner: frontend)

### Invite and discovery actions are too broadly available

- Severity: Medium
- File/path: /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/api/invites.js
- Issue: Any tree member can generate invites, review discovery requests, and invite discovery requesters. The allowMemberInvites tree setting is not enforced.
- Why it matters: Non-owner members can bring outsiders into a tree and access requester PII against product expectations.
- Evidence:
  - server/api/invites.js only checks tree access before creating invites.
  - server/api/discovery.js only checks tree access before listing or updating requests.
  - server/db/schema.sql defines allowMemberInvites in settings but server routes do not enforce it.
- Recommended fix: Enforce invite and discovery privileges on the server based on owner/admin role and tree settings.
- Actions:
  - Apply allowMemberInvites and role checks to invite and discovery routes (P2, owner: backend)

### Intended security middleware is not active

- Severity: Medium
- File/path: /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server.js
- Issue: The live server disables CSP and does not wire in the project’s stronger security and validation middleware.
- Why it matters: The app misses intended protections, making XSS and input-handling issues easier to exploit.
- Evidence:
  - server.js calls helmet({ contentSecurityPolicy: false }).
  - server/middleware/security.js and server/middleware/input-validation.js are present but unused.
- Recommended fix: Adopt a single security middleware stack, wire it into server.js, and verify CSP and validation behavior in tests.
- Actions:
  - Enable and validate the intended security middleware stack (P2, owner: backend)

### Admin list endpoints do full-table reads and filter in memory

- Severity: Medium
- File/path: /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/api/admin.js
- Issue: Admin users and audit endpoints load large result sets into memory and only then filter, paginate, and search.
- Why it matters: This will degrade with data growth and creates avoidable memory pressure and slow responses.
- Evidence:
  - server/api/admin.js loads all users before filtering.
  - server/api/admin.js loads all audit rows before filtering and slicing.
- Recommended fix: Move search, sort, and pagination into SQL and only return the requested page.
- Actions:
  - Push admin filtering and pagination down into SQL (P2, owner: backend)

### No Supabase RLS or storage policy definitions are present in this repo

- Severity: Medium
- File/path: /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/db/schema.sql
- Issue: The codebase relies on application logic and a service_role backend client but contains no RLS or storage policy migrations.
- Why it matters: There is no database-level defense-in-depth if future code starts querying Supabase directly.
- Evidence:
  - server/db/schema.sql defines tables but no ENABLE ROW LEVEL SECURITY or CREATE POLICY statements.
  - server/services/supabase.js creates a service_role Supabase client.
- Recommended fix: Add explicit Supabase SQL migrations for RLS and storage policies, even if current access is mostly server-mediated.
- Actions:
  - Create explicit RLS and storage policy migrations for Supabase (P2, owner: data)

### Critical auth and authorization flows lack automated tests

- Severity: Medium
- File/path: /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/__tests__/theme-toggle-simple.test.js
- Issue: The automated test surface is dominated by theme/UI tests, with limited coverage of authz, storage, admin permissions, and mutation flows.
- Why it matters: Security regressions are likely to ship unnoticed.
- Evidence:
  - package.json points test commands at Jest but the visible automated tests are mostly theme-related.
  - tests/html and tests/auth contain many manual HTML fixtures rather than enforced assertions.
- Recommended fix: Add integration tests for role authorization, invite flows, storage ownership, and destructive mutations.
- Actions:
  - Add integration tests for authz, storage ownership, and destructive mutations (P2, owner: qa)

## Missing tests

- Authorization matrix tests for member, moderator, admin, and superadmin across sensitive routes.
- Upload and delete tests proving users cannot write into or delete another tree namespace.
- Notification tests proving non-owners cannot email an entire tree.
- XSS regression tests for biographies, tree names, descriptions, and discovery request content.
- Invite and discovery tests enforcing allowMemberInvites and owner/admin restrictions.

## Quick wins

- Rotate all committed secrets and remove .env from version control.
- Restrict family-update, invite, and admin routes to the minimum required roles.
- Add ownership checks to all storage write and delete paths.
- Escape or sanitize all user-controlled content before rendering via innerHTML.

## Longer-term refactors

- Move route-level authorization checks into a shared policy layer.
- Create explicit Supabase SQL migrations for RLS, storage policies, and auth sync assumptions.
- Replace in-memory admin filtering with SQL pagination and search.
- Expand automated integration coverage for auth, authorization, storage, and admin mutations.

## Tickets

- No tickets have been created from this audit yet.