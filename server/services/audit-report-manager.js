const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'pyebwa.com', 'data');
const REPORT_JSON_PATH = path.join(DATA_DIR, 'admin-audit-report.json');
const REPORT_MARKDOWN_PATH = path.join(DATA_DIR, 'admin-audit-report.md');
const REPORT_HTML_PATH = path.join(DATA_DIR, 'admin-audit-report.html');
const REPORT_PDF_PATH = path.join(DATA_DIR, 'admin-audit-report.pdf');
const TICKETS_PATH = path.join(DATA_DIR, 'admin-audit-tickets.json');

function nowIso() {
    return new Date().toISOString();
}

function createSeedReport() {
    const generatedAt = nowIso();
    const findings = [
        {
            id: 'finding-committed-secrets',
            title: 'Committed live secrets and privileged Supabase credentials',
            severity: 'critical',
            filePath: '/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/.env',
            issue: 'The repository contains a committed .env with live-looking database credentials, Supabase service_role, VAPID private key, Resend API key, and webhook secret.',
            whyItMatters: 'Anyone with repository access can impersonate the backend, bypass storage and database protections via service_role, send email as the application, and forge webhook requests.',
            evidence: [
                '.env contains DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PRIVATE_KEY, RESEND_API_KEY, and SEND_EMAIL_HOOK_SECRET.',
                'server/services/supabase.js constructs a privileged Supabase client from SUPABASE_SERVICE_ROLE_KEY.'
            ],
            recommendedFix: 'Rotate all exposed secrets immediately, remove .env from version control, replace it with .env.example, and audit systems for misuse.',
            actions: [
                {
                    id: 'action-rotate-secrets',
                    title: 'Rotate exposed secrets and remove committed .env',
                    recommendedOwner: 'platform',
                    priority: 'P0'
                }
            ]
        },
        {
            id: 'finding-moderator-admin-scope',
            title: 'Moderators are granted broad admin access',
            severity: 'high',
            filePath: '/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/db/auth.js',
            issue: 'requireAdmin() allows moderator, admin, and superadmin, and sensitive /api/admin routes depend on that middleware.',
            whyItMatters: 'A lower-privilege role can access cross-tenant data and destructive admin operations.',
            evidence: [
                'server/db/auth.js includes moderator in requireAdmin().',
                'server/api/admin.js uses requireAdmin for /summary, /users, /audit, and tree deletion.'
            ],
            recommendedFix: 'Split moderator privileges from admin privileges and gate sensitive routes behind admin or superadmin only.',
            actions: [
                {
                    id: 'action-split-admin-roles',
                    title: 'Restrict sensitive admin routes to admin and superadmin',
                    recommendedOwner: 'backend',
                    priority: 'P1'
                }
            ]
        },
        {
            id: 'finding-storage-authorization',
            title: 'Service-role storage operations are reachable from user-controlled flows',
            severity: 'high',
            filePath: '/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/api/uploads.js',
            issue: 'Upload and delete endpoints accept caller-controlled storage parameters and use a service_role storage client without verifying ownership.',
            whyItMatters: 'Any authenticated user can write into another tree namespace or delete files they do not own.',
            evidence: [
                'server/api/uploads.js trusts treeId, personId, category, and url/path from the request.',
                'server/services/file-storage.js uploads and removes objects through supabaseAdmin.'
            ],
            recommendedFix: 'Derive storage paths on the server from verified ownership, persist file ownership metadata, and authorize deletes against that metadata.',
            actions: [
                {
                    id: 'action-lock-storage-paths',
                    title: 'Enforce server-side ownership checks for upload and delete paths',
                    recommendedOwner: 'backend',
                    priority: 'P1'
                }
            ]
        },
        {
            id: 'finding-family-update-spam',
            title: 'Any tree member can email the entire tree',
            severity: 'high',
            filePath: '/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/api/notifications.js',
            issue: 'The family-update route only checks tree membership before emailing every other member.',
            whyItMatters: 'An invited member can spam the whole tree, generate cost, and send misleading messages under the application identity.',
            evidence: [
                'server/api/notifications.js only checks hasAccess(treeId, userId).',
                'The same route sends email to all recipientIds derived from the tree member list.'
            ],
            recommendedFix: 'Restrict bulk family notifications to tree owner or delegated admins and add route-level rate limits.',
            actions: [
                {
                    id: 'action-restrict-family-broadcasts',
                    title: 'Limit family-update email actions to authorized tree admins',
                    recommendedOwner: 'backend',
                    priority: 'P1'
                }
            ]
        },
        {
            id: 'finding-admin-signup-flow',
            title: 'Public signup endpoint creates email-confirmed users and logs credentials',
            severity: 'high',
            filePath: '/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/api/auth-secure.js',
            issue: 'The unauthenticated signup path creates users with email_confirm set true and logs temporary passwords on email failure.',
            whyItMatters: 'This bypasses normal verification and risks credential disclosure in logs.',
            evidence: [
                'server/api/auth-secure.js uses supabaseAdmin.auth.admin.createUser with email_confirm: true.',
                'The same route logs temp passwords when email is not configured or fails.'
            ],
            recommendedFix: 'Remove or heavily restrict this route and use OTP or verified-email signup only. Never log credentials.',
            actions: [
                {
                    id: 'action-remove-temp-password-signup',
                    title: 'Retire public temp-password signup and eliminate credential logging',
                    recommendedOwner: 'auth',
                    priority: 'P1'
                }
            ]
        },
        {
            id: 'finding-stored-xss',
            title: 'Stored XSS through unsanitized innerHTML rendering',
            severity: 'medium',
            filePath: '/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/app/js/member-profile.js',
            issue: 'User-controlled values like biographies, tree names, descriptions, and discovery messages are rendered via innerHTML without sanitization.',
            whyItMatters: 'Malicious content can execute in other users’ browsers, including admin sessions.',
            evidence: [
                'app/js/member-profile.js injects member.biography into HTML.',
                'app/js/app.js injects tree and discovery request fields into HTML templates.'
            ],
            recommendedFix: 'Escape all untrusted content or render through text nodes. Only allow sanitized rich text where explicitly needed.',
            actions: [
                {
                    id: 'action-sanitize-user-content',
                    title: 'Sanitize persisted user content before HTML rendering',
                    recommendedOwner: 'frontend',
                    priority: 'P2'
                }
            ]
        },
        {
            id: 'finding-invite-scope',
            title: 'Invite and discovery actions are too broadly available',
            severity: 'medium',
            filePath: '/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/api/invites.js',
            issue: 'Any tree member can generate invites, review discovery requests, and invite discovery requesters. The allowMemberInvites tree setting is not enforced.',
            whyItMatters: 'Non-owner members can bring outsiders into a tree and access requester PII against product expectations.',
            evidence: [
                'server/api/invites.js only checks tree access before creating invites.',
                'server/api/discovery.js only checks tree access before listing or updating requests.',
                'server/db/schema.sql defines allowMemberInvites in settings but server routes do not enforce it.'
            ],
            recommendedFix: 'Enforce invite and discovery privileges on the server based on owner/admin role and tree settings.',
            actions: [
                {
                    id: 'action-enforce-invite-settings',
                    title: 'Apply allowMemberInvites and role checks to invite and discovery routes',
                    recommendedOwner: 'backend',
                    priority: 'P2'
                }
            ]
        },
        {
            id: 'finding-security-middleware-unused',
            title: 'Intended security middleware is not active',
            severity: 'medium',
            filePath: '/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server.js',
            issue: 'The live server disables CSP and does not wire in the project’s stronger security and validation middleware.',
            whyItMatters: 'The app misses intended protections, making XSS and input-handling issues easier to exploit.',
            evidence: [
                'server.js calls helmet({ contentSecurityPolicy: false }).',
                'server/middleware/security.js and server/middleware/input-validation.js are present but unused.'
            ],
            recommendedFix: 'Adopt a single security middleware stack, wire it into server.js, and verify CSP and validation behavior in tests.',
            actions: [
                {
                    id: 'action-wire-security-stack',
                    title: 'Enable and validate the intended security middleware stack',
                    recommendedOwner: 'backend',
                    priority: 'P2'
                }
            ]
        },
        {
            id: 'finding-admin-pagination',
            title: 'Admin list endpoints do full-table reads and filter in memory',
            severity: 'medium',
            filePath: '/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/api/admin.js',
            issue: 'Admin users and audit endpoints load large result sets into memory and only then filter, paginate, and search.',
            whyItMatters: 'This will degrade with data growth and creates avoidable memory pressure and slow responses.',
            evidence: [
                'server/api/admin.js loads all users before filtering.',
                'server/api/admin.js loads all audit rows before filtering and slicing.'
            ],
            recommendedFix: 'Move search, sort, and pagination into SQL and only return the requested page.',
            actions: [
                {
                    id: 'action-sql-pagination',
                    title: 'Push admin filtering and pagination down into SQL',
                    recommendedOwner: 'backend',
                    priority: 'P2'
                }
            ]
        },
        {
            id: 'finding-rls-gap',
            title: 'No Supabase RLS or storage policy definitions are present in this repo',
            severity: 'medium',
            filePath: '/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/server/db/schema.sql',
            issue: 'The codebase relies on application logic and a service_role backend client but contains no RLS or storage policy migrations.',
            whyItMatters: 'There is no database-level defense-in-depth if future code starts querying Supabase directly.',
            evidence: [
                'server/db/schema.sql defines tables but no ENABLE ROW LEVEL SECURITY or CREATE POLICY statements.',
                'server/services/supabase.js creates a service_role Supabase client.'
            ],
            recommendedFix: 'Add explicit Supabase SQL migrations for RLS and storage policies, even if current access is mostly server-mediated.',
            actions: [
                {
                    id: 'action-add-rls-migrations',
                    title: 'Create explicit RLS and storage policy migrations for Supabase',
                    recommendedOwner: 'data',
                    priority: 'P2'
                }
            ]
        },
        {
            id: 'finding-test-gap',
            title: 'Critical auth and authorization flows lack automated tests',
            severity: 'medium',
            filePath: '/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/__tests__/theme-toggle-simple.test.js',
            issue: 'The automated test surface is dominated by theme/UI tests, with limited coverage of authz, storage, admin permissions, and mutation flows.',
            whyItMatters: 'Security regressions are likely to ship unnoticed.',
            evidence: [
                'package.json points test commands at Jest but the visible automated tests are mostly theme-related.',
                'tests/html and tests/auth contain many manual HTML fixtures rather than enforced assertions.'
            ],
            recommendedFix: 'Add integration tests for role authorization, invite flows, storage ownership, and destructive mutations.',
            actions: [
                {
                    id: 'action-add-security-tests',
                    title: 'Add integration tests for authz, storage ownership, and destructive mutations',
                    recommendedOwner: 'qa',
                    priority: 'P2'
                }
            ]
        }
    ];

    const topRisks = findings.slice(0, 10).map((finding) => finding.title);

    return {
        id: 'rasin-audit-2026-04-10',
        title: 'Rasin Application Security and Reliability Audit',
        slug: 'rasin-application-security-and-reliability-audit',
        generatedAt,
        updatedAt: generatedAt,
        target: 'https://rasin.pyebwa.com',
        repository: 'rasin.pyebwa.com',
        executiveSummary: [
            'The active application in this repository is an Express server plus static frontend assets using Supabase Auth and a proxied Supabase gateway. It is not a Next.js application.',
            'The highest-risk findings are committed secrets, over-broad authorization, service_role-backed storage actions reachable from user-controlled flows, an unsafe signup path, and multiple stored XSS paths.',
            'This report is persisted in admin so findings can be tracked and converted into tickets over time.'
        ],
        topRisks,
        findings,
        missingTests: [
            'Authorization matrix tests for member, moderator, admin, and superadmin across sensitive routes.',
            'Upload and delete tests proving users cannot write into or delete another tree namespace.',
            'Notification tests proving non-owners cannot email an entire tree.',
            'XSS regression tests for biographies, tree names, descriptions, and discovery request content.',
            'Invite and discovery tests enforcing allowMemberInvites and owner/admin restrictions.'
        ],
        quickWins: [
            'Rotate all committed secrets and remove .env from version control.',
            'Restrict family-update, invite, and admin routes to the minimum required roles.',
            'Add ownership checks to all storage write and delete paths.',
            'Escape or sanitize all user-controlled content before rendering via innerHTML.'
        ],
        longerTermRefactors: [
            'Move route-level authorization checks into a shared policy layer.',
            'Create explicit Supabase SQL migrations for RLS, storage policies, and auth sync assumptions.',
            'Replace in-memory admin filtering with SQL pagination and search.',
            'Expand automated integration coverage for auth, authorization, storage, and admin mutations.'
        ]
    };
}

