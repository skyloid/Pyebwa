// Import Firebase configuration
const script = document.createElement('script');
script.src = '/js/firebase-config.js';
document.head.appendChild(script);

// Debug logging
const DEBUG = true;
function log(message, data = null) {
    if (DEBUG) {
        const timestamp = new Date().toISOString();
        if (data) {
            console.log(`[App ${timestamp}] ${message}`, data);
        } else {
            console.log(`[App ${timestamp}] ${message}`);
        }
    }
}

// Initialize after Firebase loads
script.onload = () => {
    // Import translations
    const translationsScript = document.createElement('script');
    translationsScript.src = 'js/translations.js';
    document.head.appendChild(translationsScript);
    
    translationsScript.onload = () => {
        // Initialize app after translations load
        initializeApp();
    };
};

function initializeApp() {
    log('Initializing app...');
    
    // Set current language from localStorage or default to Haitian Creole
    window.currentLang = localStorage.getItem('selectedLanguage') || 'ht';
    log(`Current language: ${window.currentLang}`);
    
    // Apply translations immediately
    if (typeof updateLanguage === 'function') {
        updateLanguage();
    }
    
    // Language selector functionality
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.lang-btn.active')?.classList.remove('active');
            e.target.classList.add('active');
            window.currentLang = e.target.dataset.lang;
            localStorage.setItem('selectedLanguage', window.currentLang);
            if (typeof updateLanguage === 'function') {
                updateLanguage();
            }
        });
    });
    
    // Set active language button
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === window.currentLang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Check authentication
    checkAuthenticationState();
}

// Authentication state management
let authCheckInProgress = false;
let authListener = null;

function checkAuthenticationState() {
    if (authCheckInProgress) {
        log('Auth check already in progress, skipping duplicate');
        return;
    }
    
    authCheckInProgress = true;
    log('Checking authentication state...');
    
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const authParam = urlParams.get('auth');
    const loginParam = urlParams.get('login');
    
    // Clean URL parameters after reading
    if (authParam || loginParam) {
        log('Cleaning URL parameters');
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
    
    // Enhanced redirect loop prevention
    const redirectData = getRedirectData();
    log('Redirect data:', redirectData);
    
    // If we've been redirecting too many times, show error
    if (redirectData.count >= 3) {
        log('Too many redirects detected, showing error');
        hideLoadingState();
        showError('Authentication error. Please clear your browser data and try again.');
        clearRedirectData();
        authCheckInProgress = false;
        return;
    }
    
    // Show loading state
    showLoadingState('Verifying authentication...');
    
    // First, check if user is already authenticated
    const currentUser = auth.currentUser;
    if (currentUser) {
        log('User already authenticated:', currentUser.email);
        handleAuthenticatedUser(currentUser);
        authCheckInProgress = false;
        return;
    }
    
    // If coming from login, wait for auth state to sync
    if (authParam === 'success' || loginParam === 'true') {
        log('Coming from successful login, waiting for auth sync...');
        
        // Set up auth state listener with timeout
        let authTimeout;
        let listenerCleared = false;
        
        const clearAuthListener = () => {
            if (!listenerCleared) {
                listenerCleared = true;
                if (authTimeout) clearTimeout(authTimeout);
                if (authListener) authListener();
                authListener = null;
            }
        };
        
        // Listen for auth state changes
        authListener = auth.onAuthStateChanged((user) => {
            log('Auth state changed:', user ? user.email : 'null');
            
            if (user) {
                clearAuthListener();
                handleAuthenticatedUser(user);
                authCheckInProgress = false;
            }
        });
        
        // Timeout after 10 seconds (increased from 5)
        authTimeout = setTimeout(() => {
            log('Auth sync timeout - redirecting to login');
            clearAuthListener();
            
            // Update redirect count
            updateRedirectData(redirectData.count + 1);
            
            // Redirect to login
            const cleanRedirectUrl = window.location.origin + window.location.pathname;
            window.location.href = 'https://secure.pyebwa.com/?redirect=' + encodeURIComponent(cleanRedirectUrl);
            authCheckInProgress = false;
        }, 10000); // Increased to 10 seconds
        
    } else {
        // Not coming from login, set up regular auth listener
        log('Setting up auth state listener...');
        
        if (!authListener) {
            authListener = auth.onAuthStateChanged((user) => {
                log('Auth state:', user ? 'authenticated' : 'not authenticated');
                
                if (user) {
                    handleAuthenticatedUser(user);
                } else {
                    // Not authenticated - redirect to login
                    log('User not authenticated, redirecting to login...');
                    
                    // Update redirect count
                    updateRedirectData(redirectData.count + 1);
                    
                    // Redirect to login
                    const cleanRedirectUrl = window.location.origin + window.location.pathname;
                    window.location.href = 'https://secure.pyebwa.com/?redirect=' + encodeURIComponent(cleanRedirectUrl);
                }
                authCheckInProgress = false;
            });
        }
    }
}

// Handle authenticated user
async function handleAuthenticatedUser(user) {
    log('Handling authenticated user:', user.email);
    
    try {
        // Clear redirect data on successful auth
        clearRedirectData();
        
        // Get user profile from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            log('User profile loaded:', userData);
            
            // Update UI with user info
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = userData.fullName || user.displayName || 'User';
            }
            
            // Initialize the main app
            initMainApp();
        } else {
            log('User profile not found, creating...');
            // Create basic profile if it doesn't exist
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                fullName: user.displayName || 'User',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            initMainApp();
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        hideLoadingState();
        showError('Error loading user profile. Please try again.');
    }
}

