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

function startAuthRetry() {
    if (window.authRetryInProgress) return;
    window.authRetryInProgress = true;
    log('Starting auth retry process');
    showLoadingState('Syncing authentication, please wait...');

    let retryCount = 0;
    const maxRetries = 15;
    let authFound = false;

    const onAuthSuccess = (user) => {
        log(`Authentication successful for ${user.email}`);
        window.authRetryInProgress = false;
        sessionStorage.removeItem('recentLogin');
        currentUser = user;
        window.currentUser = currentUser;
        const userEmailEl = document.querySelector('.user-email');
        if (userEmailEl) userEmailEl.textContent = user.email;
        checkAdminStatus(user);
        initializeUserFamilyTree().then(() => {
            hideLoadingState();
            showView('dashboard');
        }).catch(error => {
            console.error('Error initializing:', error);
            hideLoadingState();
            showError('Error loading family tree. Please refresh.');
        });
    };

    const retryAuth = async () => {
        retryCount++;
        log(`Auth retry attempt ${retryCount}/${maxRetries}`);

        let user = auth.currentUser;
        if (user) { authFound = true; onAuthSuccess(user); return; }

        try {
            await auth.currentUser?.reload();
            user = auth.currentUser;
            if (user) { authFound = true; onAuthSuccess(user); return; }
        } catch (e) { /* ignore */ }

        try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            user = auth.currentUser;
            if (user) { authFound = true; onAuthSuccess(user); return; }
        } catch (e) { /* ignore */ }

        const waitForAuth = new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 2000);
            const unsubscribe = auth.onAuthStateChanged((u) => {
                if (u) { clearTimeout(timeout); unsubscribe(); resolve(u); }
            });
        });

        user = await waitForAuth;
        if (user) { authFound = true; onAuthSuccess(user); return; }

        if (retryCount < maxRetries && !authFound) {
            const delay = Math.min(1000 * Math.pow(1.5, retryCount), 5000) + Math.random() * 500;
            setTimeout(retryAuth, delay);
        } else if (!authFound) {
            log('Auth failed after all retries');
            window.authRetryInProgress = false;
            sessionStorage.removeItem('recentLogin');
            hideLoadingState();
            showError('Authentication sync timeout. Please try logging in again.');
            setTimeout(() => { window.location.href = '/login.html'; }, 5000);
        }
    };

    retryAuth();
}

async function initializeAuth() {
    log('=== App initialization started ===');

    if (window.DeviceDetection) {
        const deviceInfo = window.DeviceDetection.getDeviceInfo();
        log(`Device type: ${deviceInfo.type}, Screen: ${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`);
        document.body.classList.add(`device-${deviceInfo.type}`);
    }

    showLoadingState();

    // Check for magic link sign-in
    if (auth.isSignInWithEmailLink(window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) email = window.prompt('Please provide your email for confirmation');
        if (email) {
            try {
                const result = await auth.signInWithEmailLink(email, window.location.href);
                window.localStorage.removeItem('emailForSignIn');
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('newUser') === 'true') {
                    const pendingUserData = JSON.parse(window.localStorage.getItem('pendingUserData') || '{}');
                    if (pendingUserData.email === email) {
                        await db.collection('users').doc(result.user.uid).set({
                            uid: result.user.uid,
                            email: result.user.email,
                            fullName: pendingUserData.fullName || '',
                            displayName: pendingUserData.fullName || '',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                            language: 'en'
                        });
                        if (pendingUserData.fullName) {
                            await result.user.updateProfile({ displayName: pendingUserData.fullName });
                        }
                        showSuccess(`Welcome ${pendingUserData.fullName || email}! Your account has been created.`);
                        window.localStorage.removeItem('pendingUserData');
                    }
                }
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
                log(`Magic link sign-in error: ${error.message}`);
                hideLoadingState();
                showError('Invalid or expired sign-in link. Please request a new one.');
                setTimeout(() => { window.location.href = '/login.html'; }, 3000);
            }
        }
    }

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

    // Wait for auth state to be determined
    const determinedUser = await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
    });

    if (determinedUser) {
        currentUser = determinedUser;
        window.currentUser = currentUser;
        const userEmailEl = document.querySelector('.user-email');
        if (userEmailEl) userEmailEl.textContent = determinedUser.email;
        checkAdminStatus(determinedUser);
        sessionStorage.removeItem('authWaitSuccess');
        sessionStorage.removeItem('recentLogin');
        sessionStorage.removeItem('loginTime');
        try {
            await initializeUserFamilyTree();
            hideLoadingState();
            showView('dashboard');
            log('App initialized successfully');
        } catch (error) {
            log(`Error initializing app: ${error.message}`);
            hideLoadingState();
            showError('Error loading your family tree. Please try again.');
        }
        return;
    }

    // Handle auth propagation wait
    if (sessionStorage.getItem('authWaitSuccess') === 'true') {
        sessionStorage.removeItem('authWaitSuccess');
        for (let i = 0; i < 6; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (auth.currentUser) { window.location.reload(); return; }
        }
        window.location.href = '/login.html';
        return;
    }

    // Setup auth state listener
    const isTablet = window.DeviceDetection && window.DeviceDetection.isTablet();
    const authTimeoutDuration = isTablet ? 20000 : 10000;

    const authTimeout = setTimeout(() => {
        const loadingView = document.getElementById('loadingView');
        if (!currentUser && !window.authRetryInProgress && loadingView && loadingView.style.display !== 'none') {
            hideLoadingState();
            setTimeout(() => { window.location.href = '/login.html'; }, 100);
        }
    }, authTimeoutDuration);

    auth.onAuthStateChanged(async (user) => {
        clearTimeout(authTimeout);
        if (user) {
            currentUser = user;
            window.currentUser = currentUser;
            const userEmailEl = document.querySelector('.user-email');
            if (userEmailEl) userEmailEl.textContent = user.email;
            checkAdminStatus(user);
            sessionStorage.removeItem('pyebwaRedirectData');
            localStorage.removeItem('lastRedirectTime');
            try {
                await initializeUserFamilyTree();
                hideLoadingState();
                const needsOnboarding = await window.shouldShowEnhancedOnboarding();
                if (needsOnboarding) {
                    window.showEnhancedOnboarding();
                } else if (window.shouldShowOnboarding && window.shouldShowOnboarding()) {
                    window.showOnboarding();
                }
                showView('dashboard');
            } catch (error) {
                hideLoadingState();
                showError('Error loading your family tree. Please try again.');
            }
        } else {
            if (window.authRetryInProgress) return;
            const recentLogin = sessionStorage.getItem('recentLogin') === 'true';
            const loginTime = parseInt(sessionStorage.getItem('loginTime') || '0');
            if (recentLogin && (Date.now() - loginTime) < 60000) {
                startAuthRetry();
            } else {
                hideLoadingState();
                if (canRedirect()) {
                    window.location.href = '/login.html';
                } else {
                    showError('Please wait before trying to access this page again.');
                }
            }
        }
    }, (error) => {
        hideLoadingState();
        showError('Authentication error. Please login again.');
    });
}

