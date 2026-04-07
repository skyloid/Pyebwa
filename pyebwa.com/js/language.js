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
    
    // Get current language with proper persistence
    // Priority: cookie > localStorage > browser detection > default (ht)
    let currentLang = null;
    
    // Check cookie first (for cross-session persistence)
    const cookieLang = getCookie('pyebwa_lang');
    if (cookieLang && translations[cookieLang]) {
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

        updateAuthLinks();
    }

    function updateAuthLinks() {
        const authTargets = [
            { id: 'loginBtn', fallback: 'https://rasin.pyebwa.com/login-standalone.html' },
            { id: 'signupBtn', fallback: 'https://rasin.pyebwa.com/signup-standalone.html' },
            { id: 'ctaBtn', fallback: 'https://rasin.pyebwa.com/signup-standalone.html' }
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
                    // Remove active from all buttons
                    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
                    // Add active to clicked button
                    e.target.classList.add('active');
                    // Update language
                    currentLang = e.target.dataset.lang;
                    
                    // Save to both localStorage keys for compatibility
                    localStorage.setItem('pyebwaLang', currentLang); // New consistent key
                    localStorage.setItem('language', currentLang); // Old key for backward compatibility
                    
                    // Save to cookie for cross-session persistence
                    setCookie('pyebwa_lang', currentLang, 365);
                    
                    window.currentLang = currentLang; // Update global reference
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
    
    // Initialize on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOMContentLoaded - initializing language system');
            updateLanguage();
            initLanguageSelector();
        });
    } else {
        console.log('DOM already loaded - initializing language system immediately');
        updateLanguage();
        initLanguageSelector();
    }
})();
