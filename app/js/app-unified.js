// Unified App.js - Consolidated version without duplications
// This replaces app.js, app-fixed.js, app-loop-fix.js, etc.

(function() {
    'use strict';
    
    console.log('[App] Initializing Pyebwa application');
    
    // App configuration
    const APP_CONFIG = {
        DEFAULT_LANGUAGE: 'ht',
        DEBOUNCE_DELAY: 300,
        PHOTO_UPLOAD_LIMIT: 10 * 1024 * 1024, // 10MB
        SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    };
    
    // App state
    let appState = {
        currentUser: null,
        userFamilyTreeId: null,
        familyMembers: [],
        currentLanguage: localStorage.getItem('pyebwaLang') || APP_CONFIG.DEFAULT_LANGUAGE,
        isInitialized: false
    };
    
    // Make state globally accessible
    window.appState = appState;
    
    // Initialize app when authentication is ready
    window.addEventListener('authReady', function(event) {
        console.log('[App] Authentication ready, initializing app');
        const { user, familyTreeId } = event.detail;
        
        appState.currentUser = user;
        appState.userFamilyTreeId = familyTreeId;
        
        initializeApp();
    });
    
    // Initialize app components
    async function initializeApp() {
        if (appState.isInitialized) {
            console.log('[App] Already initialized');
            return;
        }
        
        try {
            // Set up UI
            initializeUI();
            
            // Load translations
            await loadTranslations();
            
            // Load family members
            await loadFamilyMembers();
            
            // Set up real-time listeners
            setupRealtimeListeners();
            
            // Initialize features
            initializeFeatures();
            
            appState.isInitialized = true;
            console.log('[App] Initialization complete');
            
        } catch (error) {
            console.error('[App] Initialization error:', error);
            showError('Failed to initialize application');
        }
    }
    
    // Initialize UI components
    function initializeUI() {
        console.log('[App] Initializing UI');
        
        // Set up event listeners
        setupEventListeners();
        
        // Apply saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
        
        // Show user info
        updateUserDisplay();
        
        // Hide loading screen if present
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Language switcher
        document.querySelectorAll('[data-lang]').forEach(btn => {
            btn.addEventListener('click', handleLanguageSwitch);
        });
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        // Add member button
        const addMemberBtn = document.getElementById('addMemberBtn');
        if (addMemberBtn) {
            addMemberBtn.addEventListener('click', showAddMemberDialog);
        }
        
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleSearch, APP_CONFIG.DEBOUNCE_DELAY));
        }
    }
    
    // Load translations
    async function loadTranslations() {
        try {
            const response = await fetch(`/app/locales/${appState.currentLanguage}.json`);
            if (!response.ok) throw new Error('Failed to load translations');
            
            const translations = await response.json();
            window.translations = translations;
            
            updatePageTranslations();
            
        } catch (error) {
            console.error('[App] Error loading translations:', error);
            // Fallback to English
            appState.currentLanguage = 'en';
            await loadTranslations();
        }
    }
    
    // Update page with translations
    function updatePageTranslations() {
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = getTranslation(key);
            if (translation) {
                element.textContent = translation;
            }
        });
        
        // Update placeholders
        document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
            const key = element.getAttribute('data-translate-placeholder');
            const translation = getTranslation(key);
            if (translation) {
                element.placeholder = translation;
            }
        });
    }
    
    // Get translation by key
    function getTranslation(key) {
        const keys = key.split('.');
        let value = window.translations;
        
        for (const k of keys) {
            value = value?.[k];
        }
        
        return value || key;
    }
    
    // Load family members
    async function loadFamilyMembers() {
        if (!appState.userFamilyTreeId) {
            console.log('[App] No family tree ID, skipping member load');
            return;
        }
        
        try {
            const snapshot = await firebase.firestore()
                .collection('familyTrees')
                .doc(appState.userFamilyTreeId)
                .collection('members')
                .orderBy('createdAt', 'desc')
                .get();
            
            appState.familyMembers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`[App] Loaded ${appState.familyMembers.length} family members`);
            displayFamilyMembers();
            
        } catch (error) {
            console.error('[App] Error loading family members:', error);
        }
    }
    
    // Set up real-time listeners
    function setupRealtimeListeners() {
        if (!appState.userFamilyTreeId) return;
        
        // Listen for member changes
        firebase.firestore()
            .collection('familyTrees')
            .doc(appState.userFamilyTreeId)
            .collection('members')
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        handleMemberAdded(change.doc);
                    } else if (change.type === 'modified') {
                        handleMemberModified(change.doc);
                    } else if (change.type === 'removed') {
                        handleMemberRemoved(change.doc);
                    }
                });
            });
    }
    
    // Initialize features
    function initializeFeatures() {
        // Initialize family tree visualization if available
        if (window.FamilyTree) {
            window.FamilyTree.initialize(appState.familyMembers);
        }
        
        // Initialize photo gallery if available
        if (window.PhotoGallery) {
            window.PhotoGallery.initialize();
        }
        
        // Initialize search engine if available
        if (window.SearchEngine) {
            window.SearchEngine.initialize(appState.familyMembers);
        }
        
        // Initialize PDF export if available
        if (window.PDFExport) {
            window.PDFExport.initialize();
        }
    }
    
    // Display family members
    function displayFamilyMembers() {
        const container = document.getElementById('familyMembersContainer');
        if (!container) return;
        
        if (appState.familyMembers.length === 0) {
            container.innerHTML = '<p class="empty-state" data-translate="no_members">No family members yet</p>';
            return;
        }
        
        const html = appState.familyMembers.map(member => `
            <div class="member-card" data-member-id="${member.id}">
                <img src="${member.photoURL || '/app/images/default-avatar.svg'}" alt="${member.name}">
                <h3>${member.name}</h3>
                <p>${member.relationship || ''}</p>
                <button class="view-btn" onclick="viewMember('${member.id}')" data-translate="view">View</button>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }
    
    // Update user display
    function updateUserDisplay() {
        const userNameElement = document.getElementById('userName');
        if (userNameElement && appState.currentUser) {
            userNameElement.textContent = appState.currentUser.displayName || appState.currentUser.email;
        }
    }
    
    // Handle language switch
    function handleLanguageSwitch(event) {
        const lang = event.target.getAttribute('data-lang');
        if (lang && lang !== appState.currentLanguage) {
            appState.currentLanguage = lang;
            localStorage.setItem('pyebwaLang', lang);
            loadTranslations();
            
            // Update active button
            document.querySelectorAll('[data-lang]').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
            });
        }
    }
    
    // Toggle theme
    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
    
    // Handle logout
    async function handleLogout() {
        try {
            await AuthSimple.signOut();
            // Auth state listener will handle redirect
        } catch (error) {
            console.error('[App] Logout error:', error);
            showError('Failed to sign out');
        }
    }
    
    // Handle search
    function handleSearch(event) {
        const query = event.target.value.toLowerCase().trim();
        
        if (!query) {
            displayFamilyMembers();
            return;
        }
        
        const filtered = appState.familyMembers.filter(member => 
            member.name.toLowerCase().includes(query) ||
            (member.relationship && member.relationship.toLowerCase().includes(query))
        );
        
        const container = document.getElementById('familyMembersContainer');
        if (filtered.length === 0) {
            container.innerHTML = '<p class="empty-state" data-translate="no_results">No results found</p>';
        } else {
            appState.familyMembers = filtered;
            displayFamilyMembers();
            appState.familyMembers = [...appState.familyMembers]; // Restore original
        }
    }
    
    // Show add member dialog
    function showAddMemberDialog() {
        if (window.MemberDialog) {
            window.MemberDialog.show();
        } else {
            console.error('[App] MemberDialog not available');
        }
    }
    
    // View member
    window.viewMember = function(memberId) {
        if (window.MemberProfile) {
            window.MemberProfile.show(memberId);
        } else {
            console.error('[App] MemberProfile not available');
        }
    };
    
    // Handle member added
    function handleMemberAdded(doc) {
        const member = { id: doc.id, ...doc.data() };
        appState.familyMembers.unshift(member);
        displayFamilyMembers();
    }
    
    // Handle member modified
    function handleMemberModified(doc) {
        const index = appState.familyMembers.findIndex(m => m.id === doc.id);
        if (index !== -1) {
            appState.familyMembers[index] = { id: doc.id, ...doc.data() };
            displayFamilyMembers();
        }
    }
    
    // Handle member removed
    function handleMemberRemoved(doc) {
        appState.familyMembers = appState.familyMembers.filter(m => m.id !== doc.id);
        displayFamilyMembers();
    }
    
    // Show error message
    function showError(message) {
        // TODO: Implement proper error UI
        console.error('[App] Error:', message);
        alert(message);
    }
    
    // Utility: Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
})();