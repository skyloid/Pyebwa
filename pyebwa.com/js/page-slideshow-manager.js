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
    const resizeObserverRegistry = new WeakMap();

    function getPageScaleAdjustment() {
        return 1;
    }

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
        const slideshowUrl = new URL(getAssetUrl('data/slideshows.published.json'), window.location.href);
        slideshowUrl.searchParams.set('t', String(Date.now()));
        const response = await fetch(slideshowUrl.toString(), {
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
                background: #0B1410;
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
                position: absolute;
                top: 50%;
                left: 50%;
                display: block;
                max-width: none;
                max-height: none;
                background: #0B1410;
                object-fit: contain !important;
                object-position: center center !important;
            }
        `;
        document.head.appendChild(style);
    }

    function getSlideshowFallbackBackground() {
        return '#0B1410';
    }

    function getFitMode() {
        return 'cover';
    }

    function applyCropToImage(img, crop = {}, fit = 'cover') {
        const x = Number.isFinite(Number(crop.x)) ? Number(crop.x) : 50;
        const y = Number.isFinite(Number(crop.y)) ? Number(crop.y) : 50;
        const zoom = Number.isFinite(Number(crop.zoom)) ? Number(crop.zoom) : 100;
        const effectiveZoom = Math.max(100, zoom);
        const container = img.parentElement;
        let translateX = 0;
        let translateY = 0;
        let finalWidth = container?.clientWidth || 0;
        let finalHeight = container?.clientHeight || 0;

        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        const containerWidth = container?.clientWidth || 0;
        const containerHeight = container?.clientHeight || 0;

        if (naturalWidth > 0 && naturalHeight > 0 && containerWidth > 0 && containerHeight > 0) {
            const imageRatio = naturalWidth / naturalHeight;
            const containerRatio = containerWidth / containerHeight;
            let baseWidth = containerWidth;
            let baseHeight = containerHeight;

            if (imageRatio > containerRatio) {
                baseHeight = containerHeight;
                baseWidth = containerHeight * imageRatio;
            } else {
                baseWidth = containerWidth;
                baseHeight = containerWidth / imageRatio;
            }

            const pageScale = getPageScaleAdjustment();
            finalWidth = baseWidth * (effectiveZoom / 100) * pageScale;
            finalHeight = baseHeight * (effectiveZoom / 100) * pageScale;
            const overflowX = Math.max(0, finalWidth - containerWidth);
            const overflowY = Math.max(0, finalHeight - containerHeight);

            translateX = ((50 - x) / 50) * (overflowX / 2);
            translateY = ((50 - y) / 50) * (overflowY / 2);
        }

        img.style.width = `${finalWidth}px`;
        img.style.height = `${finalHeight}px`;
        img.style.transform = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px)`;
    }

    function bindResponsiveCrop(container, images, slides) {
        if (!container || !Array.isArray(images) || images.length === 0) return;

        const reapply = () => {
            images.forEach((img, index) => applyCropToImage(img, slides[index]?.crop, getFitMode(slides[index])));
        };

        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(reapply);
        });

        window.addEventListener('load', reapply, { once: true });
        window.addEventListener('resize', reapply, { passive: true });

        if (typeof ResizeObserver === 'function' && !resizeObserverRegistry.has(container)) {
            const observer = new ResizeObserver(reapply);
            observer.observe(container);
            resizeObserverRegistry.set(container, observer);
        }
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

        const heroSelector = page === 'about'
            ? '.about-hero'
            : page === 'contact'
                ? '.contact-hero'
                : '.cause-hero';
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

    function getRotationIntervalMs(payload, pageKey) {
        const seconds = Number(payload?.settings?.[pageKey]?.intervalSeconds);
        const normalizedSeconds = Number.isFinite(seconds) ? Math.min(30, Math.max(1, Math.round(seconds))) : 5;
        return normalizedSeconds * 1000;
    }

    function resolveSlidesForPage(payload, pageKey) {
        const baseSlides = Array.isArray(payload?.pages?.[pageKey]) ? payload.pages[pageKey] : [];
        const settings = payload?.settings?.[pageKey] || {};
        const fixedSlideId = String(settings.fixedSlideId || '').trim();

        if (fixedSlideId) {
            const fixedSlide = baseSlides.find((slide) => slide?.id === fixedSlideId);
            if (fixedSlide) {
                return [fixedSlide];
            }
        }

        return !!settings.randomize ? shuffleSlides(baseSlides) : baseSlides;
    }

    function renderHome(slides, payload) {
        const container = document.querySelector('.slideshow-container');
        if (!container || slides.length === 0) return;

        ensureSharedStyles();
        container.innerHTML = slides.map((slide, index) => `
            <div class="slide${index === 0 ? ' active' : ''}">
                <img src="${slide.url}" alt="${(slide.alt || slide.title || `Slide ${index + 1}`).replace(/"/g, '&quot;')}" class="managed-slide-image">
            </div>
        `).join('');

        const images = Array.from(container.querySelectorAll('.managed-slide-image'));
        images.forEach((img, index) => {
            const fitMode = getFitMode(slides[index]);
            const applyCurrentCrop = () => applyCropToImage(img, slides[index].crop, fitMode);
            applyCurrentCrop();
            img.addEventListener('load', applyCurrentCrop, { once: true });
            applyFiltersToImage(img, slides[index]);
        });
        bindResponsiveCrop(container, images, slides);
        const applyOverlayForIndex = (index) => {
            const slide = slides[index] || slides[0];
            const useSlideOverlay = slide?.overlayExplicit === true && slide?.overlayOverride === true;
            applyPageOverlay('home', getOverlayConfig(useSlideOverlay ? slide?.overlay : (payload?.overlays?.home || slide?.overlay || {})));
        };
        applyOverlayForIndex(0);
        startRotation('.slideshow-container .slide', 'active', getRotationIntervalMs(payload, 'home'), applyOverlayForIndex);
    }

    function renderSimpleHero(page, slides, payload) {
        const heroSelector = page === 'about'
            ? '.about-hero'
            : page === 'contact'
                ? '.contact-hero'
                : '.cause-hero';
        const hero = document.querySelector(heroSelector);
        if (!hero || slides.length === 0) return;

        ensureSharedStyles();
        hero.style.background = getSlideshowFallbackBackground();

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

        const images = Array.from(slideshow.querySelectorAll('.managed-slide-image'));
        images.forEach((img, index) => {
            const fitMode = getFitMode(slides[index]);
            const applyCurrentCrop = () => applyCropToImage(img, slides[index].crop, fitMode);
            applyCurrentCrop();
            img.addEventListener('load', applyCurrentCrop, { once: true });
            applyFiltersToImage(img, slides[index]);
        });
        bindResponsiveCrop(slideshow, images, slides);
        const applyOverlayForIndex = (index) => {
            const slide = slides[index] || slides[0];
            const useSlideOverlay = slide?.overlayExplicit === true && slide?.overlayOverride === true;
            applyPageOverlay(page, getOverlayConfig(useSlideOverlay ? slide?.overlay : (payload?.overlays?.[page] || slide?.overlay || {})));
        };
        applyOverlayForIndex(0);
        startRotation('.managed-hero-slideshow .managed-hero-slide', 'active', getRotationIntervalMs(payload, page), applyOverlayForIndex);
    }

    async function init() {
        try {
            const payload = await loadPublishedSlides();
            const slides = resolveSlidesForPage(payload, PAGE_KEY);
            if (slides.length === 0) return;

            if (PAGE_KEY === 'home') {
                renderHome(slides, payload);
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
