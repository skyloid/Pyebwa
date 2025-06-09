// Forest Slideshow Script
// This script manages the background image slideshow on the mission page

(function() {
    'use strict';
    
    console.log('[Forest Slideshow] Initializing...');
    
    // Wait for DOM to be ready
    function initSlideshow() {
        const slides = document.querySelectorAll('.forest-slide');
        
        if (!slides || slides.length === 0) {
            console.error('[Forest Slideshow] No slides found with class .forest-slide');
            return;
        }
        
        console.log(`[Forest Slideshow] Found ${slides.length} slides`);
        
        let currentSlide = 0;
        let isTransitioning = false;
        
        // Function to show a specific slide
        function showSlide(index) {
            if (isTransitioning) return;
            isTransitioning = true;
            
            // Remove active class from all slides
            slides.forEach((slide, i) => {
                if (i !== index) {
                    slide.classList.remove('active');
                }
            });
            
            // Add active class to current slide
            slides[index].classList.add('active');
            
            console.log(`[Forest Slideshow] Showing slide ${index + 1}`);
            
            // Reset transition flag after animation completes
            setTimeout(() => {
                isTransitioning = false;
            }, 2000); // Match the CSS transition duration
        }
        
        // Function to advance to next slide
        function nextSlide() {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        }
        
        // Verify initial state
        let hasActiveSlide = false;
        slides.forEach((slide, index) => {
            if (slide.classList.contains('active')) {
                hasActiveSlide = true;
                currentSlide = index;
                console.log(`[Forest Slideshow] Initial active slide: ${index + 1}`);
            }
        });
        
        // If no active slide, activate the first one
        if (!hasActiveSlide) {
            console.log('[Forest Slideshow] No active slide found, activating first slide');
            slides[0].classList.add('active');
            currentSlide = 0;
        }
        
        // Preload all background images
        let loadedImages = 0;
        const totalImages = slides.length;
        
        slides.forEach((slide, index) => {
            const bgImage = window.getComputedStyle(slide).backgroundImage;
            const urlMatch = bgImage.match(/url\(["']?(.+?)["']?\)/);
            
            if (urlMatch && urlMatch[1]) {
                const img = new Image();
                img.onload = () => {
                    loadedImages++;
                    console.log(`[Forest Slideshow] Image ${index + 1} loaded (${loadedImages}/${totalImages})`);
                    
                    if (loadedImages === totalImages) {
                        console.log('[Forest Slideshow] All images loaded, starting transitions');
                    }
                };
                img.onerror = () => {
                    console.error(`[Forest Slideshow] Failed to load image ${index + 1}: ${urlMatch[1]}`);
                    loadedImages++;
                };
                img.src = urlMatch[1];
            } else {
                console.warn(`[Forest Slideshow] Slide ${index + 1} has no background image`);
                loadedImages++;
            }
        });
        
        // Start the slideshow interval
        const interval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
        console.log('[Forest Slideshow] Started with 5-second intervals');
        
        // Pause slideshow when page is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                clearInterval(interval);
                console.log('[Forest Slideshow] Paused (page hidden)');
            } else {
                setInterval(nextSlide, 5000);
                console.log('[Forest Slideshow] Resumed (page visible)');
            }
        });
        
        // Debug: Check computed styles of slideshow container
        const slideshowContainer = document.querySelector('.forest-slideshow');
        if (slideshowContainer) {
            const containerStyles = window.getComputedStyle(slideshowContainer);
            console.log('[Forest Slideshow] Container styles:', {
                position: containerStyles.position,
                width: containerStyles.width,
                height: containerStyles.height,
                zIndex: containerStyles.zIndex
            });
        }
        
        // Debug: Check first slide styles
        const firstSlideStyles = window.getComputedStyle(slides[0]);
        console.log('[Forest Slideshow] First slide styles:', {
            position: firstSlideStyles.position,
            opacity: firstSlideStyles.opacity,
            backgroundImage: firstSlideStyles.backgroundImage.substring(0, 50) + '...'
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSlideshow);
    } else {
        // DOM is already loaded
        initSlideshow();
    }
})();