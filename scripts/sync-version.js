const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const versionFile = path.join(rootDir, 'VERSION');
const appVersionFile = path.join(rootDir, 'app', 'version.json');
const siteVersionFile = path.join(rootDir, 'pyebwa.com', 'version.json');

const htmlFiles = [
    path.join(rootDir, 'app', 'index.html'),
    path.join(rootDir, 'pyebwa.com', 'index.html'),
    path.join(rootDir, 'pyebwa.com', 'about.html'),
    path.join(rootDir, 'pyebwa.com', 'contact.html'),
    path.join(rootDir, 'pyebwa.com', 'mission.html')
];

function readVersion() {
    return fs.readFileSync(versionFile, 'utf8').trim();
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

function updateVersionJson(filePath, version, buildId, deployedAt) {
    const payload = {
        version,
        buildId,
        deployedAt
    };
    fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function updateHtmlFallback(filePath, version) {
    const original = fs.readFileSync(filePath, 'utf8');
    const updated = original.replace(
        /(<span data-build-version>)(.*?)(<\/span>)/g,
        `$1${version}$3`
    );

    if (updated !== original) {
        fs.writeFileSync(filePath, updated);
    }
}

function main() {
    const version = readVersion();
    const buildId = process.env.PYEWA_BUILD_ID || process.env.PYEBWA_BUILD_ID || makeBuildId();
    const deployedAt = process.env.PYEBWA_DEPLOYED_AT || new Date().toISOString();

    updateVersionJson(appVersionFile, version, buildId, deployedAt);
    updateVersionJson(siteVersionFile, version, buildId, deployedAt);
    htmlFiles.forEach(file => updateHtmlFallback(file, version));

    console.log(`Synced version ${version} with build ${buildId}`);
}

main();
