const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');

const DATA_DIR = path.join(__dirname, '..', '..', 'pyebwa.com', 'data');
const DRAFT_PATH = path.join(DATA_DIR, 'slideshows.draft.json');
const PUBLISHED_PATH = path.join(DATA_DIR, 'slideshows.published.json');
const execFileAsync = promisify(execFile);

const VALID_PAGES = ['home', 'about', 'mission', 'contact'];
const REMOTE_DEPLOY_ENABLED = String(process.env.SLIDESHOW_REMOTE_DEPLOY_ENABLED || 'true').toLowerCase() !== 'false';
const REMOTE_SSH_PORT = String(process.env.PYEBWA_PUBLIC_SSH_PORT || '65002');
const REMOTE_SSH_USER = process.env.PYEBWA_PUBLIC_SSH_USER || 'u316621955';
const REMOTE_SSH_HOST = process.env.PYEBWA_PUBLIC_SSH_HOST || '145.223.107.9';
const REMOTE_PUBLIC_ROOT = process.env.PYEBWA_PUBLIC_ROOT || '/home/u316621955/domains/pyebwa.com/public_html';

function createDefaultOverlays() {
    return {
        home: { color: '#000000', opacity: 80 },
        about: { color: '#000000', opacity: 0 },
        mission: { color: '#00217d', opacity: 70 },
        contact: { color: '#000000', opacity: 0 }
    };
}

function createDefaultSettings() {
    return {
        home: { randomize: false },
        about: { randomize: false },
        mission: { randomize: false },
        contact: { randomize: false }
    };
}

function createSeedData() {
    const now = new Date().toISOString();
    const buildTag = '20260407T223900Z-upscaled-slides';
    const homeFiles = [
        '20140508-094914.jpg',
        '5e0a0e49e91b8e0f8379e91e7dee11f9.jpg',
        '6e7c0d44bc280212592d6ede168dc4ca.jpg',
        'HD-wallpaper-haitian-flag-silk-wavy-flags-north-american-countries-national-symbols-flag-of-haiti-fabric-flags-haiti-flag-3d-art-haiti-north-america-haiti-3d-flag.jpg',
        'LaCitadelle.jpg',
        'TB-landscape-scaled-e1612506085272.jpg',
        'citadelle-laferriere-and-cannon-balls-47ko900hbv2okyxp.jpg',
        'concert-philharmonique.jpg',
        'expedia_group-793013-161452384-777434.jpg',
        'haiti-flag-art-wbkozdm492j96815.jpg',
        'istockphoto-637815386-612x612.jpg',
        'sun-rise-on-cormier.jpg',
        'tumblr_nsbo1mpejL1qjcl7eo4_1280.jpg',
        'us-occupation-of-haiti-16323314377941.jpg',
        'wp2203260.webp'
    ];

    const missionUrls = [
        'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
        'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
        'https://images.unsplash.com/photo-1449665291896-3d64a1c8d413?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80'
    ];

    const makeSlide = (page, url, index) => ({
        id: `${page}-${index + 1}-${crypto.randomBytes(4).toString('hex')}`,
        page,
        url,
        title: '',
        caption: '',
        alt: '',
        fit: 'cover',
        crop: {
            x: 50,
            y: 50,
            zoom: 100
        },
        filters: {
            brightness: 100,
            contrast: 100,
            saturate: 100
        },
        overlay: normalizeOverlay({}, page),
        order: index,
        createdAt: now,
        updatedAt: now
    });

    return {
        updatedAt: now,
        publishedAt: now,
        overlays: createDefaultOverlays(),
        settings: createDefaultSettings(),
        pages: {
            home: homeFiles.map((file, index) => makeSlide('home', `https://pyebwa.com/images/SlideShow/${file}?v=${buildTag}`, index)),
            about: [],
            mission: missionUrls.map((url, index) => makeSlide('mission', url, index)),
            contact: []
        }
    };
}

function normalizePageSettings(settings = {}, page) {
    const defaults = createDefaultSettings()[page] || { randomize: false };
    return {
        randomize: typeof settings.randomize === 'boolean' ? settings.randomize : defaults.randomize
    };
}

function normalizeCrop(crop = {}) {
    const x = Number.isFinite(Number(crop.x)) ? Number(crop.x) : 50;
    const y = Number.isFinite(Number(crop.y)) ? Number(crop.y) : 50;
    const zoom = Number.isFinite(Number(crop.zoom)) ? Number(crop.zoom) : 100;
    return {
        x: Math.min(100, Math.max(0, x)),
        y: Math.min(100, Math.max(0, y)),
        zoom: Math.min(300, Math.max(50, zoom))
    };
}

function normalizeFilters(filters = {}) {
    const brightness = Number.isFinite(Number(filters.brightness)) ? Number(filters.brightness) : 100;
    const contrast = Number.isFinite(Number(filters.contrast)) ? Number(filters.contrast) : 100;
    const saturate = Number.isFinite(Number(filters.saturate)) ? Number(filters.saturate) : 100;
    return {
        brightness: Math.min(200, Math.max(0, brightness)),
        contrast: Math.min(200, Math.max(0, contrast)),
        saturate: Math.min(200, Math.max(0, saturate))
    };
}

