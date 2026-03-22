// Browser Language Detection Module
// Detects user's preferred language and manages language settings

(function() {
    'use strict';
    
    console.log('[LanguageDetection] Initializing language detection module');
    
    const LanguageDetection = {
        // Supported languages with their variations
        supportedLanguages: {
            'en': { name: 'English', variations: ['en-US', 'en-GB', 'en-CA', 'en-AU'] },
            'fr': { name: 'Français', variations: ['fr-FR', 'fr-CA', 'fr-BE', 'fr-CH'] },
            'ht': { name: 'Kreyòl Ayisyen', variations: ['ht-HT'] }
        },
        
        // Storage keys
        STORAGE_KEYS: {
            USER_LANGUAGE: 'pyebwa_user_language',
            DETECTED_LANGUAGE: 'pyebwa_detected_language',
            LANGUAGE_HISTORY: 'pyebwa_language_history',
            AUTO_DETECT: 'pyebwa_auto_detect_language'
        },
        
        // Current language state
        currentLanguage: null,
        detectedLanguage: null,
        
        init() {
            this.detectedLanguage = this.detectBrowserLanguage();
            this.currentLanguage = this.getUserPreference() || this.detectedLanguage;
            
            this.setupLanguageDetection();
            this.notifyLanguageChange();
            this.monitorLanguageChanges();
            
            console.log('[LanguageDetection] Initialized with language:', this.currentLanguage);
        },
        
        // Detect browser language
        detectBrowserLanguage() {
            console.log('[LanguageDetection] Detecting browser language...');
            
            // Get all possible language indicators
            const navigatorLang = navigator.language || navigator.userLanguage;
            const navigatorLanguages = navigator.languages || [];
            
            // Also check HTML lang attribute
            const htmlLang = document.documentElement.lang;
            
            // Collect all language candidates
            const candidates = [
                navigatorLang,
                ...navigatorLanguages,
                htmlLang
            ].filter(Boolean);
            
            console.log('[LanguageDetection] Language candidates:', candidates);
            
            // Find the first supported language
            for (const candidate of candidates) {
                const normalizedLang = this.normalizeLanguageCode(candidate);
                if (this.isLanguageSupported(normalizedLang)) {
                    console.log('[LanguageDetection] Detected supported language:', normalizedLang);
                    this.storeDetectedLanguage(normalizedLang, candidates);
                    return normalizedLang;
                }
            }
            
            // Default to English if no supported language found
            console.log('[LanguageDetection] No supported language found, defaulting to English');
            return 'en';
        },
        
        // Normalize language code (e.g., 'en-US' -> 'en')
        normalizeLanguageCode(langCode) {
            if (!langCode) return null;
            
            // Convert to lowercase and get primary language
            const normalized = langCode.toLowerCase().split('-')[0];
            
            // Special handling for Chinese
            if (langCode.toLowerCase().includes('zh-hant')) return 'zh-TW';
            if (langCode.toLowerCase().includes('zh-hans')) return 'zh-CN';
            
            return normalized;
        },
        
        // Check if language is supported
        isLanguageSupported(langCode) {
            const normalized = this.normalizeLanguageCode(langCode);
            return normalized in this.supportedLanguages;
        },
        
        // Get user's stored language preference
        getUserPreference() {
            try {
                const stored = localStorage.getItem(this.STORAGE_KEYS.USER_LANGUAGE);
                if (stored && this.isLanguageSupported(stored)) {
                    console.log('[LanguageDetection] Found user preference:', stored);
                    return stored;
                }
            } catch (error) {
                console.error('[LanguageDetection] Error reading user preference:', error);
            }
            return null;
        },
        
        // Set user's language preference
        setUserPreference(langCode) {
            if (!this.isLanguageSupported(langCode)) {
                console.error('[LanguageDetection] Unsupported language:', langCode);
                return false;
            }
            
            try {
                localStorage.setItem(this.STORAGE_KEYS.USER_LANGUAGE, langCode);
                this.updateLanguageHistory(langCode);
                this.currentLanguage = langCode;
                this.notifyLanguageChange();
                
                console.log('[LanguageDetection] User preference set to:', langCode);
                return true;
            } catch (error) {
                console.error('[LanguageDetection] Error setting user preference:', error);
                return false;
            }
        },
        
        // Store detected language information
        storeDetectedLanguage(langCode, candidates) {
            try {
                const detectionInfo = {
                    language: langCode,
                    candidates: candidates,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    platform: navigator.platform
                };
                
                localStorage.setItem(
                    this.STORAGE_KEYS.DETECTED_LANGUAGE, 
                    JSON.stringify(detectionInfo)
                );
            } catch (error) {
                console.error('[LanguageDetection] Error storing detection info:', error);
            }
        },
        
        // Update language usage history
        updateLanguageHistory(langCode) {
            try {
                const history = JSON.parse(
                    localStorage.getItem(this.STORAGE_KEYS.LANGUAGE_HISTORY) || '[]'
                );
                
                history.push({
                    language: langCode,
                    timestamp: new Date().toISOString()
                });
                
                // Keep only last 10 entries
                if (history.length > 10) {
                    history.splice(0, history.length - 10);
                }
                
                localStorage.setItem(
                    this.STORAGE_KEYS.LANGUAGE_HISTORY,
                    JSON.stringify(history)
                );
            } catch (error) {
                console.error('[LanguageDetection] Error updating history:', error);
            }
        },
        
        // Setup automatic language detection
        setupLanguageDetection() {
            // Check if auto-detection is enabled
            const autoDetect = localStorage.getItem(this.STORAGE_KEYS.AUTO_DETECT) !== 'false';
            
            if (autoDetect && !this.getUserPreference()) {
                // No user preference, use detected language
                this.setUserPreference(this.detectedLanguage);
            }
            
            // Add language detection to page visibility changes
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.checkLanguageChange();
                }
            });
        },
        
        // Check if browser language has changed
        checkLanguageChange() {
            const newDetected = this.detectBrowserLanguage();
            
            if (newDetected !== this.detectedLanguage) {
                console.log('[LanguageDetection] Browser language changed:', {
                    old: this.detectedLanguage,
                    new: newDetected
                });
                
                this.detectedLanguage = newDetected;
                
                // Notify about the change
                this.notifyLanguageDetectionChange(newDetected);
            }
        },
        
        // Monitor for language changes
        monitorLanguageChanges() {
            // Check periodically for language changes
            setInterval(() => {
                this.checkLanguageChange();
            }, 30000); // Every 30 seconds
            
            // Listen for storage events (changes from other tabs)
            window.addEventListener('storage', (event) => {
                if (event.key === this.STORAGE_KEYS.USER_LANGUAGE) {
                    const newLang = event.newValue;
                    if (newLang && newLang !== this.currentLanguage) {
                        this.currentLanguage = newLang;
                        this.notifyLanguageChange();
                    }
                }
            });
        },
        
        // Notify components about language change
        notifyLanguageChange() {
            const event = new CustomEvent('languagechange', {
                detail: {
                    language: this.currentLanguage,
                    detected: this.detectedLanguage,
                    isUserPreference: !!this.getUserPreference()
                }
            });
            
            window.dispatchEvent(event);
            document.documentElement.lang = this.currentLanguage;
            
            // Update any language indicators in the UI
            this.updateLanguageIndicators();
        },
        
        // Notify about detected language change
        notifyLanguageDetectionChange(newLanguage) {
            const event = new CustomEvent('languagedetected', {
                detail: {
                    detectedLanguage: newLanguage,
                    currentLanguage: this.currentLanguage,
                    suggestion: !this.getUserPreference() && newLanguage !== this.currentLanguage
                }
            });
            
            window.dispatchEvent(event);
        },
        
        // Update UI language indicators
        updateLanguageIndicators() {
            // Update language selector if exists
            const langSelector = document.querySelector('.language-selector');
            if (langSelector) {
                langSelector.value = this.currentLanguage;
            }
            
            // Update language display
            const langDisplay = document.querySelector('.current-language');
            if (langDisplay) {
                langDisplay.textContent = this.getLanguageName(this.currentLanguage);
            }
            
            // Add language class to body
            document.body.className = document.body.className
                .replace(/\blang-\w+\b/g, '')
                .trim() + ' lang-' + this.currentLanguage;
        },
        
        // Get human-readable language name
        getLanguageName(langCode) {
            return this.supportedLanguages[langCode]?.name || langCode.toUpperCase();
        },
        
        // Get all supported languages
        getSupportedLanguages() {
            return Object.entries(this.supportedLanguages).map(([code, info]) => ({
                code: code,
                name: info.name,
                variations: info.variations
            }));
        },
        
        // Enable/disable automatic language detection
        setAutoDetect(enabled) {
            localStorage.setItem(this.STORAGE_KEYS.AUTO_DETECT, enabled ? 'true' : 'false');
        },
        
        // Get language statistics
        getLanguageStats() {
            try {
                const history = JSON.parse(
                    localStorage.getItem(this.STORAGE_KEYS.LANGUAGE_HISTORY) || '[]'
                );
                
                const stats = {};
                history.forEach(entry => {
                    stats[entry.language] = (stats[entry.language] || 0) + 1;
                });
                
                return {
                    current: this.currentLanguage,
                    detected: this.detectedLanguage,
                    history: history,
                    usage: stats,
                    mostUsed: Object.entries(stats)
                        .sort((a, b) => b[1] - a[1])[0]?.[0] || null
                };
            } catch (error) {
                console.error('[LanguageDetection] Error getting stats:', error);
                return null;
            }
        },
        
        // Get language recommendation based on various factors
        getRecommendedLanguage() {
            // Priority order:
            // 1. User preference
            // 2. Most used language
            // 3. Detected browser language
            // 4. Default (English)
            
            const userPref = this.getUserPreference();
            if (userPref) return userPref;
            
            const stats = this.getLanguageStats();
            if (stats?.mostUsed) return stats.mostUsed;
            
            if (this.detectedLanguage) return this.detectedLanguage;
            
            return 'en';
        },
        
        // Format date/time according to language
        formatDateTime(date, langCode = null) {
            const lang = langCode || this.currentLanguage;
            const locale = this.supportedLanguages[lang]?.variations[0] || lang;
            
            try {
                return new Intl.DateTimeFormat(locale, {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                }).format(date);
            } catch (error) {
                return date.toLocaleString();
            }
        },
        
        // Format numbers according to language
        formatNumber(number, langCode = null) {
            const lang = langCode || this.currentLanguage;
            const locale = this.supportedLanguages[lang]?.variations[0] || lang;
            
            try {
                return new Intl.NumberFormat(locale).format(number);
            } catch (error) {
                return number.toString();
            }
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => LanguageDetection.init());
    } else {
        LanguageDetection.init();
    }
    
    // Expose globally
    window.LanguageDetection = LanguageDetection;
    
})();