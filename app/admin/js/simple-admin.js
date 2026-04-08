(function() {
    'use strict';

    const state = {
        allUsers: [],
        filteredUsers: [],
        currentPage: 1,
        pageSize: 20,
        currentView: 'dashboard',
        summary: null
    };

    async function getAccessToken() {
        const client = window.supabaseClient;
        if (!client) return null;
        const { data: { session } } = await client.auth.getSession();
        return session?.access_token || null;
    }

    async function authFetch(url) {
        const token = await getAccessToken();
        const headers = token ? { Authorization: 'Bearer ' + token } : {};
        return fetch(url, { headers });
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDate(value) {
        if (!value) return 'Never';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Never';
        return date.toLocaleString();
    }

    function formatRelativeTime(value) {
        if (!value) return 'Just now';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Just now';
        const seconds = Math.round((date.getTime() - Date.now()) / 1000);
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        const intervals = [
            ['year', 31536000],
            ['month', 2592000],
            ['week', 604800],
            ['day', 86400],
            ['hour', 3600],
            ['minute', 60]
        ];
        for (const [unit, size] of intervals) {
            if (Math.abs(seconds) >= size || unit === 'minute') {
                return rtf.format(Math.round(seconds / size), unit);
            }
        }
        return 'Just now';
    }

    function showAdminApp() {
        const loader = document.getElementById('adminLoader');
        const app = document.getElementById('adminApp');
        if (loader) loader.style.display = 'none';
        if (app) app.style.display = 'block';
    }

    function showError(message) {
        const recentActivity = document.getElementById('recentActivity');
        if (recentActivity) {
            recentActivity.innerHTML = `<div class="activity-item"><div class="activity-content"><p>${escapeHtml(message)}</p></div></div>`;
        }
    }

    function updateAdminHeader(detail) {
        const sessionData = JSON.parse(sessionStorage.getItem('adminUser') || '{}');
        const displayName = detail?.userData?.displayName || sessionData.displayName || detail?.user?.email || sessionData.email || 'Admin';
        const role = detail?.role || sessionData.role || 'admin';
        const nameEl = document.getElementById('adminName');
        const roleEl = document.getElementById('adminRole');
        if (nameEl) nameEl.textContent = displayName;
        if (roleEl) roleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    }

    function showView(view) {
        document.querySelectorAll('.admin-view').forEach((el) => {
            el.style.display = 'none';
        });
        const target = document.getElementById(`${view}View`);
        if (target) {
            target.style.display = 'block';
        }
        document.querySelectorAll('.menu-item').forEach((item) => item.classList.remove('active'));
        document.querySelector(`.menu-link[href="#${view}"]`)?.parentElement?.classList.add('active');
        state.currentView = view;
    }

    function wireNavigation() {
        document.querySelectorAll('.menu-link').forEach((link) => {
            link.addEventListener('click', (event) => {
                const href = link.getAttribute('href') || '';
                if (!href.startsWith('#')) return;
                event.preventDefault();
                const view = href.slice(1);
                showView(view);
                if (view === 'users') {
                    renderUsers();
                } else if (view === 'system') {
                    loadSystemInfo();
                }
            });
        });
    }

    function wireHeaderControls() {
        document.getElementById('refreshDashboard')?.addEventListener('click', () => {
            loadAdminData();
        });

        document.getElementById('exportUsers')?.addEventListener('click', exportUsers);

        document.getElementById('inviteUser')?.addEventListener('click', () => {
            window.location.href = '/app/';
        });

        document.getElementById('adminLogout')?.addEventListener('click', async (event) => {
            event.preventDefault();
            const client = window.supabaseClient;
            if (client) {
                await client.auth.signOut({ scope: 'global' });
            }
            sessionStorage.removeItem('adminUser');
            window.location.href = '/login.html';
        });

        document.querySelector('.user-menu-toggle')?.addEventListener('click', () => {
            document.querySelector('.nav-user')?.classList.toggle('dropdown-open');
        });

        document.getElementById('navToggle')?.addEventListener('click', () => {
            document.getElementById('adminSidebar')?.classList.toggle('collapsed');
        });

        document.getElementById('themeToggle')?.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
        });

        document.getElementById('userSearch')?.addEventListener('input', applyUserFilters);
        document.getElementById('userRoleFilter')?.addEventListener('change', applyUserFilters);
        document.getElementById('userStatusFilter')?.addEventListener('change', applyUserFilters);
        document.getElementById('userPrevPage')?.addEventListener('click', () => changePage(-1));
        document.getElementById('userNextPage')?.addEventListener('click', () => changePage(1));
    }

    function renderSummary(summary) {
        state.summary = summary;
        document.getElementById('totalUsers').textContent = summary.totalUsers;
        document.getElementById('totalTrees').textContent = summary.totalTrees;
        document.getElementById('activeUsers').textContent = summary.activeUsers30d;
        document.getElementById('storageUsed').textContent = summary.totalMembers;
        document.querySelector('.stat-card:nth-child(4) .stat-label').textContent = 'Family Members';
        document.getElementById('treeCount').textContent = summary.totalTrees;
        const userCount = document.getElementById('userCount');
        if (userCount) {
            userCount.textContent = summary.totalUsers;
        }

        const activity = [];
        (summary.recentUsers || []).forEach((user) => {
            activity.push({
                icon: 'person_add',
                title: 'New user joined',
                description: user.display_name || user.email,
                created_at: user.created_at
            });
        });
        (summary.recentTrees || []).forEach((tree) => {
            activity.push({
                icon: 'account_tree',
                title: 'Family tree created',
                description: tree.name,
                created_at: tree.created_at
            });
        });

        activity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const recentActivity = document.getElementById('recentActivity');
        if (!recentActivity) return;
        recentActivity.innerHTML = activity.slice(0, 10).map((item) => `
            <div class="activity-item">
                <div class="activity-icon">
                    <span class="material-icons">${item.icon}</span>
                </div>
                <div class="activity-content">
                    <p>${escapeHtml(item.title)}</p>
                    <small>${escapeHtml(item.description)} · ${escapeHtml(formatRelativeTime(item.created_at))}</small>
                </div>
            </div>
        `).join('');
    }

    function applyUserFilters() {
        const search = (document.getElementById('userSearch')?.value || '').trim().toLowerCase();
        const role = (document.getElementById('userRoleFilter')?.value || '').trim().toLowerCase();
        const status = (document.getElementById('userStatusFilter')?.value || '').trim().toLowerCase();

        state.filteredUsers = state.allUsers.filter((user) => {
            const haystack = [user.display_name, user.email, user.role].filter(Boolean).join(' ').toLowerCase();
            if (search && !haystack.includes(search)) return false;
            if (role && user.role !== role) return false;
            if (status && user.status !== status) return false;
            return true;
        });
        state.currentPage = 1;
        renderUsers();
    }

    function changePage(delta) {
        const maxPage = Math.max(1, Math.ceil(state.filteredUsers.length / state.pageSize));
        state.currentPage = Math.max(1, Math.min(maxPage, state.currentPage + delta));
        renderUsers();
    }

    function renderUsers() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        const startIndex = (state.currentPage - 1) * state.pageSize;
        const pageUsers = state.filteredUsers.slice(startIndex, startIndex + state.pageSize);

        if (pageUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No users found.</td></tr>';
        } else {
            tbody.innerHTML = pageUsers.map((user) => `
                <tr>
                    <td class="checkbox-col"><input type="checkbox" value="${escapeHtml(user.id)}"></td>
                    <td>${escapeHtml(user.display_name || 'No name')}</td>
                    <td>${escapeHtml(user.email)}</td>
                    <td><span class="badge badge-${escapeHtml(user.role)}">${escapeHtml(user.role)}</span></td>
                    <td>${escapeHtml(user.status)}</td>
                    <td>${escapeHtml(formatDate(user.created_at))}</td>
                    <td>${escapeHtml(formatDate(user.last_active))}</td>
                    <td>
                        <a class="btn btn-secondary" href="/app/" style="padding:6px 10px; font-size:12px;">Open App</a>
                    </td>
                </tr>
            `).join('');
        }

        document.getElementById('userStart').textContent = state.filteredUsers.length ? (startIndex + 1) : 0;
        document.getElementById('userEnd').textContent = Math.min(startIndex + pageUsers.length, state.filteredUsers.length);
        document.getElementById('userTotal').textContent = state.filteredUsers.length;
        document.getElementById('userCurrentPage').textContent = String(state.currentPage);
        document.getElementById('userPrevPage').disabled = state.currentPage === 1;
        document.getElementById('userNextPage').disabled = (startIndex + state.pageSize) >= state.filteredUsers.length;
    }

    async function loadUsers() {
        const response = await authFetch('/api/admin/users?limit=500');
        if (!response.ok) {
            throw new Error('Failed to load users');
        }
        const data = await response.json();
        state.allUsers = data.users || [];
        state.filteredUsers = [...state.allUsers];
        renderUsers();
    }

    async function loadSystemInfo() {
        const container = document.querySelector('#systemView #content');
        if (!container) return;
        try {
            const [statusRes, infoRes] = await Promise.all([
                authFetch('/api/system/status'),
                authFetch('/api/system/info')
            ]);
            const status = statusRes.ok ? await statusRes.json() : null;
            const info = infoRes.ok ? await infoRes.json() : null;
            container.innerHTML = `
                <div class="chart-container" style="margin-bottom: 24px;">
                    <div class="chart-header"><h3>System Status</h3></div>
                    <pre style="white-space: pre-wrap;">${escapeHtml(JSON.stringify(status, null, 2))}</pre>
                </div>
                <div class="chart-container">
                    <div class="chart-header"><h3>System Info</h3></div>
                    <pre style="white-space: pre-wrap;">${escapeHtml(JSON.stringify(info, null, 2))}</pre>
                </div>
            `;
        } catch (error) {
            container.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
        }
    }

    function exportUsers() {
        const headers = ['Name', 'Email', 'Role', 'Status', 'Created', 'Last Active'];
        const rows = state.filteredUsers.map((user) => [
            user.display_name || '',
            user.email || '',
            user.role || '',
            user.status || '',
            user.created_at || '',
            user.last_active || ''
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pyebwa-admin-users.csv';
        link.click();
        URL.revokeObjectURL(url);
    }

    async function loadAdminData() {
        try {
            const response = await authFetch('/api/admin/summary');
            if (!response.ok) {
                throw new Error('Failed to load admin summary');
            }
            const summary = await response.json();
            renderSummary(summary);
            await loadUsers();
            await loadSystemInfo();
        } catch (error) {
            console.error('Admin data load failed:', error);
            showError(error.message);
        }
    }

    function init() {
        wireNavigation();
        wireHeaderControls();
        showView('dashboard');

        window.addEventListener('adminAuthSuccess', (event) => {
            updateAdminHeader(event.detail);
            showAdminApp();
            loadAdminData();
        }, { once: true });

        const existing = sessionStorage.getItem('adminUser');
        if (existing) {
            updateAdminHeader({});
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
