// API Client - Uses Supabase Auth for authentication, REST API for data
(function() {
    'use strict';

    // Helper: get current access token from Supabase session
    async function getAccessToken() {
        const client = window.supabaseClient;
        if (!client) return null;
        const { data: { session } } = await client.auth.getSession();
        return session ? session.access_token : null;
    }

    // Helper: authenticated fetch with JWT Bearer token
    async function authFetch(url, options = {}) {
        const token = await getAccessToken();
        const headers = { ...options.headers };
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        // Don't set Content-Type for FormData (browser sets multipart boundary)
        if (!(options.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
        return fetch(url, { ...options, headers });
    }

    async function persistEmailLanguagePreference(email, lang) {
        try {
            await fetch('/api/auth/email-language', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, lang })
            });
        } catch (error) {
            console.warn('Unable to persist email language preference:', error);
        }
    }

    const PyebwaAPI = {
        // --- Auth (Supabase GoTrue) ---
        async login(email, lang = 'en') {
            const client = window.supabaseClient;
            if (!client) throw new Error('Supabase client not initialized');

            await persistEmailLanguagePreference(email, lang);

            const { error } = await client.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false,
                    data: { lang },
                    emailRedirectTo: window.location.origin + '/login.html?lang=' + encodeURIComponent(lang)
                }
            });
            if (error) throw new Error(error.message);

            return {
                success: true,
                message: 'Check your email for your sign-in link.'
            };
        },

        async signup(email, fullName, lang = 'en') {
            const client = window.supabaseClient;
            if (!client) throw new Error('Supabase client not initialized');

            const { error } = await client.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: true,
                    data: { display_name: fullName, role: 'member', lang },
                    emailRedirectTo: window.location.origin + '/login.html?lang=' + encodeURIComponent(lang)
                }
            });
            if (error) throw new Error(error.message);

            return {
                success: true,
                message: 'Check your email for your sign-in link.'
            };
        },

        async logout() {
            const client = window.supabaseClient;
            if (client) {
                await client.auth.signOut({ scope: 'global' });
            }
            window._currentUser = null;
            this._notifyAuthState(null);
            return { success: true };
        },

        async getCurrentUser() {
            try {
                const token = await getAccessToken();
                if (!token) {
                    window._currentUser = null;
                    return null;
                }
                const res = await authFetch('/api/auth/me');
                if (!res.ok) {
                    window._currentUser = null;
                    return null;
                }
                const data = await res.json();
                window._currentUser = data;
                return data;
            } catch (err) {
                window._currentUser = null;
                return null;
            }
        },

        async resetPassword(email) {
            const client = window.supabaseClient;
            if (!client) throw new Error('Supabase client not initialized');

            const { error } = await client.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });
            if (error) throw new Error(error.message);
            return { success: true, message: 'If an account exists with this email, a password reset link has been sent.' };
        },

        async confirmResetPassword(newPassword) {
            const client = window.supabaseClient;
            if (!client) throw new Error('Supabase client not initialized');

            const { error } = await client.auth.updateUser({ password: newPassword });
            if (error) throw new Error(error.message);
            return { success: true };
        },

        // --- Trees ---
        async getTrees() {
            const res = await authFetch('/api/trees');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.trees;
        },

        async getTree(treeId) {
            const res = await authFetch('/api/trees/' + treeId);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.tree;
        },

        async createTree(name, description) {
            const res = await authFetch('/api/trees', {
                method: 'POST',
                body: JSON.stringify({ name, description })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.tree;
        },

        async updateTree(treeId, updates) {
            const res = await authFetch('/api/trees/' + treeId, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.tree;
        },

        async deleteTree(treeId) {
            const res = await authFetch('/api/trees/' + treeId, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },

        // --- Persons ---
        async getPersons(treeId, options = {}) {
            let url = '/api/trees/' + treeId + '/persons';
            const params = new URLSearchParams();
            if (options.limit) params.set('limit', options.limit);
            if (options.offset) params.set('offset', options.offset);
            if (params.toString()) url += '?' + params;

            const res = await authFetch(url);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },

        async getPerson(treeId, personId) {
            const res = await authFetch('/api/trees/' + treeId + '/persons/' + personId);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.person;
        },

        async addPerson(treeId, personData) {
            const res = await authFetch('/api/trees/' + treeId + '/persons', {
                method: 'POST',
                body: JSON.stringify(personData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.person;
        },

        async updatePerson(treeId, personId, updates) {
            const res = await authFetch('/api/trees/' + treeId + '/persons/' + personId, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.person;
        },

        async deletePerson(treeId, personId) {
            const res = await authFetch('/api/trees/' + treeId + '/persons/' + personId, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },

        async searchPersons(treeId, query) {
            const res = await authFetch('/api/trees/' + treeId + '/persons/search?q=' + encodeURIComponent(query));
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.persons;
        },

        // --- Public discovery / find your roots ---
        async searchDiscoverableTrees(surname, origin = '') {
            const params = new URLSearchParams();
            params.set('surname', surname);
            if (origin) params.set('origin', origin);

            const res = await fetch('/api/discovery/search?' + params.toString());
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.results || [];
        },

        async submitDiscoveryRequest(payload) {
            const res = await fetch('/api/discovery/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.request;
        },

        async listDiscoveryRequests(treeId) {
            const res = await authFetch('/api/discovery/trees/' + treeId + '/requests');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.requests || [];
        },

        async updateDiscoveryRequest(treeId, requestId, status) {
            const res = await authFetch('/api/discovery/trees/' + treeId + '/requests/' + requestId, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },

        // --- Invites ---
        async generateInvite(treeId, personId) {
            const res = await authFetch('/api/invites/generate', {
                method: 'POST',
                body: JSON.stringify({ treeId, personId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },

        async getInviteDetails(token) {
            const res = await fetch('/api/invites/details/' + token);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.invite;
        },

        async acceptInvite(token) {
            const res = await authFetch('/api/invites/accept/' + token, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },

        async listInvites(treeId) {
            const res = await authFetch('/api/invites/list/' + treeId);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.invites;
        },

        async revokeInvite(token) {
            const res = await authFetch('/api/invites/revoke/' + token, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },

        // --- File Uploads ---
        async uploadPhoto(file, options = {}) {
            const formData = new FormData();
            formData.append('photo', file);
            if (options.treeId) formData.append('treeId', options.treeId);
            if (options.personId) formData.append('personId', options.personId);
            if (options.type) formData.append('type', options.type);

            const res = await authFetch('/api/uploads/photo', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.url;
        },

        async uploadFile(file, options = {}) {
            const formData = new FormData();
            formData.append('file', file);
            if (options.treeId) formData.append('treeId', options.treeId);
            if (options.personId) formData.append('personId', options.personId);
            if (options.type) formData.append('type', options.type);
            if (options.category) formData.append('category', options.category);

            const res = await authFetch('/api/uploads/file', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.url;
        },

        async deleteUploadedFile(url) {
            const res = await authFetch('/api/uploads/file', {
                method: 'DELETE',
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },

        // --- Admin ---
        async getSystemStatus() {
            const res = await authFetch('/api/system/status');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },

        async getSystemInfo() {
            const res = await authFetch('/api/system/info');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },

        // --- Auth state management ---
        _authStateCallbacks: [],

        onAuthStateChanged(callback) {
            this._authStateCallbacks.push(callback);

            // Set up Supabase auth state listener on first subscription
            if (this._authStateCallbacks.length === 1) {
                this._setupSupabaseListener();
            }

            // Check current state immediately
            this.getCurrentUser().then(user => callback(user));
        },

        _supabaseListenerSetup: false,
        _setupSupabaseListener() {
            if (this._supabaseListenerSetup) return;
            this._supabaseListenerSetup = true;

            const client = window.supabaseClient;
            if (!client) return;

            client.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    const user = await this.getCurrentUser();
                    this._notifyAuthState(user);
                } else if (event === 'SIGNED_OUT') {
                    window._currentUser = null;
                    this._notifyAuthState(null);
                }
            });
        },

        _notifyAuthState(user) {
            this._authStateCallbacks.forEach(cb => {
                try { cb(user); } catch (e) { console.error('Auth state callback error:', e); }
            });
        }
    };

    window.PyebwaAPI = PyebwaAPI;

    // Backwards compatibility shims
    window.pyebwaQueries = {
        async getFamilyTree(treeId) { return PyebwaAPI.getTree(treeId); },
        async getFamilyMembers(treeId, lastDoc, limit) {
            const result = await PyebwaAPI.getPersons(treeId, { limit: limit || 20, offset: 0 });
            return { members: result.persons || [], hasMore: result.hasMore || false };
        },
        async searchMembers(treeId, searchTerm) { return PyebwaAPI.searchPersons(treeId, searchTerm); }
    };

    window.dispatchEvent(new Event('apiClientReady'));
})();
