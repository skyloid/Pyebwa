// Enhanced Mobile Navigation
(function() {
    'use strict';
    
    let isMenuOpen = false;
    let touchStartY = 0;
    
    function initMobileNav() {
        console.log('[Mobile Nav] Initializing enhanced mobile navigation');
        
        // Find elements with multiple possible IDs/classes
        const menuToggle = document.getElementById('mobileMenuToggle') || 
                          document.querySelector('.mobile-menu-toggle');
        const navMenu = document.getElementById('navMenu') || 
                       document.querySelector('.nav-menu');
        
        if (!menuToggle || !navMenu) {
            console.error('[Mobile Nav] Required elements not found');
            return;
        }
        
        // Ensure menu is hidden initially
        navMenu.classList.remove('active');
        
        // Toggle menu handler
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (isMenuOpen && !navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                closeMenu();
            }
        });
        
        // Close menu when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isMenuOpen) {
                closeMenu();
            }
        });
        
        // Close menu when clicking on links
        const menuLinks = navMenu.querySelectorAll('a, button');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                // Small delay to allow navigation to start
                setTimeout(closeMenu, 100);
            });
        });
        
        // Handle window resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (window.innerWidth > 768 && isMenuOpen) {
                    closeMenu();
                }
            }, 250);
        });
        
        // Prevent body scroll when menu is open
        function preventBodyScroll(prevent) {
            if (prevent) {
                document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
            } else {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
            }
        }
        
        // Toggle menu function
        function toggleMenu() {
            if (isMenuOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        }
        
        // Open menu
        function openMenu() {
            isMenuOpen = true;
            navMenu.classList.add('active');
            menuToggle.classList.add('active');
            preventBodyScroll(true);
            
            // Update icon
            const icon = menuToggle.querySelector('.material-icons');
            if (icon) {
                icon.textContent = 'close';
            }
            
            // Animate menu items
            const menuItems = navMenu.querySelectorAll('.nav-link, .nav-buttons .btn');
            menuItems.forEach((item, index) => {
                item.style.opacity = '0';
                item.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    item.style.transition = 'opacity 0.3s, transform 0.3s';
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 50);
            });
            
            console.log('[Mobile Nav] Menu opened');
        }
        
        // Close menu
        function closeMenu() {
            isMenuOpen = false;
            navMenu.classList.remove('active');
            menuToggle.classList.remove('active');
            preventBodyScroll(false);
            
            // Update icon
            const icon = menuToggle.querySelector('.material-icons');
            if (icon) {
                icon.textContent = 'menu';
            }
            
            console.log('[Mobile Nav] Menu closed');
        }
        
        // Add swipe to close functionality
        navMenu.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        navMenu.addEventListener('touchmove', (e) => {
            if (!isMenuOpen) return;
            
            const touchEndY = e.touches[0].clientY;
            const swipeDistance = touchStartY - touchEndY;
            
            // Swipe up to close
            if (swipeDistance < -50) {
                closeMenu();
            }
        }, { passive: true });
        
        // Improve menu button visibility
        const style = document.createElement('style');
        style.textContent = `
            /* Enhanced mobile navigation styles */
            .mobile-menu-toggle {
                -webkit-tap-highlight-color: transparent;
                user-select: none;
                transition: transform 0.2s;
            }
            
            .mobile-menu-toggle:active {
                transform: scale(0.95);
            }
            
            .mobile-menu-toggle.active .material-icons {
                transform: rotate(90deg);
                transition: transform 0.3s;
            }
            
            .nav-menu {
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
            }
            
            .nav-menu.active {
                animation: slideDown 0.3s ease-out;
            }
            
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* Ensure menu button is always visible */
            @media (max-width: 768px) {
                .mobile-menu-toggle {
                    display: flex !important;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.9);
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .hero .mobile-menu-toggle {
                    background: rgba(255, 255, 255, 0.9);
                }
                
                .mobile-menu-toggle .material-icons {
                    color: var(--gray-900) !important;
                }
            }
            
            /* Fix for iOS Safari bounce */
            .nav-menu.active {
                position: fixed;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                max-height: calc(100vh - 60px);
            }
            
            /* Accessibility improvements */
            .nav-link:focus,
            .nav-buttons .btn:focus {
                outline: 2px solid var(--primary-blue);
                outline-offset: 2px;
            }
        `;
        document.head.appendChild(style);
        
        console.log('[Mobile Nav] Enhanced mobile navigation initialized');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileNav);
    } else {
        initMobileNav();
    }
})();