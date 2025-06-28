// Admin App Main Controller
(function() {
    'use strict';
    
    const AdminApp = {
        currentView: 'dashboard',
        initialized: false,
        
        // Initialize admin app
        async init() {
            try {
                // Initialize authentication guard first
                const isAuthorized = await AdminAuthGuard.init();
                if (!isAuthorized) {
                    return;
                }
                
                // Initialize UI components
                this.initializeUI();
                
                // Initialize modules
                this.initializeModules();
                
                // Set up navigation
                this.setupNavigation();
                
                // Set up theme toggle
                this.setupThemeToggle();
                
                // Mark as initialized
                this.initialized = true;
                
                console.log('Admin app initialized successfully');
                
            } catch (error) {
                console.error('Failed to initialize admin app:', error);
                this.showError('Failed to initialize admin application');
            }
        },
        
        // Initialize UI components
        initializeUI() {
            // Setup sidebar toggle
            this.setupSidebarToggle();
            
            // Setup user dropdown
            this.setupUserDropdown();
            
            // Setup logout
            this.setupLogout();
            
            // Set initial view
            this.showView('dashboard');
        },
        
        // Initialize modules
        initializeModules() {
            // Initialize dashboard
            if (window.AdminDashboard) {
                AdminDashboard.init();
            }
            
            // Initialize user management when users view is accessed
            this.initializeUserManagement();
        },
        
        // Initialize user management
        initializeUserManagement() {
            if (window.UserManagement && !UserManagement.initialized) {
                UserManagement.init();
                UserManagement.initialized = true;
            }
        },
        
        // Initialize tree management
        initializeTreeManagement() {
            if (window.TreeManagement && !TreeManagement.initialized) {
                TreeManagement.init();
                TreeManagement.initialized = true;
            }
        },
        
        // Initialize audit module
        initializeAuditModule() {
            if (window.AuditModule && !AuditModule.initialized) {
                AuditModule.init();
                AuditModule.initialized = true;
            }
        },
        
        // Initialize content management
        initializeContentManagement() {
            if (window.ContentManagement && !ContentManagement.initialized) {
                ContentManagement.init();
                ContentManagement.initialized = true;
            }
        },
        
        // Initialize communications module
        initializeCommunicationsModule() {
            if (window.CommunicationsModule && !CommunicationsModule.initialized) {
                CommunicationsModule.init();
                CommunicationsModule.initialized = true;
            }
        },
        
        // Setup navigation
        setupNavigation() {
            // Sidebar navigation
            const menuLinks = document.querySelectorAll('.menu-link');
            menuLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('#')) {
                        const view = href.substring(1);
                        this.navigateToView(view);
                    }
                });
            });
            
            // Handle browser back/forward
            window.addEventListener('popstate', (e) => {
                if (e.state && e.state.view) {
                    this.showView(e.state.view, false);
                }
            });
            
            // Set initial state
            const hash = window.location.hash.substring(1) || 'dashboard';
            history.replaceState({ view: hash }, '', `#${hash}`);
        },
        
        // Navigate to view
        navigateToView(view) {
            this.showView(view);
            history.pushState({ view }, '', `#${view}`);
        },
        
        // Show specific view
        showView(view, updateHistory = true) {
            // Hide all views
            const views = document.querySelectorAll('.admin-view');
            views.forEach(v => v.style.display = 'none');
            
            // Show target view
            const targetView = document.getElementById(`${view}View`);
            if (targetView) {
                targetView.style.display = 'block';
                
                // Initialize view-specific functionality
                this.initializeView(view);
            }
            
            // Update navigation
            this.updateNavigation(view);
            
            // Update current view
            this.currentView = view;
            
            // Update browser history
            if (updateHistory) {
                history.pushState({ view }, '', `#${view}`);
            }
        },
        
        // Initialize view-specific functionality
        initializeView(view) {
            switch (view) {
                case 'users':
                    this.initializeUserManagement();
                    break;
                case 'trees':
                    this.initializeTreeManagement();
                    break;
                case 'analytics':
                    // Initialize analytics
                    break;
                case 'content':
                    this.initializeContentManagement();
                    break;
                case 'communications':
                    this.initializeCommunicationsModule();
                    break;
                case 'audit':
                    this.initializeAuditModule();
                    break;
            }
        },
        
        // Update navigation active state
        updateNavigation(activeView) {
            // Remove active class from all menu items
            const menuItems = document.querySelectorAll('.menu-item');
            menuItems.forEach(item => item.classList.remove('active'));
            
            // Add active class to current view
            const activeMenuItem = document.querySelector(`.menu-link[href="#${activeView}"]`)?.parentElement;
            if (activeMenuItem) {
                activeMenuItem.classList.add('active');
            }
        },
        
        // Setup sidebar toggle
        setupSidebarToggle() {
            const navToggle = document.getElementById('navToggle');
            const sidebar = document.getElementById('adminSidebar');
            
            if (navToggle && sidebar) {
                navToggle.addEventListener('click', () => {
                    sidebar.classList.toggle('collapsed');
                    
                    // Save preference
                    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
                });
                
                // Restore sidebar state
                const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
                if (isCollapsed) {
                    sidebar.classList.add('collapsed');
                }
            }
        },
        
        // Setup user dropdown
        setupUserDropdown() {
            const userMenuToggle = document.querySelector('.user-menu-toggle');
            const userDropdown = document.querySelector('.user-dropdown');
            
            if (userMenuToggle && userDropdown) {
                let isOpen = false;
                
                userMenuToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    isOpen = !isOpen;
                    userDropdown.style.opacity = isOpen ? '1' : '0';
                    userDropdown.style.visibility = isOpen ? 'visible' : 'hidden';
                    userDropdown.style.transform = isOpen ? 'translateY(0)' : 'translateY(-10px)';
                });
                
                // Close dropdown when clicking outside
                document.addEventListener('click', () => {
                    if (isOpen) {
                        isOpen = false;
                        userDropdown.style.opacity = '0';
                        userDropdown.style.visibility = 'hidden';
                        userDropdown.style.transform = 'translateY(-10px)';
                    }
                });
            }
        },
        
        // Setup logout
        setupLogout() {
            const logoutBtn = document.getElementById('adminLogout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.confirmLogout();
                });
            }
        },
        
        // Confirm logout
        confirmLogout() {
            if (confirm('Are you sure you want to logout?')) {
                AdminAuthGuard.logout();
            }
        },
        
        // Setup theme toggle
        setupThemeToggle() {
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', () => {
                    this.toggleTheme();
                });
                
                // Restore theme preference
                const savedTheme = localStorage.getItem('adminTheme') || 'light';
                this.setTheme(savedTheme);
            }
        },
        
        // Toggle theme
        toggleTheme() {
            const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            this.setTheme(newTheme);
        },
        
        // Set theme
        setTheme(theme) {
            const themeToggle = document.getElementById('themeToggle');
            const themeIcon = themeToggle?.querySelector('.material-icons');
            
            if (theme === 'dark') {
                document.body.classList.add('dark-theme');
                if (themeIcon) themeIcon.textContent = 'light_mode';
            } else {
                document.body.classList.remove('dark-theme');
                if (themeIcon) themeIcon.textContent = 'dark_mode';
            }
            
            localStorage.setItem('adminTheme', theme);
        },
        
        // Show success message
        showSuccess(message) {
            this.showToast(message, 'success');
        },
        
        // Show error message
        showError(message) {
            this.showToast(message, 'error');
        },
        
        // Show info message
        showInfo(message) {
            this.showToast(message, 'info');
        },
        
        // Show toast notification
        showToast(message, type = 'info') {
            // Create toast element
            const toast = document.createElement('div');
            toast.className = `admin-toast toast-${type}`;
            toast.innerHTML = `
                <div class="toast-content">
                    <span class="material-icons">${this.getToastIcon(type)}</span>
                    <span class="toast-message">${message}</span>
                </div>
                <button class="toast-close">
                    <span class="material-icons">close</span>
                </button>
            `;
            
            // Add styles if not already added
            if (!document.querySelector('#admin-toast-styles')) {
                const styles = document.createElement('style');
                styles.id = 'admin-toast-styles';
                styles.textContent = `
                    .admin-toast {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                        padding: 16px;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        z-index: 10000;
                        min-width: 300px;
                        animation: slideInRight 0.3s ease;
                    }
                    .toast-success { border-left: 4px solid #4caf50; }
                    .toast-error { border-left: 4px solid #f44336; }
                    .toast-info { border-left: 4px solid #2196f3; }
                    .toast-content { display: flex; align-items: center; gap: 8px; flex: 1; }
                    .toast-close { background: none; border: none; cursor: pointer; }
                    @keyframes slideInRight {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(styles);
            }
            
            // Add to page
            document.body.appendChild(toast);
            
            // Setup close button
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => {
                this.removeToast(toast);
            });
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                this.removeToast(toast);
            }, 5000);
        },
        
        // Get toast icon
        getToastIcon(type) {
            const icons = {
                success: 'check_circle',
                error: 'error',
                info: 'info',
                warning: 'warning'
            };
            return icons[type] || 'info';
        },
        
        // Remove toast
        removeToast(toast) {
            if (toast && toast.parentNode) {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        },
        
        // Cleanup on page unload
        cleanup() {
            if (window.AdminDashboard && AdminDashboard.destroy) {
                AdminDashboard.destroy();
            }
        }
    };
    
    // Global error handler
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        if (AdminApp.initialized) {
            AdminApp.showError('An unexpected error occurred');
        }
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        AdminApp.cleanup();
    });
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            AdminApp.init();
        });
    } else {
        AdminApp.init();
    }
    
    // Export for global use
    window.AdminApp = AdminApp;
    
    // Export helper functions
    window.showSuccess = (message) => AdminApp.showSuccess(message);
    window.showError = (message) => AdminApp.showError(message);
    window.showInfo = (message) => AdminApp.showInfo(message);
})();