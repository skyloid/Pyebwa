(function() {
    'use strict';

    const VALID_SLIDESHOW_PAGES = ['home', 'about', 'mission', 'contact'];

    const state = {
        allUsers: [],
        filteredUsers: [],
        currentPage: 1,
        pageSize: 20,
        currentView: 'dashboard',
        summary: null,
        theme: 'light',
        slideshowDraft: null,
        slideshowPublished: null,
        activeSlideshowPage: 'home',
        selectedSlideId: null,
        slideshowDirty: false,
        replacingSlideId: null,
        slideshowDrag: null
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
            const publishedAt = state.slideshowPublished?.publishedAt ? formatDate(state.slideshowPublished.publishedAt) : 'Never published';
            publishedStatus.textContent = `Published · ${publishedAt}`;
        }
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
            <div class="slideshow-list-item${slide.id === state.selectedSlideId ? ' active' : ''}" data-slide-id="${escapeHtml(slide.id)}">
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
        });
    }

    function syncPreviewCrop(slide) {
        const previewImage = document.getElementById('slideshowPreviewImage');
        const previewSurface = document.getElementById('slideshowPreviewSurface');
        if (!previewImage || !slide) return;
        const crop = slide.crop || { x: 50, y: 50, zoom: 100 };
        const filters = slide.filters || { brightness: 100, contrast: 100, saturate: 100 };
        previewImage.style.objectFit = slide.fit || 'cover';
        previewImage.style.objectPosition = `${crop.x}% ${crop.y}%`;
        previewImage.style.transform = `scale(${crop.zoom / 100})`;
        previewImage.style.transformOrigin = `${crop.x}% ${crop.y}%`;
        previewImage.style.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)`;
        previewImage.style.cursor = crop.zoom > 100 ? 'grab' : 'default';
        if (previewSurface) {
            previewSurface.classList.toggle('is-draggable', crop.zoom > 100);
        }
    }

    function syncCropInputs(slide) {
        document.getElementById('slideshowCropX').value = slide.crop?.x ?? 50;
        document.getElementById('slideshowCropY').value = slide.crop?.y ?? 50;
        document.getElementById('slideshowCropZoom').value = slide.crop?.zoom ?? 100;
    }

    function syncPreviewOverlay() {
        const previewOverlay = document.getElementById('slideshowPreviewOverlay');
        if (!previewOverlay) return;
        const overlay = getOverlayForSelectedSlide();
        previewOverlay.style.background = overlay.color;
        previewOverlay.style.opacity = String(Math.min(100, Math.max(0, overlay.opacity)) / 100);
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
        slide.fit = 'cover';
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

        if (!slide) {
            if (emptyState) emptyState.style.display = 'block';
            if (editor) editor.style.display = 'none';
            renderOverlayControls();
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (editor) editor.style.display = 'block';

        const previewImage = document.getElementById('slideshowPreviewImage');
        if (previewImage) {
            previewImage.src = getAdminPreviewUrl(slide.url);
            previewImage.alt = 'Slideshow image';
            syncPreviewCrop(slide);
        }

        document.getElementById('slideshowPageAssign').value = slide.page || state.activeSlideshowPage;
        document.getElementById('slideshowFitMode').value = slide.fit || 'cover';
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
        } else if (field === 'fit') {
            slide.fit = document.getElementById('slideshowFitMode').value || 'cover';
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
        if ((slide.crop?.zoom ?? 100) <= 100) return;

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
            image.style.cursor = (slide.crop?.zoom ?? 100) > 100 ? 'grab' : 'default';
        }

        const didMove = drag.moved;
        state.slideshowDrag = null;

        if (didMove) {
            markSlideshowDirty();
        }
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
                fit: 'cover',
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
        document.getElementById('slideshowGlobalOverlayOpacity')?.addEventListener('input', () => updateSlideField('globalOverlay'));

        document.getElementById('slideshowPageAssign')?.addEventListener('change', (event) => updateSlideField('page', event.target.value));
        document.getElementById('slideshowFitMode')?.addEventListener('change', () => updateSlideField('fit'));
        document.getElementById('slideshowCropX')?.addEventListener('input', () => updateSlideField('crop'));
        document.getElementById('slideshowCropY')?.addEventListener('input', () => updateSlideField('crop'));
        document.getElementById('slideshowCropZoom')?.addEventListener('input', () => updateSlideField('crop'));
        document.getElementById('slideshowFilterBrightness')?.addEventListener('input', () => updateSlideField('filters'));
        document.getElementById('slideshowFilterContrast')?.addEventListener('input', () => updateSlideField('filters'));
        document.getElementById('slideshowFilterSaturate')?.addEventListener('input', () => updateSlideField('filters'));
        document.getElementById('slideshowOverlayOverride')?.addEventListener('change', () => updateSlideField('overlayOverride'));
        document.getElementById('slideshowOverlayColor')?.addEventListener('input', () => updateSlideField('overlay'));
        document.getElementById('slideshowOverlayOpacity')?.addEventListener('input', () => updateSlideField('overlay'));
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
