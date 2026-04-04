// Admin Authentication Guard - Supabase-based
(function() {
    'use strict';

    console.log('[AdminAuthGuard] Initializing admin authentication guard');

    class AdminAuthGuard {
        constructor() {
            this.currentUser = null;
            this.userRole = null;
            this.isAdmin = false;
            this.initialized = false;
        }

        async initialize() {
            try {
                console.log('[AdminAuthGuard] Checking authentication');

                const client = window.supabaseClient;
                if (!client) {
                    this.redirectToLogin('Auth client not available');
                    return;
                }

                const { data: { session } } = await client.auth.getSession();
                if (!session) {
                    this.redirectToLogin();
                    return;
                }

                await this.validateAdminAccess(session);
                this.initialized = true;
            } catch (error) {
                console.error('[AdminAuthGuard] Initialization error:', error);
                this.handleError(error);
            }
        }

        async validateAdminAccess(session) {
            try {
                console.log('[AdminAuthGuard] Validating admin access for:', session.user.email);

                // Fetch user role from server API
                const res = await fetch('/api/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + session.access_token }
                });

                if (!res.ok) {
                    this.redirectToLogin('Could not verify user');
                    return;
                }

                const userData = await res.json();
                this.currentUser = session.user;
                this.userRole = userData.role || 'member';
                this.isAdmin = ['admin', 'superadmin', 'moderator'].includes(this.userRole);

                console.log('[AdminAuthGuard] User role:', this.userRole, 'Is admin:', this.isAdmin);

                if (!this.isAdmin) {
                    console.warn('[AdminAuthGuard] Access denied - user is not an admin');
                    this.showAccessDenied();
                    return;
                }

                console.log('[AdminAuthGuard] Admin access granted');
                this.setupAdminSession(userData);

                window.dispatchEvent(new CustomEvent('adminAuthSuccess', {
                    detail: { user: session.user, userData, role: this.userRole }
                }));

            } catch (error) {
                console.error('[AdminAuthGuard] Validation error:', error);
                this.handleError(error);
            }
        }

        setupAdminSession(userData) {
            sessionStorage.setItem('adminUser', JSON.stringify({
                uid: this.currentUser.id,
                email: this.currentUser.email,
                displayName: userData.displayName || '',
                role: this.userRole,
                isAdmin: this.isAdmin
            }));

            document.body.classList.add('admin-mode');

            if (window.adminDashboard && window.adminDashboard.initialize) {
                window.adminDashboard.initialize();
            }
        }

        checkAdminAccess() {
            const adminData = sessionStorage.getItem('adminUser');
            if (!adminData) return false;
            try {
                return JSON.parse(adminData).isAdmin === true;
            } catch { return false; }
        }

        getAdminUser() {
            try {
                return JSON.parse(sessionStorage.getItem('adminUser'));
            } catch { return null; }
        }

        showAccessDenied() {
            document.body.innerHTML = `
                <div class="admin-access-denied">
                    <div class="access-denied-content">
                        <h1>Access Denied</h1>
                        <p>You do not have permission to access the admin area.</p>
                        <a href="/app/" class="btn btn-primary">Return to App</a>
                    </div>
                </div>
            `;
        }

        redirectToLogin(message = '') {
            const params = new URLSearchParams({ redirect: window.location.pathname, admin: 'true' });
            if (message) params.append('error', message);
            window.location.href = '/login.html?' + params.toString();
        }

        handleError(error) {
            console.error('[AdminAuthGuard] Error:', error);
            const el = document.createElement('div');
            el.className = 'admin-error-message';
            el.innerHTML = `<div class="error-content"><h2>Authentication Error</h2><p>${error.message || 'An error occurred'}</p><button onclick="location.reload()">Retry</button></div>`;
            document.body.appendChild(el);
        }

        async signOut() {
            try {
                const client = window.supabaseClient;
                if (client) await client.auth.signOut();
                sessionStorage.removeItem('adminUser');
                window.location.href = '/';
            } catch (error) {
                console.error('[AdminAuthGuard] Sign out error:', error);
            }
        }
    }

    window.adminAuthGuard = new AdminAuthGuard();

    if (window.location.pathname.includes('/admin')) {
        document.addEventListener('DOMContentLoaded', () => {
            window.adminAuthGuard.initialize();
        });
    }
})();
