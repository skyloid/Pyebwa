// Admin Authentication Guard
(function() {
    'use strict';
    
    console.log('[AdminAuthGuard] Initializing admin authentication guard');
    
    // Admin Auth Guard Class
    class AdminAuthGuard {
        constructor() {
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.currentUser = null;
            this.userRole = null;
            this.isAdmin = false;
            this.initialized = false;
        }
        
        // Initialize the auth guard
        async initialize() {
            try {
                console.log('[AdminAuthGuard] Setting up authentication listener');
                
                // Listen for auth state changes
                this.auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        await this.validateAdminAccess(user);
                    } else {
                        this.redirectToLogin();
                    }
                });
                
                this.initialized = true;
            } catch (error) {
                console.error('[AdminAuthGuard] Initialization error:', error);
                this.handleError(error);
            }
        }
        
        // Validate admin access
        async validateAdminAccess(user) {
            try {
                console.log('[AdminAuthGuard] Validating admin access for:', user.email);
                
                // Get user document from Firestore
                const userDoc = await this.db.collection('users').doc(user.uid).get();
                
                if (!userDoc.exists) {
                    console.error('[AdminAuthGuard] User document not found');
                    this.redirectToLogin('User profile not found');
                    return;
                }
                
                const userData = userDoc.data();
                this.currentUser = user;
                this.userRole = userData.role || 'user';
                this.isAdmin = userData.isAdmin === true || userData.role === 'admin' || userData.role === 'superadmin';
                
                console.log('[AdminAuthGuard] User role:', this.userRole, 'Is admin:', this.isAdmin);
                
                // Check if user has admin access
                if (!this.isAdmin) {
                    console.warn('[AdminAuthGuard] Access denied - user is not an admin');
                    this.showAccessDenied();
                    return;
                }
                
                // Admin access granted
                console.log('[AdminAuthGuard] Admin access granted');
                this.setupAdminSession(userData);
                
                // Emit admin auth success event
                window.dispatchEvent(new CustomEvent('adminAuthSuccess', {
                    detail: {
                        user: user,
                        userData: userData,
                        role: this.userRole
                    }
                }));
                
            } catch (error) {
                console.error('[AdminAuthGuard] Validation error:', error);
                this.handleError(error);
            }
        }
        
        // Setup admin session
        setupAdminSession(userData) {
            // Store admin data in session
            sessionStorage.setItem('adminUser', JSON.stringify({
                uid: this.currentUser.uid,
                email: this.currentUser.email,
                displayName: userData.fullName || userData.displayName || this.currentUser.displayName,
                role: this.userRole,
                isAdmin: this.isAdmin
            }));
            
            // Show admin UI
            document.body.classList.add('admin-mode');
            
            // Enable admin features
            if (window.adminDashboard && window.adminDashboard.initialize) {
                window.adminDashboard.initialize();
            }
        }
        
        // Check if current user is admin (synchronous check)
        checkAdminAccess() {
            const adminData = sessionStorage.getItem('adminUser');
            if (!adminData) return false;
            
            try {
                const admin = JSON.parse(adminData);
                return admin.isAdmin === true;
            } catch (error) {
                return false;
            }
        }
        
        // Get current admin user
        getAdminUser() {
            const adminData = sessionStorage.getItem('adminUser');
            if (!adminData) return null;
            
            try {
                return JSON.parse(adminData);
            } catch (error) {
                return null;
            }
        }
        
        // Show access denied message
        showAccessDenied() {
            document.body.innerHTML = `
                <div class="admin-access-denied">
                    <div class="access-denied-content">
                        <h1>Access Denied</h1>
                        <p>You do not have permission to access the admin area.</p>
                        <p>This incident has been logged.</p>
                        <a href="/app/" class="btn btn-primary">Return to App</a>
                    </div>
                </div>
            `;
            
            // Log access attempt
            this.logAccessAttempt();
        }
        
        // Log unauthorized access attempt
        async logAccessAttempt() {
            try {
                await this.db.collection('adminAccessLogs').add({
                    userId: this.currentUser.uid,
                    email: this.currentUser.email,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    type: 'unauthorized_access_attempt',
                    ip: await this.getUserIP()
                });
            } catch (error) {
                console.error('[AdminAuthGuard] Error logging access attempt:', error);
            }
        }
        
        // Get user IP (basic implementation)
        async getUserIP() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch (error) {
                return 'unknown';
            }
        }
        
        // Redirect to login
        redirectToLogin(message = '') {
            const redirectUrl = '/auth-server/login.html';
            const params = new URLSearchParams({
                redirect: window.location.pathname,
                admin: 'true'
            });
            
            if (message) {
                params.append('error', message);
            }
            
            window.location.href = `${redirectUrl}?${params.toString()}`;
        }
        
        // Handle errors
        handleError(error) {
            console.error('[AdminAuthGuard] Error:', error);
            
            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'admin-error-message';
            errorMessage.innerHTML = `
                <div class="error-content">
                    <h2>Authentication Error</h2>
                    <p>${error.message || 'An error occurred during authentication'}</p>
                    <button onclick="location.reload()">Retry</button>
                </div>
            `;
            
            document.body.appendChild(errorMessage);
        }
        
        // Sign out admin
        async signOut() {
            try {
                await this.auth.signOut();
                sessionStorage.removeItem('adminUser');
                window.location.href = '/';
            } catch (error) {
                console.error('[AdminAuthGuard] Sign out error:', error);
            }
        }
    }
    
    // Create global instance
    window.adminAuthGuard = new AdminAuthGuard();
    
    // Auto-initialize on admin pages
    if (window.location.pathname.includes('/admin')) {
        document.addEventListener('DOMContentLoaded', () => {
            window.adminAuthGuard.initialize();
        });
    }
    
})();