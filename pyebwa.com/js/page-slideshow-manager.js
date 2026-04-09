(function() {
    'use strict';

    const PAGE_KEY = (function() {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.endsWith('/about.html') || path === '/about.html') return 'about';
        if (path.endsWith('/mission.html') || path === '/mission.html') return 'mission';
        if (path.endsWith('/contact.html') || path === '/contact.html') return 'contact';
        return 'home';
    })();

    let visibilityHandlerBound = false;
    const intervalRegistry = new Set();

    function shuffleSlides(slides) {
        const items = [...slides];
        for (let index = items.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
        }
        return items;
    }

    function getAssetUrl(path) {
        if (typeof window.__PYEBWA_assetUrl === 'function') {
            return window.__PYEBWA_assetUrl(path);
        }
        return path;
    }

    async function loadPublishedSlides() {
        const response = await fetch(getAssetUrl('data/slideshows.published.json'), {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });
        if (!response.ok) {
            throw new Error('Unable to load slideshow data');
        }
        return response.json();
    }

    function ensureSharedStyles() {
        if (document.getElementById('page-slideshow-manager-styles')) return;
        const style = document.createElement('style');
        style.id = 'page-slideshow-manager-styles';
        style.textContent = `
            .managed-hero-slideshow,
            .managed-hero-slideshow .managed-hero-slide {
                position: absolute;
                inset: 0;
            }
            .managed-hero-slideshow {
                overflow: hidden;
                z-index: 0;
            }
            .managed-hero-slide {
                opacity: 0;
                transition: opacity 1.2s ease;
                background-repeat: no-repeat;
                background-position: center center;
                background-size: cover;
            }
            .managed-hero-slide.active {
                opacity: 1;
            }
            .managed-hero-overlay {
                position: absolute;
                inset: 0;
                z-index: 1;
                pointer-events: none;
            }
            .managed-slide-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
                position: absolute;
                inset: 0;
            }
        `;
        document.head.appendChild(style);
    }

    function getFitMode(slide = {}) {
        const value = String(slide.fit || '').trim().toLowerCase();
        return new Set(['cover', 'contain', 'fill', 'scale-down', 'none']).has(value) ? value : 'cover';
    }

    function applyCropToImage(img, crop = {}) {
        const x = Number.isFinite(Number(crop.x)) ? Number(crop.x) : 50;
        const y = Number.isFinite(Number(crop.y)) ? Number(crop.y) : 50;
        const zoom = Number.isFinite(Number(crop.zoom)) ? Number(crop.zoom) : 100;
        img.style.objectPosition = `${x}% ${y}%`;
        img.style.transform = `scale(${zoom / 100})`;
        img.style.transformOrigin = `${x}% ${y}%`;
    }

    function applyFiltersToImage(img, slide = {}) {
        const brightness = Number.isFinite(Number(slide.filters?.brightness)) ? Number(slide.filters.brightness) : 100;
        const contrast = Number.isFinite(Number(slide.filters?.contrast)) ? Number(slide.filters.contrast) : 100;
        const saturate = Number.isFinite(Number(slide.filters?.saturate)) ? Number(slide.filters.saturate) : 100;

        img.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;
    }

    function getOverlayConfig(overlay = {}) {
        const color = /^#[0-9a-fA-F]{6}$/.test(String(overlay.color || '').trim())
            ? String(overlay.color).trim()
            : '#000000';
        const opacity = Number.isFinite(Number(overlay.opacity)) ? Math.min(100, Math.max(0, Number(overlay.opacity))) : 0;
        return { color, opacity };
    }

    function applyPageOverlay(page, overlay) {
        const opacity = overlay.opacity / 100;

        if (page === 'home') {
            const element = document.querySelector('.slideshow-overlay');
            if (!element) return;
            element.style.background = overlay.color;
            element.style.opacity = String(opacity);
            return;
        }

        if (page === 'mission') {
            const element = document.querySelector('.hero-overlay');
            if (!element) return;
            element.style.background = overlay.color;
            element.style.opacity = String(opacity);
            return;
        }

        const heroSelector = page === 'about' ? '.about-hero' : '.contact-hero';
        const hero = document.querySelector(heroSelector);
        if (!hero) return;

        let overlayElement = hero.querySelector('.managed-hero-overlay');
        if (!overlayElement) {
            overlayElement = document.createElement('div');
            overlayElement.className = 'managed-hero-overlay';
            hero.prepend(overlayElement);
        }
        overlayElement.style.background = overlay.color;
        overlayElement.style.opacity = String(opacity);
    }

    function startRotation(selector, activeClass = 'active', intervalMs = 5000, onRender = null) {
        const slides = Array.from(document.querySelectorAll(selector));
        if (slides.length <= 1) return;

        let currentIndex = slides.findIndex((slide) => slide.classList.contains(activeClass));
        if (currentIndex < 0) currentIndex = 0;

        const render = (index) => {
            slides.forEach((slide, slideIndex) => {
                slide.classList.toggle(activeClass, slideIndex === index);
            });
            if (typeof onRender === 'function') {
                onRender(index);
            }
        };

        render(currentIndex);

        const intervalId = window.setInterval(() => {
            currentIndex = (currentIndex + 1) % slides.length;
            render(currentIndex);
        }, intervalMs);

        intervalRegistry.add(intervalId);

        if (!visibilityHandlerBound) {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    intervalRegistry.forEach((id) => clearInterval(id));
                    intervalRegistry.clear();
                }
            }, { once: true });
            visibilityHandlerBound = true;
        }
    }

    function renderHome(slides, payload) {
        const container = document.querySelector('.slideshow-container');
        if (!container || slides.length === 0) return;

        container.innerHTML = slides.map((slide, index) => `
            <div class="slide${index === 0 ? ' active' : ''}">
                <img src="${slide.url}" alt="${(slide.alt || slide.title || `Slide ${index + 1}`).replace(/"/g, '&quot;')}" class="managed-slide-image">
            </div>
        `).join('');

        container.querySelectorAll('.managed-slide-image').forEach((img, index) => {
            img.style.objectFit = getFitMode(slides[index]);
            applyCropToImage(img, slides[index].crop);
            applyFiltersToImage(img, slides[index]);
        });
        const applyOverlayForIndex = (index) => {
            const slide = slides[index] || slides[0];
            const useSlideOverlay = slide?.overlayExplicit === true && slide?.overlayOverride === true;
            applyPageOverlay('home', getOverlayConfig(useSlideOverlay ? slide?.overlay : (payload?.overlays?.home || slide?.overlay || {})));
        };
        applyOverlayForIndex(0);
        startRotation('.slideshow-container .slide', 'active', 5000, applyOverlayForIndex);
    }

    function renderMission(slides, payload) {
        const container = document.querySelector('.cause-hero .slideshow-container');
        if (!container || slides.length === 0) return;

        container.innerHTML = slides.map((slide, index) => `
            <div class="forest-slide${index === 0 ? ' active' : ''}">
                <img src="${slide.url}" alt="${(slide.alt || slide.title || `Slide ${index + 1}`).replace(/"/g, '&quot;')}" class="managed-slide-image">
            </div>
        `).join('');

        container.querySelectorAll('.managed-slide-image').forEach((img, index) => {
            img.style.objectFit = getFitMode(slides[index]);
            applyCropToImage(img, slides[index].crop);
            applyFiltersToImage(img, slides[index]);
        });
        const applyOverlayForIndex = (index) => {
            const slide = slides[index] || slides[0];
            const useSlideOverlay = slide?.overlayExplicit === true && slide?.overlayOverride === true;
            applyPageOverlay('mission', getOverlayConfig(useSlideOverlay ? slide?.overlay : (payload?.overlays?.mission || slide?.overlay || {})));
        };
        applyOverlayForIndex(0);
        startRotation('.cause-hero .forest-slide', 'active', 5000, applyOverlayForIndex);
    }

    function renderSimpleHero(page, slides, payload) {
        const heroSelector = page === 'about' ? '.about-hero' : '.contact-hero';
        const hero = document.querySelector(heroSelector);
        if (!hero || slides.length === 0) return;

        ensureSharedStyles();
        hero.style.background = '#000';

        let slideshow = hero.querySelector('.managed-hero-slideshow');
        if (!slideshow) {
            slideshow = document.createElement('div');
            slideshow.className = 'managed-hero-slideshow';
            hero.prepend(slideshow);
        }

        slideshow.innerHTML = slides.map((slide, index) => `
            <div class="managed-hero-slide${index === 0 ? ' active' : ''}">
                <img src="${slide.url}" alt="${(slide.alt || slide.title || `Slide ${index + 1}`).replace(/"/g, '&quot;')}" class="managed-slide-image">
            </div>
        `).join('');

        slideshow.querySelectorAll('.managed-slide-image').forEach((img, index) => {
            img.style.objectFit = getFitMode(slides[index]);
            applyCropToImage(img, slides[index].crop);
            applyFiltersToImage(img, slides[index]);
        });
        const applyOverlayForIndex = (index) => {
            const slide = slides[index] || slides[0];
            const useSlideOverlay = slide?.overlayExplicit === true && slide?.overlayOverride === true;
            applyPageOverlay(page, getOverlayConfig(useSlideOverlay ? slide?.overlay : (payload?.overlays?.[page] || slide?.overlay || {})));
        };
        applyOverlayForIndex(0);
        startRotation('.managed-hero-slideshow .managed-hero-slide', 'active', 5000, applyOverlayForIndex);
    }

    async function init() {
        try {
            const payload = await loadPublishedSlides();
            const baseSlides = Array.isArray(payload?.pages?.[PAGE_KEY]) ? payload.pages[PAGE_KEY] : [];
            const shouldRandomize = !!payload?.settings?.[PAGE_KEY]?.randomize;
            const slides = shouldRandomize ? shuffleSlides(baseSlides) : baseSlides;
            if (slides.length === 0) return;

            if (PAGE_KEY === 'home') {
                renderHome(slides, payload);
                return;
            }

            if (PAGE_KEY === 'mission') {
                renderMission(slides, payload);
                return;
            }

            renderSimpleHero(PAGE_KEY, slides, payload);
        } catch (error) {
            console.warn('Page slideshow manager fallback:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
