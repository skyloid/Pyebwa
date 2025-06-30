// Enhanced Slideshow with Multiple Fallbacks
(function() {
    'use strict';
    
    const config = {
        interval: 7000,
        transition: 2000,
        maxRetries: 5,
        debug: true
    };
    
    let state = {
        initialized: false,
        running: false,
        currentSlide: 0,
        slides: [],
        interval: null,
        retryCount: 0
    };
    
    function log(msg, type = 'info') {
        if (!config.debug) return;
        const prefix = `[Slideshow-v2 ${new Date().toLocaleTimeString()}]`;
        
        switch(type) {
            case 'error':
                console.error(`${prefix} ❌ ${msg}`);
                break;
            case 'success':
                console.log(`${prefix} ✅ ${msg}`);
                break;
            case 'warn':
                console.warn(`${prefix} ⚠️ ${msg}`);
                break;
            default:
                console.log(`${prefix} ${msg}`);
        }
    }
    
    function enableCSSFallback() {
        log('Enabling CSS-only fallback', 'warn');
        const container = document.querySelector('.slideshow-container');
        if (container) {
            container.classList.add('css-fallback');
            
            // Add fallback CSS if not already loaded
            if (!document.querySelector('link[href*="slideshow-fallback.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = '/pyebwa.com/css/slideshow-fallback.css';
                document.head.appendChild(link);
                log('CSS fallback stylesheet added', 'success');
            }
        }
    }
    
    function findSlides() {
        const container = document.querySelector('.slideshow-container');
        if (!container) {
            log('No slideshow container found', 'error');
            return false;
        }
        
        state.slides = Array.from(container.querySelectorAll('.slide'));
        
        if (state.slides.length === 0) {
            log('No slides found in container', 'error');
            return false;
        }
        
        log(`Found ${state.slides.length} slides`, 'success');
        return true;
    }
    
    function initializeSlides() {
        state.slides.forEach((slide, index) => {
            // Ensure proper positioning
            slide.style.position = 'absolute';
            slide.style.top = '0';
            slide.style.left = '0';
            slide.style.width = '100%';
            slide.style.height = '100%';
            
            // Set initial state
            if (index === 0) {
                slide.classList.add('active');
                slide.style.opacity = '1';
                slide.style.zIndex = '10';
            } else {
                slide.classList.remove('active');
                slide.style.opacity = '0';
                slide.style.zIndex = '1';
            }
            
            // Add transition
            if (!slide.style.transition) {
                slide.style.transition = `opacity ${config.transition}ms ease-in-out`;
            }
        });
        
        log('Slides initialized', 'success');
    }
    
    function checkImages() {
        let loadedCount = 0;
        let errorCount = 0;
        
        state.slides.forEach((slide, index) => {
            const img = slide.querySelector('img');
            if (!img) {
                log(`No image in slide ${index + 1}`, 'warn');
                return;
            }
            
            if (img.complete) {
                if (img.naturalHeight === 0) {
                    errorCount++;
                    log(`Image failed to load in slide ${index + 1}: ${img.src}`, 'error');
                } else {
                    loadedCount++;
                }
            } else {
                // Image still loading
                img.addEventListener('load', () => {
                    loadedCount++;
                    log(`Image loaded in slide ${index + 1}`);
                });
                
                img.addEventListener('error', () => {
                    errorCount++;
                    log(`Image failed in slide ${index + 1}: ${img.src}`, 'error');
                });
            }
        });
        
        log(`Images: ${loadedCount} loaded, ${errorCount} errors`);
        return errorCount === 0;
    }
    
    function transitionToSlide(newIndex) {
        if (state.slides.length === 0 || newIndex === state.currentSlide) return;
        
        const oldSlide = state.slides[state.currentSlide];
        const newSlide = state.slides[newIndex];
        
        // Set z-index for proper layering
        newSlide.style.zIndex = '10';
        oldSlide.style.zIndex = '5';
        
        // Start transition
        newSlide.classList.add('active');
        newSlide.style.opacity = '1';
        
        // Complete transition
        setTimeout(() => {
            oldSlide.classList.remove('active');
            oldSlide.style.opacity = '0';
            oldSlide.style.zIndex = '1';
        }, 50);
        
        state.currentSlide = newIndex;
        log(`Transitioned to slide ${newIndex + 1}`);
    }
    
    function nextSlide() {
        const next = (state.currentSlide + 1) % state.slides.length;
        transitionToSlide(next);
    }
    
    function startSlideshow() {
        if (state.running) {
            log('Slideshow already running');
            return;
        }
        
        state.running = true;
        state.interval = setInterval(nextSlide, config.interval);
        log('Slideshow started', 'success');
    }
    
    function stopSlideshow() {
        if (!state.running) return;
        
        if (state.interval) {
            clearInterval(state.interval);
            state.interval = null;
        }
        
        state.running = false;
        log('Slideshow stopped');
    }
    
    function initialize() {
        if (state.initialized) {
            log('Already initialized');
            return;
        }
        
        log('Initializing slideshow...');
        
        // Find slides
        if (!findSlides()) {
            if (state.retryCount < config.maxRetries) {
                state.retryCount++;
                log(`Retry ${state.retryCount}/${config.maxRetries} in 1 second`);
                setTimeout(initialize, 1000);
            } else {
                log('Max retries reached, enabling CSS fallback', 'error');
                enableCSSFallback();
            }
            return;
        }
        
        // Initialize slides
        initializeSlides();
        
        // Check images
        const imagesOk = checkImages();
        if (!imagesOk) {
            log('Some images failed to load, but continuing...', 'warn');
        }
        
        // Start slideshow
        state.initialized = true;
        startSlideshow();
        
        // Expose API
        window.slideshowAPI = {
            start: startSlideshow,
            stop: stopSlideshow,
            next: nextSlide,
            prev: () => {
                const prev = (state.currentSlide - 1 + state.slides.length) % state.slides.length;
                transitionToSlide(prev);
            },
            goto: (index) => {
                if (index >= 0 && index < state.slides.length) {
                    transitionToSlide(index);
                }
            },
            getState: () => ({ ...state }),
            enableDebug: (enable = true) => { config.debug = enable; },
            forceCSS: enableCSSFallback
        };
        
        log('API available at window.slideshowAPI', 'success');
    }
    
    // Multiple initialization strategies
    
    // 1. Immediate if DOM is ready
    if (document.readyState !== 'loading') {
        setTimeout(initialize, 100);
    }
    
    // 2. DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initialize, 200);
    });
    
    // 3. Window load (all resources loaded)
    window.addEventListener('load', () => {
        setTimeout(initialize, 500);
    });
    
    // 4. Fallback to CSS if JavaScript fails after 10 seconds
    setTimeout(() => {
        if (!state.initialized) {
            log('JavaScript slideshow failed to initialize, using CSS fallback', 'error');
            enableCSSFallback();
        }
    }, 10000);
    
})();