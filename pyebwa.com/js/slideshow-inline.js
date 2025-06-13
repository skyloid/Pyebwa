// Solution 2: Inline Style Manipulation
// This solution directly manipulates inline styles to ensure compatibility

document.addEventListener('DOMContentLoaded', function() {
    console.log('[Slideshow-Inline] Initializing...');
    
    // Configuration
    const SLIDE_DURATION = 7000; // 7 seconds per slide
    const FADE_DURATION = 2000; // 2 seconds fade
    
    // Get slideshow elements
    const container = document.querySelector('.slideshow-container');
    if (!container) {
        console.error('[Slideshow-Inline] Container not found');
        return;
    }
    
    const slides = Array.from(container.getElementsByClassName('slide'));
    if (slides.length < 2) {
        console.log('[Slideshow-Inline] Not enough slides for slideshow');
        return;
    }
    
    // Initialize slides with inline styles
    slides.forEach((slide, index) => {
        slide.style.position = 'absolute';
        slide.style.top = '0';
        slide.style.left = '0';
        slide.style.width = '100%';
        slide.style.height = '100%';
        slide.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
        
        if (index === 0) {
            slide.style.opacity = '1';
            slide.style.display = 'block';
        } else {
            slide.style.opacity = '0';
            slide.style.display = 'block';
        }
    });
    
    let currentIndex = 0;
    
    function transitionToSlide(newIndex) {
        console.log(`[Slideshow-Inline] Transitioning from slide ${currentIndex + 1} to ${newIndex + 1}`);
        
        // Fade out current slide
        slides[currentIndex].style.opacity = '0';
        
        // Fade in new slide
        slides[newIndex].style.opacity = '1';
        
        currentIndex = newIndex;
    }
    
    function nextSlide() {
        const nextIndex = (currentIndex + 1) % slides.length;
        transitionToSlide(nextIndex);
    }
    
    // Start the slideshow
    console.log(`[Slideshow-Inline] Starting slideshow with ${slides.length} slides`);
    setInterval(nextSlide, SLIDE_DURATION);
    
    // Log success
    console.log('[Slideshow-Inline] Slideshow initialized successfully');
});