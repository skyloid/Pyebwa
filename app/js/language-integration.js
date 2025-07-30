// Language Detection Integration
// Integrates browser language detection with the translation system

(function() {
    'use strict';
    
    console.log('[LanguageIntegration] Initializing language detection integration');
    
    // Wait for both systems to be ready
    const waitForDependencies = () => {
        if (!window.LanguageDetection || !window.translations || !window.setLanguage) {
            setTimeout(waitForDependencies, 100);
            return;
        }
        
        initializeIntegration();
    };
    
    function initializeIntegration() {
        console.log('[LanguageIntegration] Dependencies loaded, integrating systems');
        
        // Get the current language from various sources
        const detectedLang = window.LanguageDetection.currentLanguage;
        const storedLang = localStorage.getItem('pyebwaLang') || 
                          localStorage.getItem('selectedLanguage');
        const cookieLang = getCookieLanguage();
        
        // Priority: stored preference > cookie > detected > default (ht)
        let initialLang = storedLang || cookieLang || detectedLang || 'ht';
        
        // Validate the language is supported
        if (!translations[initialLang]) {
            console.warn('[LanguageIntegration] Language not supported:', initialLang);
            initialLang = 'ht'; // Default to Haitian Creole if unsupported
        }
        
        // If no stored preference exists, this is likely a first visit
        if (!storedLang && !cookieLang) {
            console.log('[LanguageIntegration] First visit detected, using:', initialLang);
        }
        
        // Set the initial language
        console.log('[LanguageIntegration] Setting initial language:', initialLang);
        window.setLanguage(initialLang);
        
        // Update LanguageDetection with the active language
        if (initialLang !== detectedLang) {
            window.LanguageDetection.setUserPreference(initialLang);
        }
        
        // Listen for language changes from the detection system
        window.addEventListener('languagechange', (event) => {
            const newLang = event.detail.language;
            console.log('[LanguageIntegration] Language change detected:', newLang);
            
            if (translations[newLang] && window.currentLanguage !== newLang) {
                window.setLanguage(newLang);
            }
        });
        
        // Listen for language detection changes (browser language changed)
        window.addEventListener('languagedetected', (event) => {
            const { detectedLanguage, currentLanguage, suggestion } = event.detail;
            
            if (suggestion && translations[detectedLanguage]) {
                // Show language suggestion
                showLanguageSuggestion(detectedLanguage);
            }
        });
        
        // Override setLanguage to sync with LanguageDetection
        const originalSetLanguage = window.setLanguage;
        window.setLanguage = function(lang) {
            originalSetLanguage(lang);
            
            // Sync with LanguageDetection
            if (window.LanguageDetection && window.LanguageDetection.currentLanguage !== lang) {
                window.LanguageDetection.setUserPreference(lang);
            }
            
            // Update HTML lang attribute
            document.documentElement.lang = lang;
            
            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('languagechanged', {
                detail: { language: lang }
            }));
        };
        
        // Add language selector UI enhancements
        enhanceLanguageSelector();
        
        // Add keyboard shortcuts for language switching
        addLanguageShortcuts();
        
        console.log('[LanguageIntegration] Integration complete');
    }
    
    function getCookieLanguage() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            // Check for all possible cookie names used across domains
            if (name === 'pyebwa_lang' || name === 'pyebwaLang' || name === 'lang') {
                return value;
            }
        }
        return null;
    }
    
    function showLanguageSuggestion(suggestedLang) {
        // Don't show suggestion if already dismissed
        const dismissedKey = `langSuggestionDismissed_${suggestedLang}`;
        if (sessionStorage.getItem(dismissedKey)) {
            return;
        }
        
        const langName = window.LanguageDetection.getLanguageName(suggestedLang);
        const currentLangName = window.LanguageDetection.getLanguageName(window.currentLanguage);
        
        // Create suggestion notification
        const notification = document.createElement('div');
        notification.className = 'language-suggestion';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 9999;
            max-width: 350px;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">🌐</span>
                <div style="flex: 1;">
                    <strong>Switch to ${langName}?</strong><br>
                    <small>We detected your browser is set to ${langName}</small>
                </div>
            </div>
            <div style="margin-top: 10px; display: flex; gap: 10px;">
                <button onclick="acceptLanguageSuggestion('${suggestedLang}')" style="
                    background: white;
                    color: #4CAF50;
                    border: none;
                    padding: 5px 15px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-weight: bold;
                ">Switch</button>
                <button onclick="dismissLanguageSuggestion('${suggestedLang}')" style="
                    background: transparent;
                    color: white;
                    border: 1px solid white;
                    padding: 5px 15px;
                    border-radius: 3px;
                    cursor: pointer;
                ">Keep ${currentLangName}</button>
            </div>
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
        
        // Global functions for buttons
        window.acceptLanguageSuggestion = (lang) => {
            window.setLanguage(lang);
            notification.remove();
        };
        
        window.dismissLanguageSuggestion = (lang) => {
            sessionStorage.setItem(dismissedKey, 'true');
            notification.remove();
        };
    }
    
    function enhanceLanguageSelector() {
        // Find existing language buttons
        const langButtons = document.querySelectorAll('.lang-btn');
        
        langButtons.forEach(btn => {
            const lang = btn.getAttribute('data-lang');
            
            // Add tooltip with language info
            const langInfo = window.LanguageDetection.supportedLanguages[lang];
            if (langInfo) {
                btn.title = langInfo.name;
            }
            
            // Add detection indicator
            if (lang === window.LanguageDetection.detectedLanguage) {
                btn.classList.add('detected-language');
                
                // Add indicator icon
                const indicator = document.createElement('span');
                indicator.className = 'detection-indicator';
                indicator.textContent = '🌐';
                indicator.style.cssText = `
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    font-size: 12px;
                    background: #4CAF50;
                    border-radius: 50%;
                    width: 16px;
                    height: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                btn.style.position = 'relative';
                btn.appendChild(indicator);
            }
        });
        
        // Add language stats to selector
        addLanguageStats();
    }
    
    function addLanguageStats() {
        const stats = window.LanguageDetection.getLanguageStats();
        if (!stats || !stats.usage) return;
        
        // Find language selector container
        const langSelector = document.querySelector('.language-selector-container');
        if (!langSelector) return;
        
        // Add usage indicators
        Object.entries(stats.usage).forEach(([lang, count]) => {
            const btn = langSelector.querySelector(`[data-lang="${lang}"]`);
            if (btn && count > 1) {
                const badge = document.createElement('span');
                badge.className = 'usage-badge';
                badge.textContent = count;
                badge.style.cssText = `
                    position: absolute;
                    bottom: -5px;
                    left: -5px;
                    background: #2196F3;
                    color: white;
                    font-size: 10px;
                    padding: 2px 5px;
                    border-radius: 10px;
                `;
                btn.appendChild(badge);
            }
        });
    }
    
    function addLanguageShortcuts() {
        // Keyboard shortcuts for quick language switching
        document.addEventListener('keydown', (e) => {
            // Alt + L to cycle through languages
            if (e.altKey && e.key === 'l') {
                e.preventDefault();
                cycleLanguage();
            }
            
            // Alt + 1-3 for specific languages
            if (e.altKey && e.key >= '1' && e.key <= '3') {
                e.preventDefault();
                const languages = Object.keys(translations);
                const index = parseInt(e.key) - 1;
                if (languages[index]) {
                    window.setLanguage(languages[index]);
                }
            }
        });
    }
    
    function cycleLanguage() {
        const languages = Object.keys(translations);
        const currentIndex = languages.indexOf(window.currentLanguage);
        const nextIndex = (currentIndex + 1) % languages.length;
        window.setLanguage(languages[nextIndex]);
        
        // Show notification
        showLanguageChangeNotification(languages[nextIndex]);
    }
    
    function showLanguageChangeNotification(lang) {
        const langName = window.LanguageDetection.getLanguageName(lang);
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            z-index: 9999;
            animation: fadeInOut 2s ease-in-out;
        `;
        notification.textContent = `Language: ${langName}`;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0%, 100% { opacity: 0; transform: translateX(-50%) translateY(20px); }
                20%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 2000);
    }
    
    // Start initialization
    waitForDependencies();
    
})();