// Redirect data management
function getRedirectData() {
    try {
        const data = sessionStorage.getItem('pyebwaRedirectData');
        if (!data) return { count: 0, timestamp: Date.now() };
        
        const parsed = JSON.parse(data);
        
        // Reset if data is older than 10 minutes
        if (Date.now() - parsed.timestamp > 600000) {
            clearRedirectData();
            return { count: 0, timestamp: Date.now() };
        }
        
        return parsed;
    } catch (e) {
        return { count: 0, timestamp: Date.now() };
    }
}

function updateRedirectData(count) {
    sessionStorage.setItem('pyebwaRedirectData', JSON.stringify({
        count: count,
        timestamp: Date.now()
    }));
}

function clearRedirectData() {
    sessionStorage.removeItem('pyebwaRedirectData');
}

// UI Functions
function showLoadingState(message = 'Loading...') {
    const loadingView = document.getElementById('loadingView');
    if (loadingView) {
        loadingView.style.display = 'flex';
        const loadingText = loadingView.querySelector('p');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }
}

function hideLoadingState() {
    const loadingView = document.getElementById('loadingView');
    if (loadingView) {
        loadingView.style.display = 'none';
    }
}

function showError(message) {
    const errorView = document.getElementById('errorView');
    if (errorView) {
        errorView.style.display = 'flex';
        const errorText = errorView.querySelector('p');
        if (errorText) {
            errorText.textContent = message;
        }
    }
}

// Initialize main app functionality
function initMainApp() {
    log('Initializing main app...');
    hideLoadingState();
    
    // Show main content
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    // Initialize navigation
    initNavigation();
    
    // Initialize forms
    initForms();
    
    // Load initial data
    loadDashboardData();
}

// Navigation
function initNavigation() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = tab.dataset.tab;
            showTab(tabName);
        });
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await auth.signOut();
                clearRedirectData();
                sessionStorage.clear();
                window.location.href = 'https://pyebwa.com';
            } catch (error) {
                console.error('Logout error:', error);
                alert('Error logging out. Please try again.');
            }
        });
    }
}

// Tab management
function showTab(tabName) {
    // Update active tab
    document.querySelectorAll('.nav-tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Show corresponding view
    document.querySelectorAll('.view').forEach(view => {
        if (view.id === tabName + 'View') {
            view.style.display = 'block';
        } else {
            view.style.display = 'none';
        }
    });
}

// Form initialization
function initForms() {
    // Add person form
    const addPersonForm = document.getElementById('addPersonForm');
    if (addPersonForm) {
        addPersonForm.addEventListener('submit', handleAddPerson);
    }
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
}

// Add person handler
async function handleAddPerson(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const personData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        birthDate: formData.get('birthDate'),
        birthPlace: formData.get('birthPlace'),
        gender: formData.get('gender'),
        relationship: formData.get('relationship')
    };
    
    try {
        const docRef = await db.collection('persons').add({
            ...personData,
            userId: auth.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        log('Person added:', docRef.id);
        
        // Reset form
        e.target.reset();
        
        // Show success message
        alert(getTranslation('personAddedSuccess'));
        
        // Refresh the list
        loadPersonsList();
        
        // Switch to list view
        showTab('list');
    } catch (error) {
        console.error('Error adding person:', error);
        alert(getTranslation('errorAddingPerson'));
    }
}

// Search handler
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const personCards = document.querySelectorAll('.person-card');
    
    personCards.forEach(card => {
        const name = card.querySelector('h3').textContent.toLowerCase();
        if (name.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const personsSnapshot = await db.collection('persons')
            .where('userId', '==', auth.currentUser.uid)
            .get();
        
        const totalPersons = personsSnapshot.size;
        
        // Update dashboard stats
        const totalPersonsElement = document.getElementById('totalPersons');
        if (totalPersonsElement) {
            totalPersonsElement.textContent = totalPersons;
        }
        
        // Load persons list
        loadPersonsList();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load persons list
async function loadPersonsList() {
    try {
        const personsSnapshot = await db.collection('persons')
            .where('userId', '==', auth.currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        const personsList = document.getElementById('personsList');
        if (!personsList) return;
        
        personsList.innerHTML = '';
        
        personsSnapshot.forEach(doc => {
            const person = doc.data();
            const personCard = createPersonCard(doc.id, person);
            personsList.appendChild(personCard);
        });
    } catch (error) {
        console.error('Error loading persons:', error);
    }
}

// Create person card
function createPersonCard(id, person) {
    const card = document.createElement('div');
    card.className = 'person-card';
    card.innerHTML = `
        <h3>${person.firstName} ${person.lastName}</h3>
        <p>${getTranslation('birthDate')}: ${person.birthDate}</p>
        <p>${getTranslation('birthPlace')}: ${person.birthPlace}</p>
        <p>${getTranslation('relationship')}: ${getTranslation(person.relationship)}</p>
        <div class="card-actions">
            <button onclick="editPerson('${id}')" class="btn btn-secondary btn-sm">
                ${getTranslation('edit')}
            </button>
            <button onclick="deletePerson('${id}')" class="btn btn-secondary btn-sm">
                ${getTranslation('delete')}
            </button>
        </div>
    `;
    return card;
}

// Global functions for card actions
window.editPerson = async (id) => {
    // TODO: Implement edit functionality
    alert('Edit functionality coming soon!');
};

window.deletePerson = async (id) => {
    if (confirm(getTranslation('confirmDelete'))) {
        try {
            await db.collection('persons').doc(id).delete();
            loadPersonsList();
        } catch (error) {
            console.error('Error deleting person:', error);
            alert(getTranslation('errorDeleting'));
        }
    }
};

// Helper to get translations
function getTranslation(key) {
    if (window.translations && window.translations[window.currentLang]) {
        return window.translations[window.currentLang][key] || key;
    }
    return key;
}

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // Prevent minor errors from breaking the app
    if (e.message && e.message.includes('share-modal')) {
        e.preventDefault();
    }
});