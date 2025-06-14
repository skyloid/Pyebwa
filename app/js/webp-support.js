// WebP Support Detection and Image Optimization
(function() {
    'use strict';
    
    const WebPSupport = {
        supported: null,
        checked: false,
        
        // Check WebP support
        async checkSupport() {
            if (this.checked) return this.supported;
            
            try {
                const webP = new Image();
                const promise = new Promise((resolve) => {
                    webP.onload = webP.onerror = () => {
                        resolve(webP.height === 2);
                    };
                });
                
                webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
                
                this.supported = await promise;
                this.checked = true;
                
                // Store in session storage
                sessionStorage.setItem('webpSupport', this.supported ? 'true' : 'false');
                
                // Add class to body
                document.body.classList.add(this.supported ? 'webp' : 'no-webp');
                
                return this.supported;
            } catch (error) {
                console.error('WebP detection failed:', error);
                this.supported = false;
                this.checked = true;
                return false;
            }
        },
        
        // Initialize WebP support
        async init() {
            // Check session storage first
            const stored = sessionStorage.getItem('webpSupport');
            if (stored !== null) {
                this.supported = stored === 'true';
                this.checked = true;
                document.body.classList.add(this.supported ? 'webp' : 'no-webp');
            } else {
                await this.checkSupport();
            }
            
            // Process existing images
            this.processImages();
            
            // Setup mutation observer for new images
            this.observeNewImages();
            
            // Add CSS for picture element
            this.addStyles();
        },
        
        // Add necessary styles
        addStyles() {
            const style = document.createElement('style');
            style.textContent = `
                /* Picture element styles */
                picture {
                    display: inline-block;
                    line-height: 0;
                }
                
                picture img {
                    width: 100%;
                    height: auto;
                }
                
                /* Responsive images */
                .responsive-img {
                    max-width: 100%;
                    height: auto;
                }
                
                /* Image loading states */
                .img-loading {
                    background: linear-gradient(90deg, 
                        #f0f0f0 25%, 
                        #e0e0e0 50%, 
                        #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                }
                
                body.dark-mode .img-loading {
                    background: linear-gradient(90deg, 
                        #2a2a2a 25%, 
                        #3a3a3a 50%, 
                        #2a2a2a 75%);
                }
                
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `;
            
            if (!document.querySelector('#webp-support-styles')) {
                style.id = 'webp-support-styles';
                document.head.appendChild(style);
            }
        },
        
        // Process all images on the page
        processImages() {
            const images = document.querySelectorAll('img[data-webp], img.optimize-webp');
            images.forEach(img => this.optimizeImage(img));
        },
        
        // Optimize individual image
        optimizeImage(img) {
            // Skip if already processed
            if (img.dataset.webpProcessed) return;
            
            const src = img.src || img.dataset.src;
            const webpSrc = img.dataset.webp || this.generateWebPUrl(src);
            
            if (!webpSrc || webpSrc === src) return;
            
            // Create picture element
            const picture = document.createElement('picture');
            
            // Add responsive sources if available
            if (img.dataset.srcset || img.srcset) {
                this.addResponsiveSources(picture, img);
            } else {
                // Add WebP source
                const webpSource = document.createElement('source');
                webpSource.type = 'image/webp';
                webpSource.srcset = webpSrc;
                picture.appendChild(webpSource);
                
                // Add original format source
                const originalSource = document.createElement('source');
                originalSource.type = this.getMimeType(src);
                originalSource.srcset = src;
                picture.appendChild(originalSource);
            }
            
            // Clone original image
            const newImg = img.cloneNode(true);
            newImg.removeAttribute('data-webp');
            newImg.dataset.webpProcessed = 'true';
            
            // Add to picture element
            picture.appendChild(newImg);
            
            // Replace original image
            img.parentNode.replaceChild(picture, img);
        },
        
        // Add responsive sources to picture element
        addResponsiveSources(picture, img) {
            const srcset = img.dataset.srcset || img.srcset;
            const sizes = img.sizes || '100vw';
            
            // Parse srcset
            const sources = this.parseSrcset(srcset);
            
            // Create WebP sources
            const webpSrcset = sources.map(source => {
                const webpUrl = img.dataset[`webp${source.width}`] || 
                               this.generateWebPUrl(source.url);
                return `${webpUrl} ${source.descriptor}`;
            }).join(', ');
            
            // Add WebP source
            const webpSource = document.createElement('source');
            webpSource.type = 'image/webp';
            webpSource.srcset = webpSrcset;
            webpSource.sizes = sizes;
            picture.appendChild(webpSource);
            
            // Add original format source
            const originalSource = document.createElement('source');
            originalSource.type = this.getMimeType(sources[0].url);
            originalSource.srcset = srcset;
            originalSource.sizes = sizes;
            picture.appendChild(originalSource);
        },
        
        // Parse srcset attribute
        parseSrcset(srcset) {
            return srcset.split(',').map(source => {
                const parts = source.trim().split(/\s+/);
                return {
                    url: parts[0],
                    descriptor: parts[1] || '1x',
                    width: parseInt(parts[1]) || null
                };
            });
        },
        
        // Generate WebP URL from original URL
        generateWebPUrl(url) {
            // Don't convert external URLs
            if (url.startsWith('http') && !url.includes(window.location.hostname)) {
                return url;
            }
            
            // Don't convert data URLs
            if (url.startsWith('data:')) {
                return url;
            }
            
            // Replace extension with .webp
            return url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        },
        
        // Get MIME type from URL
        getMimeType(url) {
            const extension = url.split('.').pop().toLowerCase();
            const mimeTypes = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'svg': 'image/svg+xml',
                'webp': 'image/webp'
            };
            return mimeTypes[extension] || 'image/jpeg';
        },
        
        // Observe for new images
        observeNewImages() {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'IMG' && 
                                (node.dataset.webp || node.classList.contains('optimize-webp'))) {
                                this.optimizeImage(node);
                            } else if (node.querySelectorAll) {
                                const images = node.querySelectorAll('img[data-webp], img.optimize-webp');
                                images.forEach(img => this.optimizeImage(img));
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
        
        // Convert image to WebP (requires server-side processing)
        async convertToWebP(file, quality = 0.85) {
            if (!this.supported) return file;
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    const img = new Image();
                    
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        
                        canvas.toBlob((blob) => {
                            if (blob) {
                                resolve(new File([blob], 
                                    file.name.replace(/\.[^/.]+$/, '.webp'), 
                                    { type: 'image/webp' }
                                ));
                            } else {
                                reject(new Error('Failed to convert to WebP'));
                            }
                        }, 'image/webp', quality);
                    };
                    
                    img.onerror = () => reject(new Error('Failed to load image'));
                    img.src = e.target.result;
                };
                
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });
        },
        
        // Preload WebP images
        preloadWebP(urls) {
            if (!this.supported) return;
            
            urls.forEach(url => {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'image';
                link.type = 'image/webp';
                link.href = this.generateWebPUrl(url);
                document.head.appendChild(link);
            });
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => WebPSupport.init());
    } else {
        WebPSupport.init();
    }
    
    // Export for external use
    window.pyebwaWebP = WebPSupport;
})();