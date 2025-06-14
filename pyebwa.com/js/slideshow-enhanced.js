// Enhanced slideshow with loading states and error handling
(function() {
    'use strict';
    
    let currentIndex = 0;
    let images = [];
    let slideshowInterval = null;
    let imagesLoaded = false;
    
    // Configuration
    const config = {
        interval: 5000,
        transitionDuration: 1000,
        preloadAhead: 2
    };
    
    // Initialize slideshow
    function initSlideshow() {
        const gallery = document.querySelector('.forest-gallery');
        if (!gallery) {
            console.warn('Slideshow: No gallery container found');
            return;
        }
        
        // Get all image elements
        const imageElements = gallery.querySelectorAll('img');
        if (imageElements.length === 0) {
            console.warn('Slideshow: No images found');
            return;
        }
        
        // Create loading indicator
        const loadingIndicator = createLoadingIndicator();
        gallery.appendChild(loadingIndicator);
        
        // Setup images array with loading states
        images = Array.from(imageElements).map((img, index) => ({
            element: img,
            src: img.src || img.dataset.src,
            loaded: false,
            error: false,
            index: index
        }));
        
        // Add loading state class
        gallery.classList.add('loading');
        
        // Preload images
        preloadImages().then(() => {
            loadingIndicator.remove();
            gallery.classList.remove('loading');
            
            if (images.filter(img => !img.error).length > 1) {
                setupSlideshow();
                startSlideshow();
            } else {
                console.warn('Slideshow: Not enough valid images to create slideshow');
            }
        });
    }
    
    // Create loading indicator
    function createLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'slideshow-loading';
        indicator.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Loading images...</p>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .slideshow-loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                z-index: 10;
            }
            
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #00217D;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .forest-gallery.loading img {
                opacity: 0.5;
            }
            
            .forest-gallery img.loading {
                filter: blur(5px);
                transition: filter 0.3s ease;
            }
            
            .forest-gallery img.loaded {
                filter: none;
            }
            
            .forest-gallery img.error {
                display: none;
            }
        `;
        
        if (!document.querySelector('#slideshow-loading-styles')) {
            style.id = 'slideshow-loading-styles';
            document.head.appendChild(style);
        }
        
        return indicator;
    }
    
    // Preload images with Promise
    function preloadImages() {
        const loadPromises = images.map(imageData => {
            return new Promise((resolve) => {
                const img = new Image();
                
                img.onload = function() {
                    imageData.loaded = true;
                    imageData.element.classList.add('loaded');
                    imageData.element.classList.remove('loading');
                    console.log(`Slideshow: Image loaded - ${imageData.src}`);
                    resolve();
                };
                
                img.onerror = function() {
                    imageData.error = true;
                    imageData.element.classList.add('error');
                    imageData.element.classList.remove('loading');
                    console.error(`Slideshow: Failed to load image - ${imageData.src}`);
                    resolve(); // Resolve anyway to continue with other images
                };
                
                // Add loading class
                imageData.element.classList.add('loading');
                
                // Start loading
                img.src = imageData.src;
            });
        });
        
        return Promise.all(loadPromises);
    }
    
    // Setup slideshow functionality
    function setupSlideshow() {
        // Filter out error images
        const validImages = images.filter(img => !img.error);
        
        // Hide all images except first
        validImages.forEach((imageData, index) => {
            if (index === 0) {
                imageData.element.classList.add('active');
                imageData.element.style.opacity = '1';
            } else {
                imageData.element.style.opacity = '0';
            }
            
            // Ensure transition is set
            imageData.element.style.transition = `opacity ${config.transitionDuration}ms ease-in-out`;
        });
        
        // Update images array to only include valid images
        images = validImages;
        imagesLoaded = true;
        
        console.log(`Slideshow: Initialized with ${images.length} images`);
    }
    
    // Start the slideshow
    function startSlideshow() {
        if (!imagesLoaded || images.length <= 1) {
            return;
        }
        
        // Clear any existing interval
        if (slideshowInterval) {
            clearInterval(slideshowInterval);
        }
        
        // Start rotation
        slideshowInterval = setInterval(nextImage, config.interval);
        
        // Preload next images
        preloadNextImages();
    }
    
    // Stop the slideshow
    function stopSlideshow() {
        if (slideshowInterval) {
            clearInterval(slideshowInterval);
            slideshowInterval = null;
        }
    }
    
    // Show next image
    function nextImage() {
        if (!imagesLoaded || images.length <= 1) {
            return;
        }
        
        const currentImage = images[currentIndex];
        currentIndex = (currentIndex + 1) % images.length;
        const nextImage = images[currentIndex];
        
        // Fade out current
        currentImage.element.style.opacity = '0';
        currentImage.element.classList.remove('active');
        
        // Fade in next
        nextImage.element.style.opacity = '1';
        nextImage.element.classList.add('active');
        
        console.log(`Slideshow: Transitioning from image ${currentImage.index} to ${nextImage.index}`);
        
        // Preload upcoming images
        preloadNextImages();
    }
    
    // Preload next images for smooth transitions
    function preloadNextImages() {
        for (let i = 1; i <= config.preloadAhead; i++) {
            const nextIndex = (currentIndex + i) % images.length;
            const imageData = images[nextIndex];
            
            if (!imageData.loaded && !imageData.error) {
                const img = new Image();
                img.src = imageData.src;
            }
        }
    }
    
    // Handle visibility change
    function handleVisibilityChange() {
        if (document.hidden) {
            stopSlideshow();
        } else {
            startSlideshow();
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSlideshow);
    } else {
        initSlideshow();
    }
    
    // Handle page visibility
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', stopSlideshow);
    
    // Export for debugging
    window.slideshowDebug = {
        images: images,
        currentIndex: () => currentIndex,
        isRunning: () => slideshowInterval !== null,
        start: startSlideshow,
        stop: stopSlideshow,
        next: nextImage
    };
})();