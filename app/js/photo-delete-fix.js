// Photo Delete Button Fix and Debug Script
(function() {
    'use strict';
    
    console.log('Photo Delete Fix Script Loaded');
    
    // Function to check and fix photo delete buttons
    function checkPhotoDeleteButtons() {
        const galleryContainer = document.querySelector('.photo-gallery');
        if (!galleryContainer) {
            console.log('No photo gallery found on page');
            return;
        }
        
        const galleryItems = galleryContainer.querySelectorAll('.gallery-item');
        const deleteButtons = galleryContainer.querySelectorAll('.photo-delete-btn');
        
        console.log('Gallery Debug Info:', {
            galleryItems: galleryItems.length,
            deleteButtons: deleteButtons.length,
            galleryContainer: galleryContainer
        });
        
        // Check each gallery item
        galleryItems.forEach((item, index) => {
            const button = item.querySelector('.photo-delete-btn');
            if (button) {
                // Get computed styles
                const styles = window.getComputedStyle(button);
                console.log(`Button ${index} styles:`, {
                    opacity: styles.opacity,
                    display: styles.display,
                    visibility: styles.visibility,
                    position: styles.position,
                    zIndex: styles.zIndex,
                    pointerEvents: styles.pointerEvents
                });
                
                // Check if button is actually invisible
                if (styles.opacity === '0' && !item.matches(':hover')) {
                    console.log(`Button ${index} is correctly hidden when not hovering`);
                }
                
                // Add debug class to make button visible
                if (window.debugPhotoButtons) {
                    button.style.opacity = '0.5';
                    button.style.border = '2px solid red';
                }
            } else {
                console.error(`No delete button found in gallery item ${index}`);
            }
        });
        
        // Add hover event listeners for debugging
        galleryItems.forEach((item, index) => {
            item.addEventListener('mouseenter', function() {
                console.log(`Mouse entered gallery item ${index}`);
                const btn = this.querySelector('.photo-delete-btn');
                if (btn) {
                    const opacity = window.getComputedStyle(btn).opacity;
                    console.log(`Button opacity on hover: ${opacity}`);
                }
            });
            
            item.addEventListener('mouseleave', function() {
                console.log(`Mouse left gallery item ${index}`);
            });
        });
    }
    
    // Function to add debug mode
    function enableDebugMode() {
        document.body.classList.add('debug-mode');
        
        // Create debug info panel
        const debugPanel = document.createElement('div');
        debugPanel.className = 'debug-info';
        debugPanel.innerHTML = `
            <h4>Photo Gallery Debug</h4>
            <p>Debug mode enabled</p>
            <p>Buttons should be semi-visible</p>
            <button onclick="window.toggleForceVisible()" style="margin-top: 10px; padding: 5px 10px;">
                Toggle Force Visible
            </button>
        `;
        document.body.appendChild(debugPanel);
        
        console.log('Debug mode enabled - buttons should be semi-visible');
    }
    
    // Function to force buttons visible
    window.toggleForceVisible = function() {
        document.body.classList.toggle('force-visible');
        console.log('Force visible toggled:', document.body.classList.contains('force-visible'));
    };
    
    // Function to manually fix button visibility
    function fixButtonVisibility() {
        const buttons = document.querySelectorAll('.photo-delete-btn');
        buttons.forEach((btn, index) => {
            // Ensure button has proper event handling
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                console.log(`Delete button ${index} clicked`);
            });
            
            // Check parent gallery item
            const galleryItem = btn.closest('.gallery-item');
            if (galleryItem) {
                // Ensure hover works
                galleryItem.addEventListener('mouseenter', function() {
                    btn.style.opacity = '1';
                });
                
                galleryItem.addEventListener('mouseleave', function() {
                    btn.style.opacity = '0';
                });
            }
        });
        
        console.log(`Fixed visibility for ${buttons.length} delete buttons`);
    }
    
    // Run checks when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkPhotoDeleteButtons);
    } else {
        checkPhotoDeleteButtons();
    }
    
    // Also check when gallery tab is clicked
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-tab="gallery"]') || e.target.closest('[data-tab="gallery"]')) {
            console.log('Gallery tab clicked - checking buttons...');
            setTimeout(checkPhotoDeleteButtons, 500);
        }
    });
    
    // Expose debug functions globally
    window.photoDeleteDebug = {
        check: checkPhotoDeleteButtons,
        enableDebug: enableDebugMode,
        fix: fixButtonVisibility,
        forceVisible: function() {
            document.querySelectorAll('.photo-delete-btn').forEach(btn => {
                btn.style.opacity = '1';
                btn.style.visibility = 'visible';
            });
        }
    };
    
    // Add console help
    console.log('Photo Delete Debug Functions Available:');
    console.log('- photoDeleteDebug.check() - Check button status');
    console.log('- photoDeleteDebug.enableDebug() - Enable debug mode');
    console.log('- photoDeleteDebug.fix() - Fix button visibility');
    console.log('- photoDeleteDebug.forceVisible() - Force all buttons visible');
    
})();