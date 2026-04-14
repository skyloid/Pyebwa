const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'pyebwa.com');

const remoteUser = String(process.env.PYEBWA_PUBLIC_SSH_USER || 'u316621955');
const remoteHost = String(process.env.PYEBWA_PUBLIC_SSH_HOST || '145.223.107.9');
const remotePort = String(process.env.PYEBWA_PUBLIC_SSH_PORT || '65002');
const remoteRoot = String(process.env.PYEBWA_PUBLIC_ROOT || '/home/u316621955/domains/pyebwa.com/public_html');

function parseArgs(argv) {
    const options = {
        manifest: null,
        dryRun: false
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--manifest') {
            options.manifest = argv[index + 1] || null;
            index += 1;
        } else if (arg === '--dry-run') {
            options.dryRun = true;
        }
    }

    return options;
}

function readManifest(manifestPath) {
    if (!manifestPath || !fs.existsSync(manifestPath)) {
        return [];
    }

    return fs.readFileSync(manifestPath, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
}

function normalizeManifestEntries(lines) {
    const operations = [];

    lines.forEach((line) => {
        const parts = line.split('\t').filter(Boolean);
        if (parts.length < 2) {
            return;
        }

        const status = parts[0];
        const code = status.charAt(0);

        if (code === 'R') {
            const oldPath = parts[1];
            const newPath = parts[2];
            if (oldPath && oldPath.startsWith('pyebwa.com/')) {
                operations.push({ type: 'delete', path: oldPath });
            }
            if (newPath && newPath.startsWith('pyebwa.com/')) {
                operations.push({ type: 'upload', path: newPath });
            }
            return;
        }

        const targetPath = parts[1];
        if (!targetPath || !targetPath.startsWith('pyebwa.com/')) {
            return;
        }

        if (code === 'D') {
            operations.push({ type: 'delete', path: targetPath });
            return;
        }

        operations.push({ type: 'upload', path: targetPath });
    });

    const deduped = new Map();
    operations.forEach((operation) => {
        deduped.set(`${operation.type}:${operation.path}`, operation);
    });

    return Array.from(deduped.values()).sort((left, right) => left.path.localeCompare(right.path));
}

function relativePublicPath(repoPath) {
    return repoPath.replace(/^pyebwa\.com\//, '');
}

function runCommand(cmd, args, options = {}) {
    execFileSync(cmd, args, {
        cwd: rootDir,
        stdio: 'inherit',
        ...options
    });
}

function ensureRemoteDir(remoteDir, dryRun) {
    if (dryRun) {
        console.log(`[dry-run] ssh -p ${remotePort} ${remoteUser}@${remoteHost} mkdir -p '${remoteDir}'`);
        return;
    }

    runCommand('ssh', [
        '-o', 'BatchMode=yes',
        '-p', remotePort,
        `${remoteUser}@${remoteHost}`,
        `mkdir -p '${remoteDir}'`
    ]);
}

function uploadFile(repoPath, dryRun) {
    const localPath = path.join(rootDir, repoPath);
    if (!fs.existsSync(localPath)) {
        throw new Error(`Cannot deploy missing file: ${repoPath}`);
    }

    const publicPath = relativePublicPath(repoPath);
    const remotePath = `${remoteRoot}/${publicPath}`;
    const remoteDir = path.posix.dirname(remotePath);

    ensureRemoteDir(remoteDir, dryRun);

    if (dryRun) {
        console.log(`[dry-run] scp -P ${remotePort} ${localPath} ${remoteUser}@${remoteHost}:${remotePath}`);
        return;
    }

    runCommand('scp', [
        '-o', 'BatchMode=yes',
        '-P', remotePort,
        localPath,
        `${remoteUser}@${remoteHost}:${remotePath}`
    ]);
}

function deleteFile(repoPath, dryRun) {
    const publicPath = relativePublicPath(repoPath);
    const remotePath = `${remoteRoot}/${publicPath}`;

    if (dryRun) {
        console.log(`[dry-run] ssh -p ${remotePort} ${remoteUser}@${remoteHost} rm -f '${remotePath}'`);
        return;
    }

    runCommand('ssh', [
        '-o', 'BatchMode=yes',
        '-p', remotePort,
        `${remoteUser}@${remoteHost}`,
        `rm -f '${remotePath}'`
    ]);
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const operations = normalizeManifestEntries(readManifest(options.manifest));

    if (operations.length === 0) {
        console.log('No public-site changes to deploy.');
        return;
    }

    console.log(`Deploying ${operations.length} public-site change(s) to ${remoteUser}@${remoteHost}:${remoteRoot}`);
    operations.forEach((operation) => {
        console.log(`${operation.type === 'delete' ? 'DELETE' : 'UPLOAD'} ${operation.path}`);
        if (operation.type === 'delete') {
            deleteFile(operation.path, options.dryRun);
        } else {
            uploadFile(operation.path, options.dryRun);
        }
    });
}

main();
