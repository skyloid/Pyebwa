// Main application logic
let currentUser = null;
let userFamilyTreeId = null;
let familyMembers = [];

// Make data globally accessible for PDF export and other modules
window.familyMembers = familyMembers;
window.currentUser = currentUser;
window.userFamilyTreeId = null;

// Redirect cooldown configuration
const REDIRECT_COOLDOWN = 30000; // 30 seconds cooldown between redirects

function canRedirect() {
    const lastRedirect = parseInt(localStorage.getItem('lastRedirectTime') || '0');
    const now = Date.now();
    
    if (now - lastRedirect < REDIRECT_COOLDOWN) {
        console.log(`[Redirect Cooldown] Active - ${Math.round((REDIRECT_COOLDOWN - (now - lastRedirect)) / 1000)}s remaining`);
        const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
        logs.push(`${new Date().toISOString()}: Redirect blocked by cooldown`);
        localStorage.setItem('pyebwaDebugLogs', JSON.stringify(logs.slice(-20)));
        return false;
    }
    
    console.log('[Redirect Cooldown] Ready to redirect');
    localStorage.setItem('lastRedirectTime', now.toString());
    return true;
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Log but don't show error to user for minor issues
    if (event.error && event.error.message && !event.error.message.includes('share-modal')) {
        const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
        logs.push(`${new Date().toISOString()}: ERROR: ${event.error.message}`);
        localStorage.setItem('pyebwaDebugLogs', JSON.stringify(logs.slice(-20)));
    }
    // Prevent default error handling for known issues
    if (event.error && event.error.message && event.error.message.includes('addEventListener')) {
        event.preventDefault();
    }
});

// Listen for auth success event from auth-token-bridge
window.addEventListener('pyebwaAuthSuccess', (event) => {
    console.log('[App] Auth success event received:', event.detail);
    const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
    logs.push(`${new Date().toISOString()}: Auth success event received`);
    localStorage.setItem('pyebwaDebugLogs', JSON.stringify(logs.slice(-20)));
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    initializeEventListeners();
    
    // Restore language preference
    const savedLang = localStorage.getItem('pyebwaLang') || 'ht';
    setLanguage(savedLang);
    updateTranslations();
});

// Debug helper - type this in console to see logs
window.showDebugLogs = () => {
    const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
    console.log('=== Debug Logs ===');
    logs.forEach(log => console.log(log));
    return logs;
};

// Clear debug logs
window.clearDebugLogs = () => {
    localStorage.removeItem('pyebwaDebugLogs');
    console.log('Debug logs cleared');
};

