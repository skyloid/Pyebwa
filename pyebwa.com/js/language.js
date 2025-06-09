// Language management script for all pages
(function() {
    console.log('Language.js loading...');
    console.log('pageTranslations defined?', typeof pageTranslations !== 'undefined');
    
    // Load page translations if available
    let translations = {};
    if (typeof pageTranslations !== 'undefined') {
        translations = pageTranslations;
        console.log('Using pageTranslations with languages:', Object.keys(pageTranslations));
    } else {
        console.log('pageTranslations not found, using fallback translations');
        // Fallback translations for basic navigation
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
    }

    // Merge page translations if they exist
    if (typeof pageTranslations !== 'undefined') {
        console.log('Merging page translations...');
        Object.keys(pageTranslations).forEach(lang => {
            translations[lang] = { ...translations[lang], ...pageTranslations[lang] };
        });
    }
    
    // Get current language from localStorage or default to 'ht'
    let currentLang = localStorage.getItem('language') || 'ht';

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
                    localStorage.setItem('language', currentLang);
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