// ==================== ADMIN ====================

async function checkAdminStatus(user) {
    try {
        const adminEmails = ['claude@humanlevel.ai', 'admin@pyebwa.com'];
        const adminLink = document.getElementById('adminLink');
        if (adminLink) {
            adminLink.style.display = adminEmails.includes(user.email) ? 'flex' : 'none';
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
}

// ==================== FAMILY TREE ====================

async function initializeUserFamilyTree() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();

        if (userDoc.exists && userDoc.data().familyTreeId) {
            userFamilyTreeId = userDoc.data().familyTreeId;
        } else {
            if (!userDoc.exists) {
                await db.collection('users').doc(currentUser.uid).set({
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            const treeRef = await db.collection('familyTrees').add({
                name: `${currentUser.displayName || currentUser.email}'s Family Tree`,
                ownerId: currentUser.uid,
                memberIds: [currentUser.uid],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            userFamilyTreeId = treeRef.id;
            await db.collection('users').doc(currentUser.uid).update({
                familyTreeId: userFamilyTreeId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
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
        let snapshot;
        try {
            snapshot = await db.collection('familyTrees').doc(userFamilyTreeId)
                .collection('members').orderBy('createdAt', 'desc').get();
        } catch (e) {
            snapshot = await db.collection('familyTrees').doc(userFamilyTreeId)
                .collection('members').get();
        }

        familyMembers = [];
        const memberIds = new Set();
        snapshot.forEach(doc => {
            if (!memberIds.has(doc.id)) {
                memberIds.add(doc.id);
                familyMembers.push({ id: doc.id, treeId: userFamilyTreeId, ...doc.data() });
            }
        });
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
            birthDate: form.birthDate.value || null,
            deathDate: form.deathDate.value || null,
            email: form.email.value || null,
            biography: form.biography.value || '',
            relationship: form.relationship.value,
            relatedTo: form.relatedTo?.value || null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!editingMemberId) {
            memberData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            memberData.addedBy = currentUser.uid;
        }

        const photoFile = form.photo.files[0];
        if (photoFile && userFamilyTreeId) {
            try {
                memberData.photoUrl = await uploadPhoto(photoFile);
            } catch (photoError) {
                console.error('Photo upload failed:', photoError);
            }
        }

        let memberId;
        if (editingMemberId) {
            memberId = editingMemberId;
            await db.collection('familyTrees').doc(userFamilyTreeId)
                .collection('members').doc(editingMemberId).update(memberData);
            showSuccess(t('updatedSuccessfully') || 'Updated successfully!');
        } else {
            const docRef = await db.collection('familyTrees').doc(userFamilyTreeId)
                .collection('members').add(memberData);
            memberId = docRef.id;
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
    const storageRef = storage.ref();
    const photoRef = storageRef.child(`familyTrees/${userFamilyTreeId}/photos/${Date.now()}_${file.name}`);
    const metadata = { customMetadata: { uploadedBy: auth.currentUser.uid } };
    const snapshot = await photoRef.put(file, metadata);
    return await snapshot.ref.getDownloadURL();
}

async function updateFamilyMember(memberId, updateData) {
    if (!userFamilyTreeId || !memberId) throw new Error('Missing family tree ID or member ID');
    updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection('familyTrees').doc(userFamilyTreeId)
        .collection('members').doc(memberId).update(updateData);
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
        await auth.signOut();
        localStorage.removeItem('emailForSignIn');
        localStorage.removeItem('pendingUserData');
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
