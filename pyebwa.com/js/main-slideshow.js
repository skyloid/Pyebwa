// Main page slideshow functionality
(function() {
    // Configuration
    const SLIDE_INTERVAL = 7000; // 7 seconds per slide
    const FADE_DURATION = 1000; // 1 second fade transition
    
    // Initialize slideshow when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSlideshow);
    } else {
        initializeSlideshow();
    }
    
    function initializeSlideshow() {
        const container = document.querySelector('.slideshow-container');
        if (!container) {
            console.log('No slideshow container found');
            return;
        }
        
        const slides = container.querySelectorAll('.slide');
        if (slides.length <= 1) {
            console.log('Not enough slides for slideshow');
            return;
        }
        
        let currentSlide = 0;
        
        // Ensure first slide is active
        slides.forEach((slide, index) => {
            if (index === 0) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });
        
        // Function to show next slide
        function nextSlide() {
            // Remove active class from current slide
            slides[currentSlide].classList.remove('active');
            
            // Calculate next slide index
            currentSlide = (currentSlide + 1) % slides.length;
            
            // Add active class to next slide
            slides[currentSlide].classList.add('active');
            
            console.log(`Showing slide ${currentSlide + 1} of ${slides.length}`);
        }
        
        // Start the slideshow
        let intervalId = setInterval(nextSlide, SLIDE_INTERVAL);
        
        // Optional: Pause on hover
        container.addEventListener('mouseenter', () => {
            clearInterval(intervalId);
            console.log('Slideshow paused');
        });
        
        container.addEventListener('mouseleave', () => {
            intervalId = setInterval(nextSlide, SLIDE_INTERVAL);
            console.log('Slideshow resumed');
        });
        
        // Log initialization
        console.log(`Slideshow initialized with ${slides.length} slides`);
        console.log(`Slide interval: ${SLIDE_INTERVAL}ms`);
    }
    
    // Expose function globally if needed
    window.initializeMainSlideshow = initializeSlideshow;
})();