// Theme Toggle - uses the inline #themeToggle button in the header
(function() {
    'use strict';

    function resolveThemePreference() {
        try {
            var saved = localStorage.getItem('theme');
            if (saved === 'dark' || saved === 'light') {
                return saved;
            }
        } catch (e) {}

        var hour = new Date().getHours();
        return (hour >= 19 || hour < 6) ? 'dark' : 'light';
    }

    function initThemeToggle() {
        var button = document.getElementById('themeToggle');
        if (!button) return;

        var icon = document.getElementById('themeIcon');

        function updateIcon() {
            if (icon) {
                icon.textContent = document.body.classList.contains('dark-mode') ? 'light_mode' : 'dark_mode';
            }
        }

        function toggleTheme() {
            document.documentElement.classList.remove('dark-mode-preload');
            document.body.classList.toggle('dark-mode');
            var isDark = document.body.classList.contains('dark-mode');
            document.documentElement.classList.toggle('dark-mode-preload', isDark);
            try {
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
            } catch (e) {}
            updateIcon();
        }

        if (resolveThemePreference() === 'dark') {
            document.documentElement.classList.add('dark-mode-preload');
            document.body.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode-preload');
        }

        updateIcon();
        button.addEventListener('click', toggleTheme);
        window.toggleDarkMode = toggleTheme;

        // Keyboard shortcut: Ctrl+Shift+D
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                toggleTheme();
            }
        });
    }

    if (resolveThemePreference() === 'dark') {
        document.documentElement.classList.add('dark-mode-preload');
        document.body.classList.add('dark-mode');
    } else {
        document.documentElement.classList.remove('dark-mode-preload');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initThemeToggle);
    } else {
        initThemeToggle();
    }
})();
