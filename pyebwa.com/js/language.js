// Language management script for all pages
(function() {
    console.log('Language.js loading...');
    console.log('pageTranslations defined?', typeof pageTranslations !== 'undefined');
    
    // Cookie helper functions
    function setCookie(name, value, days = 365) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
        // Also try to set for parent domain to share across subdomains
        document.cookie = `${name}=${value};${expires};path=/;domain=.pyebwa.com;SameSite=Lax`;
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function clearCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.pyebwa.com;`;
    }

    function setButtonDisplay(element, value) {
        if (!element) return;
        element.style.setProperty('display', value, 'important');
    }

    // Browser language detection
    function detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage || '';
        const langCode = browserLang.toLowerCase().split('-')[0];
        
        // Map browser languages to our supported languages
        if (langCode === 'en') return 'en';
        if (langCode === 'fr') return 'fr';
        if (langCode === 'ht') return 'ht';
        
        // Check full language code for specific locales
        if (browserLang.toLowerCase().includes('ht')) return 'ht';
        if (browserLang.toLowerCase().includes('fr')) return 'fr';
        if (browserLang.toLowerCase().includes('en')) return 'en';
        
        return null; // No match found
    }
    
    // Load page translations if available
    let translations = {};
    
    // Always start with fallback translations
    console.log('Loading fallback translations...');
    translations = {
            en: {
                home: "Home",
                about: "About",
                ourMission: "Our Mission",
                contact: "Contact",
                login: "Login",
                signup: "Sign Up",
                backToDashboard: "Back to Dashboard",
                poweredBy: "Powered by",
                humanLevelTech: "Technologies Humanitaires"
            },
            fr: {
                home: "Accueil",
                about: "À propos",
                ourMission: "Notre Mission",
                contact: "Contact",
                login: "Connexion",
                signup: "S'inscrire",
                backToDashboard: "Retour au tableau de bord",
                poweredBy: "Propulsé par",
                humanLevelTech: "Technologies Humanitaires"
            },
            ht: {
                home: "Akèy",
                about: "Konsènan",
                ourMission: "Misyon Nou",
                contact: "Kontak",
                login: "Konekte",
                signup: "Enskri",
                backToDashboard: "Retounen nan Dashboard la",
                poweredBy: "Pwodwi pa",
                humanLevelTech: "Technologies Humanitaires"
            }
        };

    // Merge page translations if they exist
    if (typeof pageTranslations !== 'undefined') {
        console.log('Merging page translations...');
        Object.keys(pageTranslations).forEach(lang => {
            translations[lang] = { ...translations[lang], ...pageTranslations[lang] };
        });
    }

    let pageContentOverridesPayload = null;

    async function loadPageContentOverrides() {
        try {
            const baseUrl = typeof window.__PYEBWA_assetUrl === 'function'
                ? window.__PYEBWA_assetUrl('data/page-content.published.json')
                : 'data/page-content.published.json';
            const url = new URL(baseUrl, window.location.href);
            url.searchParams.set('t', String(Date.now()));

            const response = await fetch(url.toString(), {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });

            if (!response.ok) {
                return null;
            }

            return response.json();
        } catch (error) {
            console.warn('Unable to load page content overrides:', error);
            return null;
        }
    }

    function mergePageContentOverrides(payload) {
        if (!payload || typeof payload !== 'object') return;
        const pages = payload.pages || {};

        Object.values(pages).forEach((pageValue) => {
            if (!pageValue || typeof pageValue !== 'object') return;
            Object.entries(pageValue).forEach(([lang, overrides]) => {
                if (!translations[lang] || !overrides || typeof overrides !== 'object') return;
                translations[lang] = { ...translations[lang], ...overrides };
            });
        });
    }

    function getAboutRoadmapEntries() {
        const roadmap = pageContentOverridesPayload?.pages?.about?.[currentLang]?.roadmap;
        if (Array.isArray(roadmap) && roadmap.length > 0) {
            return roadmap
                .map((item) => ({
                    year: String(item?.year || '').trim(),
                    text: String(item?.text || '')
                }))
                .filter((item) => item.year || item.text);
        }

        const fallback = translations[currentLang] || {};
        return [
            { year: fallback.story2023 || '2023', text: fallback.story2023Text || '' },
            { year: fallback.storyEarly2024 || 'Early 2024', text: fallback.storyEarly2024Text || '' },
            { year: fallback.storyMid2024 || 'Mid 2024', text: fallback.storyMid2024Text || '' },
            { year: fallback.storyToday || 'Today', text: fallback.storyTodayText || '' }
        ].filter((item) => item.year || item.text);
    }

    function renderAboutRoadmap() {
        const timeline = document.getElementById('aboutRoadmapTimeline');
        if (!timeline) return;

        const entries = getAboutRoadmapEntries();
        timeline.innerHTML = entries.map((item) => `
            <div class="timeline-item">
                <h3>${item.year}</h3>
                <p>${item.text}</p>
            </div>
        `).join('');
    }
    
    // Get current language with proper persistence
    // Priority: URL param > cookie > localStorage > browser detection > default (ht)
    let currentLang = null;
    const urlLang = new URLSearchParams(window.location.search).get('lang');

    // Check URL first so cross-site redirects can force the expected language.
    if (urlLang && translations[urlLang]) {
        currentLang = urlLang;
        console.log('Language from URL:', currentLang);
        try {
            localStorage.setItem('pyebwaLang', currentLang);
            localStorage.setItem('language', currentLang);
        } catch (error) {
            console.warn('Unable to persist URL language to localStorage:', error);
        }
        setCookie('pyebwa_lang', currentLang, 365);
    }
    
    // Check cookie first (for cross-session persistence)
    const cookieLang = getCookie('pyebwa_lang');
    if (!currentLang && cookieLang && translations[cookieLang]) {
        currentLang = cookieLang;
        console.log('Language from cookie:', currentLang);
    }
    
    // Check localStorage (using both old and new keys for compatibility)
    if (!currentLang) {
        const storedLang = localStorage.getItem('pyebwaLang') || localStorage.getItem('language');
        if (storedLang && translations[storedLang]) {
            currentLang = storedLang;
            console.log('Language from localStorage:', currentLang);
        }
    }
    
    // Detect browser language if no preference stored
    if (!currentLang) {
        const detectedLang = detectBrowserLanguage();
        if (detectedLang && translations[detectedLang]) {
            currentLang = detectedLang;
            console.log('Language from browser detection:', currentLang);
        }
    }
    
    // Default to Haitian Creole only if nothing else is found
    if (!currentLang) {
        currentLang = 'ht';
        console.log('Using default language:', currentLang);
    }

    // Update all elements with data-i18n attribute
    function updateLanguage() {
        console.log('Updating language to:', currentLang);
        console.log('Available translations:', Object.keys(translations));
        
        // Update text content
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.dataset.i18n;
            if (translations[currentLang] && translations[currentLang][key]) {
                console.log(`Translating ${key} to:`, translations[currentLang][key]);
                if (element.tagName === 'TITLE') {
                    document.title = translations[currentLang][key];
                } else {
                    // Preserve any child elements while updating text
                    if (element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE) {
                        element.textContent = translations[currentLang][key];
                    } else {
                        // For elements with multiple nodes or child elements, be more careful
                        element.textContent = translations[currentLang][key];
                    }
                }
                console.log('Updated', key, 'to', translations[currentLang][key].substring(0, 50) + '...');
            } else {
                console.warn('Translation not found for key:', key, 'in language:', currentLang);
            }
        });
        
        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.dataset.i18nPlaceholder;
            if (translations[currentLang] && translations[currentLang][key]) {
                element.placeholder = translations[currentLang][key];
            }
        });

        renderAboutRoadmap();
        updateAuthLinks();
    }

    function updateAuthLinks() {
        const authTargets = [
            { id: 'loginBtn', fallback: 'https://rasin.pyebwa.com/login' },
            { id: 'signupBtn', fallback: 'https://rasin.pyebwa.com/signup' },
            { id: 'dashboardBtn', fallback: 'https://rasin.pyebwa.com/app/' },
            { id: 'ctaBtn', fallback: 'https://rasin.pyebwa.com/signup' }
        ];

        authTargets.forEach(({ id, fallback }) => {
            const element = document.getElementById(id);
            if (!element || !element.href) {
                return;
            }

            try {
                const url = new URL(element.getAttribute('href') || fallback, window.location.origin);
                url.searchParams.set('lang', currentLang);
                element.href = url.toString();
            } catch (error) {
                console.warn('Unable to update auth link language for', id, error);
            }
        });
    }

    function syncPublicAuthButtons() {
        const params = new URLSearchParams(window.location.search);
        const isLoggedOut = params.get('logged_out') === '1';

        if (isLoggedOut) {
            clearCookie('pyebwa_auth');
            clearCookie('pyebwa_user_email');
            clearCookie('pyebwa_user_name');
        }

        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const dashboardBtn = document.getElementById('dashboardBtn');
        const isAuthenticated = !isLoggedOut && getCookie('pyebwa_auth') === '1';

        setButtonDisplay(loginBtn, isAuthenticated ? 'none' : 'inline-flex');
        setButtonDisplay(signupBtn, isAuthenticated ? 'none' : 'inline-flex');
        setButtonDisplay(dashboardBtn, isAuthenticated ? 'inline-flex' : 'none');
    }

    function syncCurrentNavLink() {
        const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
        const navLinks = document.querySelectorAll('.nav-link[href]');

        navLinks.forEach((link) => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');

            try {
                const target = new URL(link.getAttribute('href'), window.location.href);
                const targetPath = target.pathname.replace(/\/+$/, '') || '/';
                const isIndexMatch = currentPath === '/' && /\/index\.html$/.test(targetPath);
                const isMatch = targetPath === currentPath || isIndexMatch;

                if (isMatch) {
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                }
            } catch (error) {
                console.warn('Unable to evaluate nav link state for', link, error);
            }
        });
    }

    // Initialize language selector if it exists
    function initLanguageSelector() {
        const langButtons = document.querySelectorAll('.lang-btn');
        if (langButtons.length > 0) {
            // Set active button based on current language
            langButtons.forEach(btn => {
                if (btn.dataset.lang === currentLang) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
                
                // Add click handler
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const button = e.currentTarget;
                    const nextLang = button?.dataset.lang;
                    if (!nextLang || !translations[nextLang]) {
                        return;
                    }

                    // Remove active from all buttons
                    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
                    // Add active to clicked button
                    button.classList.add('active');
                    // Update language
                    currentLang = nextLang;
                    
                    // Save to both localStorage keys for compatibility
                    localStorage.setItem('pyebwaLang', currentLang); // New consistent key
                    localStorage.setItem('language', currentLang); // Old key for backward compatibility
                    
                    // Save to cookie for cross-session persistence
                    setCookie('pyebwa_lang', currentLang, 365);
                    
                    window.currentLang = currentLang; // Update global reference
                    document.documentElement.lang = currentLang;
                    console.log('Language changed to:', currentLang);
                    updateLanguage();
                });
            });
        }
    }

    // Make functions globally accessible for debugging
    window.updateLanguage = updateLanguage;
    window.currentLang = currentLang;
    window.translations = translations;
    
    function revealLocalizedPage() {
        document.documentElement.removeAttribute('data-lang-pending');
    }

    async function initializeLanguageSystem() {
        try {
            const overrides = await loadPageContentOverrides();
            if (overrides) {
                console.log('Merging page content overrides...');
                pageContentOverridesPayload = overrides;
                mergePageContentOverrides(overrides);
            }
            updateLanguage();
            initLanguageSelector();
            syncPublicAuthButtons();
            syncCurrentNavLink();
        } finally {
            revealLocalizedPage();
        }
    }
    
    // Initialize on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOMContentLoaded - initializing language system');
            initializeLanguageSystem();
        });
    } else {
        console.log('DOM already loaded - initializing language system immediately');
        initializeLanguageSystem();
    }

    window.addEventListener('pageshow', syncPublicAuthButtons);
})();
