#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULT_SKIP_PATTERNS = [
    /(^|\/)node_modules\//,
    /(^|\/)\.git\//,
    /(^|\/)package-lock\.json$/,
    /(^|\/)logs\//,
    /\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|tar|jar)$/i
];

const SECRET_NAME_PATTERN = /(DATABASE_URL|SUPABASE_SERVICE_ROLE_KEY|PYEBWA_SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|VAPID_PRIVATE_KEY|SEND_EMAIL_HOOK_SECRET|WEBHOOK_SECRET|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|MOONPAY_WEBHOOK_SECRET)/;
const PLACEHOLDER_PATTERN = /^(?:|['"]?(?:your_|replace_with_|example_|placeholder|changeme|not-set|not_set|\$\{|\$\(|<|https?:\/\/localhost|postgres:\/\/\$\{))/i;

const RULES = [
    {
        id: 'jwt',
        message: 'JWT-shaped token',
        pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g
    },
    {
        id: 'api-secret-prefix',
        message: 'High-confidence API secret prefix',
        pattern: /\b(?:sk_live|sk_test|re_|whsec_|sb_secret_)[A-Za-z0-9_-]{16,}\b/g
    }
];

function shouldSkipFile(filePath) {
    return DEFAULT_SKIP_PATTERNS.some((pattern) => pattern.test(filePath));
}

function isLikelyPlaceholder(value) {
    const normalized = String(value || '').trim();
    return PLACEHOLDER_PATTERN.test(normalized) || normalized.includes('...');
}

function findLineAndColumn(text, index) {
    const prefix = text.slice(0, index);
    const lines = prefix.split('\n');
    return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1
    };
}

function addPatternFindings(findings, filePath, text) {
    for (const rule of RULES) {
        for (const match of text.matchAll(rule.pattern)) {
            const location = findLineAndColumn(text, match.index);
            findings.push({
                file: filePath,
                line: location.line,
                column: location.column,
                rule: rule.id,
                message: rule.message
            });
        }
    }
}

function addAssignmentFindings(findings, filePath, text) {
    const lines = text.split('\n');
    lines.forEach((lineText, index) => {
        if (!SECRET_NAME_PATTERN.test(lineText)) return;

        const assignment = lineText.match(/(?:^|\s|export\s+)([A-Z0-9_]*?(?:DATABASE_URL|SERVICE_ROLE_KEY|API_KEY|PRIVATE_KEY|WEBHOOK_SECRET))\s*[:=]\s*(.+)$/);
        if (!assignment) return;

        const value = assignment[2].trim().replace(/,$/, '');
        if (isLikelyPlaceholder(value)) return;

        findings.push({
            file: filePath,
            line: index + 1,
            column: lineText.indexOf(assignment[1]) + 1,
            rule: 'secret-assignment',
            message: `Literal value assigned to ${assignment[1]}`
        });
    });
}

function scanText(filePath, text) {
    const findings = [];
    addPatternFindings(findings, filePath, text);
    addAssignmentFindings(findings, filePath, text);
    return findings;
}

function listTrackedFiles(cwd) {
    const output = execFileSync('git', ['ls-files', '-z'], {
        cwd,
        encoding: 'utf8'
    });
    return output.split('\0').filter(Boolean);
}

function scanFiles(files, options = {}) {
    const cwd = options.cwd || process.cwd();
    const findings = [];

    for (const file of files) {
        if (shouldSkipFile(file)) continue;

        const fullPath = path.join(cwd, file);
        let text;
        try {
            text = fs.readFileSync(fullPath, 'utf8');
        } catch (error) {
            continue;
        }

        findings.push(...scanText(file, text));
    }

    return findings;
}

function formatFindings(findings) {
    if (findings.length === 0) {
        return 'No high-confidence secrets found in tracked files.';
    }

    return findings
        .map((finding) => `${finding.file}:${finding.line}:${finding.column} ${finding.rule} ${finding.message}`)
        .join('\n');
}

function main() {
    const cwd = process.cwd();
    const files = process.argv.slice(2);
    const targets = files.length > 0 ? files : listTrackedFiles(cwd);
    const findings = scanFiles(targets, { cwd });
    console.log(formatFindings(findings));

    if (findings.length > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    scanText,
    scanFiles,
    formatFindings,
    listTrackedFiles
};
