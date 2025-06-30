// Enhanced Slideshow Fix with Aggressive Initialization
(function() {
    'use strict';
    
    let slideshowStarted = false;
    let slideshowInterval = null;
    let currentSlide = 0;
    let slides = [];
    
    function debugLog(message) {
        console.log(`[Slideshow-Fix ${new Date().toLocaleTimeString()}] ${message}`);
    }
    
    function initializeSlideshow() {
        if (slideshowStarted) {
            debugLog('Slideshow already started, skipping initialization');
            return;
        }
        
        debugLog('Starting slideshow initialization...');
        
        // Find container
        const container = document.querySelector('.slideshow-container');
        if (!container) {
            debugLog('ERROR: No slideshow container found');
            return false;
        }
        
        // Find slides
        slides = Array.from(container.querySelectorAll('.slide'));
        if (slides.length === 0) {
            debugLog('ERROR: No slides found');
            return false;
        }
        
        debugLog(`Found ${slides.length} slides`);
        
        // Reset all slides
        slides.forEach((slide, index) => {
            slide.style.position = 'absolute';
            slide.style.top = '0';
            slide.style.left = '0';
            slide.style.width = '100%';
            slide.style.height = '100%';
            slide.style.transition = 'opacity 2s ease-in-out';
            
            if (index === 0) {
                slide.classList.add('active');
                slide.style.opacity = '1';
                slide.style.zIndex = '10';
                slide.style.display = 'block';
                debugLog(`Slide 1 set as active`);
            } else {
                slide.classList.remove('active');
                slide.style.opacity = '0';
                slide.style.zIndex = '1';
                slide.style.display = 'block';
            }
        });
        
        // Ensure images are loaded
        let imagesLoaded = 0;
        let totalImages = 0;
        
        slides.forEach((slide, index) => {
            const img = slide.querySelector('img');
            if (img) {
                totalImages++;
                if (img.complete && img.naturalHeight !== 0) {
                    imagesLoaded++;
                    debugLog(`Image in slide ${index + 1} already loaded`);
                } else {
                    img.addEventListener('load', () => {
                        imagesLoaded++;
                        debugLog(`Image in slide ${index + 1} loaded (${imagesLoaded}/${totalImages})`);
                    });
                    img.addEventListener('error', () => {
                        debugLog(`ERROR: Image in slide ${index + 1} failed to load: ${img.src}`);
                    });
                }
            }
        });
        
        debugLog(`Images status: ${imagesLoaded}/${totalImages} loaded immediately`);
        
        // Start slideshow
        startSlideshow();
        return true;
    }
    
    function startSlideshow() {
        if (slideshowStarted) {
            debugLog('Slideshow already running');
            return;
        }
        
        slideshowStarted = true;
        const INTERVAL = 7000; // 7 seconds
        
        slideshowInterval = setInterval(() => {
            nextSlide();
        }, INTERVAL);
        
        debugLog('Slideshow started with 7 second interval');
        
        // Also add manual controls for debugging
        window.slideshowControls = {
            next: nextSlide,
            prev: prevSlide,
            goto: gotoSlide,
            stop: stopSlideshow,
            start: startSlideshow,
            status: getStatus
        };
        
        debugLog('Manual controls available at window.slideshowControls');
    }
    
    function nextSlide() {
        if (slides.length === 0) return;
        
        const previousSlide = currentSlide;
        currentSlide = (currentSlide + 1) % slides.length;
        
        transitionSlides(previousSlide, currentSlide);
    }
    
    function prevSlide() {
        if (slides.length === 0) return;
        
        const previousSlide = currentSlide;
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        
        transitionSlides(previousSlide, currentSlide);
    }
    
    function gotoSlide(index) {
        if (slides.length === 0 || index < 0 || index >= slides.length) return;
        
        const previousSlide = currentSlide;
        currentSlide = index;
        
        transitionSlides(previousSlide, currentSlide);
    }
    
    function transitionSlides(from, to) {
        debugLog(`Transitioning from slide ${from + 1} to slide ${to + 1}`);
        
        // Ensure new slide is on top
        slides[to].style.zIndex = '10';
        slides[from].style.zIndex = '5';
        
        // Make new slide visible
        slides[to].style.display = 'block';
        slides[to].classList.add('active');
        
        // Force reflow to ensure styles are applied
        void slides[to].offsetHeight;
        
        // Fade in new slide
        slides[to].style.opacity = '1';
        
        // Fade out old slide after a small delay
        setTimeout(() => {
            slides[from].classList.remove('active');
            slides[from].style.opacity = '0';
            
            // Reset z-index after transition
            setTimeout(() => {
                slides[from].style.zIndex = '1';
            }, 2000);
        }, 50);
    }
    
    function stopSlideshow() {
        if (slideshowInterval) {
            clearInterval(slideshowInterval);
            slideshowInterval = null;
            slideshowStarted = false;
            debugLog('Slideshow stopped');
        }
    }
    
    function getStatus() {
        return {
            started: slideshowStarted,
            currentSlide: currentSlide + 1,
            totalSlides: slides.length,
            slidesInfo: slides.map((slide, index) => ({
                index: index + 1,
                active: slide.classList.contains('active'),
                opacity: slide.style.opacity,
                zIndex: slide.style.zIndex
            }))
        };
    }
    
    // Multiple initialization strategies
    
    // Strategy 1: DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            debugLog('Attempting initialization on DOMContentLoaded');
            initializeSlideshow();
        });
    }
    
    // Strategy 2: Immediate if DOM ready
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        debugLog('DOM ready, attempting immediate initialization');
        setTimeout(initializeSlideshow, 100);
    }
    
    // Strategy 3: Window load
    window.addEventListener('load', () => {
        debugLog('Attempting initialization on window load');
        setTimeout(initializeSlideshow, 500);
    });
    
    // Strategy 4: Mutation observer for dynamic content
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                const container = document.querySelector('.slideshow-container');
                if (container && !slideshowStarted) {
                    debugLog('Slideshow container detected by mutation observer');
                    observer.disconnect();
                    initializeSlideshow();
                    break;
                }
            }
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Strategy 5: Periodic check as last resort
    let checkCount = 0;
    const checkInterval = setInterval(() => {
        checkCount++;
        if (checkCount > 20) {
            clearInterval(checkInterval);
            debugLog('Giving up after 20 attempts');
            return;
        }
        
        if (!slideshowStarted && document.querySelector('.slideshow-container')) {
            debugLog(`Attempting initialization on periodic check ${checkCount}`);
            if (initializeSlideshow()) {
                clearInterval(checkInterval);
            }
        }
    }, 1000);
    
})();