function createSeedTickets() {
    return {
        updatedAt: nowIso(),
        tickets: []
    };
}

async function ensureDataFiles() {
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
        await fs.access(REPORT_JSON_PATH);
    } catch (error) {
        await fs.writeFile(REPORT_JSON_PATH, JSON.stringify(createSeedReport(), null, 2), 'utf8');
    }

    try {
        await fs.access(TICKETS_PATH);
    } catch (error) {
        await fs.writeFile(TICKETS_PATH, JSON.stringify(createSeedTickets(), null, 2), 'utf8');
    }

    await renderAssets();
}

async function readJson(filePath, fallbackFactory) {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        const fallback = fallbackFactory();
        await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), 'utf8');
        return fallback;
    }
}

async function writeJson(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return data;
}

async function getReport() {
    await ensureDataFiles();
    const report = await readJson(REPORT_JSON_PATH, createSeedReport);
    return normalizeReport(report);
}

async function saveReport(report) {
    const normalized = normalizeReport({
        ...report,
        updatedAt: nowIso()
    });
    await writeJson(REPORT_JSON_PATH, normalized);
    await renderAssets();
    return normalized;
}

async function getTickets() {
    await ensureDataFiles();
    const payload = await readJson(TICKETS_PATH, createSeedTickets);
    return normalizeTickets(payload);
}

