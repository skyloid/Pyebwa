// Emergency Authentication Fix - Session-based
(function() {
    'use strict';

    console.log('[AuthEmergencyFix] Loading emergency authentication fixes');

    const EmergencyFix = {
        retryCount: 0,
        maxRetries: 3,

        init() {
            this.fixAuthLoops();
            this.setupRecoveryMechanisms();
            console.log('[AuthEmergencyFix] Emergency fixes initialized');
        },

        fixAuthLoops() {
            const urlParams = new URLSearchParams(window.location.search);
            const authError = urlParams.get('authError');

            if (authError) {
                console.log('[AuthEmergencyFix] Auth error detected in URL:', authError);
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            this.checkRedirectLoop();
        },

        checkRedirectLoop() {
            const redirectKey = 'auth_redirect_count';
            const redirectTimestamp = 'auth_redirect_timestamp';
            const now = Date.now();

            let count = parseInt(sessionStorage.getItem(redirectKey) || '0');
            const lastRedirect = parseInt(sessionStorage.getItem(redirectTimestamp) || '0');

            if (now - lastRedirect > 300000) {
                count = 0;
            }

            if (count > 5) {
                console.error('[AuthEmergencyFix] Redirect loop detected, breaking loop');
                sessionStorage.removeItem(redirectKey);
                sessionStorage.removeItem(redirectTimestamp);

                this.emergencyLogout();
                this.showEmergencyMessage('Authentication loop detected. Please clear your browser cache and try again.');
                return true;
            }

            if (window.location.pathname.includes('login') || window.location.pathname.includes('auth')) {
                sessionStorage.setItem(redirectKey, (count + 1).toString());
                sessionStorage.setItem(redirectTimestamp, now.toString());
            }

            return false;
        },

        setupRecoveryMechanisms() {
            this.addEmergencyLogout();
        },

        addEmergencyLogout() {
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && e.key === 'L') {
                    console.log('[AuthEmergencyFix] Emergency logout triggered');
                    this.emergencyLogout();
                }
            });
        },

        async emergencyLogout() {
            try {
                const client = window.supabaseClient;
                if (client) await client.auth.signOut();
            } catch (e) {
                // Ignore errors during emergency logout
            }

            // Clear storage
            ['localStorage', 'sessionStorage'].forEach(storage => {
                if (window[storage]) {
                    const keysToRemove = [];
                    for (let i = 0; i < window[storage].length; i++) {
                        const key = window[storage].key(i);
                        if (key && key.includes('auth')) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => window[storage].removeItem(key));
                }
            });

            // Clear cookies
            document.cookie.split(";").forEach((c) => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });

            window.location.href = '/';
        },

        showEmergencyMessage(message) {
            const div = document.createElement('div');
            div.style.cssText = `
                position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                background: #ff6b6b; color: white; padding: 15px 25px; border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 10000; font-family: Arial, sans-serif;
            `;
            div.textContent = message;
            document.body.appendChild(div);
            setTimeout(() => div.remove(), 10000);
        }
    };

    EmergencyFix.init();
    window.AuthEmergencyFix = EmergencyFix;
})();
