// Mobile Navigation Handler
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenuClose = document.getElementById('mobileMenuClose');
        const mobileNav = document.getElementById('mobileNav');
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item[data-view]');
        const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
        
        // Open mobile menu
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', function() {
                mobileNav.classList.add('active');
            });
        }
        
        // Close mobile menu
        if (mobileMenuClose) {
            mobileMenuClose.addEventListener('click', function() {
                mobileNav.classList.remove('active');
            });
        }
        
        // Close menu when clicking outside
        if (mobileNav) {
            mobileNav.addEventListener('click', function(e) {
                if (e.target === mobileNav) {
                    mobileNav.classList.remove('active');
                }
            });
        }
        
        // Handle navigation item clicks
        mobileNavItems.forEach(item => {
            item.addEventListener('click', function() {
                const view = this.getAttribute('data-view');
                
                // Update active state
                mobileNavItems.forEach(navItem => {
                    navItem.classList.remove('active');
                });
                this.classList.add('active');
                
                // Close menu
                mobileNav.classList.remove('active');
                
                // Trigger view change (this will be handled by existing nav logic)
                if (window.showView) {
                    window.showView(view);
                }
                
                // Also update desktop nav
                document.querySelectorAll('.nav-item').forEach(desktopItem => {
                    desktopItem.classList.toggle('active', desktopItem.getAttribute('data-view') === view);
                });
            });
        });
        
        // Handle logout
        if (mobileLogoutBtn) {
            mobileLogoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (window.auth) {
                    window.auth.signOut();
                }
            });
        }
        
        // Sync active state with desktop nav
        function syncActiveState() {
            const activeDesktopItem = document.querySelector('.nav-item.active');
            if (activeDesktopItem) {
                const activeView = activeDesktopItem.getAttribute('data-view');
                mobileNavItems.forEach(item => {
                    item.classList.toggle('active', item.getAttribute('data-view') === activeView);
                });
            }
        }
        
        // Initial sync
        syncActiveState();
        
        // Re-sync when view changes
        const observer = new MutationObserver(syncActiveState);
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            observer.observe(item, { attributes: true, attributeFilter: ['class'] });
        });
    });
})();