function normalizeFit(fit) {
    const value = String(fit || '').trim().toLowerCase();
    return new Set(['cover', 'contain', 'fill', 'scale-down', 'none']).has(value) ? value : 'cover';
}

function normalizeColor(color, fallback = '#000000') {
    const value = String(color || '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
        return value;
    }
    if (/^#[0-9a-fA-F]{3}$/.test(value)) {
        return '#' + value.slice(1).split('').map((char) => char + char).join('');
    }
    return fallback;
}

function normalizeOverlay(overlay = {}, page) {
    const defaults = createDefaultOverlays()[page] || { color: '#000000', opacity: 0 };
    const opacity = Number.isFinite(Number(overlay.opacity)) ? Number(overlay.opacity) : defaults.opacity;
    return {
        color: normalizeColor(overlay.color, defaults.color),
        opacity: Math.min(100, Math.max(0, opacity))
    };
}

function normalizeSlide(page, slide = {}, index = 0, pageOverlay = null) {
    const normalizedSlideOverlay = normalizeOverlay(slide.overlay || pageOverlay || {}, page);
    const overlayExplicit = slide.overlayExplicit === true;
    const overlayOverride = overlayExplicit && slide.overlayOverride === true;

    return {
        id: slide.id || `${page}-${index + 1}-${crypto.randomBytes(4).toString('hex')}`,
        page,
        url: String(slide.url || '').trim(),
        title: String(slide.title || '').trim(),
        caption: String(slide.caption || '').trim(),
        alt: String(slide.alt || '').trim(),
        fit: normalizeFit(slide.fit),
        crop: normalizeCrop(slide.crop),
        filters: normalizeFilters(slide.filters),
        overlayExplicit,
        overlayOverride,
        overlay: normalizedSlideOverlay,
        order: index,
        createdAt: slide.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

function normalizeDataset(data = {}) {
    const pages = {};
    const overlays = {};
    const settings = {};
    for (const page of VALID_PAGES) {
        const sourceSlides = Array.isArray(data.pages?.[page]) ? data.pages[page] : [];
        const pageOverlay = normalizeOverlay(data.overlays?.[page], page);
        settings[page] = normalizePageSettings(data.settings?.[page], page);
        pages[page] = sourceSlides
            .filter((slide) => slide && slide.url)
            .map((slide, index) => normalizeSlide(page, slide, index, pageOverlay));
        overlays[page] = pageOverlay;
    }

    return {
        updatedAt: new Date().toISOString(),
        publishedAt: data.publishedAt || null,
        overlays,
        settings,
        pages
    };
}

async function ensureDataFiles() {
    await fs.mkdir(DATA_DIR, { recursive: true });

    const seed = createSeedData();

    for (const [targetPath, payload] of [
        [DRAFT_PATH, seed],
        [PUBLISHED_PATH, seed]
    ]) {
        try {
            await fs.access(targetPath);
        } catch (error) {
            await fs.writeFile(targetPath, JSON.stringify(payload, null, 2), 'utf8');
        }
    }
}

async function readJson(filePath) {
    await ensureDataFiles();
    const raw = await fs.readFile(filePath, 'utf8');
    return normalizeDataset(JSON.parse(raw));
}

async function writeJson(filePath, data) {
    const normalized = normalizeDataset(data);
    await ensureDataFiles();
    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf8');
    return normalized;
}

async function deployPublishedFile() {
    if (!REMOTE_DEPLOY_ENABLED) {
        return { deployed: false, skipped: true, reason: 'remote deploy disabled' };
    }

    const remoteTarget = `${REMOTE_SSH_USER}@${REMOTE_SSH_HOST}:${REMOTE_PUBLIC_ROOT}/data/slideshows.published.json`;
    await execFileAsync('scp', ['-P', REMOTE_SSH_PORT, PUBLISHED_PATH, remoteTarget], {
        cwd: path.join(__dirname, '..', '..')
    });

    return {
        deployed: true,
        deployedAt: new Date().toISOString(),
        remoteTarget
    };
}

async function getDraft() {
    return readJson(DRAFT_PATH);
}

async function getPublished() {
    return readJson(PUBLISHED_PATH);
}

async function saveDraft(data) {
    return writeJson(DRAFT_PATH, data);
}

async function publishDraft() {
    const draft = await getDraft();
    const payload = {
        ...draft,
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    await fs.writeFile(PUBLISHED_PATH, JSON.stringify(payload, null, 2), 'utf8');
    const deployment = await deployPublishedFile();
    return {
        ...payload,
        deployment
    };
}

module.exports = {
    VALID_PAGES,
    ensureDataFiles,
    getDraft,
    getPublished,
    saveDraft,
    publishDraft,
    deployPublishedFile,
    normalizeDataset
};
