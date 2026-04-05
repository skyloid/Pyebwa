// Pyebwa Family Tree App - Main Application
// UI helpers loaded from ui-helpers.js, debug from debug-utils.js

if (window.preventRedirect || window.isSignupPage || sessionStorage.getItem('onSignupPage') === 'true' || window.location.href.includes('signup.html')) {
    console.log('App.js: Detected signup page, skipping app.js execution');
} else {

let currentUser = null;
let userFamilyTreeId = null;
let familyMembers = [];
let editingMemberId = null;

window.familyMembers = familyMembers;
window.currentUser = currentUser;
window.userFamilyTreeId = null;
window.editingMemberId = null;

const log = window.pyebwaLog || console.log;

// Redirect cooldown
const REDIRECT_COOLDOWN = window.DeviceDetection && window.DeviceDetection.isTablet() ? 60000 : 30000;

function canRedirect() {
    const lastRedirect = parseInt(localStorage.getItem('lastRedirectTime') || '0');
    const now = Date.now();
    if (now - lastRedirect < REDIRECT_COOLDOWN) {
        log(`[Redirect Cooldown] Active - ${Math.round((REDIRECT_COOLDOWN - (now - lastRedirect)) / 1000)}s remaining`);
        return false;
    }
    localStorage.setItem('lastRedirectTime', now.toString());
    return true;
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (event.error && event.error.message && event.error.message.includes('addEventListener')) {
        event.preventDefault();
    }
});

// Listen for auth success event
window.addEventListener('pyebwaAuthSuccess', (event) => {
    log('[App] Auth success event received');
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    initializeEventListeners();
    const savedLang = localStorage.getItem('pyebwaLang') || 'ht';
    setLanguage(savedLang);
    updateTranslations();
});

// ==================== AUTH ====================

async function initializeAuth() {
    log('=== App initialization started ===');

    if (window.DeviceDetection) {
        const deviceInfo = window.DeviceDetection.getDeviceInfo();
        log(`Device type: ${deviceInfo.type}, Screen: ${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`);
        document.body.classList.add(`device-${deviceInfo.type}`);
    }

    showLoadingState();

    // Redirect loop prevention
    const redirectData = JSON.parse(sessionStorage.getItem('pyebwaRedirectData') || '{}');
    const timeSinceLastRedirect = Date.now() - (redirectData.timestamp || 0);
    if (timeSinceLastRedirect > 300000) {
        sessionStorage.removeItem('pyebwaRedirectData');
    } else if ((redirectData.count || 0) > 2) {
        sessionStorage.removeItem('pyebwaRedirectData');
        hideLoadingState();
        showError('Authentication loop detected. Please clear your browser cache and try again.');
        return;
    }

    // Check Supabase auth session
    try {
        if (typeof PyebwaAPI === 'undefined') {
            // Wait for api-client.js to load (may be delayed by CDN)
            await new Promise((resolve, reject) => {
                if (window.PyebwaAPI) return resolve();
                window.addEventListener('apiClientReady', resolve);
                setTimeout(() => reject(new Error('PyebwaAPI failed to load')), 5000);
            });
        }
        const user = await PyebwaAPI.getCurrentUser();

        if (user) {
            currentUser = user;
            window.currentUser = currentUser;
            const userEmailEl = document.querySelector('.user-email');
            if (userEmailEl) userEmailEl.textContent = user.email;
            checkAdminStatus(user);
            sessionStorage.removeItem('pyebwaRedirectData');

            try {
                await initializeUserFamilyTree();
                hideLoadingState();
                const needsOnboarding = typeof window.shouldShowEnhancedOnboarding === 'function' && await window.shouldShowEnhancedOnboarding();
                if (needsOnboarding) {
                    window.showEnhancedOnboarding();
                } else if (window.shouldShowOnboarding && window.shouldShowOnboarding()) {
                    window.showOnboarding();
                }
                showView('dashboard');
                log('App initialized successfully');
            } catch (error) {
                log(`Error initializing app: ${error.message}`);
                hideLoadingState();
                showError('Error loading your family tree. Please try again.');
            }
        } else {
            // Not authenticated - redirect to login
            hideLoadingState();
            if (canRedirect()) {
                window.location.href = '/login.html';
            } else {
                showError('Please wait before trying to access this page again.');
            }
        }
    } catch (error) {
        log(`Auth check error: ${error.message}`);
        hideLoadingState();
        showError('Authentication error. Please login again.');
        setTimeout(() => { window.location.href = '/login.html'; }, 3000);
    }
}

// ==================== ADMIN ====================