async function saveTickets(payload) {
    const normalized = normalizeTickets({
        ...payload,
        updatedAt: nowIso()
    });
    await writeJson(TICKETS_PATH, normalized);
    await renderAssets();
    return normalized;
}

function normalizeReport(report) {
    const seed = createSeedReport();
    const findings = Array.isArray(report.findings) ? report.findings : seed.findings;
    return {
        ...seed,
        ...report,
        findings: findings.map((finding) => ({
            actions: [],
            evidence: [],
            ...finding,
            actions: Array.isArray(finding.actions) ? finding.actions : [],
            evidence: Array.isArray(finding.evidence) ? finding.evidence : []
        })),
        topRisks: Array.isArray(report.topRisks) ? report.topRisks : seed.topRisks,
        executiveSummary: Array.isArray(report.executiveSummary) ? report.executiveSummary : seed.executiveSummary,
        missingTests: Array.isArray(report.missingTests) ? report.missingTests : seed.missingTests,
        quickWins: Array.isArray(report.quickWins) ? report.quickWins : seed.quickWins,
        longerTermRefactors: Array.isArray(report.longerTermRefactors) ? report.longerTermRefactors : seed.longerTermRefactors
    };
}

function normalizeTickets(payload) {
    const tickets = Array.isArray(payload.tickets) ? payload.tickets : [];
    return {
        updatedAt: payload.updatedAt || nowIso(),
        tickets: tickets.map((ticket) => ({
            id: ticket.id || `ticket-${crypto.randomUUID()}`,
            status: 'open',
            priority: 'P2',
            severity: 'medium',
            owner: '',
            sourceFindingId: '',
            sourceActionId: '',
            summary: '',
            title: '',
            notes: '',
            tags: [],
            createdAt: nowIso(),
            updatedAt: nowIso(),
            ...ticket,
            tags: Array.isArray(ticket.tags) ? ticket.tags : []
        }))
    };
}

