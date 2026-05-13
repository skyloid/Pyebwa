// Supabase Client Initialization
(function() {
    'use strict';

    const SUPABASE_URL = window.location.origin + '/supabase';
    const SUPABASE_ANON_KEY = window.__PYEBWA_SUPABASE_ANON_KEY__;

    // Wait for Supabase JS to be loaded
    function initSupabase() {
        if (typeof supabase === 'undefined' || !supabase.createClient) {
            console.error('[supabase-client] Supabase JS library not loaded');
            return null;
        }
        if (!SUPABASE_ANON_KEY) {
            console.error('[supabase-client] Missing runtime Supabase anon key');
            return null;
        }

        const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('[supabase-client] Supabase client initialized');
        return client;
    }

    window._supabaseClient = null;

    // Getter that lazy-initializes the client
    Object.defineProperty(window, 'supabaseClient', {
        get() {
            if (!window._supabaseClient) {
                window._supabaseClient = initSupabase();
            }
            return window._supabaseClient;
        }
    });

    // Backwards-compatible globals
    window.auth = {
        currentUser: null,
        onAuthStateChanged(cb) {
            if (window.PyebwaAPI) {
                window.PyebwaAPI.onAuthStateChanged(cb);
            } else {
                window.addEventListener('apiClientReady', () => {
                    window.PyebwaAPI.onAuthStateChanged(cb);
                });
            }
        },
        signOut() {
            return window.PyebwaAPI ? window.PyebwaAPI.logout() : Promise.resolve();
        }
    };

    window.db = null;
    window.storage = null;
})();