// Test Firestore access
window.testFirestore = async () => {
    console.log('Testing Firestore access...');
    
    try {
        // Test 1: Read user document
        console.log('Test 1: Reading user document...');
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        console.log('User doc exists:', userDoc.exists);
        if (userDoc.exists) {
            console.log('User data:', userDoc.data());
        }
        
        // Test 2: Try to write to users collection
        console.log('Test 2: Writing to user document...');
        await db.collection('users').doc(auth.currentUser.uid).set({
            testField: 'test',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('Write to users collection: SUCCESS');
        
        // Test 3: Try to create a test collection
        console.log('Test 3: Creating test document...');
        const testRef = await db.collection('test').add({
            test: true,
            uid: auth.currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Created test document:', testRef.id);
        
        // Test 4: Try to read familyTrees
        console.log('Test 4: Reading familyTrees...');
        const treesQuery = await db.collection('familyTrees')
            .where('ownerId', '==', auth.currentUser.uid)
            .get();
        console.log('Found', treesQuery.size, 'family trees');
        
    } catch (error) {
        console.error('Firestore test error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
    }
};

// Initialize authentication
function initializeAuth() {
    // Debug logging to localStorage (persists across redirects)
    const log = (msg) => {
        console.log(msg);
        const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
        logs.push(`${new Date().toISOString()}: ${msg}`);
        localStorage.setItem('pyebwaDebugLogs', JSON.stringify(logs.slice(-20))); // Keep last 20 logs
    };
    
    log('=== App initialization started ===');
    
    // Show loading state
    showLoadingState();
    
    // Single-domain auth - no URL parameters needed
    log('Using single-domain authentication');
    
    // IMPORTANT: Track if we've already set up auth listener to prevent duplicates
    let authListenerSet = false;
    
    // Add redirect loop prevention with timestamp
    const redirectData = JSON.parse(sessionStorage.getItem('pyebwaRedirectData') || '{}');
    const redirectCount = redirectData.count || 0;
    const lastRedirectTime = redirectData.timestamp || 0;
    const timeSinceLastRedirect = Date.now() - lastRedirectTime;
    
    // Reset redirect count if more than 5 minutes have passed
    if (timeSinceLastRedirect > 300000) { // 5 minutes
        sessionStorage.removeItem('pyebwaRedirectData');
        log('Redirect data expired and cleared');
    } else if (redirectCount > 2) {
        log('Redirect loop detected - stopping redirects');
        sessionStorage.removeItem('pyebwaRedirectData');
        hideLoadingState();
        showError('Authentication loop detected. Please clear your browser cache and try again.');
        return;
    }
    
    // First, check current auth state immediately
    const immediateUser = auth.currentUser;
    log(`Immediate auth user: ${immediateUser ? immediateUser.email : 'null'}`);
    
    // If user is already authenticated, skip the auth state listener wait
    if (immediateUser) {
        log('User already authenticated - initializing immediately');
        currentUser = immediateUser;
        window.currentUser = currentUser;
        const userEmailEl = document.querySelector('.user-email');
        if (userEmailEl) {
            userEmailEl.textContent = immediateUser.email;
        }
        
        // Initialize family tree asynchronously
        initializeUserFamilyTree().then(() => {
            hideLoadingState();
            showView('tree');
            log('App initialized successfully with immediate auth');
        }).catch(error => {
            log(`Error initializing app: ${error.message}`);
            console.error('Error initializing app:', error);
            hideLoadingState();
            showError('Error loading your family tree. Please try again.');
        });
        return; // Important: exit early to avoid setting up duplicate auth listeners
    }
    
    // Set auth state listener only once
    if (!authListenerSet) {
        authListenerSet = true;
        log('Setting up auth state listener');
        
        // Set auth state listener with proper error handling
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            log(`Auth state changed: ${user ? user.email : 'No user'}`);
            
            if (user) {
                // User is authenticated
                log('User authenticated successfully');
                currentUser = user;
                window.currentUser = currentUser;
                const userEmailEl = document.querySelector('.user-email');
                if (userEmailEl) {
                    userEmailEl.textContent = user.email;
                }
                
                // Clear redirect data and cooldown on successful auth
                sessionStorage.removeItem('pyebwaRedirectData');
                localStorage.removeItem('lastRedirectTime'); // Clear cooldown on successful auth
                localStorage.removeItem('pyebwaVisitCount'); // Clear visit count
                log('Cleared redirect data and cooldown after successful auth');
                
                // Check Firebase Storage configuration
                if (window.firebase && window.firebase.storage) {
                    console.log('Firebase Storage is initialized');
                    const storage = firebase.storage();
                    console.log('Storage bucket:', storage.ref().bucket);
                } else {
                    console.error('Firebase Storage is not initialized');
                }
                
                try {
                    // Get or create user's family tree
                    await initializeUserFamilyTree();
                    
                    // Hide loading and show main view
                    hideLoadingState();
                    
                    // Check if onboarding is needed
                    if (window.shouldShowOnboarding && window.shouldShowOnboarding()) {
                        window.showOnboarding();
                    }
                    
                    // Show dashboard by default
                    showView('dashboard');
                    
                    log('App initialized successfully');
                } catch (error) {
                    log(`Error initializing app: ${error.message}`);
                    console.error('Error initializing app:', error);
                    hideLoadingState();
                    showError('Error loading your family tree. Please try again.');
                }
            } else {
                // No user authenticated - redirect to login
                log('No user authenticated - redirecting to login');
                // Use the login page on the same domain
                window.location.href = '/login.html';
                return;
            }
        }, (error) => {
            // Auth error
            log(`Auth error: ${error.message}`);
            console.error('Auth error:', error);
            hideLoadingState();
            showError('Authentication error. Please login again.');
        });
    }
}

// Show loading state
function showLoadingState(message = 'Loading...') {
    const loadingView = document.getElementById('loadingView');
    if (loadingView) {
        loadingView.style.display = 'flex';
        const messageEl = loadingView.querySelector('p');
        if (messageEl && message !== 'Loading...') {
            messageEl.textContent = message;
        }
    }
    // Hide other views
    document.querySelectorAll('.view-container').forEach(view => {
        if (view.id !== 'loadingView') {
            view.style.display = 'none';
        }
    });
}

// Hide loading state
function hideLoadingState() {
    const loadingView = document.getElementById('loadingView');
    if (loadingView) {
        loadingView.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    // Create or update error element
    let errorEl = document.getElementById('errorMessage');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id = 'errorMessage';
        errorEl.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 1000;';
        document.body.appendChild(errorEl);
    }
    
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}

// Initialize or get user's family tree
async function initializeUserFamilyTree() {
    try {
        console.log('Initializing family tree for user:', currentUser.uid);
        
        // Check if user has a family tree
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        console.log('User document exists:', userDoc.exists);
        
        if (userDoc.exists && userDoc.data().familyTreeId) {
            userFamilyTreeId = userDoc.data().familyTreeId;
            window.userFamilyTreeId = userFamilyTreeId;
            console.log('Found existing family tree:', userFamilyTreeId);
        } else {
            console.log('No family tree found, creating new one...');
            
            // First, ensure user document exists
            if (!userDoc.exists) {
                console.log('User document does not exist, creating...');
                await db.collection('users').doc(currentUser.uid).set({
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Create new family tree
            const treeData = {
                name: `${currentUser.displayName || currentUser.email}'s Family Tree`,
                ownerId: currentUser.uid,
                memberIds: [currentUser.uid],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            console.log('Creating family tree with data:', treeData);
            const treeRef = await db.collection('familyTrees').add(treeData);
            userFamilyTreeId = treeRef.id;
            window.userFamilyTreeId = userFamilyTreeId;
            console.log('Created family tree with ID:', userFamilyTreeId);
            
            // Update user document with family tree ID
            await db.collection('users').doc(currentUser.uid).update({
                familyTreeId: userFamilyTreeId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Updated user document with family tree ID');
        }
        
        // Load family members
        await loadFamilyMembers();
        
    } catch (error) {
        console.error('Error initializing family tree:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        // Don't show error to user during initialization
        // Just log it and continue
        userFamilyTreeId = null;
        window.userFamilyTreeId = null;
    }
}

// Load family members
async function loadFamilyMembers() {
    try {
        console.log('Loading family members for tree:', userFamilyTreeId);
        
        const snapshot = await db.collection('familyTrees')
            .doc(userFamilyTreeId)
            .collection('members')
            .orderBy('createdAt', 'desc')
            .get();
        
        familyMembers = [];
        window.familyMembers = familyMembers;
        const memberIds = new Set(); // Track unique IDs to prevent duplicates
        
        snapshot.forEach(doc => {
            if (!memberIds.has(doc.id)) {
                memberIds.add(doc.id);
                familyMembers.push({
                    id: doc.id,
                    ...doc.data()
                });
            }
        });
        
        console.log('Loaded members:', familyMembers.length);
        console.log('Members:', familyMembers);
        
        // Make familyMembers globally accessible for PDF export
        window.familyMembers = familyMembers;
        
        // Update current view
        const activeView = document.querySelector('.nav-item.active')?.getAttribute('data-view') || 'dashboard';
        showView(activeView);
        
    } catch (error) {
        console.error('Error loading family members:', error);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const view = e.currentTarget.getAttribute('data-view');
            showView(view);
        });
    });
    
    // Language selector
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lang = e.currentTarget.getAttribute('data-lang');
            setLanguage(lang);
        });
    });
    
    // User menu
    const userMenuBtn = document.querySelector('.user-menu-btn');
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', () => {
            const userMenu = document.querySelector('.user-menu');
            if (userMenu) {
                userMenu.classList.toggle('active');
            }
        });
    }
    
    // Close user menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu')) {
            document.querySelector('.user-menu').classList.remove('active');
        }
    });
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut();
        });
    }
    
    // Add member button
    const addMemberBtn = document.getElementById('addMemberBtn');
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => {
            showAddMemberModal();
        });
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const modal = btn.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                // Reset form if it's the add member modal
                if (modal.id === 'addMemberModal') {
                    const form = modal.querySelector('form');
                    if (form) form.reset();
                    editingMemberId = null;
                }
            }
        });
    });
    
    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Add member form
    const addMemberForm = document.getElementById('addMemberForm');
    if (addMemberForm) {
        addMemberForm.addEventListener('submit', handleAddMember);
    }
    
    // Cancel button in form
    const cancelBtn = document.querySelector('#addMemberForm .btn-secondary');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('addMemberModal').classList.remove('active');
            editingMemberId = null;
        });
    }
    
    // Relationship field change
    const relationshipField = document.querySelector('[name="relationship"]');
    if (relationshipField) {
        relationshipField.addEventListener('change', (e) => {
            const relatedToGroup = document.getElementById('relatedToGroup');
            if (relatedToGroup) {
                if (e.target.value && e.target.value !== 'parent') {
                    relatedToGroup.style.display = 'block';
                    populateRelatedToOptions();
                } else {
                    relatedToGroup.style.display = 'none';
                }
            }
        });
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Show view
function showView(viewName) {
    // Hide all views
    document.querySelectorAll('.view-container').forEach(view => {
        view.style.display = 'none';
    });
    
    // Show selected view
    const viewElement = document.getElementById(`${viewName}View`);
    if (viewElement) {
        viewElement.style.display = 'block';
    }
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });
    
    // Load view-specific data
    switch (viewName) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'tree':
            renderFamilyTree();
            break;
        case 'members':
            renderMembersList();
            break;
        case 'stories':
            loadStories();
            break;
    }
}

