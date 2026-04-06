// Theme Toggle - uses the inline #themeToggle button in the header
(function() {
    'use strict';

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
            document.body.classList.toggle('dark-mode');
            var isDark = document.body.classList.contains('dark-mode');
            try {
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
            } catch (e) {}
            updateIcon();
        }

        // Load saved theme (default: dark)
        try {
            var saved = localStorage.getItem('theme');
            if (saved !== 'light') {
                document.body.classList.add('dark-mode');
            }
        } catch (e) {}

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

    // Apply saved theme immediately (before DOM ready)
    // Default to dark mode unless user explicitly chose light
    try {
        var saved = localStorage.getItem('theme');
        if (saved !== 'light') {
            document.body.classList.add('dark-mode');
        }
    } catch (e) {
        document.body.classList.add('dark-mode');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initThemeToggle);
    } else {
        initThemeToggle();
    }
})();
