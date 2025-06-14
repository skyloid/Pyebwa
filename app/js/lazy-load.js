// Lazy Loading for Images with Progressive Enhancement
(function() {
    'use strict';
    
    const LazyLoad = {
        options: {
            rootMargin: '50px 0px',
            threshold: 0.01,
            fadeInDuration: 300
        },
        
        imageObserver: null,
        loadedImages: new Set(),
        
        // Initialize lazy loading
        init() {
            if ('IntersectionObserver' in window) {
                this.setupIntersectionObserver();
                this.processImages();
                this.observeMutations();
            } else {
                // Fallback for older browsers
                this.loadAllImages();
            }
            
            // Add CSS for loading states
            this.addStyles();
        },
        
        // Add necessary CSS
        addStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .lazy-image {
                    opacity: 0;
                    transition: opacity ${this.options.fadeInDuration}ms ease-in-out;
                }
                
                .lazy-image.loaded {
                    opacity: 1;
                }
                
                .lazy-image-wrapper {
                    position: relative;
                    overflow: hidden;
                    background-color: #f0f0f0;
                }
                
                body.dark-mode .lazy-image-wrapper {
                    background-color: #2a2a2a;
                }
                
                .lazy-image-wrapper::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(90deg, 
                        rgba(255,255,255,0) 0%, 
                        rgba(255,255,255,0.4) 50%, 
                        rgba(255,255,255,0) 100%);
                    animation: shimmer 1.5s infinite;
                    z-index: 1;
                }
                
                body.dark-mode .lazy-image-wrapper::before {
                    background: linear-gradient(90deg, 
                        rgba(255,255,255,0) 0%, 
                        rgba(255,255,255,0.1) 50%, 
                        rgba(255,255,255,0) 100%);
                }
                
                .lazy-image-wrapper.loaded::before {
                    display: none;
                }
                
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                
                .lazy-error {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #999;
                    font-size: 14px;
                    padding: 20px;
                    text-align: center;
                }
                
                .lazy-error-icon {
                    font-size: 48px;
                    color: #ddd;
                    margin-bottom: 10px;
                }
            `;
            
            if (!document.querySelector('#lazy-load-styles')) {
                style.id = 'lazy-load-styles';
                document.head.appendChild(style);
            }
        },
        
        // Setup Intersection Observer
        setupIntersectionObserver() {
            this.imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, this.options);
        },
        
        // Process all images on the page
        processImages() {
            // Find all images that should be lazy loaded
            const images = document.querySelectorAll('img[data-src], img.lazy');
            
            images.forEach(img => {
                this.prepareImage(img);
            });
        },
        
        // Prepare image for lazy loading
        prepareImage(img) {
            // Skip if already processed
            if (this.loadedImages.has(img)) return;
            
            // Add wrapper if needed
            if (!img.closest('.lazy-image-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'lazy-image-wrapper';
                
                // Copy dimensions if available
                if (img.width) wrapper.style.width = img.width + 'px';
                if (img.height) wrapper.style.height = img.height + 'px';
                
                // Preserve aspect ratio
                if (img.dataset.aspectRatio) {
                    wrapper.style.paddingBottom = img.dataset.aspectRatio;
                    wrapper.style.height = '0';
                }
                
                img.parentNode.insertBefore(wrapper, img);
                wrapper.appendChild(img);
            }
            
            // Add lazy class
            img.classList.add('lazy-image');
            
            // Set low quality placeholder if available
            if (img.dataset.placeholder) {
                img.src = img.dataset.placeholder;
            }
            
            // Start observing
            this.imageObserver.observe(img);
        },
        
        // Load the actual image
        loadImage(img) {
            const src = img.dataset.src || img.getAttribute('data-src');
            if (!src) return;
            
            // Create a new image to preload
            const tempImg = new Image();
            
            tempImg.onload = () => {
                // Update src
                img.src = src;
                
                // Handle srcset if available
                if (img.dataset.srcset) {
                    img.srcset = img.dataset.srcset;
                }
                
                // Mark as loaded
                img.classList.add('loaded');
                const wrapper = img.closest('.lazy-image-wrapper');
                if (wrapper) wrapper.classList.add('loaded');
                
                // Clean up data attributes
                delete img.dataset.src;
                delete img.dataset.srcset;
                delete img.dataset.placeholder;
                
                // Track loaded image
                this.loadedImages.add(img);
                
                // Fire custom event
                img.dispatchEvent(new CustomEvent('lazyloaded', {
                    detail: { src }
                }));
            };
            
            tempImg.onerror = () => {
                // Handle error
                console.error(`Failed to load image: ${src}`);
                
                const wrapper = img.closest('.lazy-image-wrapper');
                if (wrapper) {
                    wrapper.classList.add('loaded', 'error');
                    wrapper.innerHTML = `
                        <div class="lazy-error">
                            <div class="lazy-error-icon">🖼️</div>
                            <div>Image could not be loaded</div>
                        </div>
                    `;
                }
                
                // Fire error event
                img.dispatchEvent(new CustomEvent('lazyerror', {
                    detail: { src }
                }));
            };
            
            // Start loading
            tempImg.src = src;
        },
        
        // Observe DOM mutations for new images
        observeMutations() {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            if (node.tagName === 'IMG' && (node.dataset.src || node.classList.contains('lazy'))) {
                                this.prepareImage(node);
                            } else {
                                // Check for images within the added node
                                const images = node.querySelectorAll('img[data-src], img.lazy');
                                images.forEach(img => this.prepareImage(img));
                            }
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },
        
        // Fallback for browsers without IntersectionObserver
        loadAllImages() {
            const images = document.querySelectorAll('img[data-src]');
            images.forEach(img => {
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    delete img.dataset.src;
                }
            });
        },
        
        // Force load specific images
        forceLoad(selector) {
            const images = document.querySelectorAll(selector);
            images.forEach(img => {
                this.imageObserver.unobserve(img);
                this.loadImage(img);
            });
        },
        
        // Convert regular images to lazy loaded
        convertToLazy(img, placeholder = null) {
            if (this.loadedImages.has(img)) return;
            
            // Store original src
            img.dataset.src = img.src;
            
            // Set placeholder
            if (placeholder) {
                img.src = placeholder;
                img.dataset.placeholder = placeholder;
            } else {
                // Create simple SVG placeholder
                const width = img.width || 100;
                const height = img.height || 100;
                img.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3C/svg%3E`;
            }
            
            // Process for lazy loading
            this.prepareImage(img);
        }
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => LazyLoad.init());
    } else {
        LazyLoad.init();
    }
    
    // Export for manual control
    window.pyebwaLazyLoad = LazyLoad;
})();