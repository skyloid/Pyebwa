// Admin Router - Simple SPA Router
(function() {
    'use strict';
    
    const AdminRouter = {
        routes: {},
        currentRoute: null,
        defaultRoute: 'dashboard',
        
        // Initialize router
        init() {
            this.setupRoutes();
            this.handleInitialRoute();
            this.setupEventListeners();
        },
        
        // Setup routes
        setupRoutes() {
            this.routes = {
                'dashboard': {
                    title: 'Dashboard',
                    view: 'dashboardView',
                    requiresPermission: 'viewDashboard'
                },
                'users': {
                    title: 'User Management',
                    view: 'usersView',
                    requiresPermission: 'manageUsers'
                },
                'trees': {
                    title: 'Family Trees',
                    view: 'treesView',
                    requiresPermission: 'manageTrees'
                },
                'content': {
                    title: 'Content Management',
                    view: 'contentView',
                    requiresPermission: 'manageContent'
                },
                'analytics': {
                    title: 'Analytics',
                    view: 'analyticsView',
                    requiresPermission: 'viewAnalytics'
                },
                'communications': {
                    title: 'Communications',
                    view: 'communicationsView',
                    requiresPermission: 'manageCommunications'
                },
                'settings': {
                    title: 'Settings',
                    view: 'settingsView',
                    requiresPermission: 'manageSettings'
                },
                'audit': {
                    title: 'Audit Logs',
                    view: 'auditView',
                    requiresPermission: 'viewAuditLogs'
                },
                'backup': {
                    title: 'Backup',
                    view: 'backupView',
                    requiresPermission: 'manageBackup'
                }
            };
        },
        
        // Handle initial route
        handleInitialRoute() {
            const hash = window.location.hash.substring(1);
            const route = hash || this.defaultRoute;
            this.navigateTo(route, false);
        },
        
        // Setup event listeners
        setupEventListeners() {
            // Handle browser back/forward
            window.addEventListener('popstate', (e) => {
                if (e.state && e.state.route) {
                    this.showRoute(e.state.route, false);
                } else {
                    this.handleInitialRoute();
                }
            });
            
            // Handle hash changes
            window.addEventListener('hashchange', () => {
                const hash = window.location.hash.substring(1);
                if (hash && hash !== this.currentRoute) {
                    this.showRoute(hash, false);
                }
            });
        },
        
        // Navigate to route
        navigateTo(routeName, updateHistory = true) {
            const route = this.routes[routeName];
            
            if (!route) {
                console.warn(`Route '${routeName}' not found, redirecting to default`);
                routeName = this.defaultRoute;
                route = this.routes[routeName];
            }
            
            // Check permissions
            if (!this.hasPermission(route.requiresPermission)) {
                console.warn(`Access denied to route '${routeName}'`);
                this.showAccessDenied();
                return;
            }
            
            this.showRoute(routeName, updateHistory);
        },
        
        // Show route
        showRoute(routeName, updateHistory = true) {
            const route = this.routes[routeName];
            if (!route) return;
            
            // Hide all views
            this.hideAllViews();
            
            // Show target view
            const viewElement = document.getElementById(route.view);
            if (viewElement) {
                viewElement.style.display = 'block';
                
                // Initialize route-specific functionality
                this.initializeRoute(routeName);
            }
            
            // Update navigation
            this.updateNavigation(routeName);
            
            // Update document title
            document.title = `${route.title} - Pyebwa Admin`;
            
            // Update current route
            this.currentRoute = routeName;
            
            // Update browser history
            if (updateHistory) {
                const url = `#${routeName}`;
                history.pushState({ route: routeName }, route.title, url);
            }
            
            // Trigger route change event
            this.triggerRouteChange(routeName, route);
        },
        
        // Hide all views
        hideAllViews() {
            Object.values(this.routes).forEach(route => {
                const viewElement = document.getElementById(route.view);
                if (viewElement) {
                    viewElement.style.display = 'none';
                }
            });
        },
        
        // Update navigation
        updateNavigation(activeRoute) {
            // Remove active class from all menu items
            const menuItems = document.querySelectorAll('.menu-item');
            menuItems.forEach(item => item.classList.remove('active'));
            
            // Add active class to current route
            const activeMenuItem = document.querySelector(`.menu-link[href="#${activeRoute}"]`)?.parentElement;
            if (activeMenuItem) {
                activeMenuItem.classList.add('active');
            }
        },
        
        // Initialize route-specific functionality
        initializeRoute(routeName) {
            switch (routeName) {
                case 'dashboard':
                    if (window.AdminDashboard && !AdminDashboard.initialized) {
                        AdminDashboard.init();
                        AdminDashboard.initialized = true;
                    }
                    break;
                
                case 'users':
                    if (window.UserManagement && !UserManagement.initialized) {
                        UserManagement.init();
                        UserManagement.initialized = true;
                    }
                    break;
                
                case 'trees':
                    // Initialize tree management when implemented
                    break;
                
                case 'analytics':
                    // Initialize analytics when implemented
                    break;
                
                case 'audit':
                    // Initialize audit logs when implemented
                    break;
            }
        },
        
        // Check permission
        hasPermission(permission) {
            if (!permission) return true;
            
            const adminRole = AdminAuthGuard.getAdminRole();
            if (!adminRole) return false;
            
            // Define permission matrix
            const permissions = {
                'superadmin': [
                    'viewDashboard', 'manageUsers', 'manageTrees', 'manageContent',
                    'viewAnalytics', 'manageCommunications', 'manageSettings',
                    'viewAuditLogs', 'manageBackup'
                ],
                'admin': [
                    'viewDashboard', 'manageUsers', 'manageTrees', 'manageContent',
                    'viewAnalytics', 'manageCommunications', 'viewAuditLogs'
                ],
                'moderator': [
                    'viewDashboard', 'manageContent', 'viewAnalytics'
                ]
            };
            
            const rolePermissions = permissions[adminRole] || [];
            return rolePermissions.includes(permission);
        },
        
        // Show access denied
        showAccessDenied() {
            // Hide all views
            this.hideAllViews();
            
            // Show access denied message
            const mainContent = document.querySelector('.admin-main');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="access-denied">
                        <div class="denied-content">
                            <span class="material-icons denied-icon">lock</span>
                            <h1>Access Denied</h1>
                            <p>You don't have permission to access this page.</p>
                            <button class="btn btn-primary" onclick="AdminRouter.navigateTo('dashboard')">
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                `;
            }
        },
        
        // Trigger route change event
        triggerRouteChange(routeName, route) {
            const event = new CustomEvent('routechange', {
                detail: { route: routeName, config: route }
            });
            window.dispatchEvent(event);
        },
        
        // Get current route
        getCurrentRoute() {
            return this.currentRoute;
        },
        
        // Get route config
        getRouteConfig(routeName) {
            return this.routes[routeName];
        },
        
        // Check if route exists
        routeExists(routeName) {
            return !!this.routes[routeName];
        },
        
        // Add route dynamically
        addRoute(routeName, config) {
            this.routes[routeName] = config;
        },
        
        // Remove route
        removeRoute(routeName) {
            delete this.routes[routeName];
        },
        
        // Get all routes
        getAllRoutes() {
            return { ...this.routes };
        },
        
        // Redirect
        redirect(routeName) {
            this.navigateTo(routeName, true);
        },
        
        // Go back
        goBack() {
            if (history.length > 1) {
                history.back();
            } else {
                this.navigateTo(this.defaultRoute);
            }
        },
        
        // Replace current route
        replace(routeName) {
            const route = this.routes[routeName];
            if (!route) return;
            
            this.showRoute(routeName, false);
            
            // Replace current history entry
            const url = `#${routeName}`;
            history.replaceState({ route: routeName }, route.title, url);
        }
    };
    
    // Export for global use
    window.AdminRouter = AdminRouter;
    
    // Auto-initialize if AdminAuthGuard is ready
    if (window.AdminAuthGuard) {
        document.addEventListener('DOMContentLoaded', () => {
            // Small delay to ensure auth guard is initialized
            setTimeout(() => {
                if (AdminAuthGuard.getCurrentAdmin()) {
                    AdminRouter.init();
                }
            }, 100);
        });
    }
})();