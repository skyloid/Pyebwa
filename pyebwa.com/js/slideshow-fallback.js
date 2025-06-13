// Solution 3: Aggressive Fallback with Multiple Initialization Attempts
// This solution tries multiple methods to ensure the slideshow works

(function() {
    'use strict';
    
    let slideshowInitialized = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;
    
    function initializeSlideshow() {
        if (slideshowInitialized || attempts >= MAX_ATTEMPTS) {
            return;
        }
        
        attempts++;
        console.log(`[Slideshow-Fallback] Initialization attempt ${attempts}`);
        
        // Method 1: Query by class name
        let slides = document.querySelectorAll('.slideshow-container .slide');
        
        // Method 2: If that fails, try getting container first
        if (!slides || slides.length === 0) {
            const container = document.querySelector('.slideshow-container');
            if (container) {
                slides = container.children;
            }
        }
        
        // Method 3: Try by searching the entire document
        if (!slides || slides.length === 0) {
            slides = document.getElementsByClassName('slide');
        }
        
        // Convert to array if needed
        slides = Array.from(slides || []);
        
        if (slides.length < 2) {
            console.warn(`[Slideshow-Fallback] Only ${slides.length} slides found, retrying...`);
            setTimeout(initializeSlideshow, 1000);
            return;
        }
        
        console.log(`[Slideshow-Fallback] Found ${slides.length} slides!`);
        
        // Reset all slides
        slides.forEach((slide, index) => {
            // Ensure slide is visible but transparent
            slide.style.display = 'block';
            slide.style.position = 'absolute';
            slide.style.width = '100%';
            slide.style.height = '100%';
            slide.style.top = '0';
            slide.style.left = '0';
            
            // Remove all classes first
            slide.className = slide.className.replace(/\s*active\s*/g, ' ').trim();
            
            if (index === 0) {
                slide.className += ' active';
                slide.style.opacity = '1';
                slide.style.zIndex = '2';
            } else {
                slide.style.opacity = '0';
                slide.style.zIndex = '1';
            }
        });
        
        let currentSlide = 0;
        
        // Main slideshow function
        function rotateSlides() {
            // Current slide
            const current = slides[currentSlide];
            const nextIndex = (currentSlide + 1) % slides.length;
            const next = slides[nextIndex];
            
            console.log(`[Slideshow-Fallback] Rotating from slide ${currentSlide + 1} to ${nextIndex + 1}`);
            
            // Prepare next slide
            next.style.zIndex = '1';
            next.style.opacity = '0';
            
            // Start transition
            setTimeout(() => {
                current.style.zIndex = '1';
                next.style.zIndex = '2';
                
                // Use both methods for maximum compatibility
                current.className = current.className.replace(/\s*active\s*/g, ' ').trim();
                next.className += ' active';
                
                // Fade transition
                current.style.transition = 'opacity 2s ease-in-out';
                next.style.transition = 'opacity 2s ease-in-out';
                
                current.style.opacity = '0';
                next.style.opacity = '1';
                
                currentSlide = nextIndex;
            }, 50);
        }
        
        // Start rotating
        const interval = setInterval(rotateSlides, 7000);
        
        slideshowInitialized = true;
        console.log('[Slideshow-Fallback] Slideshow initialized successfully!');
        
        // Ensure transitions work
        slides.forEach(slide => {
            if (!slide.style.transition) {
                slide.style.transition = 'opacity 2s ease-in-out';
            }
        });
        
        // Return control functions
        window.slideshowControl = {
            stop: () => clearInterval(interval),
            next: rotateSlides,
            initialized: true
        };
    }
    
    // Try multiple initialization methods
    
    // Method 1: DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSlideshow);
    }
    
    // Method 2: Immediate execution
    initializeSlideshow();
    
    // Method 3: Window load
    window.addEventListener('load', initializeSlideshow);
    
    // Method 4: Multiple delayed attempts
    setTimeout(initializeSlideshow, 100);
    setTimeout(initializeSlideshow, 500);
    setTimeout(initializeSlideshow, 1000);
    setTimeout(initializeSlideshow, 2000);
    
})();