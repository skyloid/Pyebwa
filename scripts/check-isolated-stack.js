#!/usr/bin/env node

const checks = [];

const baseUrl = (process.env.PYEBWA_BASE_URL || 'https://rasin.pyebwa.com').replace(/\/$/, '');
const staticImageUrl = process.env.PYEBWA_SMOKE_IMAGE_URL || 'https://pyebwa.com/images/SlideShow/istockphoto-637815386-612x612.jpg';
const previewUrl = `${baseUrl}/api/admin/slideshows/preview?url=${encodeURIComponent(staticImageUrl)}`;
const imgproxyUrl = `${baseUrl}/imgproxy/unsafe/rs:fill:160:160:0/g:sm/plain/${encodeURIComponent(staticImageUrl)}@jpg`;

async function runCheck(name, url, validate) {
    try {
        const response = await fetch(url, { redirect: 'manual' });
        const body = await response.text();
        const result = validate(response, body);
        checks.push({ name, ok: !!result, detail: `${response.status} ${url}` });
    } catch (error) {
        checks.push({ name, ok: false, detail: error.message });
    }
}

async function main() {
    await runCheck('App health', `${baseUrl}/health`, (response, body) => {
        return response.ok && body.includes('Pyebwa app server is running');
    });

    await runCheck('Auth settings', `${baseUrl}/supabase/auth/v1/settings`, (response, body) => {
        return response.ok && body.includes('external') && !body.includes('"google":true');
    });

    await runCheck('Login route', `${baseUrl}/login`, (response, body) => {
        return response.ok && body.toLowerCase().includes('magic link');
    });

    await runCheck('Legacy login redirect', `${baseUrl}/login.html`, (response) => {
        const location = response.headers.get('location') || '';
        return response.status >= 300 && response.status < 400 && location.startsWith('/login');
    });

    await runCheck('Imgproxy path', imgproxyUrl, (response) => response.ok);

    await runCheck('Admin slideshow preview', previewUrl, (response) => response.ok);

    const failures = checks.filter((check) => !check.ok);
    for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}: ${check.detail}`);
    }

    if (failures.length > 0) {
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