// Store current editing member
let editingMemberId = null;

// Show add member modal
function showAddMemberModal(member = null) {
    const modal = document.getElementById('addMemberModal');
    const form = document.getElementById('addMemberForm');
    const modalTitle = modal.querySelector('.modal-header h3');
    const submitBtn = form.querySelector('[type="submit"]');
    
    // Reset form
    form.reset();
    
    // If editing, populate form
    if (member) {
        editingMemberId = member.id;
        modalTitle.textContent = t('editFamilyMember') || 'Edit Family Member';
        submitBtn.textContent = t('update') || 'Update';
        
        form.firstName.value = member.firstName || '';
        form.lastName.value = member.lastName || '';
        form.gender.value = member.gender || '';
        form.birthDate.value = member.birthDate || '';
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

// Populate related to options
function populateRelatedToOptions() {
    const select = document.getElementById('relatedToSelect');
    select.innerHTML = '<option value="">' + (t('selectPerson') || 'Select person') + '</option>';
    
    familyMembers.forEach(member => {
        // Don't include the member being edited
        if (editingMemberId && member.id === editingMemberId) {
            return;
        }
        
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = `${member.firstName} ${member.lastName}`;
        select.appendChild(option);
    });
}

// Handle add member form submission
async function handleAddMember(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = t('loading');
    
    try {
        // Prepare member data
        const memberData = {
            firstName: form.firstName.value,
            lastName: form.lastName.value,
            gender: form.gender.value,
            birthDate: form.birthDate.value || null,
            email: form.email.value || null,
            biography: form.biography.value || '',
            relationship: form.relationship.value,
            relatedTo: form.relatedTo?.value || null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Only add these fields for new members
        if (!editingMemberId) {
            memberData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            memberData.addedBy = currentUser.uid;
        }
        
        // Handle photo upload if provided
        const photoFile = form.photo.files[0];
        if (photoFile && userFamilyTreeId) {
            try {
                const photoUrl = await uploadPhoto(photoFile);
                memberData.photoUrl = photoUrl;
            } catch (photoError) {
                console.error('Photo upload failed:', photoError);
                // Continue without photo
                console.log('Continuing without photo upload');
            }
        }
        
        // Add or update in Firestore
        let memberId;
        if (editingMemberId) {
            // Update existing member
            memberId = editingMemberId;
            await db.collection('familyTrees')
                .doc(userFamilyTreeId)
                .collection('members')
                .doc(editingMemberId)
                .update(memberData);
            
            showSuccess(t('updatedSuccessfully') || 'Updated successfully!');
        } else {
            // Add new member
            const docRef = await db.collection('familyTrees')
                .doc(userFamilyTreeId)
                .collection('members')
                .add(memberData);
            memberId = docRef.id;
            
            showSuccess(t('savedSuccessfully'));
        }
        
        // Update search index
        if (window.pyebwaSearch && memberId) {
            try {
                const memberWithId = { ...memberData, id: memberId };
                await window.pyebwaSearch.updateSearchIndex(memberWithId, userFamilyTreeId);
                console.log('Search index updated for member:', memberWithId.firstName, memberWithId.lastName);
            } catch (searchError) {
                console.error('Failed to update search index:', searchError);
                // Don't fail the operation if search indexing fails
            }
        }
        
        // Close modal and reload members
        const modal = document.getElementById('addMemberModal');
        if (modal) {
            modal.classList.remove('active');
            // Reset form
            form.reset();
        }
        editingMemberId = null;
        await loadFamilyMembers();
        
    } catch (error) {
        console.error('Error adding member:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            familyTreeId: userFamilyTreeId,
            currentUser: currentUser?.uid
        });
        
        // Show more specific error message
        if (error.code === 'permission-denied') {
            showError('Permission denied. Please check Firestore rules.');
        } else if (!userFamilyTreeId) {
            showError('No family tree found. Please refresh the page.');
        } else {
            showError(t('errorSaving') + ': ' + error.message);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = t('save');
    }
}

// Upload photo to Firebase Storage
async function uploadPhoto(file) {
    const storageRef = storage.ref();
    const photoRef = storageRef.child(`familyTrees/${userFamilyTreeId}/photos/${Date.now()}_${file.name}`);
    
    // Add metadata required by security rules
    const metadata = {
        customMetadata: {
            uploadedBy: auth.currentUser.uid
        }
    };
    
    const snapshot = await photoRef.put(file, metadata);
    const downloadUrl = await snapshot.ref.getDownloadURL();
    
    return downloadUrl;
}

// Show success message
function showSuccess(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'toast-notification success';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Fade in
    setTimeout(() => toast.style.opacity = '1', 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Show error message
function showError(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'toast-notification error';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #f44336;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Fade in
    setTimeout(() => toast.style.opacity = '1', 10);
    
    // Remove after 5 seconds (longer for errors)
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Render dashboard view
function renderDashboard() {
    const container = document.getElementById('dashboardView');
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create dashboard using the dashboard component
    if (window.createDashboard) {
        const dashboard = window.createDashboard();
        container.appendChild(dashboard);
    } else {
        // Fallback if dashboard.js hasn't loaded yet
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <h3>Loading Dashboard...</h3>
            </div>
        `;
    }
}

// Helper function to close all modals
function closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
        const form = modal.querySelector('form');
        if (form) form.reset();
    });
    editingMemberId = null;
}

// Make functions globally accessible
window.showView = showView;
window.closeAllModals = closeAllModals;

// Global function to show member details
window.showMemberDetails = function(member) {
    // Show the enhanced member profile
    if (window.viewMemberProfile && member.id) {
        window.viewMemberProfile(member.id);
    } else {
        // Fallback to edit modal if profile viewer not available
        showAddMemberModal(member);
    }
};