(function() {
    'use strict';

    const VALID_SLIDESHOW_PAGES = ['home', 'about', 'mission', 'contact'];
    const VALID_PAGE_CONTENT_PAGES = ['home', 'about', 'mission', 'contact'];
    const VALID_PAGE_CONTENT_LANGS = ['en', 'fr', 'ht'];
    const MANAGEMENT_VIEWS = ['dashboard', 'users', 'trees', 'content', 'slideshows', 'page-content', 'analytics', 'communications'];
    const SUPERADMIN_VIEWS = ['settings', 'audit', 'backup', 'system'];
    const PAGE_CONTENT_LANG_LABELS = {
        en: 'English',
        fr: 'French',
        ht: 'Creole'
    };
    const PAGE_CONTENT_SCHEMA = {
        home: [
            {
                title: 'Hero',
                fields: [
                    { key: 'heroTitle', label: 'Hero Title', type: 'textarea', rows: 2 },
                    { key: 'heroSubtitle', label: 'Hero Subtitle', type: 'textarea', rows: 3 },
                    { key: 'getStarted', label: 'Hero CTA Label' }
                ]
            },
            {
                title: 'Features',
                fields: [
                    { key: 'featuresTitle', label: 'Section Title' },
                    { key: 'feature1Title', label: 'Feature 1 Title' },
                    { key: 'feature1Desc', label: 'Feature 1 Text', type: 'textarea', rows: 2 },
                    { key: 'feature2Title', label: 'Feature 2 Title' },
                    { key: 'feature2Desc', label: 'Feature 2 Text', type: 'textarea', rows: 2 },
                    { key: 'feature3Title', label: 'Feature 3 Title' },
                    { key: 'feature3Desc', label: 'Feature 3 Text', type: 'textarea', rows: 2 }
                ]
            }
        ],
        about: [
            {
                title: 'Hero',
                fields: [
                    { key: 'aboutPageTitle', label: 'Browser Page Title', type: 'textarea', rows: 2 },
                    { key: 'aboutTitle', label: 'Hero Title' },
                    { key: 'aboutSubtitle', label: 'Hero Subtitle', type: 'textarea', rows: 2 }
                ]
            },
            {
                title: 'Mission',
                fields: [
                    { key: 'aboutMissionTitle', label: 'Mission Section Title' },
                    { key: 'aboutMissionText', label: 'Mission Section Text', type: 'textarea', rows: 5 }
                ]
            },
            {
                title: 'Values',
                fields: [
                    { key: 'ourValues', label: 'Values Section Title' },
                    { key: 'heritage', label: 'Heritage Title' },
                    { key: 'heritageText', label: 'Heritage Text', type: 'textarea', rows: 2 },
                    { key: 'connection', label: 'Connection Title' },
                    { key: 'connectionText', label: 'Connection Text', type: 'textarea', rows: 2 },
                    { key: 'privacy', label: 'Privacy Title' },
                    { key: 'privacyText', label: 'Privacy Text', type: 'textarea', rows: 2 },
                    { key: 'inclusivity', label: 'Inclusivity Title' },
                    { key: 'inclusivityText', label: 'Inclusivity Text', type: 'textarea', rows: 2 }
                ]
            },
            {
                title: 'Story and Team',
                fields: [
                    { key: 'ourStory', label: 'Story Section Title' },
                    { key: 'roadmap', label: 'Roadmap', type: 'roadmap' },
                    { key: 'meetOurTeam', label: 'Team Section Title' },
                    { key: 'teamDescription', label: 'Team Intro Text', type: 'textarea', rows: 2 },
                    { key: 'founderCeo', label: 'Founder Title' },
                    { key: 'founderDescription', label: 'Founder Description', type: 'textarea', rows: 2 },
                    { key: 'leadDeveloper', label: 'Lead Developer Title' },
                    { key: 'leadDeveloperDescription', label: 'Lead Developer Description', type: 'textarea', rows: 2 },
                    { key: 'communityManager', label: 'Community Manager Title' },
                    { key: 'communityManagerDescription', label: 'Community Manager Description', type: 'textarea', rows: 2 }
                ]
            },
            {
                title: 'Call To Action',
                fields: [
                    { key: 'readyToStart', label: 'CTA Title' },
                    { key: 'joinThousands', label: 'CTA Text', type: 'textarea', rows: 2 },
                    { key: 'getStartedFree', label: 'CTA Button Label' }
                ]
            }
        ],
        mission: [
            {
                title: 'Hero',
                fields: [
                    { key: 'missionPageTitle', label: 'Browser Page Title', type: 'textarea', rows: 2 },
                    { key: 'oneBillionTrees', label: 'Hero Title' },
                    { key: 'missionSubtitle', label: 'Hero Subtitle', type: 'textarea', rows: 2 }
                ]
            },
            {
                title: 'Why Haiti Needs This',
                fields: [
                    { key: 'whyHaitiNeeds', label: 'Section Title' },
                    { key: 'whyHaitiNeedsText', label: 'Section Text', type: 'textarea', rows: 5 },
                    { key: 'treesPlantedSoFar', label: 'Counter Title' },
                    { key: 'outOfGoal', label: 'Counter Subtitle' }
                ]
            },
            {
                title: 'Impact',
                fields: [
                    { key: 'impactOnHaiti', label: 'Impact Section Title' },
                    { key: 'impactDescription', label: 'Impact Intro Text', type: 'textarea', rows: 3 },
                    { key: 'erosionReductionText', label: 'Erosion Text', type: 'textarea', rows: 2 },
                    { key: 'floodPreventionText', label: 'Flood Text', type: 'textarea', rows: 2 },
                    { key: 'agriculturalYieldText', label: 'Agriculture Text', type: 'textarea', rows: 2 },
                    { key: 'haitianJobsText', label: 'Jobs Text', type: 'textarea', rows: 2 }
                ]
            },
            {
                title: 'Approach',
                fields: [
                    { key: 'howWeMakeItHappen', label: 'Approach Section Title' },
                    { key: 'comprehensiveApproach', label: 'Approach Intro Text', type: 'textarea', rows: 3 },
                    { key: 'strategicPartnershipsText', label: 'Partnerships Text', type: 'textarea', rows: 3 },
                    { key: 'communityEngagementText', label: 'Community Text', type: 'textarea', rows: 3 },
                    { key: 'monitoringCareText', label: 'Monitoring Text', type: 'textarea', rows: 3 }
                ]
            },
            {
                title: 'Journey and Regions',
                fields: [
                    { key: 'ourJourney', label: 'Journey Section Title' },
                    { key: 'treesPlantedInHaiti', label: 'Journey Text', type: 'textarea', rows: 2 },
                    { key: 'workingWithCommunities', label: 'Communities Section Title' },
                    { key: 'partnershipDescription', label: 'Communities Text', type: 'textarea', rows: 3 },
                    { key: 'strategicPlantingRegions', label: 'Regions Section Title' },
                    { key: 'northernMountainsText', label: 'Northern Mountains Text', type: 'textarea', rows: 2 },
                    { key: 'coastalAreasText', label: 'Coastal Areas Text', type: 'textarea', rows: 2 },
                    { key: 'agriculturalZonesText', label: 'Agricultural Zones Text', type: 'textarea', rows: 2 }
                ]
            },
            {
                title: 'Call To Action',
                fields: [
                    { key: 'helpUsReforest', label: 'CTA Title' },
                    { key: 'bePartOfTransformation', label: 'CTA Text', type: 'textarea', rows: 3 },
                    { key: 'getInvolved', label: 'Primary Button Label' },
                    { key: 'donatePlantTrees', label: 'Secondary Button Label' }
                ]
            }
        ],
        contact: [
            {
                title: 'Hero',
                fields: [
                    { key: 'contactPageTitle', label: 'Browser Page Title', type: 'textarea', rows: 2 },
                    { key: 'getInTouch', label: 'Hero Title' },
                    { key: 'contactSubtitle', label: 'Hero Subtitle', type: 'textarea', rows: 2 }
                ]
            },
            {
                title: 'Contact Form',
                fields: [
                    { key: 'sendMessage', label: 'Form Section Title' },
                    { key: 'messageIntro', label: 'Form Intro Text', type: 'textarea', rows: 3 },
                    { key: 'successMessage', label: 'Success Message', type: 'textarea', rows: 2 },
                    { key: 'errorMessage', label: 'Error Message', type: 'textarea', rows: 2 },
                    { key: 'fullName', label: 'Full Name Label' },
                    { key: 'emailAddress', label: 'Email Label' },
                    { key: 'subject', label: 'Subject Label' },
                    { key: 'message', label: 'Message Label' },
                    { key: 'messagePlaceholder', label: 'Message Placeholder', type: 'textarea', rows: 2 },
                    { key: 'sendMessageButton', label: 'Submit Button Label' }
                ]
            },
            {
                title: 'Support Details',
                fields: [
                    { key: 'otherWaysToReach', label: 'Reach Us Title' },
                    { key: 'emailDescription', label: 'Email Description', type: 'textarea', rows: 3 },
                    { key: 'addressDescription', label: 'Address Description', type: 'textarea', rows: 3 },
                    { key: 'supportHoursDescription', label: 'Support Hours Description', type: 'textarea', rows: 3 },
                    { key: 'languagesDescription', label: 'Languages Description', type: 'textarea', rows: 3 }
                ]
            },
            {
                title: 'FAQ',
                fields: [
                    { key: 'frequentlyAskedQuestions', label: 'FAQ Section Title' },
                    { key: 'faq1Question', label: 'FAQ 1 Question', type: 'textarea', rows: 2 },
                    { key: 'faq1Answer', label: 'FAQ 1 Answer', type: 'textarea', rows: 4 },
                    { key: 'faq2Question', label: 'FAQ 2 Question', type: 'textarea', rows: 2 },
                    { key: 'faq2Answer', label: 'FAQ 2 Answer', type: 'textarea', rows: 5 },
                    { key: 'faq3Question', label: 'FAQ 3 Question', type: 'textarea', rows: 2 },
                    { key: 'faq3Answer', label: 'FAQ 3 Answer', type: 'textarea', rows: 3 },
                    { key: 'faq4Question', label: 'FAQ 4 Question', type: 'textarea', rows: 2 },
                    { key: 'faq4Answer', label: 'FAQ 4 Answer', type: 'textarea', rows: 2 },
                    { key: 'faq5Question', label: 'FAQ 5 Question', type: 'textarea', rows: 2 },
                    { key: 'faq5Answer', label: 'FAQ 5 Answer', type: 'textarea', rows: 3 }
                ]
            }
        ]
    };

    const state = {
        allUsers: [],
        filteredUsers: [],
        currentPage: 1,
        pageSize: 20,
        auditPage: 1,
        auditPageSize: 20,
        auditLogs: [],
        auditTotal: 0,
        auditReport: null,
        auditTickets: [],
        auditAssets: {},
        allTrees: [],
        filteredTrees: [],
        treePage: 1,
        treePageSize: 20,
        currentView: 'dashboard',
        summary: null,
        theme: 'light',
        adminRole: 'admin',
        settingsConfig: null,
        settingsDirty: false,
        settingsSaving: false,
        backupHistory: [],
        backupSchedule: null,
        backupBusy: false,
        pageContentDraft: null,
        pageContentPublished: null,
        activePageContentPage: 'home',
        activePageContentLang: 'en',
        pageContentDirty: false,
        pageContentPublishing: false,
        slideshowDraft: null,
        slideshowPublished: null,
        activeSlideshowPage: 'home',
        selectedSlideId: null,
        slideshowDirty: false,
        replacingSlideId: null,
        slideshowDrag: null,
        slideshowListDrag: null,
        slideshowPublishing: false
    };

    function normalizeAdminView(view) {
        return String(view || '').trim();
    }

    function getViewFromHash(hash = window.location.hash) {
        const candidate = normalizeAdminView(String(hash || '').replace(/^#/, '').trim());
        if (!candidate) return 'dashboard';
        return document.getElementById(`${candidate}View`) ? candidate : 'dashboard';
    }

    async function getAccessToken() {
        const client = window.supabaseClient;
        if (!client) return null;
        const { data: { session } } = await client.auth.getSession();
        return session?.access_token || null;
    }

    async function authFetch(url, options = {}) {
        const token = await getAccessToken();
        const headers = { ...(options.headers || {}) };
        if (token) {
            headers.Authorization = 'Bearer ' + token;
        }
        if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.body) {
            headers['Content-Type'] = 'application/json';
        }
        return fetch(url, { ...options, headers });
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getAdminPreviewUrl(url, version = '') {
        const value = String(url || '').trim();
        if (!value) return '';
        const previewUrl = new URL('/api/admin/slideshows/preview', window.location.origin);
        previewUrl.searchParams.set('url', value);
        if (version) {
            previewUrl.searchParams.set('v', String(version));
        }
        return `${previewUrl.pathname}${previewUrl.search}`;
    }

    function revokeSlidePreviewUrl(slide) {
        if (slide?.tempPreviewUrl && String(slide.tempPreviewUrl).startsWith('blob:')) {
            URL.revokeObjectURL(slide.tempPreviewUrl);
        }
        if (slide) {
            delete slide.tempPreviewUrl;
        }
    }

    function setSlidePreviewUrl(slide, file) {
        if (!slide || !file) return;
        revokeSlidePreviewUrl(slide);
        slide.tempPreviewUrl = URL.createObjectURL(file);
    }

    function getSlidePreviewSrc(slide) {
        if (!slide) return '';
        if (slide.tempPreviewUrl) {
            return slide.tempPreviewUrl;
        }
        return getAdminPreviewUrl(slide.url, slide.updatedAt || slide.createdAt || '');
    }

    function findSlideById(slideId) {
        if (!slideId || !state.slideshowDraft) return null;
        for (const page of VALID_SLIDESHOW_PAGES) {
            const slide = (state.slideshowDraft.pages?.[page] || []).find((item) => item.id === slideId);
            if (slide) return slide;
        }
        return null;
    }

    function getPreviewHeroMinHeight(page) {
        switch (page) {
        case 'about':
        case 'mission':
        case 'contact':
            return 620;
        case 'home':
        default:
            return 600;
        }
    }

    function syncPreviewSurfaceLayout(page = state.activeSlideshowPage) {
        const previewSurface = document.getElementById('slideshowPreviewSurface');
        if (!previewSurface) return;

        const viewportWidth = Math.max(
            document.documentElement?.clientWidth || 0,
            window.innerWidth || 0,
            320
        );
        const heroMinHeight = getPreviewHeroMinHeight(page);
        const clampedWidth = Math.min(Math.max(viewportWidth, 320), 1920);
        previewSurface.style.setProperty('--slideshow-preview-aspect-ratio', `${clampedWidth} / ${heroMinHeight}`);
    }

    function getOverlayForSelectedSlide() {
        const slide = findSelectedSlide();
        if (!slide) {
            return { color: '#000000', opacity: 0 };
        }
        if (!(slide.overlayExplicit === true && slide.overlayOverride)) {
            const globalOverlay = state.slideshowDraft?.overlays?.[slide.page || state.activeSlideshowPage] || {};
            return {
                color: String(globalOverlay.color || '#000000'),
                opacity: Number.isFinite(Number(globalOverlay.opacity)) ? Number(globalOverlay.opacity) : 0
            };
        }
        const overlay = slide.overlay || {};
        return {
            color: String(overlay.color || '#000000'),
            opacity: Number.isFinite(Number(overlay.opacity)) ? Number(overlay.opacity) : 0
        };
    }

    function getPageSettings(page = state.activeSlideshowPage) {
        if (!state.slideshowDraft) {
            return { randomize: false };
        }
        return state.slideshowDraft.settings?.[page] || { randomize: false };
    }

    function getGlobalOverlayForPage(page = state.activeSlideshowPage) {
        if (!state.slideshowDraft) {
            return { color: '#000000', opacity: 0 };
        }
        const overlay = state.slideshowDraft.overlays?.[page] || {};
        return {
            color: String(overlay.color || '#000000'),
            opacity: Number.isFinite(Number(overlay.opacity)) ? Number(overlay.opacity) : 0
        };
    }

    function formatDate(value) {
        if (!value) return 'Never';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Never';
        return date.toLocaleString();
    }

    function formatRelativeTime(value) {
        if (!value) return 'Just now';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Just now';
        const seconds = Math.round((date.getTime() - Date.now()) / 1000);
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        const intervals = [
            ['year', 31536000],
            ['month', 2592000],
            ['week', 604800],
            ['day', 86400],
            ['hour', 3600],
            ['minute', 60]
        ];
        for (const [unit, size] of intervals) {
            if (Math.abs(seconds) >= size || unit === 'minute') {
                return rtf.format(Math.round(seconds / size), unit);
            }
        }
        return 'Just now';
    }

    function severityClass(value) {
        const level = String(value || 'medium').trim().toLowerCase();
        return `severity-${level}`;
    }

    function showAdminApp() {
        const loader = document.getElementById('adminLoader');
        const app = document.getElementById('adminApp');
        if (loader) loader.style.display = 'none';
        if (app) app.style.display = 'block';
    }

    function showError(message) {
        const recentActivity = document.getElementById('recentActivity');
        if (recentActivity) {
            recentActivity.innerHTML = `<div class="activity-item"><div class="activity-content"><p>${escapeHtml(message)}</p></div></div>`;
        }
    }

    function updateAdminHeader(detail) {
        const sessionData = JSON.parse(sessionStorage.getItem('adminUser') || '{}');
        const displayName = detail?.userData?.displayName || sessionData.displayName || detail?.user?.email || sessionData.email || 'Admin';
        const role = detail?.role || sessionData.role || 'admin';
        state.adminRole = String(role || 'admin').toLowerCase();
        const nameEl = document.getElementById('adminName');
        const roleEl = document.getElementById('adminRole');
        const avatarEl = document.getElementById('adminAvatar');
        if (nameEl) nameEl.textContent = displayName;
        if (roleEl) {
            roleEl.textContent = state.adminRole === 'superadmin'
                ? 'Super Admin'
                : state.adminRole.charAt(0).toUpperCase() + state.adminRole.slice(1);
        }
        if (avatarEl) {
            const fallbackAvatar = '/app/images/default-avatar.png?v=1.0.98';
            const avatarUrl = detail?.userData?.photoURL || detail?.user?.user_metadata?.avatar_url || sessionData.photoURL || fallbackAvatar;
            avatarEl.src = avatarUrl || fallbackAvatar;
        }
        applyRoleAccess();
    }

    function canAccessView(view, role = state.adminRole) {
        if (SUPERADMIN_VIEWS.includes(view)) {
            return role === 'superadmin';
        }
        return MANAGEMENT_VIEWS.includes(view);
    }

    function applyRoleAccess() {
        const role = state.adminRole || 'admin';
        document.querySelectorAll('.menu-link').forEach((link) => {
            const href = link.getAttribute('href') || '';
            if (!href.startsWith('#')) return;
            const view = href.slice(1);
            const allowed = canAccessView(view, role);
            const item = link.closest('.menu-item');
            if (item) {
                item.style.display = allowed ? '' : 'none';
            }
        });

        const systemSection = document.querySelector('.menu-section');
        if (systemSection) {
            systemSection.style.display = role === 'superadmin' ? '' : 'none';
        }

        const settingsLink = document.getElementById('adminSettingsLink');
        if (settingsLink) {
            settingsLink.style.display = role === 'superadmin' ? '' : 'none';
        }
    }

    function updateThemeIcon() {
        const icon = document.getElementById('adminThemeIcon');
        if (!icon) return;
        icon.textContent = state.theme === 'dark' ? 'light_mode' : 'dark_mode';
    }

    function applyTheme(theme) {
        state.theme = theme === 'dark' ? 'dark' : 'light';
        document.body.classList.toggle('dark-theme', state.theme === 'dark');
        try {
            localStorage.setItem('theme', state.theme);
            localStorage.setItem('adminTheme', state.theme);
        } catch (error) {
            console.warn('Unable to persist admin theme preference:', error);
        }
        updateThemeIcon();
    }

    function initializeTheme() {
        let savedTheme = window.__ADMIN_INITIAL_THEME__ || 'light';
        if (!window.__ADMIN_INITIAL_THEME__) {
            try {
                savedTheme = localStorage.getItem('theme') || localStorage.getItem('adminTheme') || 'light';
            } catch (error) {
                savedTheme = 'light';
            }
        }
        applyTheme(savedTheme);
    }

    function updateSettingsStatus(message) {
        const status = document.getElementById('settingsStatus');
        if (status) {
            status.textContent = message || (state.settingsDirty ? 'Unsaved settings changes.' : 'Settings loaded.');
        }
    }

    function setSettingsSaving(isSaving) {
        state.settingsSaving = !!isSaving;
        const saveButton = document.getElementById('saveSettings');
        const refreshButton = document.getElementById('refreshSettings');
        [saveButton, refreshButton].forEach((button) => {
            if (!button) return;
            button.disabled = state.settingsSaving;
            button.classList.toggle('is-busy', state.settingsSaving);
        });
        if (saveButton) {
            saveButton.innerHTML = state.settingsSaving
                ? '<span class="btn-spinner" aria-hidden="true"></span><span>Saving...</span>'
                : '<span class="material-icons">save</span><span>Save Settings</span>';
        }
    }

    function updateBackupStatus(message) {
        const status = document.getElementById('backupStatus');
        if (status) {
            status.textContent = message || 'Backup status unknown.';
        }
    }

    function renderBackupView() {
        const scheduleTarget = document.getElementById('backupScheduleForm');
        const historyTarget = document.getElementById('backupHistoryList');
        if (!scheduleTarget || !historyTarget) return;

        const schedule = state.backupSchedule || {
            frequency: 'disabled',
            time: '02:00',
            day: '0',
            date: '1',
            retention: '30'
        };

        scheduleTarget.innerHTML = `
            <div class="page-content-fields">
                <div class="form-group page-content-field">
                    <label for="backupFrequency">Frequency</label>
                    <select id="backupFrequency">
                        <option value="disabled" ${schedule.frequency === 'disabled' ? 'selected' : ''}>Disabled</option>
                        <option value="daily" ${schedule.frequency === 'daily' ? 'selected' : ''}>Daily</option>
                        <option value="weekly" ${schedule.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                        <option value="monthly" ${schedule.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                    </select>
                </div>
                <div class="form-group page-content-field">
                    <label for="backupTime">Time</label>
                    <input id="backupTime" type="time" value="${escapeHtml(schedule.time || '02:00')}">
                </div>
                <div class="form-group page-content-field">
                    <label for="backupDay">Day of Week</label>
                    <select id="backupDay">
                        <option value="0" ${String(schedule.day) === '0' ? 'selected' : ''}>Sunday</option>
                        <option value="1" ${String(schedule.day) === '1' ? 'selected' : ''}>Monday</option>
                        <option value="2" ${String(schedule.day) === '2' ? 'selected' : ''}>Tuesday</option>
                        <option value="3" ${String(schedule.day) === '3' ? 'selected' : ''}>Wednesday</option>
                        <option value="4" ${String(schedule.day) === '4' ? 'selected' : ''}>Thursday</option>
                        <option value="5" ${String(schedule.day) === '5' ? 'selected' : ''}>Friday</option>
                        <option value="6" ${String(schedule.day) === '6' ? 'selected' : ''}>Saturday</option>
                    </select>
                </div>
                <div class="form-group page-content-field">
                    <label for="backupDate">Day of Month</label>
                    <input id="backupDate" type="number" min="1" max="31" value="${escapeHtml(String(schedule.date || '1'))}">
                </div>
                <div class="form-group page-content-field">
                    <label for="backupRetention">Retention (days)</label>
                    <input id="backupRetention" type="number" min="1" value="${escapeHtml(String(schedule.retention || '30'))}">
                </div>
            </div>
        `;

        if (!state.backupHistory.length) {
            historyTarget.innerHTML = '<div class="empty-state"><span class="material-icons">backup</span><h3>No backups yet</h3><p>Create your first backup to populate history.</p></div>';
            return;
        }

        historyTarget.innerHTML = state.backupHistory.map((backup) => `
            <div class="activity-item">
                <div class="activity-icon">
                    <span class="material-icons">${backup.status === 'completed' ? 'task_alt' : 'error'}</span>
                </div>
                <div class="activity-content">
                    <p>${escapeHtml(backup.id || 'Backup')}</p>
                    <small>${escapeHtml(formatDate(backup.created))} · ${escapeHtml((backup.tables || []).join(', '))} · ${escapeHtml(String(backup.format || '').toUpperCase())}</small>
                </div>
            </div>
        `).join('');
    }

    async function loadBackupData(force = false) {
        if (state.backupHistory.length && state.backupSchedule && !force) {
            renderBackupView();
            return;
        }

        const [historyRes, scheduleRes] = await Promise.all([
            authFetch('/api/backup/history'),
            authFetch('/api/backup/schedule')
        ]);

        if (!historyRes.ok || !scheduleRes.ok) {
            throw new Error('Failed to load backup data');
        }

        state.backupHistory = await historyRes.json();
        state.backupSchedule = await scheduleRes.json();
        renderBackupView();
        updateBackupStatus(`Loaded ${state.backupHistory.length} backups.`);
    }

    async function createBackupNow() {
        state.backupBusy = true;
        updateBackupStatus('Creating backup...');
        try {
            const collections = Array.from(document.querySelectorAll('[data-backup-collection]:checked')).map((input) => input.getAttribute('data-backup-collection'));
            const format = document.getElementById('backupFormat')?.value || 'json';
            const response = await authFetch('/api/backup/create', {
                method: 'POST',
                body: JSON.stringify({ collections, format })
            });
            if (!response.ok) {
                throw new Error('Failed to create backup');
            }
            await loadBackupData(true);
            updateBackupStatus('Backup created successfully.');
        } finally {
            state.backupBusy = false;
        }
    }

    async function saveBackupSchedule() {
        updateBackupStatus('Saving backup schedule...');
        const payload = {
            frequency: document.getElementById('backupFrequency')?.value || 'disabled',
            time: document.getElementById('backupTime')?.value || '02:00',
            day: document.getElementById('backupDay')?.value || '0',
            date: document.getElementById('backupDate')?.value || '1',
            retention: document.getElementById('backupRetention')?.value || '30'
        };
        const response = await authFetch('/api/backup/schedule', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error('Failed to save backup schedule');
        }
        state.backupSchedule = payload;
        renderBackupView();
        updateBackupStatus('Backup schedule saved.');
    }

    async function cleanupBackups() {
        updateBackupStatus('Cleaning up old backups...');
        const retentionDays = parseInt(document.getElementById('backupRetention')?.value || '30', 10) || 30;
        const response = await authFetch('/api/backup/cleanup', {
            method: 'POST',
            body: JSON.stringify({ retentionDays })
        });
        if (!response.ok) {
            throw new Error('Failed to clean up backups');
        }
        const result = await response.json();
        await loadBackupData(true);
        updateBackupStatus(`Deleted ${result.deleted || 0} old backups.`);
    }

    function renderSettings() {
        const featuresTarget = document.getElementById('settingsFeatureToggles');
        const maintenanceTarget = document.getElementById('settingsMaintenanceForm');
        const envTarget = document.getElementById('settingsEnvInfo');
        const config = state.settingsConfig;
        if (!featuresTarget || !maintenanceTarget || !envTarget || !config) return;

        const features = config.features || {};
        const maintenance = config.maintenance || {};
        const env = config.env || {};

        featuresTarget.innerHTML = `
            <div class="page-content-fields">
                ${[
                    ['emailNotifications', 'Email Notifications'],
                    ['backupEnabled', 'Backup Enabled'],
                    ['auditLogging', 'Audit Logging']
                ].map(([key, label]) => `
                    <label class="settings-toggle-row">
                        <span>${escapeHtml(label)}</span>
                        <input type="checkbox" data-settings-feature="${escapeHtml(key)}" ${features[key] ? 'checked' : ''}>
                    </label>
                `).join('')}
            </div>
        `;

        maintenanceTarget.innerHTML = `
            <div class="page-content-fields">
                <label class="settings-toggle-row">
                    <span>Enable Maintenance Mode</span>
                    <input type="checkbox" id="settingsMaintenanceEnabled" ${maintenance.enabled ? 'checked' : ''}>
                </label>
                <div class="form-group page-content-field">
                    <label for="settingsMaintenanceMessage">Maintenance Message</label>
                    <textarea id="settingsMaintenanceMessage" rows="3">${escapeHtml(maintenance.message || 'Site is currently under maintenance')}</textarea>
                </div>
                <div class="form-group page-content-field">
                    <label for="settingsMaintenanceDuration">Duration (minutes)</label>
                    <input id="settingsMaintenanceDuration" type="number" min="1" value="${escapeHtml(String(maintenance.duration || 30))}">
                </div>
                <label class="settings-toggle-row">
                    <span>Allow Admins During Maintenance</span>
                    <input type="checkbox" id="settingsMaintenanceAllowAdmins" ${maintenance.allowAdmins !== false ? 'checked' : ''}>
                </label>
            </div>
        `;

        envTarget.innerHTML = `
            <div class="page-content-fields">
                ${Object.entries(env).map(([key, entry]) => `
                    <div class="form-group page-content-field">
                        <label>${escapeHtml(key)}</label>
                        <input type="text" value="${escapeHtml(entry?.value ?? '')}" readonly>
                    </div>
                `).join('')}
            </div>
        `;

        updateSettingsStatus(state.settingsDirty ? 'Unsaved settings changes.' : 'Settings loaded.');
    }

    async function loadSettings(force = false) {
        if (state.settingsConfig && !force) {
            renderSettings();
            return;
        }

        const [configRes, statusRes] = await Promise.all([
            authFetch('/api/system/config'),
            authFetch('/api/system/status')
        ]);
        if (!configRes.ok || !statusRes.ok) {
            throw new Error('Failed to load settings');
        }

        const config = await configRes.json();
        const status = await statusRes.json();
        state.settingsConfig = {
            env: config.env || {},
            features: config.features || {},
            maintenance: {
                enabled: !!status.maintenanceMode,
                message: 'Site is currently under maintenance',
                duration: 30,
                allowAdmins: true
            }
        };
        state.settingsDirty = false;
        renderSettings();
    }

    function collectSettingsForm() {
        if (!state.settingsConfig) return null;
        const features = { ...(state.settingsConfig.features || {}) };
        document.querySelectorAll('[data-settings-feature]').forEach((input) => {
            features[input.getAttribute('data-settings-feature')] = !!input.checked;
        });

        return {
            features,
            maintenance: {
                enabled: !!document.getElementById('settingsMaintenanceEnabled')?.checked,
                message: document.getElementById('settingsMaintenanceMessage')?.value?.trim() || 'Site is currently under maintenance',
                duration: Math.max(1, parseInt(document.getElementById('settingsMaintenanceDuration')?.value || '30', 10) || 30),
                allowAdmins: !!document.getElementById('settingsMaintenanceAllowAdmins')?.checked
            }
        };
    }

    async function saveSettings() {
        setSettingsSaving(true);
        try {
            const payload = collectSettingsForm();
            if (!payload) return;

            const [configRes, maintenanceRes] = await Promise.all([
                authFetch('/api/system/config', {
                    method: 'POST',
                    body: JSON.stringify({ features: payload.features })
                }),
                authFetch('/api/system/maintenance', {
                    method: 'POST',
                    body: JSON.stringify(payload.maintenance)
                })
            ]);

            if (!configRes.ok || !maintenanceRes.ok) {
                throw new Error('Failed to save settings');
            }

            state.settingsConfig.features = payload.features;
            state.settingsConfig.maintenance = payload.maintenance;
            state.settingsDirty = false;
            renderSettings();
            updateSettingsStatus('Settings saved.');
        } finally {
            setSettingsSaving(false);
        }
    }

    function updateSlideStatusBar() {
        const draftStatus = document.getElementById('slideshowDraftStatus');
        const publishedStatus = document.getElementById('slideshowPublishedStatus');
        if (draftStatus) {
            const updatedAt = state.slideshowDraft?.updatedAt ? formatDate(state.slideshowDraft.updatedAt) : 'Not loaded';
            draftStatus.textContent = `${state.slideshowDirty ? 'Unsaved draft changes' : 'Draft saved'} · ${updatedAt}`;
        }
        if (publishedStatus) {
            if (state.slideshowPublishing) {
                publishedStatus.textContent = 'Publishing to live site...';
                return;
            }
            const publishedAt = state.slideshowPublished?.publishedAt ? formatDate(state.slideshowPublished.publishedAt) : 'Never published';
            publishedStatus.textContent = `Published · ${publishedAt}`;
        }
    }

    function setSlideshowPublishing(isPublishing) {
        state.slideshowPublishing = !!isPublishing;

        const publishButton = document.getElementById('publishSlideshows');
        const saveButton = document.getElementById('saveSlideshowDraft');
        const refreshButton = document.getElementById('refreshSlideshows');
        const overlay = document.getElementById('slideshowPublishOverlay');

        [publishButton, saveButton, refreshButton].forEach((button) => {
            if (!button) return;
            button.disabled = state.slideshowPublishing;
            button.classList.toggle('is-busy', state.slideshowPublishing);
        });

        if (publishButton) {
            publishButton.innerHTML = state.slideshowPublishing
                ? '<span class="btn-spinner" aria-hidden="true"></span><span>Publishing...</span>'
                : '<span class="material-icons">publish</span><span>Publish</span>';
        }

        if (overlay) {
            overlay.style.display = state.slideshowPublishing ? 'flex' : 'none';
        }

        updateSlideStatusBar();
    }

    function getSlidesForPage(page = state.activeSlideshowPage) {
        return state.slideshowDraft?.pages?.[page] || [];
    }

    function findSelectedSlide() {
        if (!state.selectedSlideId || !state.slideshowDraft) return null;
        for (const page of VALID_SLIDESHOW_PAGES) {
            const slide = (state.slideshowDraft.pages?.[page] || []).find((item) => item.id === state.selectedSlideId);
            if (slide) return slide;
        }
        return null;
    }

    function markSlideshowDirty() {
        state.slideshowDirty = true;
        if (state.slideshowDraft) {
            state.slideshowDraft.updatedAt = new Date().toISOString();
        }
        updateSlideStatusBar();
    }

    function renderSlideshowList() {
        const list = document.getElementById('slideshowList');
        const title = document.getElementById('slideshowListTitle');
        const count = document.getElementById('slideshowCount');
        if (!list) return;

        const slides = getSlidesForPage();
        if (title) title.textContent = `${state.activeSlideshowPage.charAt(0).toUpperCase() + state.activeSlideshowPage.slice(1)} Slides`;
        if (count) count.textContent = `${slides.length} ${slides.length === 1 ? 'slide' : 'slides'}`;

        if (slides.length === 0) {
            list.innerHTML = '<div class="slideshow-empty-state">No images yet for this page. Use Add Image to start the slideshow.</div>';
            return;
        }

        list.innerHTML = slides.map((slide, index) => `
            <div class="slideshow-list-item${slide.id === state.selectedSlideId ? ' active' : ''}" data-slide-id="${escapeHtml(slide.id)}" draggable="true">
                <div class="slideshow-thumb">
                    <img src="${escapeHtml(getSlidePreviewSrc(slide))}" alt="Slide ${index + 1}">
                </div>
                <div class="slideshow-meta">
                    <strong>Slide ${index + 1}</strong>
                    <span>${escapeHtml(slide.page)} · ${escapeHtml(slide.url)}</span>
                </div>
                <div class="slideshow-order">#${index + 1}</div>
            </div>
        `).join('');

        list.querySelectorAll('.slideshow-list-item').forEach((item) => {
            item.addEventListener('click', () => {
                state.selectedSlideId = item.getAttribute('data-slide-id');
                renderSlideshowList();
                renderSlideEditor();
            });
            item.addEventListener('dragstart', handleSlideReorderDragStart);
            item.addEventListener('dragover', handleSlideReorderDragOver);
            item.addEventListener('dragenter', handleSlideReorderDragEnter);
            item.addEventListener('dragleave', handleSlideReorderDragLeave);
            item.addEventListener('drop', handleSlideReorderDrop);
            item.addEventListener('dragend', handleSlideReorderDragEnd);
        });
    }

    function reorderSlidesForPage(page, fromIndex, toIndex) {
        const slides = getSlidesForPage(page);
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= slides.length || toIndex >= slides.length) {
            return false;
        }

        const reordered = [...slides];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);
        state.slideshowDraft.pages[page] = reordered.map((item, itemIndex) => ({
            ...item,
            order: itemIndex
        }));
        return true;
    }

    function clearSlideDropTargets() {
        document.querySelectorAll('.slideshow-list-item').forEach((item) => {
            item.classList.remove('drag-over', 'dragging');
        });
    }

    function handleSlideReorderDragStart(event) {
        const slideId = event.currentTarget.getAttribute('data-slide-id');
        const slides = getSlidesForPage();
        const fromIndex = slides.findIndex((item) => item.id === slideId);
        if (fromIndex < 0) {
            event.preventDefault();
            return;
        }
        state.slideshowListDrag = {
            slideId,
            page: state.activeSlideshowPage,
            fromIndex
        };
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', slideId);
        event.currentTarget.classList.add('dragging');
    }

    function handleSlideReorderDragOver(event) {
        if (!state.slideshowListDrag) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    function handleSlideReorderDragEnter(event) {
        if (!state.slideshowListDrag) return;
        const target = event.currentTarget;
        if (target.getAttribute('data-slide-id') === state.slideshowListDrag.slideId) return;
        target.classList.add('drag-over');
    }

    function handleSlideReorderDragLeave(event) {
        event.currentTarget.classList.remove('drag-over');
    }

    function handleSlideReorderDrop(event) {
        const dragState = state.slideshowListDrag;
        if (!dragState) return;
        event.preventDefault();

        const targetSlideId = event.currentTarget.getAttribute('data-slide-id');
        const slides = getSlidesForPage(dragState.page);
        const toIndex = slides.findIndex((item) => item.id === targetSlideId);
        if (toIndex < 0) {
            clearSlideDropTargets();
            state.slideshowListDrag = null;
            return;
        }

        if (reorderSlidesForPage(dragState.page, dragState.fromIndex, toIndex)) {
            markSlideshowDirty();
            renderSlideshowList();
            renderSlideEditor();
        } else {
            clearSlideDropTargets();
        }

        state.slideshowListDrag = null;
    }

    function handleSlideReorderDragEnd() {
        clearSlideDropTargets();
        state.slideshowListDrag = null;
    }

    function syncPreviewCrop(slide) {
        const previewImage = document.getElementById('slideshowPreviewImage');
        const previewSurface = document.getElementById('slideshowPreviewSurface');
        if (!previewImage || !previewSurface || !slide) return;
        syncPreviewSurfaceLayout(slide.page || state.activeSlideshowPage);
        const crop = slide.crop || { x: 50, y: 50, zoom: 100 };
        const filters = slide.filters || { brightness: 100, contrast: 100, saturate: 100 };
        const fitMode = 'cover';
        const effectiveZoom = Math.max(100, crop.zoom ?? 100);
        let translateX = 0;
        let translateY = 0;
        let finalWidth = previewSurface.clientWidth || 0;
        let finalHeight = previewSurface.clientHeight || 0;

        previewImage.style.objectFit = fitMode;
        previewImage.style.objectPosition = '50% 50%';
        previewImage.style.transformOrigin = '50% 50%';

        const naturalWidth = previewImage.naturalWidth;
        const naturalHeight = previewImage.naturalHeight;
        const surfaceWidth = previewSurface.clientWidth;
        const surfaceHeight = previewSurface.clientHeight;

        if (naturalWidth > 0 && naturalHeight > 0 && surfaceWidth > 0 && surfaceHeight > 0) {
            const imageRatio = naturalWidth / naturalHeight;
            const surfaceRatio = surfaceWidth / surfaceHeight;
            let baseWidth = surfaceWidth;
            let baseHeight = surfaceHeight;

            if (imageRatio > surfaceRatio) {
                baseHeight = surfaceHeight;
                baseWidth = surfaceHeight * imageRatio;
            } else {
                baseWidth = surfaceWidth;
                baseHeight = surfaceWidth / imageRatio;
            }

            finalWidth = baseWidth * (effectiveZoom / 100);
            finalHeight = baseHeight * (effectiveZoom / 100);
            const overflowX = Math.max(0, finalWidth - surfaceWidth);
            const overflowY = Math.max(0, finalHeight - surfaceHeight);
            translateX = ((50 - crop.x) / 50) * (overflowX / 2);
            translateY = ((50 - crop.y) / 50) * (overflowY / 2);
        }

        previewImage.style.width = `${finalWidth}px`;
        previewImage.style.height = `${finalHeight}px`;
        previewImage.style.transform = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px)`;
        previewImage.style.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)`;
        previewImage.style.cursor = 'grab';
        if (previewSurface) {
            previewSurface.classList.add('is-draggable');
        }
    }

    function syncCropInputs(slide) {
        document.getElementById('slideshowCropX').value = slide.crop?.x ?? 50;
        document.getElementById('slideshowCropY').value = slide.crop?.y ?? 50;
        document.getElementById('slideshowCropZoom').value = slide.crop?.zoom ?? 100;
    }

    function syncPreviewOverlay() {
        const previewOverlay = document.getElementById('slideshowPreviewOverlay');
        const previewSurface = document.getElementById('slideshowPreviewSurface');
        if (!previewOverlay) return;
        const overlay = getOverlayForSelectedSlide();
        previewOverlay.style.background = overlay.color || '#000000';
        previewOverlay.style.opacity = String(Math.min(100, Math.max(0, Number(overlay.opacity) || 0)) / 100);

        if (previewSurface) {
            previewSurface.style.setProperty('--slideshow-preview-mask', 'rgba(11, 20, 16, 0.7)');
        }
    }

    function renderOverlayControls() {
        const colorInput = document.getElementById('slideshowOverlayColor');
        const opacityInput = document.getElementById('slideshowOverlayOpacity');
        const opacityValue = document.getElementById('slideshowOverlayOpacityValue');
        const overrideInput = document.getElementById('slideshowOverlayOverride');
        const slide = findSelectedSlide();
        const overlay = getOverlayForSelectedSlide();
        const isOverride = !!(slide?.overlayExplicit === true && slide?.overlayOverride);
        if (overrideInput) overrideInput.checked = isOverride;
        if (colorInput) colorInput.value = overlay.color;
        if (opacityInput) opacityInput.value = overlay.opacity;
        if (opacityValue) opacityValue.textContent = `${overlay.opacity}%`;
        if (colorInput) colorInput.disabled = !isOverride;
        if (opacityInput) opacityInput.disabled = !isOverride;
        syncPreviewOverlay();
    }

    function renderPageSettings() {
        const toggle = document.getElementById('slideshowRandomizeToggle');
        const colorInput = document.getElementById('slideshowGlobalOverlayColor');
        const opacityInput = document.getElementById('slideshowGlobalOverlayOpacity');
        const opacityValue = document.getElementById('slideshowGlobalOverlayOpacityValue');
        if (toggle) {
            toggle.checked = !!getPageSettings().randomize;
        }
        const overlay = getGlobalOverlayForPage();
        if (colorInput) colorInput.value = overlay.color;
        if (opacityInput) opacityInput.value = overlay.opacity;
        if (opacityValue) opacityValue.textContent = `${overlay.opacity}%`;
    }

    function resetSlideImageState(slide) {
        if (!slide) return;
        slide.crop = { x: 50, y: 50, zoom: 100 };
        slide.filters = { brightness: 100, contrast: 100, saturate: 100 };
        slide.overlayExplicit = false;
        slide.overlayOverride = false;
        slide.overlay = { color: '#000000', opacity: 0 };
    }

    function renderSlideEditor() {
        const emptyState = document.getElementById('slideshowEmptyState');
        const editor = document.getElementById('slideshowEditor');
        const slide = findSelectedSlide();
        const previewSurface = document.getElementById('slideshowPreviewSurface');

        if (!slide) {
            if (emptyState) emptyState.style.display = 'block';
            if (editor) editor.style.display = 'none';
            if (previewSurface) {
                delete previewSurface.dataset.page;
            }
            renderOverlayControls();
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (editor) editor.style.display = 'block';
        if (previewSurface) {
            previewSurface.dataset.page = slide.page || state.activeSlideshowPage;
            syncPreviewSurfaceLayout(slide.page || state.activeSlideshowPage);
        }

        const previewImage = document.getElementById('slideshowPreviewImage');
        if (previewImage) {
            previewImage.src = getSlidePreviewSrc(slide);
            previewImage.alt = 'Slideshow image';
            previewImage.onload = () => {
                const currentSlide = findSelectedSlide();
                if (currentSlide && currentSlide.id === slide.id) {
                    syncPreviewCrop(currentSlide);
                }
            };
            syncPreviewCrop(slide);
        }

        document.getElementById('slideshowPageAssign').value = slide.page || state.activeSlideshowPage;
        syncCropInputs(slide);
        document.getElementById('slideshowFilterBrightness').value = slide.filters?.brightness ?? 100;
        document.getElementById('slideshowFilterContrast').value = slide.filters?.contrast ?? 100;
        document.getElementById('slideshowFilterSaturate').value = slide.filters?.saturate ?? 100;
        renderOverlayControls();
    }

    function selectFirstSlideForActivePage() {
        const slides = getSlidesForPage();
        state.selectedSlideId = slides[0]?.id || null;
        renderSlideshowList();
        renderSlideEditor();
    }

    async function loadSlideshows(force = false) {
        if (state.slideshowDraft && !force) {
            renderSlideshowList();
            renderSlideEditor();
            updateSlideStatusBar();
            renderPageSettings();
            return;
        }

        const response = await authFetch('/api/admin/slideshows');
        if (!response.ok) {
            throw new Error('Failed to load slideshows');
        }

        const payload = await response.json();
        state.slideshowDraft = payload.draft;
        state.slideshowPublished = payload.published;
        state.slideshowDirty = false;

        const activeSlides = getSlidesForPage();
        if (!activeSlides.some((slide) => slide.id === state.selectedSlideId)) {
            state.selectedSlideId = activeSlides[0]?.id || null;
        }

        updateSlideStatusBar();
        renderSlideshowList();
        renderSlideEditor();
        renderOverlayControls();
        renderPageSettings();
    }

    async function saveSlideshowDraft() {
        if (!state.slideshowDraft) return;
        const selectedSlideId = state.selectedSlideId;

        await flushPendingSlideshowInputs();
        syncSlideshowControlsToState();

        const response = await authFetch('/api/admin/slideshows/draft', {
            method: 'PUT',
            body: JSON.stringify(state.slideshowDraft)
        });

        if (!response.ok) {
            throw new Error('Failed to save slideshow draft');
        }

        const payload = await response.json();
        state.slideshowDraft = payload.draft;
        if (selectedSlideId && findSlideById(selectedSlideId)) {
            state.selectedSlideId = selectedSlideId;
        }
        state.slideshowDirty = false;
        updateSlideStatusBar();
        renderSlideshowList();
        renderSlideEditor();
        renderPageSettings();
    }

    async function publishSlideshows() {
        setSlideshowPublishing(true);
        try {
            await flushPendingSlideshowInputs();
            syncSlideshowControlsToState();

            if (state.slideshowDirty) {
                await saveSlideshowDraft();
            }

            const response = await authFetch('/api/admin/slideshows/publish', { method: 'POST' });
            if (!response.ok) {
                throw new Error('Failed to publish slideshows');
            }

            const payload = await response.json();
            state.slideshowPublished = payload.published;
            updateSlideStatusBar();
        } finally {
            setSlideshowPublishing(false);
        }
    }

    async function flushPendingSlideshowInputs() {
        const activeElement = document.activeElement;
        if (activeElement && typeof activeElement.blur === 'function' && (
            activeElement.id === 'slideshowGlobalOverlayColor' ||
            activeElement.id === 'slideshowOverlayColor' ||
            activeElement.id === 'slideshowGlobalOverlayOpacity' ||
            activeElement.id === 'slideshowOverlayOpacity' ||
            activeElement.id === 'slideshowCropX' ||
            activeElement.id === 'slideshowCropY' ||
            activeElement.id === 'slideshowCropZoom' ||
            activeElement.id === 'slideshowFilterBrightness' ||
            activeElement.id === 'slideshowFilterContrast' ||
            activeElement.id === 'slideshowFilterSaturate'
        )) {
            activeElement.blur();
        }

        await new Promise((resolve) => {
            window.requestAnimationFrame(() => resolve());
        });
    }

    function syncSlideshowControlsToState() {
        if (!state.slideshowDraft) return;

        const globalOverlayColor = document.getElementById('slideshowGlobalOverlayColor');
        const globalOverlayOpacity = document.getElementById('slideshowGlobalOverlayOpacity');
        if (globalOverlayColor && globalOverlayOpacity) {
            if (!state.slideshowDraft.overlays) state.slideshowDraft.overlays = {};
            state.slideshowDraft.overlays[state.activeSlideshowPage] = {
                color: globalOverlayColor.value || '#000000',
                opacity: Number(globalOverlayOpacity.value)
            };
        }

        const randomizeToggle = document.getElementById('slideshowRandomizeToggle');
        if (randomizeToggle) {
            if (!state.slideshowDraft.settings) state.slideshowDraft.settings = {};
            state.slideshowDraft.settings[state.activeSlideshowPage] = {
                ...getPageSettings(),
                randomize: !!randomizeToggle.checked
            };
        }

        const slide = findSelectedSlide();
        if (!slide) return;

        const pageAssign = document.getElementById('slideshowPageAssign');
        if (pageAssign && VALID_SLIDESHOW_PAGES.includes(pageAssign.value)) {
            slide.page = pageAssign.value;
        }

        slide.crop = {
            x: Number(document.getElementById('slideshowCropX')?.value ?? slide.crop?.x ?? 50),
            y: Number(document.getElementById('slideshowCropY')?.value ?? slide.crop?.y ?? 50),
            zoom: Number(document.getElementById('slideshowCropZoom')?.value ?? slide.crop?.zoom ?? 100)
        };

        slide.filters = {
            brightness: Number(document.getElementById('slideshowFilterBrightness')?.value ?? slide.filters?.brightness ?? 100),
            contrast: Number(document.getElementById('slideshowFilterContrast')?.value ?? slide.filters?.contrast ?? 100),
            saturate: Number(document.getElementById('slideshowFilterSaturate')?.value ?? slide.filters?.saturate ?? 100)
        };

        const overlayOverride = document.getElementById('slideshowOverlayOverride');
        const overlayColor = document.getElementById('slideshowOverlayColor');
        const overlayOpacity = document.getElementById('slideshowOverlayOpacity');
        if (overlayOverride && overlayColor && overlayOpacity) {
            slide.overlayExplicit = true;
            slide.overlayOverride = !!overlayOverride.checked;
            slide.overlay = {
                color: overlayColor.value || '#000000',
                opacity: Number(overlayOpacity.value)
            };
        }
    }

    function updateSlideField(field, value) {
        if (field === 'globalOverlay') {
            if (!state.slideshowDraft.overlays) state.slideshowDraft.overlays = {};
            state.slideshowDraft.overlays[state.activeSlideshowPage] = {
                color: document.getElementById('slideshowGlobalOverlayColor').value || '#000000',
                opacity: Number(document.getElementById('slideshowGlobalOverlayOpacity').value)
            };
            markSlideshowDirty();
            renderPageSettings();
            renderOverlayControls();
            renderSlideshowList();
            renderSlideEditor();
            return;
        }

        if (field === 'randomize') {
            if (!state.slideshowDraft.settings) {
                state.slideshowDraft.settings = {};
            }
            state.slideshowDraft.settings[state.activeSlideshowPage] = {
                ...getPageSettings(),
                randomize: !!document.getElementById('slideshowRandomizeToggle')?.checked
            };
            markSlideshowDirty();
            renderPageSettings();
            renderSlideshowList();
            renderSlideEditor();
            return;
        }

        const slide = findSelectedSlide();
        if (!slide) return;

        if (field === 'page') {
            const currentPage = slide.page;
            const targetPage = VALID_SLIDESHOW_PAGES.includes(value) ? value : currentPage;
            if (targetPage !== currentPage) {
                const fromSlides = state.slideshowDraft.pages[currentPage];
                state.slideshowDraft.pages[currentPage] = fromSlides.filter((item) => item.id !== slide.id)
                    .map((item, index) => ({ ...item, order: index }));
                slide.page = targetPage;
                state.slideshowDraft.pages[targetPage] = [...state.slideshowDraft.pages[targetPage], slide]
                    .map((item, index) => ({ ...item, order: index }));
                state.activeSlideshowPage = targetPage;
                document.querySelectorAll('.slideshow-page-tab').forEach((btn) => {
                    btn.classList.toggle('active', btn.getAttribute('data-page') === targetPage);
                });
            }
        } else if (field === 'crop') {
            slide.crop = {
                x: Number(document.getElementById('slideshowCropX').value),
                y: Number(document.getElementById('slideshowCropY').value),
                zoom: Number(document.getElementById('slideshowCropZoom').value)
            };
            syncPreviewCrop(slide);
        } else if (field === 'filters') {
            slide.filters = {
                brightness: Number(document.getElementById('slideshowFilterBrightness').value),
                contrast: Number(document.getElementById('slideshowFilterContrast').value),
                saturate: Number(document.getElementById('slideshowFilterSaturate').value)
            };
            syncPreviewCrop(slide);
        } else if (field === 'overlay') {
            slide.overlay = {
                color: document.getElementById('slideshowOverlayColor').value || '#000000',
                opacity: Number(document.getElementById('slideshowOverlayOpacity').value)
            };
            slide.overlayExplicit = true;
            slide.overlayOverride = true;
            syncPreviewOverlay();
        } else if (field === 'overlayOverride') {
            slide.overlayExplicit = true;
            slide.overlayOverride = !!document.getElementById('slideshowOverlayOverride')?.checked;
            if (!slide.overlayOverride) {
                slide.overlay = { ...getGlobalOverlayForPage(slide.page || state.activeSlideshowPage) };
            }
            renderOverlayControls();
        } else {
            slide[field] = value;
        }

        markSlideshowDirty();
        renderSlideshowList();
        renderSlideEditor();
    }

    function beginSlideshowDrag(event) {
        const slide = findSelectedSlide();
        const surface = document.getElementById('slideshowPreviewSurface');
        const image = document.getElementById('slideshowPreviewImage');
        if (!slide || !surface || !image) return;

        state.slideshowDrag = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            cropX: slide.crop?.x ?? 50,
            cropY: slide.crop?.y ?? 50,
            moved: false
        };

        surface.setPointerCapture?.(event.pointerId);
        surface.classList.add('is-dragging');
        image.style.cursor = 'grabbing';
        event.preventDefault();
    }

    function moveSlideshowDrag(event) {
        const drag = state.slideshowDrag;
        const slide = findSelectedSlide();
        const surface = document.getElementById('slideshowPreviewSurface');
        if (!drag || !slide || !surface || drag.pointerId !== event.pointerId) return;

        const rect = surface.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;
        const nextX = Math.min(100, Math.max(0, drag.cropX - ((deltaX / rect.width) * 100)));
        const nextY = Math.min(100, Math.max(0, drag.cropY - ((deltaY / rect.height) * 100)));

        slide.crop = {
            x: nextX,
            y: nextY,
            zoom: slide.crop?.zoom ?? 100
        };
        drag.moved = true;
        syncCropInputs(slide);
        syncPreviewCrop(slide);
    }

    function endSlideshowDrag(event) {
        const drag = state.slideshowDrag;
        const slide = findSelectedSlide();
        const surface = document.getElementById('slideshowPreviewSurface');
        const image = document.getElementById('slideshowPreviewImage');
        if (!drag || drag.pointerId !== event.pointerId) return;

        surface?.releasePointerCapture?.(event.pointerId);
        surface?.classList.remove('is-dragging');
        if (image && slide) {
            image.style.cursor = 'grab';
        }

        const didMove = drag.moved;
        state.slideshowDrag = null;

        if (didMove) {
            markSlideshowDirty();
        }
    }

    function handleSlideshowWheelZoom(event) {
        const slide = findSelectedSlide();
        const surface = document.getElementById('slideshowPreviewSurface');
        if (!slide || !surface) return;

        event.preventDefault();

        const currentZoom = Number(slide.crop?.zoom ?? 100);
        const nextZoom = Math.min(300, Math.max(50, currentZoom + (event.deltaY < 0 ? 5 : -5)));
        if (nextZoom === currentZoom) return;

        slide.crop = {
            x: slide.crop?.x ?? 50,
            y: slide.crop?.y ?? 50,
            zoom: nextZoom
        };

        syncCropInputs(slide);
        syncPreviewCrop(slide);
        markSlideshowDirty();
    }

    async function uploadSlideshowImage(file, page) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('page', page);

        const response = await authFetch('/api/admin/slideshows/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload image');
        }

        return response.json();
    }

    async function handleSlideshowUpload(file) {
        if (!file) return;

        const replacingSlide = state.replacingSlideId ? findSlideById(state.replacingSlideId) : null;
        const page = replacingSlide?.page || state.activeSlideshowPage;
        if (replacingSlide) {
            setSlidePreviewUrl(replacingSlide, file);
            renderSlideshowList();
            renderSlideEditor();
        }
        const uploadResult = await uploadSlideshowImage(file, page);
        let nextSelectedSlideId = null;

        if (replacingSlide) {
            replacingSlide.url = uploadResult.url;
            replacingSlide.updatedAt = new Date().toISOString();
            state.selectedSlideId = replacingSlide.id;
            nextSelectedSlideId = replacingSlide.id;
            state.replacingSlideId = null;
        } else {
            const now = new Date().toISOString();
            const slide = {
                id: `slide-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                page,
                url: uploadResult.url,
                title: '',
                caption: '',
                alt: '',
                crop: { x: 50, y: 50, zoom: 100 },
                filters: { brightness: 100, contrast: 100, saturate: 100 },
                overlayExplicit: false,
                overlay: { color: '#000000', opacity: 0 },
                overlayOverride: false,
                order: getSlidesForPage(page).length,
                createdAt: now,
                updatedAt: now
            };
            setSlidePreviewUrl(slide, file);
            state.slideshowDraft.pages[page].push(slide);
            state.selectedSlideId = slide.id;
            nextSelectedSlideId = slide.id;
        }

        markSlideshowDirty();
        renderSlideshowList();
        renderSlideEditor();
        if (nextSelectedSlideId) {
            state.selectedSlideId = nextSelectedSlideId;
        }
        await saveSlideshowDraft();
    }

    function moveSelectedSlide(delta) {
        const slide = findSelectedSlide();
        if (!slide) return;

        const slides = getSlidesForPage(slide.page);
        const index = slides.findIndex((item) => item.id === slide.id);
        const target = index + delta;
        if (index < 0 || target < 0 || target >= slides.length) return;

        const reordered = [...slides];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(target, 0, moved);
        state.slideshowDraft.pages[slide.page] = reordered.map((item, itemIndex) => ({
            ...item,
            order: itemIndex
        }));

        markSlideshowDirty();
        renderSlideshowList();
        renderSlideEditor();
    }

    function deleteSelectedSlide() {
        const slide = findSelectedSlide();
        if (!slide || !window.confirm('Delete this draft slide?')) return;
        revokeSlidePreviewUrl(slide);

        state.slideshowDraft.pages[slide.page] = state.slideshowDraft.pages[slide.page]
            .filter((item) => item.id !== slide.id)
            .map((item, index) => ({ ...item, order: index }));

        const nextSlides = getSlidesForPage(slide.page);
        state.selectedSlideId = nextSlides[0]?.id || null;
        markSlideshowDirty();
        renderSlideshowList();
        renderSlideEditor();
    }

    function resetSelectedSlideImage() {
        const slide = findSelectedSlide();
        if (!slide) return;
        resetSlideImageState(slide);
        markSlideshowDirty();
        renderSlideshowList();
        renderSlideEditor();
    }

    function wireSlideshowManager() {
        const previewSurface = document.getElementById('slideshowPreviewSurface');
        previewSurface?.addEventListener('pointerdown', beginSlideshowDrag);
        previewSurface?.addEventListener('pointermove', moveSlideshowDrag);
        previewSurface?.addEventListener('pointerup', endSlideshowDrag);
        previewSurface?.addEventListener('pointercancel', endSlideshowDrag);
        previewSurface?.addEventListener('wheel', handleSlideshowWheelZoom, { passive: false });
        window.addEventListener('resize', () => {
            const slide = findSelectedSlide();
            syncPreviewSurfaceLayout(slide?.page || state.activeSlideshowPage);
            if (slide) {
                syncPreviewCrop(slide);
            }
        }, { passive: true });

        document.querySelectorAll('.slideshow-page-tab').forEach((button) => {
            button.addEventListener('click', async () => {
                state.activeSlideshowPage = button.getAttribute('data-page');
                document.querySelectorAll('.slideshow-page-tab').forEach((tab) => {
                    tab.classList.toggle('active', tab === button);
                });
                selectFirstSlideForActivePage();
                renderPageSettings();
            });
        });

        document.getElementById('refreshSlideshows')?.addEventListener('click', async () => {
            await loadSlideshows(true);
        });

        document.getElementById('saveSlideshowDraft')?.addEventListener('click', async () => {
            await saveSlideshowDraft();
        });

        document.getElementById('publishSlideshows')?.addEventListener('click', async () => {
            await publishSlideshows();
        });

        const uploadInput = document.getElementById('slideshowUploadInput');
        document.getElementById('addSlideshowImage')?.addEventListener('click', () => {
            state.replacingSlideId = null;
            uploadInput?.click();
        });

        document.getElementById('replaceSlideshowImage')?.addEventListener('click', () => {
            state.replacingSlideId = state.selectedSlideId;
            uploadInput?.click();
        });

        uploadInput?.addEventListener('change', async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
                await handleSlideshowUpload(file);
            } catch (error) {
                console.error('Slideshow upload failed:', error);
                window.alert(error?.message || 'Failed to replace slideshow image.');
            } finally {
                state.replacingSlideId = null;
                event.target.value = '';
            }
        });

        document.getElementById('deleteSlideshowImage')?.addEventListener('click', deleteSelectedSlide);
        document.getElementById('resetSlideshowImage')?.addEventListener('click', resetSelectedSlideImage);
        document.getElementById('moveSlideUp')?.addEventListener('click', () => moveSelectedSlide(-1));
        document.getElementById('moveSlideDown')?.addEventListener('click', () => moveSelectedSlide(1));
        document.getElementById('slideshowRandomizeToggle')?.addEventListener('change', () => updateSlideField('randomize'));
        document.getElementById('slideshowGlobalOverlayColor')?.addEventListener('input', () => updateSlideField('globalOverlay'));
        document.getElementById('slideshowGlobalOverlayColor')?.addEventListener('change', () => updateSlideField('globalOverlay'));
        document.getElementById('slideshowGlobalOverlayOpacity')?.addEventListener('input', () => updateSlideField('globalOverlay'));

        document.getElementById('slideshowPageAssign')?.addEventListener('change', (event) => updateSlideField('page', event.target.value));
        document.getElementById('slideshowCropX')?.addEventListener('input', () => updateSlideField('crop'));
        document.getElementById('slideshowCropY')?.addEventListener('input', () => updateSlideField('crop'));
        document.getElementById('slideshowCropZoom')?.addEventListener('input', () => updateSlideField('crop'));
        document.getElementById('slideshowFilterBrightness')?.addEventListener('input', () => updateSlideField('filters'));
        document.getElementById('slideshowFilterContrast')?.addEventListener('input', () => updateSlideField('filters'));
        document.getElementById('slideshowFilterSaturate')?.addEventListener('input', () => updateSlideField('filters'));
        document.getElementById('slideshowOverlayOverride')?.addEventListener('change', () => updateSlideField('overlayOverride'));
        document.getElementById('slideshowOverlayColor')?.addEventListener('input', () => updateSlideField('overlay'));
        document.getElementById('slideshowOverlayColor')?.addEventListener('change', () => updateSlideField('overlay'));
        document.getElementById('slideshowOverlayOpacity')?.addEventListener('input', () => updateSlideField('overlay'));
    }

    function getPageContentCopy(page = state.activePageContentPage, lang = state.activePageContentLang) {
        return state.pageContentDraft?.pages?.[page]?.[lang] || {};
    }

    function getAboutRoadmapCopy() {
        const copy = getPageContentCopy('about', state.activePageContentLang);
        return Array.isArray(copy.roadmap) ? copy.roadmap : [];
    }

    function updatePageContentStatusBar() {
        const draftStatus = document.getElementById('pageContentDraftStatus');
        const publishedStatus = document.getElementById('pageContentPublishedStatus');
        if (draftStatus) {
            const updatedAt = state.pageContentDraft?.updatedAt ? formatDate(state.pageContentDraft.updatedAt) : 'Not loaded';
            draftStatus.textContent = `${state.pageContentDirty ? 'Unsaved draft changes' : 'Draft saved'} · ${updatedAt}`;
        }
        if (publishedStatus) {
            if (state.pageContentPublishing) {
                publishedStatus.textContent = 'Publishing to live site...';
                return;
            }
            const publishedAt = state.pageContentPublished?.publishedAt ? formatDate(state.pageContentPublished.publishedAt) : 'Never published';
            publishedStatus.textContent = `Published · ${publishedAt}`;
        }
    }

    function setPageContentPublishing(isPublishing) {
        state.pageContentPublishing = !!isPublishing;
        const publishButton = document.getElementById('publishPageContent');
        const saveButton = document.getElementById('savePageContentDraft');
        const refreshButton = document.getElementById('refreshPageContent');

        [publishButton, saveButton, refreshButton].forEach((button) => {
            if (!button) return;
            button.disabled = state.pageContentPublishing;
            button.classList.toggle('is-busy', state.pageContentPublishing);
        });

        if (publishButton) {
            publishButton.innerHTML = state.pageContentPublishing
                ? '<span class="btn-spinner" aria-hidden="true"></span><span>Publishing...</span>'
                : '<span class="material-icons">publish</span><span>Publish</span>';
        }

        updatePageContentStatusBar();
    }

    function markPageContentDirty() {
        state.pageContentDirty = true;
        if (state.pageContentDraft) {
            state.pageContentDraft.updatedAt = new Date().toISOString();
        }
        updatePageContentStatusBar();
    }

    function renderPageContentEditor() {
        const editor = document.getElementById('pageContentEditor');
        const currentPageTitle = document.getElementById('pageContentCurrentPageTitle');
        const currentLanguage = document.getElementById('pageContentCurrentLanguage');
        if (!editor) return;

        const groups = PAGE_CONTENT_SCHEMA[state.activePageContentPage] || [];
        const values = getPageContentCopy();

        if (currentPageTitle) {
            currentPageTitle.textContent = `${state.activePageContentPage.charAt(0).toUpperCase() + state.activePageContentPage.slice(1)} Content`;
        }
        if (currentLanguage) {
            currentLanguage.textContent = `Editing ${PAGE_CONTENT_LANG_LABELS[state.activePageContentLang] || state.activePageContentLang} copy`;
        }

        editor.innerHTML = groups.map((group) => `
            <section class="page-content-group">
                <div class="chart-header">
                    <h3>${escapeHtml(group.title)}</h3>
                </div>
                <div class="page-content-fields">
                    ${group.fields.map((field) => {
                        if (field.type === 'roadmap') {
                            const roadmap = getAboutRoadmapCopy();
                            return `
                                <div class="form-group page-content-field page-content-roadmap-field">
                                    <div class="page-content-roadmap-header">
                                        <label>${escapeHtml(field.label)}</label>
                                        <button type="button" class="btn btn-secondary" id="pageContentAddRoadmapItem">
                                            <span class="material-icons">add</span>
                                            <span>Add Roadmap Item</span>
                                        </button>
                                    </div>
                                    <div class="page-content-roadmap-list">
                                        ${roadmap.map((item, index) => `
                                            <div class="page-content-roadmap-item" data-roadmap-index="${index}">
                                                <div class="form-group page-content-field">
                                                    <label for="pageContent-roadmap-year-${index}">Year / Label</label>
                                                    <input
                                                        id="pageContent-roadmap-year-${index}"
                                                        type="text"
                                                        value="${escapeHtml(item.year || '')}"
                                                        data-page-content-roadmap-index="${index}"
                                                        data-page-content-roadmap-field="year"
                                                    >
                                                </div>
                                                <div class="form-group page-content-field">
                                                    <label for="pageContent-roadmap-text-${index}">Story Text</label>
                                                    <textarea
                                                        id="pageContent-roadmap-text-${index}"
                                                        rows="2"
                                                        data-page-content-roadmap-index="${index}"
                                                        data-page-content-roadmap-field="text"
                                                    >${escapeHtml(item.text || '')}</textarea>
                                                </div>
                                                <button
                                                    type="button"
                                                    class="btn btn-danger page-content-roadmap-remove"
                                                    data-page-content-roadmap-remove="${index}"
                                                >
                                                    <span class="material-icons">delete</span>
                                                    <span>Remove</span>
                                                </button>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `;
                        }

                        const value = values[field.key] || '';
                        const rows = field.rows || 3;
                        if (field.type === 'textarea') {
                            return `
                                <div class="form-group page-content-field">
                                    <label for="pageContent-${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>
                                    <textarea
                                        id="pageContent-${escapeHtml(field.key)}"
                                        data-page-content-key="${escapeHtml(field.key)}"
                                        rows="${rows}"
                                    >${escapeHtml(value)}</textarea>
                                </div>
                            `;
                        }

                        return `
                            <div class="form-group page-content-field">
                                <label for="pageContent-${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>
                                <input
                                    id="pageContent-${escapeHtml(field.key)}"
                                    type="text"
                                    value="${escapeHtml(value)}"
                                    data-page-content-key="${escapeHtml(field.key)}"
                                >
                            </div>
                        `;
                    }).join('')}
                </div>
            </section>
        `).join('');
    }

    function ensurePageContentLanguageBucket(page = state.activePageContentPage, lang = state.activePageContentLang) {
        if (!state.pageContentDraft.pages?.[page]) {
            state.pageContentDraft.pages[page] = {};
        }
        if (!state.pageContentDraft.pages[page][lang]) {
            state.pageContentDraft.pages[page][lang] = {};
        }
        return state.pageContentDraft.pages[page][lang];
    }

    function updateRoadmapField(index, field, value) {
        const bucket = ensurePageContentLanguageBucket('about', state.activePageContentLang);
        const roadmap = Array.isArray(bucket.roadmap) ? [...bucket.roadmap] : [];
        if (!roadmap[index]) {
            roadmap[index] = { year: '', text: '' };
        }
        roadmap[index] = {
            ...roadmap[index],
            [field]: value
        };
        bucket.roadmap = roadmap;
        markPageContentDirty();
    }

    function addRoadmapItem() {
        const bucket = ensurePageContentLanguageBucket('about', state.activePageContentLang);
        const roadmap = Array.isArray(bucket.roadmap) ? [...bucket.roadmap] : [];
        roadmap.push({ year: '', text: '' });
        bucket.roadmap = roadmap;
        markPageContentDirty();
        renderPageContentEditor();
    }

    function removeRoadmapItem(index) {
        const bucket = ensurePageContentLanguageBucket('about', state.activePageContentLang);
        const roadmap = Array.isArray(bucket.roadmap) ? [...bucket.roadmap] : [];
        roadmap.splice(index, 1);
        bucket.roadmap = roadmap;
        markPageContentDirty();
        renderPageContentEditor();
    }

    function renderPageContentTabs() {
        document.querySelectorAll('[data-page-content-page]').forEach((button) => {
            button.classList.toggle('active', button.getAttribute('data-page-content-page') === state.activePageContentPage);
        });
        document.querySelectorAll('[data-page-content-lang]').forEach((button) => {
            button.classList.toggle('active', button.getAttribute('data-page-content-lang') === state.activePageContentLang);
        });
    }

    async function loadPageContent(force = false) {
        if (state.pageContentDraft && !force) {
            renderPageContentTabs();
            renderPageContentEditor();
            updatePageContentStatusBar();
            return;
        }

        const response = await authFetch('/api/admin/page-content');
        if (!response.ok) {
            throw new Error('Failed to load page content');
        }

        const payload = await response.json();
        state.pageContentDraft = payload.draft;
        state.pageContentPublished = payload.published;
        state.pageContentDirty = false;

        renderPageContentTabs();
        renderPageContentEditor();
        updatePageContentStatusBar();
    }

    async function savePageContentDraft() {
        if (!state.pageContentDraft) return;

        const response = await authFetch('/api/admin/page-content/draft', {
            method: 'PUT',
            body: JSON.stringify(state.pageContentDraft)
        });

        if (!response.ok) {
            throw new Error('Failed to save page content draft');
        }

        const payload = await response.json();
        state.pageContentDraft = payload.draft;
        state.pageContentDirty = false;
        renderPageContentEditor();
        updatePageContentStatusBar();
    }

    async function publishPageContent() {
        setPageContentPublishing(true);
        try {
            if (state.pageContentDirty) {
                await savePageContentDraft();
            }

            const response = await authFetch('/api/admin/page-content/publish', { method: 'POST' });
            if (!response.ok) {
                throw new Error('Failed to publish page content');
            }

            const payload = await response.json();
            state.pageContentPublished = payload.published;
            updatePageContentStatusBar();
        } finally {
            setPageContentPublishing(false);
        }
    }

    function wirePageContentManager() {
        document.getElementById('refreshPageContent')?.addEventListener('click', async () => {
            await loadPageContent(true);
        });

        document.getElementById('savePageContentDraft')?.addEventListener('click', async () => {
            await savePageContentDraft();
        });

        document.getElementById('publishPageContent')?.addEventListener('click', async () => {
            await publishPageContent();
        });

        document.getElementById('pageContentPageTabs')?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-page-content-page]');
            if (!button) return;
            state.activePageContentPage = button.getAttribute('data-page-content-page');
            renderPageContentTabs();
            renderPageContentEditor();
        });

        document.getElementById('pageContentLanguageTabs')?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-page-content-lang]');
            if (!button) return;
            state.activePageContentLang = button.getAttribute('data-page-content-lang');
            renderPageContentTabs();
            renderPageContentEditor();
        });

        document.getElementById('pageContentEditor')?.addEventListener('input', (event) => {
            const roadmapField = event.target.closest('[data-page-content-roadmap-index]');
            if (roadmapField && state.pageContentDraft) {
                const index = Number(roadmapField.getAttribute('data-page-content-roadmap-index'));
                const fieldName = roadmapField.getAttribute('data-page-content-roadmap-field');
                if (!Number.isNaN(index) && fieldName) {
                    updateRoadmapField(index, fieldName, roadmapField.value);
                }
                return;
            }

            const field = event.target.closest('[data-page-content-key]');
            if (!field || !state.pageContentDraft) return;
            const key = field.getAttribute('data-page-content-key');
            if (!key) return;

            ensurePageContentLanguageBucket(state.activePageContentPage, state.activePageContentLang)[key] = field.value;
            markPageContentDirty();
        });

        document.getElementById('pageContentEditor')?.addEventListener('click', (event) => {
            const addButton = event.target.closest('#pageContentAddRoadmapItem');
            if (addButton) {
                addRoadmapItem();
                return;
            }

            const removeButton = event.target.closest('[data-page-content-roadmap-remove]');
            if (removeButton) {
                const index = Number(removeButton.getAttribute('data-page-content-roadmap-remove'));
                if (!Number.isNaN(index)) {
                    removeRoadmapItem(index);
                }
            }
        });
    }

    function showView(view, options = {}) {
        view = normalizeAdminView(view);
        let { syncHash = true } = options;
        if (!canAccessView(view)) {
            view = 'dashboard';
            syncHash = true;
        }
        document.querySelectorAll('.admin-view').forEach((el) => {
            el.style.display = 'none';
        });

        const target = document.getElementById(`${view}View`);
        if (target) {
            target.style.display = 'block';
        }

        document.querySelectorAll('.menu-item').forEach((item) => item.classList.remove('active'));
        document.querySelector(`.menu-link[href="#${view}"]`)?.parentElement?.classList.add('active');
        state.currentView = view;

        if (syncHash && window.location.hash !== `#${view}`) {
            history.replaceState({ view }, '', `#${view}`);
        }

        if (view === 'users') {
            renderUsers();
        } else if (view === 'trees') {
            loadTrees().catch((error) => showError(error.message));
        } else if (view === 'audit') {
            loadAuditReport().catch((error) => showError(error.message));
            loadAuditLogs().catch((error) => showError(error.message));
        } else if (view === 'backup') {
            loadBackupData().catch((error) => showError(error.message));
        } else if (view === 'settings') {
            loadSettings().catch((error) => showError(error.message));
        } else if (view === 'system') {
            loadSystemInfo();
        } else if (view === 'slideshows') {
            loadSlideshows().catch((error) => showError(error.message));
        } else if (view === 'page-content') {
            loadPageContent().catch((error) => showError(error.message));
        }
    }

    function wireNavigation() {
        document.querySelectorAll('.menu-link').forEach((link) => {
            link.addEventListener('click', (event) => {
                const href = link.getAttribute('href') || '';
                if (!href.startsWith('#')) return;
                event.preventDefault();
                const view = href.slice(1);
                showView(view);
            });
        });

        window.addEventListener('hashchange', () => {
            const view = getViewFromHash();
            if (view !== state.currentView) {
                showView(view, { syncHash: false });
            }
        });
    }

    function wireHeaderControls() {
        document.getElementById('refreshDashboard')?.addEventListener('click', () => {
            loadAdminData();
        });

        document.getElementById('exportUsers')?.addEventListener('click', exportUsers);

        document.getElementById('inviteUser')?.addEventListener('click', () => {
            window.location.href = '/app/';
        });

        document.getElementById('adminLogout')?.addEventListener('click', async (event) => {
            event.preventDefault();
            const client = window.supabaseClient;
            if (client) {
                await client.auth.signOut({ scope: 'global' });
            }
            sessionStorage.removeItem('adminUser');
            window.location.href = '/login.html';
        });

        document.getElementById('adminBackToAppLink')?.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.assign('/app/');
        });

        document.getElementById('adminProfileLink')?.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.assign('/app/');
        });

        document.getElementById('adminSettingsLink')?.addEventListener('click', (event) => {
            event.preventDefault();
            showView('settings');
            loadSettings().catch((error) => showError(error.message));
        });

        document.getElementById('navToggle')?.addEventListener('click', () => {
            document.getElementById('adminSidebar')?.classList.toggle('collapsed');
        });

        document.getElementById('themeToggle')?.addEventListener('click', () => {
            applyTheme(state.theme === 'dark' ? 'light' : 'dark');
        });

        document.getElementById('userSearch')?.addEventListener('input', applyUserFilters);
        document.getElementById('userRoleFilter')?.addEventListener('change', applyUserFilters);
        document.getElementById('userStatusFilter')?.addEventListener('change', applyUserFilters);
        document.getElementById('userPrevPage')?.addEventListener('click', () => changePage(-1));
        document.getElementById('userNextPage')?.addEventListener('click', () => changePage(1));
        document.getElementById('usersTableBody')?.addEventListener('click', async (event) => {
            const saveButton = event.target.closest('.user-role-save-btn');
            if (saveButton) {
                const userId = saveButton.getAttribute('data-user-id');
                const select = document.querySelector(`.user-role-select[data-user-id="${CSS.escape(userId)}"]`);
                const nextRole = select?.value;
                if (!userId || !nextRole) return;
                saveButton.disabled = true;
                const originalLabel = saveButton.textContent;
                saveButton.textContent = 'Saving...';
                try {
                    await updateUserRole(userId, nextRole);
                } catch (error) {
                    alert(error.message);
                } finally {
                    saveButton.disabled = false;
                    saveButton.textContent = originalLabel;
                }
                return;
            }

            const statusButton = event.target.closest('.user-status-save-btn');
            if (statusButton) {
                const userId = statusButton.getAttribute('data-user-id');
                const select = document.querySelector(`.user-status-select[data-user-id="${CSS.escape(userId)}"]`);
                const nextStatus = select?.value;
                if (!userId || !nextStatus) return;
                statusButton.disabled = true;
                const originalLabel = statusButton.textContent;
                statusButton.textContent = 'Saving...';
                try {
                    await updateUserStatus(userId, nextStatus);
                } catch (error) {
                    alert(error.message);
                } finally {
                    statusButton.disabled = false;
                    statusButton.textContent = originalLabel;
                }
            }
        });
        document.getElementById('treeSearch')?.addEventListener('input', applyTreeFilters);
        document.getElementById('treeStatusFilter')?.addEventListener('change', applyTreeFilters);
        document.getElementById('treeSortFilter')?.addEventListener('change', applyTreeFilters);
        document.getElementById('treeDateFilter')?.addEventListener('change', applyTreeFilters);
        document.getElementById('treePrevPage')?.addEventListener('click', () => {
            state.treePage = Math.max(1, state.treePage - 1);
            renderTrees();
        });
        document.getElementById('treeNextPage')?.addEventListener('click', () => {
            state.treePage += 1;
            renderTrees();
        });
        document.getElementById('exportTrees')?.addEventListener('click', exportTrees);
        document.getElementById('bulkArchiveTrees')?.addEventListener('click', async () => {
            await updateSelectedTreesArchive(true);
        });
        document.getElementById('bulkDeleteTrees')?.addEventListener('click', async () => {
            const ids = Array.from(document.querySelectorAll('.tree-select:checked')).map((input) => input.value);
            for (const id of ids) {
                await deleteTree(id);
            }
        });
        document.getElementById('treesTableBody')?.addEventListener('click', async (event) => {
            const archiveButton = event.target.closest('.tree-archive-btn');
            if (archiveButton) {
                await updateSelectedTreesArchive(archiveButton.getAttribute('data-tree-archived') !== '1');
                return;
            }
            const deleteButton = event.target.closest('.tree-delete-btn');
            if (deleteButton) {
                await deleteTree(deleteButton.getAttribute('data-tree-id'));
            }
        });
        document.getElementById('refreshAuditLogs')?.addEventListener('click', () => {
            loadAuditLogs().catch((error) => showError(error.message));
        });
        document.getElementById('refreshAuditReport')?.addEventListener('click', () => {
            loadAuditReport().catch((error) => showError(error.message));
        });
        document.getElementById('downloadAuditMarkdown')?.addEventListener('click', async () => {
            try {
                await downloadAuditAsset('markdown');
            } catch (error) {
                showError(error.message);
            }
        });
        document.getElementById('downloadAuditHtml')?.addEventListener('click', async () => {
            try {
                await downloadAuditAsset('html');
            } catch (error) {
                showError(error.message);
            }
        });
        document.getElementById('downloadAuditPdf')?.addEventListener('click', async () => {
            try {
                await downloadAuditAsset('pdf');
            } catch (error) {
                showError(error.message);
            }
        });
        document.getElementById('exportAuditLogs')?.addEventListener('click', exportAuditLogs);
        document.getElementById('createManualAuditTicket')?.addEventListener('click', async () => {
            try {
                await createManualAuditTicket();
            } catch (error) {
                showError(error.message);
            }
        });
        document.getElementById('auditFindingsList')?.addEventListener('click', async (event) => {
            const button = event.target.closest('.audit-create-ticket-btn');
            if (!button) return;
            button.disabled = true;
            try {
                await createAuditTicketFromAction(
                    button.getAttribute('data-finding-id'),
                    button.getAttribute('data-action-id')
                );
            } catch (error) {
                showError(error.message);
            } finally {
                button.disabled = false;
            }
        });
        document.getElementById('auditTicketsTableBody')?.addEventListener('click', async (event) => {
            const button = event.target.closest('.audit-save-ticket-btn');
            if (!button) return;
            button.disabled = true;
            try {
                await saveAuditTicket(button.getAttribute('data-ticket-id'));
            } catch (error) {
                showError(error.message);
            } finally {
                button.disabled = false;
            }
        });
        document.getElementById('auditSearch')?.addEventListener('input', () => {
            state.auditPage = 1;
            loadAuditLogs().catch((error) => showError(error.message));
        });
        document.getElementById('auditActionFilter')?.addEventListener('change', () => {
            state.auditPage = 1;
            loadAuditLogs().catch((error) => showError(error.message));
        });
        document.getElementById('auditDateFrom')?.addEventListener('change', () => {
            state.auditPage = 1;
            loadAuditLogs().catch((error) => showError(error.message));
        });
        document.getElementById('auditDateTo')?.addEventListener('change', () => {
            state.auditPage = 1;
            loadAuditLogs().catch((error) => showError(error.message));
        });
        document.getElementById('auditPrevPage')?.addEventListener('click', () => {
            state.auditPage = Math.max(1, state.auditPage - 1);
            loadAuditLogs().catch((error) => showError(error.message));
        });
        document.getElementById('auditNextPage')?.addEventListener('click', () => {
            state.auditPage += 1;
            loadAuditLogs().catch((error) => showError(error.message));
        });
        document.getElementById('refreshBackup')?.addEventListener('click', () => {
            loadBackupData(true).catch((error) => showError(error.message));
        });
        document.getElementById('createBackupButton')?.addEventListener('click', async () => {
            await createBackupNow();
        });
        document.getElementById('saveBackupSchedule')?.addEventListener('click', async () => {
            await saveBackupSchedule();
        });
        document.getElementById('cleanupBackups')?.addEventListener('click', async () => {
            await cleanupBackups();
        });
        document.getElementById('refreshSettings')?.addEventListener('click', () => {
            loadSettings(true).catch((error) => showError(error.message));
        });
        document.getElementById('saveSettings')?.addEventListener('click', async () => {
            await saveSettings();
        });
        document.getElementById('settingsView')?.addEventListener('input', (event) => {
            if (!event.target.closest('#settingsFeatureToggles, #settingsMaintenanceForm')) return;
            state.settingsDirty = true;
            updateSettingsStatus('Unsaved settings changes.');
        });
        document.getElementById('settingsView')?.addEventListener('change', (event) => {
            if (!event.target.closest('#settingsFeatureToggles, #settingsMaintenanceForm')) return;
            state.settingsDirty = true;
            updateSettingsStatus('Unsaved settings changes.');
        });
    }

    function renderSummary(summary) {
        state.summary = summary;
        document.getElementById('totalUsers').textContent = summary.totalUsers;
        document.getElementById('totalTrees').textContent = summary.totalTrees;
        document.getElementById('activeUsers').textContent = summary.activeUsers30d;
        document.getElementById('storageUsed').textContent = summary.totalMembers;
        document.querySelector('.stat-card:nth-child(4) .stat-label').textContent = 'Family Members';
        document.getElementById('treeCount').textContent = summary.totalTrees;
        const userCount = document.getElementById('userCount');
        if (userCount) {
            userCount.textContent = summary.totalUsers;
        }

        const activity = [];
        (summary.recentUsers || []).forEach((user) => {
            activity.push({
                icon: 'person_add',
                title: 'New user joined',
                description: user.display_name || user.email,
                created_at: user.created_at
            });
        });
        (summary.recentTrees || []).forEach((tree) => {
            activity.push({
                icon: 'account_tree',
                title: 'Family tree created',
                description: tree.name,
                created_at: tree.created_at
            });
        });

        activity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const recentActivity = document.getElementById('recentActivity');
        if (!recentActivity) return;
        recentActivity.innerHTML = activity.slice(0, 10).map((item) => `
            <div class="activity-item">
                <div class="activity-icon">
                    <span class="material-icons">${item.icon}</span>
                </div>
                <div class="activity-content">
                    <p>${escapeHtml(item.title)}</p>
                    <small>${escapeHtml(item.description)} · ${escapeHtml(formatRelativeTime(item.created_at))}</small>
                </div>
            </div>
        `).join('');
    }

    function applyUserFilters() {
        const search = (document.getElementById('userSearch')?.value || '').trim().toLowerCase();
        const role = (document.getElementById('userRoleFilter')?.value || '').trim().toLowerCase();
        const status = (document.getElementById('userStatusFilter')?.value || '').trim().toLowerCase();

        state.filteredUsers = state.allUsers.filter((user) => {
            const haystack = [user.display_name, user.email, user.role].filter(Boolean).join(' ').toLowerCase();
            if (search && !haystack.includes(search)) return false;
            if (role && user.role !== role) return false;
            if (status && user.status !== status) return false;
            return true;
        });
        state.currentPage = 1;
        renderUsers();
    }

    function changePage(delta) {
        const maxPage = Math.max(1, Math.ceil(state.filteredUsers.length / state.pageSize));
        state.currentPage = Math.max(1, Math.min(maxPage, state.currentPage + delta));
        renderUsers();
    }

    function renderUsers() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        const canManageRoles = state.adminRole === 'superadmin';
        const canManageStatuses = state.adminRole === 'admin' || state.adminRole === 'superadmin';

        const startIndex = (state.currentPage - 1) * state.pageSize;
        const pageUsers = state.filteredUsers.slice(startIndex, startIndex + state.pageSize);

        if (pageUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No users found.</td></tr>';
        } else {
            tbody.innerHTML = pageUsers.map((user) => `
                <tr>
                    <td class="checkbox-col"><input type="checkbox" value="${escapeHtml(user.id)}"></td>
                    <td>${escapeHtml(user.display_name || 'No name')}</td>
                    <td>${escapeHtml(user.email)}</td>
                    <td>
                        ${canManageRoles ? `
                            <div style="display:flex; gap:8px; align-items:center;">
                                <select class="user-role-select" data-user-id="${escapeHtml(user.id)}" style="min-width:130px;">
                                    <option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option>
                                    <option value="moderator" ${user.role === 'moderator' ? 'selected' : ''}>Moderator</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                    <option value="superadmin" ${user.role === 'superadmin' ? 'selected' : ''}>Super Admin</option>
                                </select>
                                <button class="btn btn-secondary user-role-save-btn" data-user-id="${escapeHtml(user.id)}" style="padding:6px 10px; font-size:12px;">Save</button>
                            </div>
                        ` : `
                            <span class="badge badge-${escapeHtml(user.role)}">${escapeHtml(user.role)}</span>
                        `}
                    </td>
                    <td>
                        ${canManageStatuses ? `
                            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                                <span class="badge badge-${escapeHtml(user.status)}">${escapeHtml(user.status)}</span>
                                <select class="user-status-select" data-user-id="${escapeHtml(user.id)}" style="min-width:130px;">
                                    <option value="active" ${user.account_status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="suspended" ${user.account_status === 'suspended' ? 'selected' : ''}>Suspended</option>
                                </select>
                                <button class="btn btn-secondary user-status-save-btn" data-user-id="${escapeHtml(user.id)}" style="padding:6px 10px; font-size:12px;">Save</button>
                            </div>
                        ` : `
                            <span class="badge badge-${escapeHtml(user.status)}">${escapeHtml(user.status)}</span>
                        `}
                    </td>
                    <td>${escapeHtml(formatDate(user.created_at))}</td>
                    <td>${escapeHtml(formatDate(user.last_active))}</td>
                    <td>
                        <a class="btn btn-secondary" href="/app/" style="padding:6px 10px; font-size:12px;">Open Dashboard</a>
                    </td>
                </tr>
            `).join('');
        }

        document.getElementById('userStart').textContent = state.filteredUsers.length ? (startIndex + 1) : 0;
        document.getElementById('userEnd').textContent = Math.min(startIndex + pageUsers.length, state.filteredUsers.length);
        document.getElementById('userTotal').textContent = state.filteredUsers.length;
        document.getElementById('userCurrentPage').textContent = String(state.currentPage);
        document.getElementById('userPrevPage').disabled = state.currentPage === 1;
        document.getElementById('userNextPage').disabled = (startIndex + state.pageSize) >= state.filteredUsers.length;
    }

    async function updateUserRole(userId, role) {
        const response = await authFetch(`/api/auth/user/${encodeURIComponent(userId)}/claims`, {
            method: 'POST',
            body: JSON.stringify({ claims: { role } })
        });
        if (!response.ok) {
            let message = 'Failed to update user role';
            try {
                const payload = await response.json();
                if (payload?.error) message = payload.error;
            } catch (_) {
                // ignore parse failures
            }
            throw new Error(message);
        }

        const user = state.allUsers.find((item) => item.id === userId);
        if (user) user.role = role;
        const filteredUser = state.filteredUsers.find((item) => item.id === userId);
        if (filteredUser) filteredUser.role = role;
        renderUsers();
    }

    async function updateUserStatus(userId, status) {
        const response = await authFetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
            method: 'POST',
            body: JSON.stringify({ status })
        });
        if (!response.ok) {
            let message = 'Failed to update user status';
            try {
                const payload = await response.json();
                if (payload?.error) message = payload.error;
            } catch (_) {
                // ignore parse failures
            }
            throw new Error(message);
        }

        const user = state.allUsers.find((item) => item.id === userId);
        if (user) user.account_status = status;
        const filteredUser = state.filteredUsers.find((item) => item.id === userId);
        if (filteredUser) filteredUser.account_status = status;
        await loadUsers();
    }

    function renderTrees() {
        const tbody = document.getElementById('treesTableBody');
        if (!tbody) return;

        const startIndex = (state.treePage - 1) * state.treePageSize;
        const pageTrees = state.filteredTrees.slice(startIndex, startIndex + state.treePageSize);

        if (!pageTrees.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No family trees found.</td></tr>';
        } else {
            tbody.innerHTML = pageTrees.map((tree) => `
                <tr>
                    <td class="checkbox-col"><input type="checkbox" class="tree-select" value="${escapeHtml(tree.id)}"></td>
                    <td>${escapeHtml(tree.name || 'Untitled tree')}</td>
                    <td>${escapeHtml(tree.owner_display_name || tree.owner_email || 'Unknown')}</td>
                    <td>${escapeHtml(String(tree.member_count || 0))}</td>
                    <td><span class="badge badge-${escapeHtml(tree.status)}">${escapeHtml(tree.status)}</span></td>
                    <td>${escapeHtml(formatDate(tree.created_at))}</td>
                    <td>${escapeHtml(formatDate(tree.updated_at))}</td>
                    <td>
                        <button class="btn btn-secondary tree-archive-btn" data-tree-id="${escapeHtml(tree.id)}" data-tree-archived="${tree.status === 'archived' ? '1' : '0'}" style="padding:6px 10px; font-size:12px;">
                            ${tree.status === 'archived' ? 'Unarchive' : 'Archive'}
                        </button>
                        <button class="btn btn-danger tree-delete-btn" data-tree-id="${escapeHtml(tree.id)}" style="padding:6px 10px; font-size:12px; margin-left:6px;">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        document.getElementById('treeStart').textContent = state.filteredTrees.length ? (startIndex + 1) : 0;
        document.getElementById('treeEnd').textContent = Math.min(startIndex + pageTrees.length, state.filteredTrees.length);
        document.getElementById('treeTotal').textContent = state.filteredTrees.length;
        document.getElementById('treeCurrentPage').textContent = state.treePage;
        document.getElementById('treePrevPage').disabled = state.treePage <= 1;
        document.getElementById('treeNextPage').disabled = (startIndex + state.treePageSize) >= state.filteredTrees.length;
    }

    function applyTreeFilters() {
        const search = (document.getElementById('treeSearch')?.value || '').trim().toLowerCase();
        const status = (document.getElementById('treeStatusFilter')?.value || '').trim().toLowerCase();
        const sort = (document.getElementById('treeSortFilter')?.value || 'createdAt-desc').trim();
        const dateFilter = (document.getElementById('treeDateFilter')?.value || '').trim();

        state.filteredTrees = state.allTrees.filter((tree) => {
            const haystack = [tree.name, tree.owner_display_name, tree.owner_email].filter(Boolean).join(' ').toLowerCase();
            if (search && !haystack.includes(search)) return false;
            if (status && tree.status !== status) return false;
            if (dateFilter) {
                const created = new Date(tree.created_at);
                const cutoff = new Date(`${dateFilter}T00:00:00`);
                if (created < cutoff) return false;
            }
            return true;
        });

        const [sortKey, sortDirection] = sort.split('-');
        state.filteredTrees.sort((a, b) => {
            let left;
            let right;
            if (sortKey === 'name') {
                left = String(a.name || '').toLowerCase();
                right = String(b.name || '').toLowerCase();
            } else if (sortKey === 'memberCount') {
                left = Number(a.member_count || 0);
                right = Number(b.member_count || 0);
            } else {
                left = new Date(a.created_at).getTime();
                right = new Date(b.created_at).getTime();
            }

            if (left < right) return sortDirection === 'asc' ? -1 : 1;
            if (left > right) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        state.treePage = 1;
        renderTrees();
    }

    async function loadTrees() {
        const response = await authFetch('/api/admin/trees');
        if (!response.ok) {
            throw new Error('Failed to load family trees');
        }
        const data = await response.json();
        state.allTrees = data.trees || [];
        state.filteredTrees = [...state.allTrees];
        applyTreeFilters();
    }

    async function updateSelectedTreesArchive(archived) {
        const ids = Array.from(document.querySelectorAll('.tree-select:checked')).map((input) => input.value);
        if (!ids.length) return;
        const response = await authFetch('/api/admin/trees/archive', {
            method: 'POST',
            body: JSON.stringify({ ids, archived })
        });
        if (!response.ok) {
            throw new Error('Failed to update selected trees');
        }
        await loadTrees();
    }

    async function deleteTree(treeId) {
        const existingIndex = state.allTrees.findIndex((tree) => tree.id === treeId);
        const existingTree = existingIndex >= 0 ? { ...state.allTrees[existingIndex] } : null;

        if (!window.confirm('Delete this family tree? This cannot be undone.')) {
            return;
        }

        if (existingIndex >= 0) {
            state.allTrees.splice(existingIndex, 1);
            state.filteredTrees = state.filteredTrees.filter((tree) => tree.id !== treeId);
            renderTrees();
        }

        const response = await authFetch(`/api/admin/trees/${encodeURIComponent(treeId)}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            if (existingTree) {
                state.allTrees.splice(existingIndex >= 0 ? existingIndex : state.allTrees.length, 0, existingTree);
                applyTreeFilters();
            }
            throw new Error('Failed to delete tree');
        }
    }

    function exportTrees() {
        const headers = ['Tree Name', 'Owner', 'Members', 'Status', 'Created', 'Updated'];
        const rows = state.filteredTrees.map((tree) => [
            tree.name || '',
            tree.owner_display_name || tree.owner_email || '',
            tree.member_count || 0,
            tree.status || '',
            tree.created_at || '',
            tree.updated_at || ''
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pyebwa-admin-family-trees.csv';
        link.click();
        URL.revokeObjectURL(url);
    }

    function renderAuditLogs() {
        const tbody = document.getElementById('auditLogsTableBody');
        if (!tbody) return;

        if (!state.auditLogs.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No audit logs found.</td></tr>';
        } else {
            tbody.innerHTML = state.auditLogs.map((log) => {
                const actor = log.user_display_name || log.user_email || 'System';
                const target = log.details?.targetUid || log.details?.targetId || log.user_email || 'N/A';
                const details = typeof log.details === 'string'
                    ? log.details
                    : JSON.stringify(log.details || {});
                return `
                    <tr>
                        <td>${escapeHtml(formatDate(log.created_at))}</td>
                        <td>${escapeHtml(actor)}</td>
                        <td><span class="badge badge-admin">${escapeHtml(log.action || 'unknown')}</span></td>
                        <td>${escapeHtml(String(target))}</td>
                        <td>${escapeHtml(details)}</td>
                        <td>${escapeHtml(log.ip_address || '')}</td>
                    </tr>
                `;
            }).join('');
        }

        const startIndex = state.auditTotal ? ((state.auditPage - 1) * state.auditPageSize) + 1 : 0;
        const endIndex = Math.min(state.auditPage * state.auditPageSize, state.auditTotal);
        document.getElementById('auditStart').textContent = startIndex;
        document.getElementById('auditEnd').textContent = endIndex;
        document.getElementById('auditTotal').textContent = state.auditTotal;
        document.getElementById('auditCurrentPage').textContent = state.auditPage;
        document.getElementById('auditPrevPage').disabled = state.auditPage <= 1;
        document.getElementById('auditNextPage').disabled = endIndex >= state.auditTotal;
    }

    function renderAuditReport() {
        const report = state.auditReport;
        const summaryEl = document.getElementById('auditExecutiveSummary');
        const topRisksEl = document.getElementById('auditTopRisks');
        const findingsEl = document.getElementById('auditFindingsList');

        if (!summaryEl || !topRisksEl || !findingsEl) return;

        if (!report) {
            summaryEl.innerHTML = '<p>Audit report not loaded.</p>';
            topRisksEl.innerHTML = '';
            findingsEl.innerHTML = '<div class="empty-state"><span class="material-icons">description</span><h3>No audit report loaded</h3><p>Refresh the report to load findings.</p></div>';
            return;
        }

        const criticalCount = report.findings.filter((finding) => String(finding.severity || '').toLowerCase() === 'critical').length;
        const resolvedCount = state.auditTickets.filter((ticket) => ['resolved', 'closed'].includes(String(ticket.status || '').toLowerCase())).length;
        const openCount = state.auditTickets.filter((ticket) => !['resolved', 'closed'].includes(String(ticket.status || '').toLowerCase())).length;

        document.getElementById('auditTicketOpenCount').textContent = String(openCount);
        document.getElementById('auditCriticalCount').textContent = String(criticalCount);
        document.getElementById('auditResolvedCount').textContent = String(resolvedCount);
        document.getElementById('auditReportGeneratedAt').textContent = `Generated ${formatDate(report.generatedAt)}`;
        document.getElementById('auditReportUpdatedAt').textContent = `Updated ${formatDate(report.updatedAt)}`;
        document.getElementById('auditFindingCount').textContent = `${report.findings.length} findings`;

        summaryEl.innerHTML = `<ul>${(report.executiveSummary || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
        topRisksEl.innerHTML = (report.topRisks || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');

        findingsEl.innerHTML = (report.findings || []).map((finding) => {
            const actions = Array.isArray(finding.actions) ? finding.actions : [];
            return `
                <article class="audit-finding-card">
                    <div class="audit-finding-header">
                        <div>
                            <span class="badge ${severityClass(finding.severity)}">${escapeHtml(String(finding.severity || 'medium'))}</span>
                            <h4>${escapeHtml(finding.title || 'Untitled finding')}</h4>
                        </div>
                        <div class="audit-finding-meta">${escapeHtml(finding.filePath || '')}</div>
                    </div>
                    <p><strong>Issue:</strong> ${escapeHtml(finding.issue || '')}</p>
                    <p><strong>Why it matters:</strong> ${escapeHtml(finding.whyItMatters || '')}</p>
                    <div>
                        <strong>Evidence</strong>
                        <ul class="audit-evidence-list">
                            ${(finding.evidence || []).map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
                        </ul>
                    </div>
                    <p><strong>Recommended fix:</strong> ${escapeHtml(finding.recommendedFix || '')}</p>
                    <div>
                        <strong>Actions</strong>
                        <ul class="audit-action-list">
                            ${actions.map((action) => `
                                <li>
                                    <div class="audit-action-row">
                                        <div>
                                            <div>${escapeHtml(action.title || 'Untitled action')}</div>
                                            <div class="audit-action-meta">Priority ${escapeHtml(action.priority || 'P2')} • Owner ${escapeHtml(action.recommendedOwner || 'unassigned')}</div>
                                            <div class="audit-ticket-links">
                                                ${(action.linkedTickets || []).length
                                                    ? action.linkedTickets.map((ticket) => `<span class="audit-ticket-pill">${escapeHtml(ticket.id)} • ${escapeHtml(ticket.status)}</span>`).join('')
                                                    : '<span class="audit-ticket-pill">No ticket yet</span>'}
                                            </div>
                                        </div>
                                        <button class="btn btn-secondary audit-create-ticket-btn" data-finding-id="${escapeHtml(finding.id)}" data-action-id="${escapeHtml(action.id)}">
                                            <span class="material-icons">add_task</span>
                                            <span>Create Ticket</span>
                                        </button>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </article>
            `;
        }).join('');
    }

    function renderAuditTickets() {
        const tbody = document.getElementById('auditTicketsTableBody');
        if (!tbody) return;

        if (!state.auditTickets.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No tickets created yet.</td></tr>';
            return;
        }

        tbody.innerHTML = state.auditTickets.map((ticket) => `
            <tr data-ticket-id="${escapeHtml(ticket.id)}">
                <td class="audit-ticket-cell">
                    <strong>${escapeHtml(ticket.id)}</strong>
                    <small>${escapeHtml(ticket.severity || 'medium')}</small>
                </td>
                <td class="audit-ticket-cell">
                    <div><strong>${escapeHtml(ticket.title || '')}</strong></div>
                    <small>${escapeHtml(ticket.summary || '')}</small>
                    <textarea class="audit-inline-textarea audit-ticket-notes" placeholder="Notes">${escapeHtml(ticket.notes || '')}</textarea>
                </td>
                <td class="audit-ticket-cell">
                    <select class="audit-inline-select audit-ticket-status">
                        ${['open', 'in_progress', 'blocked', 'resolved', 'closed'].map((status) => `
                            <option value="${status}" ${ticket.status === status ? 'selected' : ''}>${status}</option>
                        `).join('')}
                    </select>
                </td>
                <td class="audit-ticket-cell">${escapeHtml(ticket.priority || 'P2')}</td>
                <td class="audit-ticket-cell">
                    <input class="audit-inline-input audit-ticket-owner" type="text" value="${escapeHtml(ticket.owner || '')}" placeholder="owner">
                </td>
                <td class="audit-ticket-cell">${escapeHtml(formatRelativeTime(ticket.updatedAt))}</td>
                <td class="audit-ticket-cell">
                    <button class="btn btn-secondary audit-save-ticket-btn" data-ticket-id="${escapeHtml(ticket.id)}">
                        <span class="material-icons">save</span>
                        <span>Save</span>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async function loadAuditReport() {
        const response = await authFetch('/api/admin/audit/report');
        if (!response.ok) {
            throw new Error('Failed to load audit report');
        }

        const data = await response.json();
        state.auditReport = data.report || null;
        state.auditTickets = data.tickets?.tickets || [];
        state.auditAssets = data.assets || {};
        renderAuditReport();
        renderAuditTickets();
    }

    async function createAuditTicketFromAction(findingId, actionId) {
        const response = await authFetch('/api/admin/audit/tickets', {
            method: 'POST',
            body: JSON.stringify({ findingId, actionId })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create ticket');
        }
        await loadAuditReport();
    }

    async function createManualAuditTicket() {
        const title = (document.getElementById('auditManualTicketTitle')?.value || '').trim();
        const owner = (document.getElementById('auditManualTicketOwner')?.value || '').trim();
        const severity = (document.getElementById('auditManualTicketSeverity')?.value || 'medium').trim();
        const priority = (document.getElementById('auditManualTicketPriority')?.value || 'P2').trim();
        const summary = (document.getElementById('auditManualTicketSummary')?.value || '').trim();

        if (!title) {
            throw new Error('Ticket title is required');
        }

        const response = await authFetch('/api/admin/audit/tickets', {
            method: 'POST',
            body: JSON.stringify({
                title,
                owner,
                severity,
                priority,
                summary,
                notes: summary
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create ticket');
        }

        document.getElementById('auditManualTicketTitle').value = '';
        document.getElementById('auditManualTicketOwner').value = '';
        document.getElementById('auditManualTicketSummary').value = '';
        document.getElementById('auditManualTicketSeverity').value = 'medium';
        document.getElementById('auditManualTicketPriority').value = 'P2';
        await loadAuditReport();
    }

    async function saveAuditTicket(ticketId) {
        const row = document.querySelector(`tr[data-ticket-id="${CSS.escape(ticketId)}"]`);
        if (!row) {
            throw new Error('Ticket row not found');
        }

        const status = row.querySelector('.audit-ticket-status')?.value || 'open';
        const owner = row.querySelector('.audit-ticket-owner')?.value || '';
        const notes = row.querySelector('.audit-ticket-notes')?.value || '';

        const response = await authFetch(`/api/admin/audit/tickets/${encodeURIComponent(ticketId)}`, {
            method: 'PATCH',
            body: JSON.stringify({ status, owner, notes })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update ticket');
        }
        await loadAuditReport();
    }

    async function downloadAuditAsset(format) {
        const url = state.auditAssets?.[format];
        if (!url) {
            throw new Error(`No ${format} asset available`);
        }
        const response = await authFetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download ${format} audit asset`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = format === 'pdf'
            ? 'pyebwa-audit-report.pdf'
            : format === 'html'
                ? 'pyebwa-audit-report.html'
                : 'pyebwa-audit-report.md';
        link.click();
        URL.revokeObjectURL(objectUrl);
    }

    async function loadAuditLogs() {
        const params = new URLSearchParams({
            page: String(state.auditPage),
            limit: String(state.auditPageSize)
        });

        const search = (document.getElementById('auditSearch')?.value || '').trim();
        const action = (document.getElementById('auditActionFilter')?.value || '').trim();
        const dateFrom = (document.getElementById('auditDateFrom')?.value || '').trim();
        const dateTo = (document.getElementById('auditDateTo')?.value || '').trim();

        if (search) params.set('search', search);
        if (action) params.set('action', action);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);

        const response = await authFetch(`/api/admin/audit?${params.toString()}`);
        if (!response.ok) {
            throw new Error('Failed to load audit logs');
        }

        const data = await response.json();
        state.auditLogs = data.logs || [];
        state.auditTotal = data.total || 0;
        renderAuditLogs();
    }

    function exportAuditLogs() {
        const headers = ['Timestamp', 'Admin', 'Action', 'Target', 'Details', 'IP'];
        const rows = state.auditLogs.map((log) => [
            log.created_at || '',
            log.user_display_name || log.user_email || 'System',
            log.action || '',
            log.details?.targetUid || log.details?.targetId || log.user_email || '',
            typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {}),
            log.ip_address || ''
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pyebwa-admin-audit-logs.csv';
        link.click();
        URL.revokeObjectURL(url);
    }

    async function loadUsers() {
        const response = await authFetch('/api/admin/users?limit=500');
        if (!response.ok) {
            throw new Error('Failed to load users');
        }
        const data = await response.json();
        state.allUsers = data.users || [];
        state.filteredUsers = [...state.allUsers];
        renderUsers();
    }

    async function loadSystemInfo() {
        const container = document.querySelector('#systemView #content');
        if (!container) return;
        try {
            const [statusRes, infoRes] = await Promise.all([
                authFetch('/api/system/status'),
                authFetch('/api/system/info')
            ]);
            const status = statusRes.ok ? await statusRes.json() : null;
            const info = infoRes.ok ? await infoRes.json() : null;

            const formatBytes = (value) => {
                const bytes = Number(value || 0);
                if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
                const units = ['B', 'KB', 'MB', 'GB', 'TB'];
                let size = bytes;
                let unitIndex = 0;
                while (size >= 1024 && unitIndex < units.length - 1) {
                    size /= 1024;
                    unitIndex += 1;
                }
                return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
            };

            const formatUptime = (secondsValue) => {
                const seconds = Math.max(0, Math.round(Number(secondsValue || 0)));
                const days = Math.floor(seconds / 86400);
                const hours = Math.floor((seconds % 86400) / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                if (days > 0) return `${days}d ${hours}h`;
                if (hours > 0) return `${hours}h ${minutes}m`;
                return `${minutes}m`;
            };

            const serviceRows = (status?.services || []).map((service) => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <span class="material-icons">${service.status === 'operational' ? 'check_circle' : (service.status === 'not_configured' ? 'info' : 'error')}</span>
                    </div>
                    <div class="activity-content">
                        <p>${escapeHtml(service.name)}</p>
                        <small>${escapeHtml(service.details || '')}</small>
                    </div>
                </div>
            `).join('');

            container.innerHTML = `
                <div class="view-header">
                    <div>
                        <h1>System</h1>
                        <p class="view-subtitle">Operational status, services, and environment details.</p>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon active"><span class="material-icons">dns</span></div>
                        <div class="stat-content">
                            <h3 class="stat-value">${escapeHtml(status?.server?.status || 'Unknown')}</h3>
                            <p class="stat-label">Server Status</p>
                            <span class="stat-change">${escapeHtml(formatUptime(status?.server?.uptime))} uptime</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon trees"><span class="material-icons">storage</span></div>
                        <div class="stat-content">
                            <h3 class="stat-value">${escapeHtml(status?.database?.status || 'Unknown')}</h3>
                            <p class="stat-label">Database</p>
                            <span class="stat-change">${escapeHtml(String(status?.database?.tables || 0))} tables available</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon storage"><span class="material-icons">memory</span></div>
                        <div class="stat-content">
                            <h3 class="stat-value">${escapeHtml(`${Math.round(status?.memory?.usage || 0)}%`)}</h3>
                            <p class="stat-label">Memory Usage</p>
                            <span class="stat-change">${escapeHtml(formatBytes(status?.memory?.used))} used</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon users"><span class="material-icons">speed</span></div>
                        <div class="stat-content">
                            <h3 class="stat-value">${escapeHtml(`${status?.api?.avgResponseTime || 0} ms`)}</h3>
                            <p class="stat-label">API Response</p>
                            <span class="stat-change">${escapeHtml(status?.api?.status || 'Unknown')}</span>
                        </div>
                    </div>
                </div>

                <div class="charts-row">
                    <div class="chart-container">
                        <div class="chart-header"><h3>Services</h3></div>
                        <div class="activity-list">${serviceRows || '<p>No service data available.</p>'}</div>
                    </div>
                    <div class="chart-container">
                        <div class="chart-header"><h3>Runtime</h3></div>
                        <div class="page-content-fields">
                            <div class="form-group page-content-field">
                                <label>Node Version</label>
                                <input type="text" value="${escapeHtml(info?.node?.version || '')}" readonly>
                            </div>
                            <div class="form-group page-content-field">
                                <label>Platform</label>
                                <input type="text" value="${escapeHtml(`${info?.node?.platform || ''} (${info?.node?.arch || ''})`)}" readonly>
                            </div>
                            <div class="form-group page-content-field">
                                <label>Total Memory</label>
                                <input type="text" value="${escapeHtml(formatBytes(info?.os?.totalMemory))}" readonly>
                            </div>
                            <div class="form-group page-content-field">
                                <label>Free Memory</label>
                                <input type="text" value="${escapeHtml(formatBytes(info?.os?.freeMemory))}" readonly>
                            </div>
                            <div class="form-group page-content-field">
                                <label>CPU Cores</label>
                                <input type="text" value="${escapeHtml(String(info?.os?.cpus || 0))}" readonly>
                            </div>
                            <div class="form-group page-content-field">
                                <label>Maintenance Mode</label>
                                <input type="text" value="${status?.maintenanceMode ? 'Enabled' : 'Disabled'}" readonly>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            container.innerHTML = `<div class="chart-container"><p>${escapeHtml(error.message)}</p></div>`;
        }
    }

    function exportUsers() {
        const headers = ['Name', 'Email', 'Role', 'Status', 'Created', 'Last Active'];
        const rows = state.filteredUsers.map((user) => [
            user.display_name || '',
            user.email || '',
            user.role || '',
            user.status || '',
            user.created_at || '',
            user.last_active || ''
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pyebwa-admin-users.csv';
        link.click();
        URL.revokeObjectURL(url);
    }

    async function loadAdminData() {
        try {
            const response = await authFetch('/api/admin/summary');
            if (response.status === 429) {
                renderSummary({
                    currentUserRole: state.adminRole || 'admin',
                    totalUsers: 0,
                    activeUsers30d: 0,
                    totalTrees: 0,
                    totalMembers: 0,
                    recentUsers: [],
                    recentTrees: []
                });
                return;
            }
            if (!response.ok) {
                throw new Error('Failed to load admin summary');
            }
            const summary = await response.json();
            renderSummary(summary);
            await loadUsers();
            if (canAccessView('trees')) {
                await loadTrees();
            }
            if (canAccessView('audit')) {
                await loadAuditReport();
                await loadAuditLogs();
            }
            if (canAccessView('backup')) {
                await loadBackupData();
            }
            if (canAccessView('settings')) {
                await loadSettings();
            }
            if (canAccessView('system')) {
                await loadSystemInfo();
            }
        } catch (error) {
            console.error('Admin data load failed:', error);
            showError(error.message);
        }
    }

    function init() {
        initializeTheme();
        wireNavigation();
        wireHeaderControls();
        wireSlideshowManager();
        wirePageContentManager();
        showView(getViewFromHash(), { syncHash: false });

        window.addEventListener('adminAuthSuccess', (event) => {
            updateAdminHeader(event.detail);
            showAdminApp();
            loadAdminData();
        }, { once: true });

        const existing = sessionStorage.getItem('adminUser');
        if (existing) {
            updateAdminHeader({});
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
