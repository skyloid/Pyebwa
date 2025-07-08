// Simple Mobile Navigation Handler
(function() {
    'use strict';
    
    // Wait for DOM to be ready
    function initMobileNav() {
        console.log('[MobileNavSimple] Initializing mobile navigation');
        
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenuClose = document.getElementById('mobileMenuClose');
        const mobileNav = document.getElementById('mobileNav');
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item[data-view]');
        const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
        
        if (!mobileMenuBtn || !mobileNav) {
            console.warn('[MobileNavSimple] Required elements not found');
            return;
        }
        
        // Open menu function
        function openMenu() {
            console.log('[MobileNavSimple] Opening menu');
            mobileNav.classList.add('active');
            document.body.classList.add('mobile-menu-open');
        }
        
        // Close menu function
        function closeMenu() {
            console.log('[MobileNavSimple] Closing menu');
            mobileNav.classList.remove('active');
            document.body.classList.remove('mobile-menu-open');
        }
        
        // Toggle menu function
        function toggleMenu() {
            if (mobileNav.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
        }
        
        // Menu button click handler
        mobileMenuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        });
        
        // Close button click handler
        if (mobileMenuClose) {
            mobileMenuClose.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeMenu();
            });
        }
        
        // Click outside to close
        mobileNav.addEventListener('click', function(e) {
            if (e.target === mobileNav) {
                closeMenu();
            }
        });
        
        // Navigation item clicks
        mobileNavItems.forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const view = item.getAttribute('data-view');
                
                console.log('[MobileNavSimple] Navigating to:', view);
                
                // Update active states
                mobileNavItems.forEach(navItem => navItem.classList.remove('active'));
                item.classList.add('active');
                
                // Close menu
                closeMenu();
                
                // Trigger navigation
                if (window.showView && typeof window.showView === 'function') {
                    window.showView(view);
                }
                
                // Sync with desktop nav
                document.querySelectorAll('.nav-item').forEach(desktopItem => {
                    if (desktopItem.getAttribute('data-view') === view) {
                        desktopItem.classList.add('active');
                    } else {
                        desktopItem.classList.remove('active');
                    }
                });
            });
        });
        
        // Logout handler
        if (mobileLogoutBtn) {
            mobileLogoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('[MobileNavSimple] Logging out');
                if (window.auth && window.auth.signOut) {
                    window.auth.signOut();
                }
            });
        }
        
        // Sync active state on init
        const activeDesktopItem = document.querySelector('.nav-item.active');
        if (activeDesktopItem) {
            const activeView = activeDesktopItem.getAttribute('data-view');
            mobileNavItems.forEach(item => {
                if (item.getAttribute('data-view') === activeView) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
        
        console.log('[MobileNavSimple] Mobile navigation initialized successfully');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileNav);
    } else {
        // DOM is already ready
        initMobileNav();
    }
    
    // Expose for debugging
    window.mobileNavSimple = {
        init: initMobileNav,
        open: function() {
            const nav = document.getElementById('mobileNav');
            if (nav) {
                nav.classList.add('active');
                document.body.classList.add('mobile-menu-open');
            }
        },
        close: function() {
            const nav = document.getElementById('mobileNav');
            if (nav) {
                nav.classList.remove('active');
                document.body.classList.remove('mobile-menu-open');
            }
        }
    };
})();