// Mobile-optimized slideshow enhancements
(function() {
    'use strict';
    
    // Detect mobile/tablet
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768);
    }
    
    function isSlowConnection() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!connection) return false;
        
        const effectiveType = connection.effectiveType;
        return effectiveType === '2g' || effectiveType === 'slow-2g' || connection.saveData;
    }
    
    // Optimize images for mobile
    function optimizeImagesForMobile() {
        if (!isMobileDevice()) return;
        
        const slides = document.querySelectorAll('.slideshow-container .slide img');
        const isSlowConn = isSlowConnection();
        
        slides.forEach((img, index) => {
            // Lazy load images except first 3
            if (index > 2) {
                img.loading = 'lazy';
            }
            
            // Add performance hints
            img.decoding = 'async';
            
            // On slow connections, reduce quality
            if (isSlowConn && img.src.includes('jpg')) {
                // This would require server-side support for different quality images
                // For now, just add a class for CSS-based optimization
                img.classList.add('low-quality');
            }
        });
        
        console.log('[Slideshow Mobile] Optimized for mobile device');
    }
    
    // Touch gesture support for slideshow
    function addTouchSupport() {
        const container = document.querySelector('.slideshow-container');
        if (!container) return;
        
        let touchStartX = 0;
        let touchEndX = 0;
        const minSwipeDistance = 50;
        
        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].pageX;
        }, { passive: true });
        
        container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].pageX;
            handleSwipe();
        }, { passive: true });
        
        function handleSwipe() {
            const swipeDistance = touchEndX - touchStartX;
            
            if (Math.abs(swipeDistance) < minSwipeDistance) return;
            
            // Check if slideshow API is available
            if (window.slideshowAPI) {
                if (swipeDistance > 0) {
                    // Swipe right - previous slide
                    window.slideshowAPI.prev();
                    console.log('[Slideshow Mobile] Swiped to previous slide');
                } else {
                    // Swipe left - next slide
                    window.slideshowAPI.next();
                    console.log('[Slideshow Mobile] Swiped to next slide');
                }
            }
        }
        
        console.log('[Slideshow Mobile] Touch support added');
    }
    
    // Add pause on visibility change (battery saving)
    function addVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (!window.slideshowAPI) return;
            
            if (document.hidden) {
                window.slideshowAPI.stop();
                console.log('[Slideshow Mobile] Paused - page hidden');
            } else {
                window.slideshowAPI.start();
                console.log('[Slideshow Mobile] Resumed - page visible');
            }
        });
    }
    
    // Add mobile slideshow controls
    function addMobileControls() {
        if (!isMobileDevice()) return;
        
        const container = document.querySelector('.slideshow-container');
        if (!container) return;
        
        // Create control overlay
        const controls = document.createElement('div');
        controls.className = 'slideshow-mobile-controls';
        controls.innerHTML = `
            <button class="slideshow-control slideshow-prev" aria-label="Previous slide">
                <span>‹</span>
            </button>
            <button class="slideshow-control slideshow-next" aria-label="Next slide">
                <span>›</span>
            </button>
            <div class="slideshow-indicators"></div>
        `;
        
        // Add CSS for controls
        const style = document.createElement('style');
        style.textContent = `
            .slideshow-mobile-controls {
                position: absolute;
                bottom: 20px;
                left: 0;
                right: 0;
                z-index: 20;
                pointer-events: none;
            }
            
            .slideshow-control {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                background: rgba(0,0,0,0.5);
                color: white;
                border: none;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                font-size: 24px;
                cursor: pointer;
                pointer-events: auto;
                opacity: 0.7;
                transition: opacity 0.3s;
            }
            
            .slideshow-control:active {
                opacity: 1;
                background: rgba(0,0,0,0.7);
            }
            
            .slideshow-prev {
                left: 10px;
            }
            
            .slideshow-next {
                right: 10px;
            }
            
            .slideshow-indicators {
                text-align: center;
                pointer-events: auto;
            }
            
            .slideshow-dot {
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: rgba(255,255,255,0.5);
                margin: 0 4px;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .slideshow-dot.active {
                background: white;
            }
            
            @media (min-width: 769px) {
                .slideshow-mobile-controls {
                    display: none;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Add controls to container
        container.appendChild(controls);
        
        // Setup control handlers
        const prevBtn = controls.querySelector('.slideshow-prev');
        const nextBtn = controls.querySelector('.slideshow-next');
        
        prevBtn.addEventListener('click', () => {
            if (window.slideshowAPI) window.slideshowAPI.prev();
        });
        
        nextBtn.addEventListener('click', () => {
            if (window.slideshowAPI) window.slideshowAPI.next();
        });
        
        // Create indicators
        const slides = container.querySelectorAll('.slide');
        const indicatorsContainer = controls.querySelector('.slideshow-indicators');
        
        slides.forEach((slide, index) => {
            const dot = document.createElement('span');
            dot.className = 'slideshow-dot';
            if (index === 0) dot.classList.add('active');
            
            dot.addEventListener('click', () => {
                if (window.slideshowAPI) window.slideshowAPI.goto(index);
            });
            
            indicatorsContainer.appendChild(dot);
        });
        
        // Update indicators on slide change
        const updateIndicators = () => {
            if (!window.slideshowAPI) return;
            
            const state = window.slideshowAPI.getState();
            const dots = indicatorsContainer.querySelectorAll('.slideshow-dot');
            
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === state.currentSlide);
            });
        };
        
        // Poll for slide changes (since we can't modify the original slideshow)
        setInterval(updateIndicators, 1000);
        
        console.log('[Slideshow Mobile] Controls added');
    }
    
    // Initialize mobile optimizations
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        console.log('[Slideshow Mobile] Initializing mobile optimizations');
        
        optimizeImagesForMobile();
        addTouchSupport();
        addVisibilityHandling();
        
        // Wait a bit for slideshow to initialize
        setTimeout(() => {
            addMobileControls();
        }, 1000);
    }
    
    init();
})();