function groupFindingsBySeverity(findings) {
    const order = ['critical', 'high', 'medium', 'low'];
    return order.map((severity) => ({
        severity,
        items: findings.filter((finding) => String(finding.severity || '').toLowerCase() === severity)
    })).filter((group) => group.items.length > 0);
}

function ticketIndexByAction(tickets) {
    const index = new Map();
    for (const ticket of tickets) {
        const key = `${ticket.sourceFindingId || ''}:${ticket.sourceActionId || ''}`;
        if (!ticket.sourceFindingId || !ticket.sourceActionId) continue;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(ticket);
    }
    return index;
}

function renderMarkdown(report, ticketsPayload) {
    const ticketMap = ticketIndexByAction(ticketsPayload.tickets);
    const lines = [];

    lines.push(`# ${report.title}`);
    lines.push('');
    lines.push(`Generated: ${report.generatedAt}`);
    lines.push(`Updated: ${report.updatedAt}`);
    lines.push(`Target: ${report.target}`);
    lines.push('');
    lines.push('## Executive summary');
    lines.push('');
    for (const item of report.executiveSummary) {
        lines.push(`- ${item}`);
    }
    lines.push('');
    lines.push('## Top 10 risks');
    lines.push('');
    report.topRisks.forEach((item, index) => {
        lines.push(`${index + 1}. ${item}`);
    });
    lines.push('');

    for (const group of groupFindingsBySeverity(report.findings)) {
        lines.push(`## ${capitalize(group.severity)}`);
        lines.push('');
        for (const finding of group.items) {
            lines.push(`### ${finding.title}`);
            lines.push('');
            lines.push(`- Severity: ${capitalize(finding.severity)}`);
            lines.push(`- File/path: ${finding.filePath}`);
            lines.push(`- Issue: ${finding.issue}`);
            lines.push(`- Why it matters: ${finding.whyItMatters}`);
            lines.push('- Evidence:');
            for (const evidenceLine of finding.evidence) {
                lines.push(`  - ${evidenceLine}`);
            }
            lines.push(`- Recommended fix: ${finding.recommendedFix}`);
            if (finding.actions.length) {
                lines.push('- Actions:');
                for (const action of finding.actions) {
                    const linkedTickets = ticketMap.get(`${finding.id}:${action.id}`) || [];
                    const ticketSummary = linkedTickets.length
                        ? ` [tickets: ${linkedTickets.map((ticket) => ticket.id).join(', ')}]`
                        : '';
                    lines.push(`  - ${action.title} (${action.priority}, owner: ${action.recommendedOwner})${ticketSummary}`);
                }
            }
            lines.push('');
        }
    }

    lines.push('## Missing tests');
    lines.push('');
    for (const item of report.missingTests) lines.push(`- ${item}`);
    lines.push('');
    lines.push('## Quick wins');
    lines.push('');
    for (const item of report.quickWins) lines.push(`- ${item}`);
    lines.push('');
    lines.push('## Longer-term refactors');
    lines.push('');
    for (const item of report.longerTermRefactors) lines.push(`- ${item}`);
    lines.push('');
    lines.push('## Tickets');
    lines.push('');
    if (!ticketsPayload.tickets.length) {
        lines.push('- No tickets have been created from this audit yet.');
    } else {
        for (const ticket of ticketsPayload.tickets) {
            lines.push(`- ${ticket.id}: ${ticket.title} [${ticket.status}]`);
        }
    }

    return lines.join('\n');
}

