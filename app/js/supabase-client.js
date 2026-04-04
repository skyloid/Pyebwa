// Supabase Client Initialization
// Replaces firebase-config.js - loaded in <head> before other scripts
(function() {
    'use strict';

    const SUPABASE_URL = window.location.origin + '/supabase';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc1MTk5NDM4LCJleHAiOjE5MzI4Nzk0Mzh9.t_O46hoypu8qZjZgiM_GjMkwhDBhwFa-IXRMjnQ5m7o';

    // Wait for Supabase JS to be loaded
    function initSupabase() {
        if (typeof supabase === 'undefined' || !supabase.createClient) {
            console.error('[supabase-client] Supabase JS library not loaded');
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

    // Stub db global for lingering Firestore references
    window.db = {
        collection() {
            console.warn('[supabase-client] Firestore calls are no longer available. Use PyebwaAPI.');
            const stub = () => Promise.reject(new Error('Use PyebwaAPI'));
            return { doc: () => ({ get: stub, set: stub, update: stub }), get: stub, where: () => ({ get: stub }) };
        }
    };

    // Comprehensive firebase global stub for secondary feature files
    // (photo-gallery, video-messages, social-*, search-*, onboarding-flow, etc.)
    // These files still reference firebase.* directly - stubs prevent crashes
    const noopPromise = () => Promise.resolve({ exists: false, data: () => null, docs: [], forEach: () => {} });
    const docStub = () => ({
        get: noopPromise, set: noopPromise, update: noopPromise, delete: noopPromise,
        collection: collStub
    });
    function collStub() {
        return {
            doc: docStub, add: noopPromise, get: noopPromise,
            where: () => ({ get: noopPromise, orderBy: () => ({ get: noopPromise, limit: () => ({ get: noopPromise }) }) }),
            orderBy: () => ({ get: noopPromise, limit: () => ({ get: noopPromise }) })
        };
    }
    const storageRefStub = () => ({
        child: storageRefStub,
        put: () => Promise.resolve({ ref: { getDownloadURL: () => Promise.resolve('') } }),
        getDownloadURL: () => Promise.resolve(''),
        delete: noopPromise
    });

    window.firebase = {
        initializeApp() {},
        app() { return {}; },
        auth() { return window.auth; },
        firestore() { return window.db; },
        storage() { return { ref: storageRefStub }; },
        messaging() { return { getToken: noopPromise, onMessage() {}, useServiceWorker() {}, onTokenRefresh() {}, deleteToken: noopPromise }; }
    };
    window.firebase.auth.GoogleAuthProvider = function() {};
    window.firebase.auth.FacebookAuthProvider = function() {};
    window.firebase.auth.Auth = { Persistence: { LOCAL: 'LOCAL' } };
    window.firebase.firestore.FieldValue = {
        serverTimestamp: () => new Date().toISOString(),
        arrayUnion: (...v) => v,
        arrayRemove: (...v) => v,
        delete: () => null
    };
    window.firebase.firestore.Timestamp = { now: () => ({ toDate: () => new Date() }) };

    // Also make storage available as a global
    window.storage = window.firebase.storage();

    // Dispatch ready event for backwards compatibility
    window.dispatchEvent(new Event('firebaseReady'));
})();
