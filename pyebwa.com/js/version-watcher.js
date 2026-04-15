(function() {
    'use strict';

    const VERSION_URL = window.__PYEBWA_VERSION_URL__ || 'version.json';
    const POLL_INTERVAL_MS = 60000;
    let promptVisible = false;
    let lastSeenBuildId = window.__PYEBWA_BUILD_ID__ || null;

    function getCurrentLanguage() {
        return window.currentLang
            || localStorage.getItem('pyebwaLang')
            || localStorage.getItem('language')
            || 'ht';
    }

    function reloadPreservingLanguage() {
        const lang = getCurrentLanguage();
        const url = new URL(window.location.href);
        url.searchParams.set('lang', lang);
        window.location.replace(url.toString());
    }

    function getTranslations() {
        if (typeof pageTranslations !== 'undefined') {
            return pageTranslations;
        }
        if (typeof window.pageTranslations !== 'undefined') {
            return window.pageTranslations;
        }
        return null;
    }

    function getText(key, fallback) {
        const translations = getTranslations();
        if (typeof window.currentLang === 'string' &&
            translations?.[window.currentLang]?.[key]) {
            return translations[window.currentLang][key];
        }
        return fallback;
    }

    function showUpdatePrompt(nextBuildId) {
        if (promptVisible) {
            return;
        }

        promptVisible = true;

        const prompt = document.createElement('div');
        prompt.className = 'version-update-banner';
        prompt.innerHTML = `
            <div class="version-update-banner__content">
                <span>${getText('newVersionAvailable', 'A new version of Pyebwa is available.')}</span>
                <button type="button" class="version-update-banner__action">${getText('refresh', 'Refresh')}</button>
            </div>
        `;

        const style = document.createElement('style');
        style.id = 'version-update-banner-styles';
        style.textContent = `
            .version-update-banner {
                position: fixed;
                left: 50%;
                bottom: 20px;
                transform: translateX(-50%);
                z-index: 20000;
                background: #513219;
                color: #FDEED6;
                border-radius: 999px;
                box-shadow: 0 16px 40px rgba(17, 24, 39, 0.22);
                padding: 12px 18px;
            }
            .version-update-banner__content {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 14px;
                font-weight: 600;
            }
            .version-update-banner__action {
                border: none;
                border-radius: 999px;
                padding: 8px 14px;
                background: #FDEED6;
                color: #513219;
                font-weight: 700;
                cursor: pointer;
            }
        `;

        if (!document.getElementById(style.id)) {
            document.head.appendChild(style);
        }

        prompt.querySelector('.version-update-banner__action').addEventListener('click', () => {
            lastSeenBuildId = nextBuildId;
            reloadPreservingLanguage();
        });

        (document.body || document.documentElement).appendChild(prompt);
    }

    async function checkVersion() {
        try {
            const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });

            if (!response.ok) {
                return;
            }

            const payload = await response.json();
            const nextVersion = payload.version || null;
            const nextBuildId = payload.buildId;

            if (nextVersion) {
                window.__PYEBWA_VERSION__ = nextVersion;
                if (typeof window.__PYEBWA_UPDATE_VERSION_LABELS__ === 'function') {
                    window.__PYEBWA_UPDATE_VERSION_LABELS__(nextVersion);
                }
            }

            if (!lastSeenBuildId) {
                lastSeenBuildId = nextBuildId;
                window.__PYEBWA_BUILD_ID__ = nextBuildId;
                return;
            }

            if (nextBuildId && nextBuildId !== lastSeenBuildId) {
                showUpdatePrompt(nextBuildId);
            }
        } catch (error) {
            console.warn('Version check failed:', error);
        }
    }

    window.__PYEBWA_CHECK_VERSION__ = checkVersion;
    checkVersion();
    window.setInterval(checkVersion, POLL_INTERVAL_MS);
})();
