(function() {
    'use strict';

    const VALID_SLIDESHOW_PAGES = ['home', 'about', 'mission', 'contact'];
    const VALID_PAGE_CONTENT_PAGES = ['home', 'about', 'mission', 'contact'];
    const VALID_PAGE_CONTENT_LANGS = ['en', 'fr', 'ht'];
    const PAGE_CONTENT_LANG_LABELS = {
        en: 'English',
        fr: 'French',
        ht: 'Haitian Creole'
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
                    { key: 'story2023Text', label: '2023 Story Text', type: 'textarea', rows: 2 },
                    { key: 'storyEarly2024Text', label: 'Early 2024 Story Text', type: 'textarea', rows: 2 },
                    { key: 'storyMid2024Text', label: 'Mid 2024 Story Text', type: 'textarea', rows: 2 },
                    { key: 'storyTodayText', label: 'Today Story Text', type: 'textarea', rows: 2 },
                    { key: 'meetOurTeam', label: 'Team Section Title' },
                    { key: 'teamDescription', label: 'Team Intro Text', type: 'textarea', rows: 2 },
                    { key: 'founderDescription', label: 'Founder Description', type: 'textarea', rows: 2 },
                    { key: 'leadDeveloperDescription', label: 'Lead Developer Description', type: 'textarea', rows: 2 },
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
        currentView: 'dashboard',
        summary: null,
        theme: 'light',
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

    function getViewFromHash(hash = window.location.hash) {
        const candidate = String(hash || '').replace(/^#/, '').trim();
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

    function getAdminPreviewUrl(url) {
        const value = String(url || '').trim();
        if (!value) return '';
        return `/api/admin/slideshows/preview?url=${encodeURIComponent(value)}`;
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
        const nameEl = document.getElementById('adminName');
        const roleEl = document.getElementById('adminRole');
        const avatarEl = document.getElementById('adminAvatar');
        if (nameEl) nameEl.textContent = displayName;
        if (roleEl) roleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        if (avatarEl) {
            const fallbackAvatar = '/app/images/default-avatar.png?v=1.0.98';
            const avatarUrl = detail?.userData?.photoURL || detail?.user?.user_metadata?.avatar_url || sessionData.photoURL || fallbackAvatar;
            avatarEl.src = avatarUrl || fallbackAvatar;
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
                    <img src="${escapeHtml(getAdminPreviewUrl(slide.url))}" alt="Slide ${index + 1}">
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
        if (!previewImage || !slide) return;
        const crop = slide.crop || { x: 50, y: 50, zoom: 100 };
        const filters = slide.filters || { brightness: 100, contrast: 100, saturate: 100 };
        const fitMode = 'cover';
        const effectiveZoom = Math.max(100, crop.zoom ?? 100);
        const scale = effectiveZoom / 100;
        let translateX = 0;
        let translateY = 0;

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

            const scaledWidth = baseWidth * scale;
            const scaledHeight = baseHeight * scale;
            const overflowX = Math.max(0, scaledWidth - surfaceWidth);
            const overflowY = Math.max(0, scaledHeight - surfaceHeight);
            translateX = ((50 - crop.x) / 50) * (overflowX / 2);
            translateY = ((50 - crop.y) / 50) * (overflowY / 2);
        }

        previewImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
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
        const overrideInput = document.getElementById('slideshowOverlayOverride');
        const slide = findSelectedSlide();
        const overlay = getOverlayForSelectedSlide();
        const isOverride = !!(slide?.overlayExplicit === true && slide?.overlayOverride);
        if (overrideInput) overrideInput.checked = isOverride;
        if (colorInput) colorInput.value = overlay.color;
        if (opacityInput) opacityInput.value = overlay.opacity;
        if (colorInput) colorInput.disabled = !isOverride;
        if (opacityInput) opacityInput.disabled = !isOverride;
        syncPreviewOverlay();
    }

    function renderPageSettings() {
        const toggle = document.getElementById('slideshowRandomizeToggle');
        const colorInput = document.getElementById('slideshowGlobalOverlayColor');
        const opacityInput = document.getElementById('slideshowGlobalOverlayOpacity');
        if (toggle) {
            toggle.checked = !!getPageSettings().randomize;
        }
        const overlay = getGlobalOverlayForPage();
        if (colorInput) colorInput.value = overlay.color;
        if (opacityInput) opacityInput.value = overlay.opacity;
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
        }

        const previewImage = document.getElementById('slideshowPreviewImage');
        if (previewImage) {
            previewImage.src = getAdminPreviewUrl(slide.url);
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

        const page = state.replacingSlideId ? (findSelectedSlide()?.page || state.activeSlideshowPage) : state.activeSlideshowPage;
        const uploadResult = await uploadSlideshowImage(file, page);

        if (state.replacingSlideId) {
            const slide = findSelectedSlide();
            if (slide) {
                slide.url = uploadResult.url;
                slide.updatedAt = new Date().toISOString();
            }
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
            state.slideshowDraft.pages[page].push(slide);
            state.selectedSlideId = slide.id;
        }

        markSlideshowDirty();
        renderSlideshowList();
        renderSlideEditor();
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
            } finally {
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
            const field = event.target.closest('[data-page-content-key]');
            if (!field || !state.pageContentDraft) return;
            const key = field.getAttribute('data-page-content-key');
            if (!key) return;

            if (!state.pageContentDraft.pages?.[state.activePageContentPage]?.[state.activePageContentLang]) {
                state.pageContentDraft.pages[state.activePageContentPage][state.activePageContentLang] = {};
            }
            state.pageContentDraft.pages[state.activePageContentPage][state.activePageContentLang][key] = field.value;
            markPageContentDirty();
        });
    }

    function showView(view, options = {}) {
        const { syncHash = true } = options;
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
            showView('system');
            loadSystemInfo();
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
                    <td><span class="badge badge-${escapeHtml(user.role)}">${escapeHtml(user.role)}</span></td>
                    <td>${escapeHtml(user.status)}</td>
                    <td>${escapeHtml(formatDate(user.created_at))}</td>
                    <td>${escapeHtml(formatDate(user.last_active))}</td>
                    <td>
                        <a class="btn btn-secondary" href="/app/" style="padding:6px 10px; font-size:12px;">Open App</a>
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
            container.innerHTML = `
                <div class="chart-container" style="margin-bottom: 24px;">
                    <div class="chart-header"><h3>System Status</h3></div>
                    <pre style="white-space: pre-wrap;">${escapeHtml(JSON.stringify(status, null, 2))}</pre>
                </div>
                <div class="chart-container">
                    <div class="chart-header"><h3>System Info</h3></div>
                    <pre style="white-space: pre-wrap;">${escapeHtml(JSON.stringify(info, null, 2))}</pre>
                </div>
            `;
        } catch (error) {
            container.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
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
            if (!response.ok) {
                throw new Error('Failed to load admin summary');
            }
            const summary = await response.json();
            renderSummary(summary);
            await loadUsers();
            await loadSystemInfo();
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