function renderHtml(report, ticketsPayload) {
    const ticketMap = ticketIndexByAction(ticketsPayload.tickets);
    const grouped = groupFindingsBySeverity(report.findings);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(report.title)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f3efe6;
      --panel: #fffdfa;
      --text: #1d241f;
      --muted: #5d665f;
      --border: #d9d2c3;
      --critical: #a32020;
      --high: #b35613;
      --medium: #4a5c14;
      --low: #1d5b7a;
      --accent: #1b4332;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    main {
      max-width: 1120px;
      margin: 0 auto;
      padding: 32px 20px 56px;
    }
    .hero, .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 18px 40px rgba(27, 67, 50, 0.06);
    }
    .hero h1 {
      margin: 0 0 12px;
      font-size: 2rem;
    }
    .meta {
      color: var(--muted);
      font-size: 0.95rem;
    }
    .risk-list li, .bullet-list li { margin-bottom: 8px; }
    .finding {
      border-top: 1px solid var(--border);
      padding-top: 20px;
      margin-top: 20px;
    }
    .finding:first-of-type {
      border-top: 0;
      margin-top: 0;
      padding-top: 0;
    }
    .badge {
      display: inline-block;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: #fff;
    }
    .severity-critical { background: var(--critical); }
    .severity-high { background: var(--high); }
    .severity-medium { background: var(--medium); }
    .severity-low { background: var(--low); }
    code {
      background: #f3eee5;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 0.92em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th, td {
      text-align: left;
      padding: 12px 10px;
      border-top: 1px solid var(--border);
      vertical-align: top;
    }
    th { color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .ticket-pill {
      display: inline-block;
      margin: 4px 6px 0 0;
      padding: 4px 8px;
      border-radius: 999px;
      background: #edf5ee;
      color: var(--accent);
      font-size: 0.78rem;
      font-weight: 600;
    }
    @media print {
      body { background: #fff; }
      .hero, .panel { box-shadow: none; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <h1>${escapeHtml(report.title)}</h1>
      <div class="meta">Generated ${escapeHtml(formatDate(report.generatedAt))} • Updated ${escapeHtml(formatDate(report.updatedAt))} • Target ${escapeHtml(report.target)}</div>
      <ul class="bullet-list">
        ${report.executiveSummary.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </section>
    <section class="panel">
      <h2>Top 10 risks</h2>
      <ol class="risk-list">
        ${report.topRisks.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ol>
    </section>
    ${grouped.map((group) => `
      <section class="panel">
        <h2>${escapeHtml(capitalize(group.severity))}</h2>
        ${group.items.map((finding) => `
          <article class="finding">
            <div class="badge severity-${escapeHtml(finding.severity)}">${escapeHtml(finding.severity)}</div>
            <h3>${escapeHtml(finding.title)}</h3>
            <p><strong>File/path:</strong> <code>${escapeHtml(finding.filePath)}</code></p>
            <p><strong>Issue:</strong> ${escapeHtml(finding.issue)}</p>
            <p><strong>Why it matters:</strong> ${escapeHtml(finding.whyItMatters)}</p>
            <p><strong>Evidence:</strong></p>
            <ul class="bullet-list">
              ${finding.evidence.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
            </ul>
            <p><strong>Recommended fix:</strong> ${escapeHtml(finding.recommendedFix)}</p>
            ${finding.actions.length ? `
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Priority</th>
                    <th>Owner</th>
                    <th>Linked tickets</th>
                  </tr>
                </thead>
                <tbody>
                  ${finding.actions.map((action) => {
                      const linkedTickets = ticketMap.get(`${finding.id}:${action.id}`) || [];
                      return `<tr>
                        <td>${escapeHtml(action.title)}</td>
                        <td>${escapeHtml(action.priority || 'P2')}</td>
                        <td>${escapeHtml(action.recommendedOwner || '')}</td>
                        <td>${linkedTickets.length ? linkedTickets.map((ticket) => `<span class="ticket-pill">${escapeHtml(ticket.id)} • ${escapeHtml(ticket.status)}</span>`).join('') : 'No tickets yet'}</td>
                      </tr>`;
                  }).join('')}
                </tbody>
              </table>
            ` : ''}
          </article>
        `).join('')}
      </section>
    `).join('')}
    <section class="panel">
      <h2>Missing tests</h2>
      <ul class="bullet-list">
        ${report.missingTests.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
      <h2>Quick wins</h2>
      <ul class="bullet-list">
        ${report.quickWins.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
      <h2>Longer-term refactors</h2>
      <ul class="bullet-list">
        ${report.longerTermRefactors.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </section>
  </main>
</body>
</html>`;
}

function buildPdfBuffer(markdown) {
    const sourceLines = markdown.split('\n');
    const wrappedLines = [];

    for (const line of sourceLines) {
        const normalized = String(line || '').replace(/\t/g, '    ');
        if (!normalized) {
            wrappedLines.push('');
            continue;
        }
        let remaining = normalized;
        while (remaining.length > 100) {
            wrappedLines.push(remaining.slice(0, 100));
            remaining = remaining.slice(100);
        }
        wrappedLines.push(remaining);
    }

    const linesPerPage = 46;
    const pages = [];
    for (let index = 0; index < wrappedLines.length; index += linesPerPage) {
        pages.push(wrappedLines.slice(index, index + linesPerPage));
    }

    const objects = [];
    const addObject = (body) => {
        objects.push(body);
        return objects.length;
    };

    const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const pageIds = [];
    const contentIds = [];

    for (const pageLines of pages) {
        const streamLines = pageLines.map((line, index) => {
            const y = 790 - (index * 16);
            return `BT /F1 10 Tf 40 ${y} Td (${escapePdfText(line)}) Tj ET`;
        }).join('\n');
        const contentBody = `<< /Length ${Buffer.byteLength(streamLines, 'utf8')} >>\nstream\n${streamLines}\nendstream`;
        const contentId = addObject(contentBody);
        contentIds.push(contentId);
        pageIds.push(addObject(''));
    }

    const pagesId = addObject('');
    for (let i = 0; i < pageIds.length; i += 1) {
        objects[pageIds[i] - 1] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;
    }
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (let i = 0; i < objects.length; i += 1) {
        offsets.push(Buffer.byteLength(pdf, 'utf8'));
        pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i < offsets.length; i += 1) {
        pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
}

function escapePdfText(value) {
    return String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
}

async function renderAssets() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const report = normalizeReport(await readJson(REPORT_JSON_PATH, createSeedReport));
    const ticketsPayload = normalizeTickets(await readJson(TICKETS_PATH, createSeedTickets));
    const markdown = renderMarkdown(report, ticketsPayload);
    const html = renderHtml(report, ticketsPayload);
    const pdf = buildPdfBuffer(markdown);

    await fs.writeFile(REPORT_MARKDOWN_PATH, markdown, 'utf8');
    await fs.writeFile(REPORT_HTML_PATH, html, 'utf8');
    await fs.writeFile(REPORT_PDF_PATH, pdf);
}

async function getReportBundle() {
    const report = await getReport();
    const tickets = await getTickets();
    const actionTicketMap = ticketIndexByAction(tickets.tickets);
    return {
        report: {
            ...report,
            findings: report.findings.map((finding) => ({
                ...finding,
                actions: finding.actions.map((action) => ({
                    ...action,
                    linkedTickets: actionTicketMap.get(`${finding.id}:${action.id}`) || []
                }))
            }))
        },
        tickets,
        assets: {
            markdown: '/api/admin/audit/report/download?format=markdown',
            html: '/api/admin/audit/report/download?format=html',
            pdf: '/api/admin/audit/report/download?format=pdf'
        }
    };
}

async function createTicketFromAction({ findingId, actionId, title, owner = '', notes = '', createdBy = '' }) {
    const report = await getReport();
    const finding = report.findings.find((item) => item.id === findingId);
    if (!finding) {
        throw new Error('Audit finding not found');
    }
    const action = finding.actions.find((item) => item.id === actionId);
    if (!action) {
        throw new Error('Audit action not found');
    }

    const ticketsPayload = await getTickets();
    const existing = ticketsPayload.tickets.find((ticket) => ticket.sourceFindingId === findingId && ticket.sourceActionId === actionId && ticket.status !== 'closed');
    if (existing) {
        return existing;
    }

    const ticket = {
        id: `AUD-${String(ticketsPayload.tickets.length + 1).padStart(3, '0')}`,
        title: title || action.title,
        summary: finding.title,
        severity: finding.severity,
        priority: action.priority || 'P2',
        owner,
        status: 'open',
        notes,
        sourceFindingId: findingId,
        sourceActionId: actionId,
        tags: ['audit', finding.severity, action.recommendedOwner || 'unassigned'].filter(Boolean),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdBy
    };

    ticketsPayload.tickets.push(ticket);
    await saveTickets(ticketsPayload);
    return ticket;
}

async function createManualTicket({
    title,
    summary = '',
    severity = 'medium',
    priority = 'P2',
    owner = '',
    notes = '',
    tags = [],
    createdBy = ''
}) {
    const normalizedTitle = String(title || '').trim();
    if (!normalizedTitle) {
        throw new Error('Ticket title is required');
    }

    const ticketsPayload = await getTickets();
    const ticket = {
        id: `AUD-${String(ticketsPayload.tickets.length + 1).padStart(3, '0')}`,
        title: normalizedTitle,
        summary: String(summary || '').trim(),
        severity: String(severity || 'medium').trim().toLowerCase(),
        priority: String(priority || 'P2').trim().toUpperCase(),
        owner: String(owner || '').trim(),
        status: 'open',
        notes: String(notes || '').trim(),
        sourceFindingId: '',
        sourceActionId: '',
        tags: ['audit', 'manual', ...tags.map((tag) => String(tag || '').trim()).filter(Boolean)],
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdBy
    };

    ticketsPayload.tickets.push(ticket);
    await saveTickets(ticketsPayload);
    return ticket;
}

async function updateTicket(ticketId, updates = {}) {
    const ticketsPayload = await getTickets();
    const ticket = ticketsPayload.tickets.find((item) => item.id === ticketId);
    if (!ticket) {
        throw new Error('Ticket not found');
    }

    const allowedStatuses = new Set(['open', 'in_progress', 'blocked', 'resolved', 'closed']);
    const nextStatus = updates.status ? String(updates.status).trim().toLowerCase() : ticket.status;
    if (!allowedStatuses.has(nextStatus)) {
        throw new Error('Invalid ticket status');
    }

    ticket.status = nextStatus;
    if (updates.owner !== undefined) ticket.owner = String(updates.owner || '').trim();
    if (updates.notes !== undefined) ticket.notes = String(updates.notes || '').trim();
    if (updates.priority !== undefined) ticket.priority = String(updates.priority || ticket.priority).trim();
    ticket.updatedAt = nowIso();

    await saveTickets(ticketsPayload);
    return ticket;
}

function getAssetPath(format) {
    switch (String(format || '').toLowerCase()) {
        case 'md':
        case 'markdown':
            return {
                path: REPORT_MARKDOWN_PATH,
                contentType: 'text/markdown; charset=utf-8',
                downloadName: 'pyebwa-audit-report.md'
            };
        case 'html':
            return {
                path: REPORT_HTML_PATH,
                contentType: 'text/html; charset=utf-8',
                downloadName: 'pyebwa-audit-report.html'
            };
        case 'pdf':
            return {
                path: REPORT_PDF_PATH,
                contentType: 'application/pdf',
                downloadName: 'pyebwa-audit-report.pdf'
            };
        default:
            throw new Error('Unsupported report format');
    }
}

function capitalize(value) {
    const text = String(value || '');
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || '');
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

module.exports = {
    ensureDataFiles,
    getReport,
    saveReport,
    getTickets,
    saveTickets,
    getReportBundle,
    createTicketFromAction,
    createManualTicket,
    updateTicket,
    getAssetPath
};
