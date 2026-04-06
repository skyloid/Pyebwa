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
    const supportedLangs = ['en', 'fr', 'ht'];
    const saved = localStorage.getItem('pyebwaLang');
    const browserLang = (navigator.language || '').split('-')[0].toLowerCase();
    const lang = saved || (supportedLangs.includes(browserLang) ? browserLang : 'en');
    setLanguage(lang);
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
            relationship: p.relationship || ((p.relationships && p.relationships[0]) ? p.relationships[0].type : null),
            relatedTo: p.relatedTo || ((p.relationships && p.relationships[0]) ? p.relationships[0].personId : null),
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

    const cancelBtn = document.querySelector('#addMemberForm .form-actions .btn-secondary');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('addMemberModal').classList.remove('active');
            editingMemberId = null;
        });
    }

    // Relationship rows — add first row and wire up "Add Relationship" button
    var addRelBtn = document.getElementById('addRelationshipBtn');
    if (addRelBtn) {
        addRelBtn.addEventListener('click', () => addRelationshipRow());
        // Add first row by default
        var container = document.getElementById('relationshipsContainer');
        if (container && container.children.length === 0) addRelationshipRow();
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

    // Clear relationship rows
    var relContainer = document.getElementById('relationshipsContainer');
    if (relContainer) relContainer.innerHTML = '';

    if (member) {
        editingMemberId = member.id;
        modalTitle.textContent = t('editFamilyMember') || 'Edit Family Member';
        submitBtn.textContent = t('update') || 'Update';
        form.firstName.value = member.firstName || '';
        form.lastName.value = member.lastName || '';
        form.gender.value = member.gender || '';
        form.birthDate.value = member.birthDate ? member.birthDate.substring(0, 10) : '';
        form.deathDate.value = member.deathDate ? member.deathDate.substring(0, 10) : '';
        form.email.value = member.email || '';
        form.biography.value = member.biography || '';

        // Populate relationship rows from member's relationships array
        var rels = member.relationships || [];
        if (rels.length > 0) {
            rels.forEach(function(rel) { addRelationshipRow(rel); });
        } else if (member.relationship && member.relatedTo) {
            addRelationshipRow({ type: member.relationship, personId: member.relatedTo });
        } else {
            addRelationshipRow();
        }
    } else {
        editingMemberId = null;
        modalTitle.textContent = t('addFamilyMember') || 'Add Family Member';
        submitBtn.textContent = t('save') || 'Save';
        addRelationshipRow();
    }

    modal.classList.add('active');
}

function populatePersonSelect(select, excludeIds) {
    excludeIds = excludeIds || [];
    select.innerHTML = '<option value="">' + (t('selectPerson') || 'Select person') + '</option>';
    familyMembers.forEach(member => {
        if (editingMemberId && member.id === editingMemberId) return;
        if (excludeIds.indexOf(member.id) !== -1) return;
        var option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.firstName + ' ' + member.lastName;
        select.appendChild(option);
    });
}

// Legacy alias
function populateRelatedToOptions() {
    var select = document.getElementById('relatedToSelect');
    if (select) populatePersonSelect(select);
}

var _relRowCounter = 0;

function addRelationshipRow(data) {
    var container = document.getElementById('relationshipsContainer');
    if (!container) return;

    _relRowCounter++;
    var rowId = 'relRow_' + _relRowCounter;

    var row = document.createElement('div');
    row.className = 'relationship-row';
    row.id = rowId;

    row.innerHTML =
        '<div class="rel-row-fields">' +
            '<select class="rel-type" required>' +
                '<option value="">' + (t('selectRelationship') || 'Select relationship') + '</option>' +
                '<option value="child"' + (data && data.type === 'child' ? ' selected' : '') + '>' + (t('childOf') || 'Son / Daughter of') + '</option>' +
                '<option value="spouse"' + (data && data.type === 'spouse' ? ' selected' : '') + '>' + (t('spouseOf') || 'Husband / Wife of') + '</option>' +
                '<option value="sibling"' + (data && data.type === 'sibling' ? ' selected' : '') + '>' + (t('siblingOf') || 'Brother / Sister of') + '</option>' +
                '<option value="parent"' + (data && data.type === 'parent' ? ' selected' : '') + '>' + (t('parentOf') || 'Father / Mother of') + '</option>' +
            '</select>' +
            '<select class="rel-person" style="display:none;"></select>' +
            '<select class="rel-marital" style="display:none;">' +
                '<option value="married">' + (t('married') || 'Married') + '</option>' +
                '<option value="engaged">' + (t('engaged') || 'Engaged') + '</option>' +
                '<option value="commonLaw">' + (t('commonLaw') || 'Common-Law') + '</option>' +
                '<option value="separated">' + (t('separated') || 'Separated') + '</option>' +
                '<option value="divorced">' + (t('divorced') || 'Divorced') + '</option>' +
                '<option value="widowed">' + (t('widowed') || 'Widowed') + '</option>' +
            '</select>' +
            '<input type="date" class="rel-date" style="display:none;" placeholder="Date">' +
        '</div>' +
        '<button type="button" class="rel-remove-btn" title="Remove">' +
            '<span class="material-icons" style="font-size:18px;">close</span>' +
        '</button>';

    container.appendChild(row);

    var typeSelect = row.querySelector('.rel-type');
    var personSelect = row.querySelector('.rel-person');
    var maritalSelect = row.querySelector('.rel-marital');
    var dateInput = row.querySelector('.rel-date');
    var removeBtn = row.querySelector('.rel-remove-btn');

    typeSelect.addEventListener('change', function() {
        var val = this.value;
        var showPerson = !!val;
        personSelect.style.display = showPerson ? '' : 'none';
        maritalSelect.style.display = val === 'spouse' ? '' : 'none';
        dateInput.style.display = val === 'spouse' ? '' : 'none';
        if (showPerson) populatePersonSelect(personSelect);
    });

    removeBtn.addEventListener('click', function() {
        row.remove();
    });

    // Pre-populate if editing
    if (data) {
        if (data.type) {
            personSelect.style.display = '';
            populatePersonSelect(personSelect);
            if (data.personId) personSelect.value = data.personId;
        }
        if (data.type === 'spouse') {
            maritalSelect.style.display = '';
            dateInput.style.display = '';
            if (data.maritalStatus) maritalSelect.value = data.maritalStatus;
            if (data.marriageDate) dateInput.value = data.marriageDate;
        }
    }
}

function getRelationshipsFromForm() {
    var rows = document.querySelectorAll('.relationship-row');
    var relationships = [];
    rows.forEach(function(row) {
        var type = row.querySelector('.rel-type').value;
        var personId = row.querySelector('.rel-person').value;
        if (!type) return;
        if (!personId) return;

        var rel = { type: type };
        if (personId) rel.personId = personId;
        if (type === 'spouse') {
            rel.maritalStatus = row.querySelector('.rel-marital').value || 'married';
            var dateVal = row.querySelector('.rel-date').value;
            if (dateVal) rel.marriageDate = dateVal;
        }
        relationships.push(rel);
    });
    return relationships;
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

        // Handle relationships — collect all rows
        var relationships = getRelationshipsFromForm();
        if (relationships.length > 0) {
            memberData.relationships = relationships;
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
