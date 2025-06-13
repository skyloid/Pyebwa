// Enhanced Mobile Navigation with Touch Support
(function() {
    'use strict';
    
    let isInitialized = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    
    function initMobileNav() {
        if (isInitialized) return;
        isInitialized = true;
        
        console.log('[MobileNav] Initializing enhanced mobile navigation');
        
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenuClose = document.getElementById('mobileMenuClose');
        const mobileNav = document.getElementById('mobileNav');
        const mobileNavContent = document.querySelector('.mobile-nav-content');
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item[data-view]');
        const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
        
        if (!mobileNav || !mobileNavContent) {
            console.warn('[MobileNav] Mobile navigation elements not found');
            return;
        }
        
        // Prevent duplicate menus - hide any duplicates
        const allMobileNavs = document.querySelectorAll('.mobile-nav');
        if (allMobileNavs.length > 1) {
            console.warn('[MobileNav] Found duplicate mobile navs, hiding extras');
            for (let i = 1; i < allMobileNavs.length; i++) {
                allMobileNavs[i].style.display = 'none';
                allMobileNavs[i].remove();
            }
        }
        
        // Enhanced touch handling for menu button
        if (mobileMenuBtn) {
            // Remove any existing listeners
            mobileMenuBtn.replaceWith(mobileMenuBtn.cloneNode(true));
            const newMenuBtn = document.getElementById('mobileMenuBtn');
            
            // Add both click and touch events
            const openMenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[MobileNav] Opening menu');
                mobileNav.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent background scroll
            };
            
            newMenuBtn.addEventListener('click', openMenu);
            newMenuBtn.addEventListener('touchend', openMenu, { passive: false });
        }
        
        // Enhanced touch handling for close button
        if (mobileMenuClose) {
            // Remove any existing listeners
            mobileMenuClose.replaceWith(mobileMenuClose.cloneNode(true));
            const newCloseBtn = document.getElementById('mobileMenuClose');
            
            const closeMenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[MobileNav] Closing menu');
                mobileNav.classList.remove('active');
                document.body.style.overflow = ''; // Restore scroll
            };
            
            newCloseBtn.addEventListener('click', closeMenu);
            newCloseBtn.addEventListener('touchend', closeMenu, { passive: false });
        }
        
        // Close menu when clicking/touching overlay
        const closeOnOverlay = (e) => {
            if (e.target === mobileNav) {
                console.log('[MobileNav] Closing menu via overlay');
                mobileNav.classList.remove('active');
                document.body.style.overflow = '';
            }
        };
        
        mobileNav.addEventListener('click', closeOnOverlay);
        mobileNav.addEventListener('touchend', closeOnOverlay, { passive: false });
        
        // Swipe to close gesture
        if (mobileNavContent) {
            mobileNavContent.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                isSwiping = false;
            }, { passive: true });
            
            mobileNavContent.addEventListener('touchmove', (e) => {
                if (!touchStartX) return;
                
                const touchEndX = e.touches[0].clientX;
                const touchEndY = e.touches[0].clientY;
                const diffX = touchStartX - touchEndX;
                const diffY = Math.abs(touchStartY - touchEndY);
                
                // Detect horizontal swipe
                if (Math.abs(diffX) > 50 && diffY < 50) {
                    isSwiping = true;
                    
                    // Swipe left to close
                    if (diffX > 0) {
                        const translateX = Math.min(diffX, mobileNavContent.offsetWidth);
                        mobileNavContent.style.transform = `translateX(-${translateX}px)`;
                    }
                }
            }, { passive: true });
            
            mobileNavContent.addEventListener('touchend', (e) => {
                if (!isSwiping) return;
                
                const touchEndX = e.changedTouches[0].clientX;
                const diffX = touchStartX - touchEndX;
                
                if (diffX > 100) {
                    // Close menu
                    mobileNav.classList.remove('active');
                    document.body.style.overflow = '';
                } else {
                    // Snap back
                    mobileNavContent.style.transform = 'translateX(0)';
                }
                
                // Reset
                touchStartX = 0;
                touchStartY = 0;
                isSwiping = false;
                
                // Remove inline transform after animation
                setTimeout(() => {
                    mobileNavContent.style.transform = '';
                }, 300);
            }, { passive: true });
        }
        
        // Handle navigation item clicks
        mobileNavItems.forEach(item => {
            // Clone to remove existing listeners
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            const handleNavClick = (e) => {
                e.preventDefault();
                const view = newItem.getAttribute('data-view');
                
                console.log('[MobileNav] Navigating to:', view);
                
                // Update active state
                document.querySelectorAll('.mobile-nav-item').forEach(navItem => {
                    navItem.classList.remove('active');
                });
                newItem.classList.add('active');
                
                // Close menu
                mobileNav.classList.remove('active');
                document.body.style.overflow = '';
                
                // Trigger view change
                if (window.showView) {
                    window.showView(view);
                }
                
                // Sync with desktop nav
                document.querySelectorAll('.nav-item').forEach(desktopItem => {
                    desktopItem.classList.toggle('active', 
                        desktopItem.getAttribute('data-view') === view);
                });
            };
            
            newItem.addEventListener('click', handleNavClick);
            newItem.addEventListener('touchend', handleNavClick, { passive: false });
        });
        
        // Handle logout
        if (mobileLogoutBtn) {
            const newLogoutBtn = mobileLogoutBtn.cloneNode(true);
            mobileLogoutBtn.parentNode.replaceChild(newLogoutBtn, mobileLogoutBtn);
            
            const handleLogout = (e) => {
                e.preventDefault();
                console.log('[MobileNav] Logging out');
                if (window.auth) {
                    window.auth.signOut();
                }
            };
            
            newLogoutBtn.addEventListener('click', handleLogout);
            newLogoutBtn.addEventListener('touchend', handleLogout, { passive: false });
        }
        
        // Sync active state with desktop nav
        function syncActiveState() {
            const activeDesktopItem = document.querySelector('.nav-item.active');
            if (activeDesktopItem) {
                const activeView = activeDesktopItem.getAttribute('data-view');
                document.querySelectorAll('.mobile-nav-item').forEach(item => {
                    item.classList.toggle('active', 
                        item.getAttribute('data-view') === activeView);
                });
            }
        }
        
        // Initial sync
        syncActiveState();
        
        // Watch for view changes
        const observer = new MutationObserver(syncActiveState);
        document.querySelectorAll('.nav-item').forEach(item => {
            observer.observe(item, { 
                attributes: true, 
                attributeFilter: ['class'] 
            });
        });
        
        // Prevent iOS bounce effect
        if (mobileNavContent) {
            let startY = 0;
            
            mobileNavContent.addEventListener('touchstart', (e) => {
                startY = e.touches[0].pageY;
            }, { passive: true });
            
            mobileNavContent.addEventListener('touchmove', (e) => {
                const y = e.touches[0].pageY;
                const scrollTop = mobileNavContent.scrollTop;
                const scrollHeight = mobileNavContent.scrollHeight;
                const height = mobileNavContent.clientHeight;
                
                // At top and trying to scroll up
                if (scrollTop === 0 && y > startY) {
                    e.preventDefault();
                }
                
                // At bottom and trying to scroll down
                if (scrollTop + height === scrollHeight && y < startY) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
        
        console.log('[MobileNav] Enhanced mobile navigation initialized');
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileNav);
    } else {
        initMobileNav();
    }
    
    // Also init on window load as fallback
    window.addEventListener('load', initMobileNav);
    
    // Expose for debugging
    window.mobileNavEnhanced = {
        init: initMobileNav,
        isInitialized: () => isInitialized
    };
})();