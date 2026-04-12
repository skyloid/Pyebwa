(function() {
    'use strict';

    function getLoader() {
        return document.getElementById('adminLoader');
    }

    function getApp() {
        return document.getElementById('adminApp');
    }

    function getAccessDenied() {
        return document.getElementById('accessDenied');
    }

    function showLoader(message) {
        const loader = getLoader();
        const app = getApp();
        const denied = getAccessDenied();
        if (loader) {
            loader.style.display = 'flex';
            const label = loader.querySelector('p');
            if (label && message) {
                label.textContent = message;
            }
        }
        if (app) app.style.display = 'none';
        if (denied) denied.style.display = 'none';
    }

    function showDenied(message) {
        const loader = getLoader();
        const denied = getAccessDenied();
        if (loader) loader.style.display = 'none';
        if (denied) {
            denied.style.display = 'flex';
            const label = denied.querySelector('p');
            if (label && message) {
                label.textContent = message;
            }
        }
    }

    function redirectToLogin() {
        const url = new URL('/login.html', window.location.origin);
        const params = new URLSearchParams(window.location.search);
        const lang = params.get('lang');
        if (lang) {
            url.searchParams.set('lang', lang);
        }
        url.searchParams.set('redirect', '/app/admin/');
        window.location.replace(url.toString());
    }

    async function waitForSupabaseClient() {
        for (let i = 0; i < 50; i += 1) {
            if (window.supabaseClient) {
                return window.supabaseClient;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error('Supabase client unavailable');
    }

    async function validateAdminAccess() {
        const client = await waitForSupabaseClient();
        const { data: { session } } = await client.auth.getSession();

        if (!session?.user) {
            redirectToLogin();
            return;
        }

        const requestSummary = () => fetch('/api/admin/summary', {
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        });

        let response = await requestSummary();

        if (response.status === 429) {
            const retryAfter = Number(response.headers.get('retry-after')) || 1;
            await new Promise((resolve) => setTimeout(resolve, Math.max(1000, retryAfter * 1000)));
            response = await requestSummary();
        }

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        if (response.status === 403) {
            showDenied("You don't have permission to access the admin dashboard.");
            return;
        }

        if (response.status === 429) {
            const detail = {
                user: session.user,
                role: session.user.user_metadata?.role || session.user.app_metadata?.role || 'admin',
                userData: {
                    displayName: session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || session.user.email,
                    photoURL: session.user.user_metadata?.avatar_url || ''
                }
            };

            window.dispatchEvent(new CustomEvent('adminAuthSuccess', { detail }));
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to verify admin access');
        }

        const summary = await response.json();

        const detail = {
            user: session.user,
            role: summary.currentUserRole || session.user.user_metadata?.role || session.user.app_metadata?.role || 'admin',
            userData: {
                displayName: session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || session.user.email,
                photoURL: session.user.user_metadata?.avatar_url || ''
            }
        };

        try {
            sessionStorage.setItem('adminUser', JSON.stringify({
                email: session.user.email || '',
                displayName: detail.userData.displayName,
                photoURL: detail.userData.photoURL,
                role: detail.role
            }));
        } catch (error) {
            console.warn('[AdminAuthGuard] Unable to persist admin user session data', error);
        }

        window.dispatchEvent(new CustomEvent('adminAuthSuccess', { detail }));
    }

    async function init() {
        try {
            console.log('[AdminAuthGuard] Initializing admin authentication guard');
            showLoader('Verifying admin access...');
            await validateAdminAccess();
        } catch (error) {
            console.error('[AdminAuthGuard] Admin guard failed:', error);
            showDenied('Unable to verify admin access. Please refresh and try again.');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
