const fs = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const DATA_DIR = path.join(__dirname, '..', '..', 'pyebwa.com', 'data');
const DRAFT_PATH = path.join(DATA_DIR, 'page-content.draft.json');
const PUBLISHED_PATH = path.join(DATA_DIR, 'page-content.published.json');
const execFileAsync = promisify(execFile);
const baseTranslations = require('../../pyebwa.com/js/translations-pages.js');

const VALID_PAGES = ['home', 'about', 'mission', 'contact'];
const VALID_LANGS = ['en', 'fr', 'ht'];
const PAGE_CONTENT_FIELDS = {
    home: ['heroTitle', 'heroSubtitle', 'getStarted', 'featuresTitle', 'feature1Title', 'feature1Desc', 'feature2Title', 'feature2Desc', 'feature3Title', 'feature3Desc'],
    about: ['aboutPageTitle', 'aboutTitle', 'aboutSubtitle', 'aboutMissionTitle', 'aboutMissionText', 'ourValues', 'heritage', 'heritageText', 'connection', 'connectionText', 'privacy', 'privacyText', 'inclusivity', 'inclusivityText', 'ourStory', 'story2023Text', 'storyEarly2024Text', 'storyMid2024Text', 'storyTodayText', 'meetOurTeam', 'teamDescription', 'founderDescription', 'leadDeveloperDescription', 'communityManagerDescription', 'readyToStart', 'joinThousands', 'getStartedFree'],
    mission: ['missionPageTitle', 'oneBillionTrees', 'missionSubtitle', 'whyHaitiNeeds', 'whyHaitiNeedsText', 'treesPlantedSoFar', 'outOfGoal', 'impactOnHaiti', 'impactDescription', 'erosionReductionText', 'floodPreventionText', 'agriculturalYieldText', 'haitianJobsText', 'howWeMakeItHappen', 'comprehensiveApproach', 'strategicPartnershipsText', 'communityEngagementText', 'monitoringCareText', 'ourJourney', 'treesPlantedInHaiti', 'workingWithCommunities', 'partnershipDescription', 'strategicPlantingRegions', 'northernMountainsText', 'coastalAreasText', 'agriculturalZonesText', 'helpUsReforest', 'bePartOfTransformation', 'getInvolved', 'donatePlantTrees'],
    contact: ['contactPageTitle', 'getInTouch', 'contactSubtitle', 'sendMessage', 'messageIntro', 'successMessage', 'errorMessage', 'fullName', 'emailAddress', 'subject', 'message', 'messagePlaceholder', 'sendMessageButton', 'otherWaysToReach', 'emailDescription', 'addressDescription', 'supportHoursDescription', 'languagesDescription', 'frequentlyAskedQuestions', 'faq1Question', 'faq1Answer', 'faq2Question', 'faq2Answer', 'faq3Question', 'faq3Answer', 'faq4Question', 'faq4Answer', 'faq5Question', 'faq5Answer']
};

const REMOTE_DEPLOY_ENABLED = String(process.env.PAGE_CONTENT_REMOTE_DEPLOY_ENABLED || process.env.SLIDESHOW_REMOTE_DEPLOY_ENABLED || 'true').toLowerCase() !== 'false';
const REMOTE_SSH_PORT = String(process.env.PYEBWA_PUBLIC_SSH_PORT || '65002');
const REMOTE_SSH_USER = process.env.PYEBWA_PUBLIC_SSH_USER || 'u316621955';
const REMOTE_SSH_HOST = process.env.PYEBWA_PUBLIC_SSH_HOST || '145.223.107.9';
const REMOTE_PUBLIC_ROOT = process.env.PYEBWA_PUBLIC_ROOT || '/home/u316621955/domains/pyebwa.com/public_html';

function createSeedData() {
    const pages = VALID_PAGES.reduce((pagesAcc, page) => {
        pagesAcc[page] = VALID_LANGS.reduce((langsAcc, lang) => {
            const source = baseTranslations?.[lang] || {};
            langsAcc[lang] = PAGE_CONTENT_FIELDS[page].reduce((copy, key) => {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    copy[key] = String(source[key] ?? '');
                }
                return copy;
            }, {});
            return langsAcc;
        }, {});
        return pagesAcc;
    }, {});

    return {
        updatedAt: new Date().toISOString(),
        publishedAt: null,
        pages
    };
}

function normalizeTextMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }

    return Object.entries(value).reduce((acc, [key, text]) => {
        const normalizedKey = String(key || '').trim();
        if (!normalizedKey) return acc;
        acc[normalizedKey] = String(text ?? '');
        return acc;
    }, {});
}

function normalizeDataset(data = {}) {
    const seed = createSeedData();
    const pages = {};

    for (const page of VALID_PAGES) {
        pages[page] = {};
        for (const lang of VALID_LANGS) {
            pages[page][lang] = normalizeTextMap(data.pages?.[page]?.[lang]);
        }
    }

    return {
        updatedAt: new Date().toISOString(),
        publishedAt: data.publishedAt || seed.publishedAt,
        pages
    };
}

function isDatasetEmpty(data = {}) {
    return VALID_PAGES.every((page) =>
        VALID_LANGS.every((lang) => Object.keys(data.pages?.[page]?.[lang] || {}).length === 0)
    );
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
            const raw = await fs.readFile(targetPath, 'utf8');
            const current = normalizeDataset(JSON.parse(raw));
            if (isDatasetEmpty(current)) {
                const seeded = {
                    ...seed,
                    publishedAt: current.publishedAt
                };
                await fs.writeFile(targetPath, JSON.stringify(seeded, null, 2), 'utf8');
            }
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

    const remoteTarget = `${REMOTE_SSH_USER}@${REMOTE_SSH_HOST}:${REMOTE_PUBLIC_ROOT}/data/page-content.published.json`;
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
    VALID_LANGS,
    ensureDataFiles,
    getDraft,
    getPublished,
    saveDraft,
    publishDraft,
    deployPublishedFile
};
