// Admin Authentication Guard
(function() {
    'use strict';
    
    const AdminAuthGuard = {
        // Admin roles
        ROLES: {
            SUPER_ADMIN: 'superadmin',
            ADMIN: 'admin',
            MODERATOR: 'moderator'
        },
        
        // Initialize auth guard
        async init() {
            try {
                // Check if this is the setup page - bypass auth for setup
                if (this.isSetupPage()) {
                    console.log('Setup page detected - bypassing admin auth');
                    return true;
                }
                
                // Show loader
                this.showLoader(true);
                
                // Check if user is authenticated
                const user = await this.checkAuthentication();
                if (!user) {
                    this.redirectToLogin();
                    return false;
                }
                
                // Check admin permissions
                const isAdmin = await this.checkAdminPermissions(user);
                if (!isAdmin) {
                    this.showAccessDenied();
                    return false;
                }
                
                // Store admin info
                this.currentAdmin = user;
                this.adminRole = user.role || this.ROLES.ADMIN;
                
                // Initialize admin session
                await this.initializeAdminSession(user);
                
                // Log admin access
                await this.logAdminAccess(user);
                
                // Show admin app
                this.showAdminApp();
                
                return true;
                
            } catch (error) {
                console.error('Auth guard error:', error);
                this.showError('Authentication failed. Please try again.');
                return false;
            }
        },
        
        // Check if this is the setup page
        isSetupPage() {
            return window.location.pathname.includes('setup-admin.html') || 
                   window.location.href.includes('setup-admin.html');
        },
        
        // Check if user is authenticated
        async checkAuthentication() {
            return new Promise((resolve) => {
                if (!window.firebase || !window.firebase.auth) {
                    console.error('Firebase not initialized');
                    resolve(null);
                    return;
                }
                
                const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
                    unsubscribe();
                    
                    if (!user) {
                        resolve(null);
                        return;
                    }
                    
                    try {
                        // Get user data from Firestore
                        const userDoc = await firebase.firestore()
                            .collection('users')
                            .doc(user.uid)
                            .get();
                        
                        if (!userDoc.exists) {
                            resolve(null);
                            return;
                        }
                        
                        const userData = userDoc.data();
                        resolve({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                            ...userData
                        });
                        
                    } catch (error) {
                        console.error('Error fetching user data:', error);
                        resolve(null);
                    }
                });
            });
        },
        
        // Check if user has admin permissions
        async checkAdminPermissions(user) {
            // Check if user has admin role
            if (!user.role || !this.isAdminRole(user.role)) {
                return false;
            }
            
            // Additional permission checks can be added here
            // For example, checking if admin account is active
            if (user.status === 'suspended' || user.status === 'disabled') {
                return false;
            }
            
            return true;
        },
        
        // Check if role is admin role
        isAdminRole(role) {
            return [
                this.ROLES.SUPER_ADMIN,
                this.ROLES.ADMIN,
                this.ROLES.MODERATOR
            ].includes(role);
        },
        
        // Initialize admin session
        async initializeAdminSession(user) {
            // Set session data
            sessionStorage.setItem('adminSession', JSON.stringify({
                uid: user.uid,
                email: user.email,
                role: user.role,
                loginTime: new Date().toISOString()
            }));
            
            // Update UI with admin info
            this.updateAdminUI(user);
            
            // Set up session timeout
            this.setupSessionTimeout();
        },
        
        // Update admin UI
        updateAdminUI(user) {
            // Update admin name
            const nameElements = document.querySelectorAll('#adminName');
            nameElements.forEach(el => {
                el.textContent = user.displayName || user.email.split('@')[0];
            });
            
            // Update admin role
            const roleElements = document.querySelectorAll('#adminRole');
            roleElements.forEach(el => {
                el.textContent = this.formatRole(user.role);
            });
            
            // Update admin avatar
            const avatarElements = document.querySelectorAll('#adminAvatar');
            avatarElements.forEach(el => {
                if (user.photoURL) {
                    el.src = user.photoURL;
                }
            });
        },
        
        // Format role for display
        formatRole(role) {
            const roleMap = {
                'superadmin': 'Super Admin',
                'admin': 'Admin',
                'moderator': 'Moderator'
            };
            return roleMap[role] || 'Admin';
        },
        
        // Log admin access
        async logAdminAccess(user) {
            try {
                await firebase.firestore().collection('adminLogs').add({
                    type: 'access',
                    adminId: user.uid,
                    adminEmail: user.email,
                    adminRole: user.role,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    userAgent: navigator.userAgent,
                    ip: await this.getUserIP()
                });
            } catch (error) {
                console.error('Error logging admin access:', error);
            }
        },
        
        // Get user IP (simplified - in production use proper IP service)
        async getUserIP() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch (error) {
                return 'unknown';
            }
        },
        
        // Setup session timeout
        setupSessionTimeout() {
            const TIMEOUT_MINUTES = 30;
            let timeout;
            
            const resetTimeout = () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.showSessionExpired();
                }, TIMEOUT_MINUTES * 60 * 1000);
            };
            
            // Reset on user activity
            ['mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
                document.addEventListener(event, resetTimeout, true);
            });
            
            resetTimeout();
        },
        
        // Show session expired
        showSessionExpired() {
            if (confirm('Your session has expired. Would you like to continue?')) {
                location.reload();
            } else {
                this.logout();
            }
        },
        
        // Logout
        async logout() {
            try {
                // Log logout
                if (this.currentAdmin) {
                    await firebase.firestore().collection('adminLogs').add({
                        type: 'logout',
                        adminId: this.currentAdmin.uid,
                        adminEmail: this.currentAdmin.email,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                // Clear session
                sessionStorage.removeItem('adminSession');
                
                // Sign out
                await firebase.auth().signOut();
                
                // Redirect to app
                window.location.href = '/app/';
                
            } catch (error) {
                console.error('Logout error:', error);
            }
        },
        
        // UI Helper Methods
        showLoader(show) {
            const loader = document.getElementById('adminLoader');
            if (loader) {
                loader.style.display = show ? 'flex' : 'none';
            }
        },
        
        showAdminApp() {
            this.showLoader(false);
            const app = document.getElementById('adminApp');
            if (app) {
                app.style.display = 'block';
            }
        },
        
        showAccessDenied() {
            this.showLoader(false);
            const denied = document.getElementById('accessDenied');
            if (denied) {
                denied.style.display = 'flex';
            }
            
            // Log unauthorized access attempt
            firebase.auth().currentUser && firebase.firestore().collection('adminLogs').add({
                type: 'unauthorized_access',
                userId: firebase.auth().currentUser.uid,
                email: firebase.auth().currentUser.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(console.error);
        },
        
        redirectToLogin() {
            // Store intended destination
            sessionStorage.setItem('adminRedirect', window.location.href);
            window.location.href = '/app/';
        },
        
        showError(message) {
            this.showLoader(false);
            alert(message);
            this.redirectToLogin();
        },
        
        // Permission checks for specific features
        canManageUsers() {
            return [this.ROLES.SUPER_ADMIN, this.ROLES.ADMIN].includes(this.adminRole);
        },
        
        canManageContent() {
            return this.isAdminRole(this.adminRole);
        },
        
        canViewAnalytics() {
            return this.isAdminRole(this.adminRole);
        },
        
        canAccessSystemSettings() {
            return this.adminRole === this.ROLES.SUPER_ADMIN;
        },
        
        // Get current admin
        getCurrentAdmin() {
            return this.currentAdmin;
        },
        
        // Get admin role
        getAdminRole() {
            return this.adminRole;
        }
    };
    
    // Export for use
    window.AdminAuthGuard = AdminAuthGuard;
})();