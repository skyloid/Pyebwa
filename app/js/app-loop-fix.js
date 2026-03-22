// App Loop Prevention Fix
// Prevents infinite loops in app initialization and navigation

(function() {
    'use strict';
    
    console.log('[AppLoopFix] Loading app loop prevention module');
    
    const LoopFix = {
        initCount: 0,
        maxInits: 3,
        navigationCount: {},
        initialized: false,
        
        init() {
            if (this.initialized) {
                console.log('[AppLoopFix] Already initialized, skipping');
                return;
            }
            
            this.initCount++;
            
            if (this.initCount > this.maxInits) {
                console.error('[AppLoopFix] Max initialization attempts reached');
                this.breakInitLoop();
                return;
            }
            
            this.setupLoopDetection();
            this.monitorNavigation();
            this.fixCommonLoops();
            
            this.initialized = true;
            console.log('[AppLoopFix] App loop prevention initialized');
        },
        
        setupLoopDetection() {
            // Override common initialization functions
            this.wrapFunction('initializeApp');
            this.wrapFunction('initApp');
            this.wrapFunction('startApp');
            
            // Monitor Firebase initialization
            if (window.firebase) {
                const originalInitApp = firebase.initializeApp;
                let initCallCount = 0;
                
                firebase.initializeApp = function(...args) {
                    initCallCount++;
                    if (initCallCount > 1) {
                        console.warn('[AppLoopFix] Firebase already initialized, skipping');
                        return firebase.app();
                    }
                    return originalInitApp.apply(firebase, args);
                };
            }
        },
        
        wrapFunction(functionName) {
            if (window[functionName] && typeof window[functionName] === 'function') {
                const original = window[functionName];
                const callCount = { count: 0 };
                
                window[functionName] = function(...args) {
                    callCount.count++;
                    
                    if (callCount.count > 3) {
                        console.error(`[AppLoopFix] ${functionName} called too many times, blocking`);
                        return;
                    }
                    
                    return original.apply(this, args);
                };
            }
        },
        
        monitorNavigation() {
            // Track navigation to detect loops
            const checkNavigation = (url) => {
                const path = new URL(url, window.location).pathname;
                const now = Date.now();
                
                if (!this.navigationCount[path]) {
                    this.navigationCount[path] = { count: 0, lastTime: 0 };
                }
                
                const navInfo = this.navigationCount[path];
                
                // Reset count if more than 10 seconds have passed
                if (now - navInfo.lastTime > 10000) {
                    navInfo.count = 0;
                }
                
                navInfo.count++;
                navInfo.lastTime = now;
                
                // Detect rapid navigation loop
                if (navInfo.count > 5) {
                    console.error('[AppLoopFix] Navigation loop detected for:', path);
                    this.breakNavigationLoop(path);
                    return false;
                }
                
                return true;
            };
            
            // Override history methods
            const originalPushState = history.pushState;
            history.pushState = function(...args) {
                if (checkNavigation(args[2])) {
                    return originalPushState.apply(history, args);
                }
            };
            
            const originalReplaceState = history.replaceState;
            history.replaceState = function(...args) {
                if (checkNavigation(args[2])) {
                    return originalReplaceState.apply(history, args);
                }
            };
            
            // Monitor location changes
            let lastLocation = window.location.href;
            setInterval(() => {
                if (window.location.href !== lastLocation) {
                    checkNavigation(window.location.href);
                    lastLocation = window.location.href;
                }
            }, 500);
        },
        
        fixCommonLoops() {
            // Fix modal loops
            this.fixModalLoops();
            
            // Fix auth redirect loops
            this.fixAuthRedirectLoops();
            
            // Fix router loops
            this.fixRouterLoops();
        },
        
        fixModalLoops() {
            // Prevent modals from opening repeatedly
            const modalShowCount = {};
            
            ['show.bs.modal', 'shown.bs.modal'].forEach(event => {
                document.addEventListener(event, (e) => {
                    const modalId = e.target.id || 'unknown';
                    modalShowCount[modalId] = (modalShowCount[modalId] || 0) + 1;
                    
                    if (modalShowCount[modalId] > 3) {
                        console.warn('[AppLoopFix] Modal show loop detected:', modalId);
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Force close the modal
                        if (window.$ && $.fn.modal) {
                            $(e.target).modal('hide');
                        }
                    }
                }, true);
            });
            
            // Reset counts periodically
            setInterval(() => {
                Object.keys(modalShowCount).forEach(key => {
                    modalShowCount[key] = 0;
                });
            }, 30000);
        },
        
        fixAuthRedirectLoops() {
            // Check for auth redirect patterns
            const authPaths = ['/login', '/signin', '/auth', '/authenticate'];
            const currentPath = window.location.pathname.toLowerCase();
            
            if (authPaths.some(path => currentPath.includes(path))) {
                const redirectCount = parseInt(sessionStorage.getItem('auth_loop_count') || '0');
                
                if (redirectCount > 3) {
                    console.error('[AppLoopFix] Auth redirect loop detected');
                    sessionStorage.removeItem('auth_loop_count');
                    
                    // Break the loop by going to home
                    window.location.href = '/';
                    return;
                }
                
                sessionStorage.setItem('auth_loop_count', (redirectCount + 1).toString());
                
                // Clear count after successful navigation
                setTimeout(() => {
                    sessionStorage.removeItem('auth_loop_count');
                }, 5000);
            }
        },
        
        fixRouterLoops() {
            // Monitor router changes if using a SPA framework
            let routeChangeCount = 0;
            let lastRoute = '';
            let lastRouteTime = 0;
            
            const checkRouteLoop = (newRoute) => {
                const now = Date.now();
                
                if (newRoute === lastRoute && now - lastRouteTime < 1000) {
                    routeChangeCount++;
                    
                    if (routeChangeCount > 5) {
                        console.error('[AppLoopFix] Router loop detected');
                        this.breakRouterLoop();
                        return false;
                    }
                } else {
                    routeChangeCount = 0;
                }
                
                lastRoute = newRoute;
                lastRouteTime = now;
                return true;
            };
            
            // Hook into common router events
            window.addEventListener('popstate', (e) => {
                if (!checkRouteLoop(window.location.pathname)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        },
        
        breakInitLoop() {
            console.log('[AppLoopFix] Breaking initialization loop');
            
            // Set a flag to prevent further initialization
            window.__APP_INIT_BLOCKED = true;
            
            // Show error message
            this.showError('Application initialization loop detected. Please refresh the page.');
        },
        
        breakNavigationLoop(path) {
            console.log('[AppLoopFix] Breaking navigation loop for:', path);
            
            // Reset navigation count for this path
            delete this.navigationCount[path];
            
            // Navigate to a safe page
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        },
        
        breakRouterLoop() {
            console.log('[AppLoopFix] Breaking router loop');
            
            // Try to stop any routing
            if (window.stopRouting) {
                window.stopRouting();
            }
            
            // Clear any route timers
            ['setTimeout', 'setInterval'].forEach(method => {
                const maxId = setTimeout(() => {}, 0);
                for (let i = 0; i < maxId; i++) {
                    clearTimeout(i);
                    clearInterval(i);
                }
            });
        },
        
        showError(message) {
            const div = document.createElement('div');
            div.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #ff4444;
                color: white;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                z-index: 10001;
                max-width: 400px;
                text-align: center;
            `;
            div.innerHTML = `
                <h3 style="margin: 0 0 10px 0;">Error</h3>
                <p style="margin: 0 0 15px 0;">${message}</p>
                <button onclick="location.reload()" style="
                    background: white;
                    color: #ff4444;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-weight: bold;
                ">Reload Page</button>
            `;
            document.body.appendChild(div);
        }
    };
    
    // Initialize loop prevention
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => LoopFix.init());
    } else {
        LoopFix.init();
    }
    
    window.AppLoopFix = LoopFix;
    
})();