const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const versionFile = path.join(rootDir, 'VERSION');

const generatedFiles = [
    'VERSION',
    'app/version.json',
    'pyebwa.com/version.json',
    'app/index.html',
    'app/admin/index.html',
    'pyebwa.com/index.html',
    'pyebwa.com/about.html',
    'pyebwa.com/contact.html',
    'pyebwa.com/mission.html'
];

function getStagedFiles() {
    const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
        cwd: rootDir,
        encoding: 'utf8'
    }).trim();

    return output ? output.split('\n').map((line) => line.trim()).filter(Boolean) : [];
}

function makeBuildId() {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mi = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z-version-sync`;
}

function bumpVersion() {
    const current = fs.readFileSync(versionFile, 'utf8').trim();
    const [major = '1', minor = '0', patch = '0'] = current.split('.');
    const normalizedMajor = Number(major) || 1;
    const normalizedMinor = Number(minor) || 0;
    const normalizedPatch = Number(patch) || 0;
    const next = normalizedPatch >= 99
        ? `${normalizedMajor}.${normalizedMinor + 1}.0`
        : `${normalizedMajor}.${normalizedMinor}.${normalizedPatch + 1}`;
    fs.writeFileSync(versionFile, `${next}\n`);
    return next;
}

function main() {
    const stagedFiles = getStagedFiles();
    const materialFiles = stagedFiles.filter((file) => !generatedFiles.includes(file));

    if (materialFiles.length === 0) {
        process.exit(0);
    }

    if (!stagedFiles.includes('VERSION')) {
        bumpVersion();
    }

    const buildId = makeBuildId();
    execFileSync('node', ['scripts/sync-version.js'], {
        cwd: rootDir,
        stdio: 'inherit',
        env: {
            ...process.env,
            PYEBWA_BUILD_ID: buildId,
            PYEWA_BUILD_ID: buildId
        }
    });

    execFileSync('git', ['add', ...generatedFiles], {
        cwd: rootDir,
        stdio: 'inherit'
    });
}

main();
