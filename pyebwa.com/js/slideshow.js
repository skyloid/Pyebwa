// Solution 1: Simple and Reliable Slideshow
// This is the most straightforward implementation that should work in all browsers

(function() {
    'use strict';
    
    // Wait for DOM to be fully loaded
    function initSlideshow() {
        console.log('[Slideshow] Starting initialization...');
        
        // Find the slideshow container
        const container = document.querySelector('.slideshow-container');
        if (!container) {
            console.error('[Slideshow] No slideshow container found!');
            return;
        }
        
        // Find all slides
        const slides = container.querySelectorAll('.slide');
        if (slides.length === 0) {
            console.error('[Slideshow] No slides found!');
            return;
        }
        
        console.log(`[Slideshow] Found ${slides.length} slides`);
        
        // Initialize variables
        let currentSlide = 0;
        const SLIDE_INTERVAL = 7000; // 7 seconds
        
        // Make sure only first slide is active initially
        slides.forEach((slide, index) => {
            if (index === 0) {
                slide.classList.add('active');
                slide.style.opacity = '1';
            } else {
                slide.classList.remove('active');
                slide.style.opacity = '0';
            }
        });
        
        // Function to show next slide
        function showNextSlide() {
            // Hide current slide
            slides[currentSlide].classList.remove('active');
            slides[currentSlide].style.opacity = '0';
            
            // Move to next slide
            currentSlide = (currentSlide + 1) % slides.length;
            
            // Show next slide
            slides[currentSlide].classList.add('active');
            slides[currentSlide].style.opacity = '1';
            
            console.log(`[Slideshow] Showing slide ${currentSlide + 1} of ${slides.length}`);
        }
        
        // Start the slideshow
        const intervalId = setInterval(showNextSlide, SLIDE_INTERVAL);
        console.log('[Slideshow] Slideshow started successfully');
        
        // Return control object for testing
        return {
            next: showNextSlide,
            stop: () => clearInterval(intervalId),
            getCurrentSlide: () => currentSlide
        };
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSlideshow);
    } else {
        // DOM is already ready
        initSlideshow();
    }
    
    // Also try to initialize after a short delay as fallback
    setTimeout(initSlideshow, 1000);
    
})();