async function checkAdminStatus(user) {
    try {
        const adminLink = document.getElementById('adminLink');
        if (adminLink) {
            const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'moderator';
            adminLink.style.display = isAdmin ? 'flex' : 'none';
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
}

// ==================== FAMILY TREE ====================

async function initializeUserFamilyTree() {
    try {
        // Get user's trees via API
        const trees = await PyebwaAPI.getTrees();

        if (trees && trees.length > 0) {
            userFamilyTreeId = trees[0].id;
        } else {
            // Create a default family tree
            const displayName = currentUser.displayName || currentUser.email;
            const tree = await PyebwaAPI.createTree(
                `${displayName}'s Family Tree`,
                'My family tree'
            );
            userFamilyTreeId = tree.id;
        }

        window.userFamilyTreeId = userFamilyTreeId;
        window.currentFamilyTreeId = userFamilyTreeId;
        await loadFamilyMembers();
    } catch (error) {
        console.error('Error initializing family tree:', error);
        userFamilyTreeId = null;
        window.userFamilyTreeId = null;
    }
}

async function loadFamilyMembers() {
    if (!userFamilyTreeId) return;

    try {
        const result = await PyebwaAPI.getPersons(userFamilyTreeId);
        familyMembers = (result.persons || []).map(p => ({
            id: p.id,
            treeId: userFamilyTreeId,
            firstName: p.first_name || p.firstName || '',
            lastName: p.last_name || p.lastName || '',
            birthDate: p.birth_date || p.birthDate || null,
            deathDate: p.death_date || p.deathDate || null,
            gender: p.gender || null,
            email: p.email || null,
            biography: p.biography || '',
            photoUrl: p.photo_url || p.photoUrl || (p.photos && p.photos.length > 0 ? (p.photos.find(ph => ph.isProfile) || p.photos[0]).url : null),
            photos: p.photos || [],
            relationships: p.relationships || [],
            phone: p.phone || null,
            userId: p.user_id || p.userId || null,
            createdAt: p.created_at || p.createdAt || null,
            updatedAt: p.updated_at || p.updatedAt || null
        }));
        window.familyMembers = familyMembers;

        const activeView = document.querySelector('.nav-item.active')?.getAttribute('data-view') || 'dashboard';
        showView(activeView);
    } catch (error) {
        console.error('Error loading family members:', error);
    }
}

// ==================== EVENT LISTENERS ====================

function initializeEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => showView(e.currentTarget.getAttribute('data-view')));
    });

    // Language selector
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => setLanguage(e.currentTarget.getAttribute('data-lang')));
    });

    // User menu toggle
    const userMenuBtn = document.querySelector('.user-menu-btn');
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', () => {
            document.querySelector('.user-menu')?.classList.toggle('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu')) {
            document.querySelector('.user-menu')?.classList.remove('active');
        }
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await logout();
        });
    }

    // Add member
    const addMemberBtn = document.getElementById('addMemberBtn');
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => showAddMemberModal());
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const modal = btn.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                if (modal.id === 'addMemberModal') {
                    const form = modal.querySelector('form');
                    if (form) form.reset();
                    editingMemberId = null;
                }
            }
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });

    // Add member form
    const addMemberForm = document.getElementById('addMemberForm');
    if (addMemberForm) addMemberForm.addEventListener('submit', handleAddMember);

    const cancelBtn = document.querySelector('#addMemberForm .btn-secondary');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('addMemberModal').classList.remove('active');
            editingMemberId = null;
        });
    }

    // Relationship field
    const relationshipField = document.querySelector('[name="relationship"]');
    if (relationshipField) {
        relationshipField.addEventListener('change', (e) => {
            const relatedToGroup = document.getElementById('relatedToGroup');
            if (relatedToGroup) {
                relatedToGroup.style.display = (e.target.value && e.target.value !== 'parent') ? 'block' : 'none';
                if (relatedToGroup.style.display === 'block') populateRelatedToOptions();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllModals();
    });
}

// ==================== VIEWS ====================

function showView(viewName) {
    if (viewName !== 'dashboard' && window.stopDashboardSlideshow) {
        window.stopDashboardSlideshow();
    }

    document.querySelectorAll('.view-container').forEach(v => v.style.display = 'none');
    const viewElement = document.getElementById(`${viewName}View`);
    if (viewElement) viewElement.style.display = 'block';

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    switch (viewName) {
        case 'dashboard': renderDashboard(); break;
        case 'tree': renderFamilyTree(); break;
        case 'members': renderMembersList(); break;
        case 'stories': loadStories(); break;
    }
}

function renderDashboard() {
    const container = document.getElementById('dashboardView');
    if (!container) return;
    container.innerHTML = '';
    if (window.createDashboard) {
        container.appendChild(window.createDashboard());
    } else {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">Loading...</div></div>';
    }
}

// ==================== MEMBERS ====================

function showAddMemberModal(member = null) {
    const modal = document.getElementById('addMemberModal');
    const form = document.getElementById('addMemberForm');
    const modalTitle = modal.querySelector('.modal-header h3');
    const submitBtn = form.querySelector('[type="submit"]');
    form.reset();

    if (member) {
        editingMemberId = member.id;
        modalTitle.textContent = t('editFamilyMember') || 'Edit Family Member';
        submitBtn.textContent = t('update') || 'Update';
        form.firstName.value = member.firstName || '';
        form.lastName.value = member.lastName || '';
        form.gender.value = member.gender || '';
        form.birthDate.value = member.birthDate || '';
        form.deathDate.value = member.deathDate || '';
        form.email.value = member.email || '';
        form.biography.value = member.biography || '';
        form.relationship.value = member.relationship || '';
        if (member.relatedTo) {
            document.getElementById('relatedToGroup').style.display = 'block';
            populateRelatedToOptions();
            form.relatedTo.value = member.relatedTo;
        }
    } else {
        editingMemberId = null;
        modalTitle.textContent = t('addFamilyMember') || 'Add Family Member';
        submitBtn.textContent = t('save') || 'Save';
    }

    modal.classList.add('active');
}

function populateRelatedToOptions() {
    const select = document.getElementById('relatedToSelect');
    select.innerHTML = '<option value="">' + (t('selectPerson') || 'Select person') + '</option>';
    familyMembers.forEach(member => {
        if (editingMemberId && member.id === editingMemberId) return;
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = `${member.firstName} ${member.lastName}`;
        select.appendChild(option);
    });
}

async function handleAddMember(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = t('loading');

    try {
        const memberData = {
            firstName: form.firstName.value,
            lastName: form.lastName.value,
            gender: form.gender.value,
            birth_date: form.birthDate.value || null,
            death_date: form.deathDate.value || null,
            email: form.email.value || null,
            biography: form.biography.value || ''
        };

        // Handle relationships
        const relationship = form.relationship.value;
        const relatedTo = form.relatedTo?.value || null;
        if (relationship && relatedTo) {
            memberData.relationships = [{ type: relationship, personId: relatedTo }];
        }

        const photoFile = form.photo.files[0];
        if (photoFile && userFamilyTreeId) {
            try {
                const photoUrl = await uploadPhoto(photoFile);
                memberData.photos = [{ url: photoUrl }];
            } catch (photoError) {
                console.error('Photo upload failed:', photoError);
            }
        }

        let memberId;
        if (editingMemberId) {
            memberId = editingMemberId;
            await PyebwaAPI.updatePerson(userFamilyTreeId, editingMemberId, memberData);
            showSuccess(t('updatedSuccessfully') || 'Updated successfully!');
        } else {
            const person = await PyebwaAPI.addPerson(userFamilyTreeId, memberData);
            memberId = person.id;
            showSuccess(t('savedSuccessfully'));
        }

        if (window.pyebwaSearch && memberId) {
            try {
                await window.pyebwaSearch.updateSearchIndex({ ...memberData, id: memberId }, userFamilyTreeId);
            } catch (e) { /* ignore search index errors */ }
        }

        document.getElementById('addMemberModal')?.classList.remove('active');
        form.reset();
        editingMemberId = null;
        await loadFamilyMembers();
    } catch (error) {
        console.error('Error adding member:', error);
        if (error.code === 'permission-denied') {
            showError('Permission denied. Please check Firestore rules.');
        } else if (!userFamilyTreeId) {
            showError('No family tree found. Please refresh the page.');
        } else {
            showError((t('errorSaving') || 'Error saving') + ': ' + error.message);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = t('save');
    }
}

async function uploadPhoto(file) {
    return await PyebwaAPI.uploadPhoto(file, { treeId: userFamilyTreeId });
}

async function updateFamilyMember(memberId, updateData) {
    if (!userFamilyTreeId || !memberId) throw new Error('Missing family tree ID or member ID');
    await PyebwaAPI.updatePerson(userFamilyTreeId, memberId, updateData);
    const memberIndex = familyMembers.findIndex(m => m.id === memberId);
    if (memberIndex !== -1) {
        familyMembers[memberIndex] = { ...familyMembers[memberIndex], ...updateData };
        window.familyMembers = familyMembers;
    }
    if (window.pyebwaSearch && familyMembers[memberIndex]) {
        try { await window.pyebwaSearch.updateSearchIndex(familyMembers[memberIndex], userFamilyTreeId); } catch (e) { /* ignore */ }
    }
}

// ==================== PRIVACY ====================

window.canViewField = function(member, fieldName) {
    if (!member.privacy || !member.privacy[fieldName]) return true;
    const privacy = member.privacy[fieldName];
    if (member.addedBy === currentUser?.uid) return true;
    switch (privacy) {
        case 'public': return true;
        case 'family': return currentUser && currentUser.uid;
        case 'private': return false;
        default: return true;
    }
};

// ==================== LOGOUT ====================

async function logout() {
    try {
        showLoadingState('Signing out...');
        await PyebwaAPI.logout();
        sessionStorage.clear();
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        hideLoadingState();
        showError('Error signing out. Please try again.');
    }
}

// ==================== EXPORTS ====================

window.showView = showView;
window.showAddMemberModal = showAddMemberModal;
window.updateFamilyMember = updateFamilyMember;
window.logout = logout;

window.showMemberDetails = function(member) {
    if (window.viewMemberProfile && member.id) {
        window.viewMemberProfile(member.id);
    } else {
        showAddMemberModal(member);
    }
};

} // End of signup page protection
