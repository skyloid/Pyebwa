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
        const SLIDE_INTERVAL = 3000; // 3 seconds for faster debugging
        
        // Make sure only first slide is active initially
        slides.forEach((slide, index) => {
            if (index === 0) {
                slide.classList.add('active');
                slide.style.opacity = '1';
                slide.style.zIndex = '10';
                console.log(`[Slideshow] Initialized slide ${index} as active`);
            } else {
                slide.classList.remove('active');
                slide.style.opacity = '0';
                slide.style.zIndex = '1';
                console.log(`[Slideshow] Initialized slide ${index} as inactive`);
            }
        });
        
        // Function to show next slide
        function showNextSlide() {
            const previousSlide = currentSlide;
            
            // Move to next slide
            currentSlide = (currentSlide + 1) % slides.length;
            
            console.log(`[Slideshow] Transitioning from slide ${previousSlide + 1} to slide ${currentSlide + 1}`);
            
            // Set z-index to ensure new slide appears on top
            slides[currentSlide].style.zIndex = '10';
            slides[previousSlide].style.zIndex = '5';
            
            // Show next slide
            slides[currentSlide].classList.add('active');
            slides[currentSlide].style.opacity = '1';
            
            // Add temporary visual indicator for debugging
            slides[currentSlide].style.border = '5px solid red';
            setTimeout(() => {
                slides[currentSlide].style.border = '';
            }, 1000);
            
            // Hide previous slide after transition starts
            setTimeout(() => {
                slides[previousSlide].classList.remove('active');
                slides[previousSlide].style.opacity = '0';
                slides[previousSlide].style.zIndex = '1';
                console.log(`[Slideshow] Hidden slide ${previousSlide + 1}`);
            }, 100);
            
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