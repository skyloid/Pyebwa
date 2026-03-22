// Theme Toggle functionality - Inline version with immediate execution
// This version executes immediately without waiting for DOM ready to avoid timing issues

(function() {
    'use strict';
    
    console.log('[Theme Toggle] Script starting...');
    
    // Function to create and initialize theme toggle
    function createThemeToggle() {
        // Check if button already exists
        if (document.getElementById('themeToggle')) {
            console.log('[Theme Toggle] Button already exists, skipping creation');
            return;
        }
        
        console.log('[Theme Toggle] Creating theme toggle button...');
        
        // Create button element
        const button = document.createElement('button');
        button.id = 'themeToggle';
        button.className = 'theme-toggle-btn';
        button.setAttribute('aria-label', 'Toggle dark mode');
        button.innerHTML = '<span class="material-icons">brightness_4</span>';
        
        // Add inline styles to ensure visibility
        button.style.cssText = `
            position: fixed !important;
            top: 70px !important;
            right: 20px !important;
            width: 48px !important;
            height: 48px !important;
            border-radius: 50% !important;
            background: #ffffff !important;
            border: 2px solid #E5E7EB !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 10000 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
            transition: all 0.3s ease !important;
        `;
        
        // Function to toggle theme
        function toggleTheme() {
            console.log('[Theme Toggle] Toggling theme...');
            
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            
            // Update icon
            const icon = button.querySelector('.material-icons');
            if (icon) {
                icon.textContent = isDark ? 'brightness_7' : 'brightness_4';
            }
            
            // Update button styles for dark mode
            if (isDark) {
                button.style.background = '#2a2a2a';
                button.style.borderColor = '#404040';
            } else {
                button.style.background = '#ffffff';
                button.style.borderColor = '#E5E7EB';
            }
            
            // Save preference
            try {
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
                document.cookie = `pyebwa_theme=${isDark ? 'dark' : 'light'};path=/;max-age=31536000;SameSite=Lax`;
                console.log('[Theme Toggle] Theme saved:', isDark ? 'dark' : 'light');
            } catch (e) {
                console.error('[Theme Toggle] Failed to save preference:', e);
            }
        }
        
        // Add click handler
        button.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleTheme();
        };
        
        // Add to body
        document.body.appendChild(button);
        console.log('[Theme Toggle] Button added to body');
        
        // Load saved theme
        try {
            const savedTheme = localStorage.getItem('theme');
            const cookieTheme = document.cookie.split(';').find(c => c.trim().startsWith('pyebwa_theme='));
            const theme = savedTheme || (cookieTheme ? cookieTheme.split('=')[1] : 'light');
            
            console.log('[Theme Toggle] Loaded theme:', theme);
            
            if (theme === 'dark') {
                document.body.classList.add('dark-mode');
                const icon = button.querySelector('.material-icons');
                if (icon) icon.textContent = 'brightness_7';
                button.style.background = '#2a2a2a';
                button.style.borderColor = '#404040';
            }
        } catch (e) {
            console.error('[Theme Toggle] Failed to load saved theme:', e);
        }
        
        // Make function globally available
        window.toggleDarkMode = toggleTheme;
        
        // Add keyboard shortcut
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                toggleTheme();
            }
        });
        
        console.log('[Theme Toggle] Initialization complete');
    }
    
    // Try to create button immediately
    if (document.body) {
        createThemeToggle();
    } else {
        // If body doesn't exist yet, wait for it
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createThemeToggle);
        } else {
            // Try again after a short delay
            setTimeout(createThemeToggle, 100);
        }
    }
    
    // Also ensure it runs after full page load as backup
    window.addEventListener('load', function() {
        setTimeout(createThemeToggle, 500);
    });
})();