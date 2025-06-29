// Theme Toggle functionality for Pyebwa App
(function() {
    // Create theme toggle button
    const themeToggle = document.createElement('button');
    themeToggle.id = 'themeToggle';
    themeToggle.className = 'theme-toggle-btn';
    themeToggle.setAttribute('aria-label', 'Toggle dark mode');
    themeToggle.innerHTML = '<span class="material-icons">brightness_4</span>';
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .theme-toggle-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: var(--white);
            border: 2px solid var(--gray-200);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            z-index: 100;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
        }
        
        .theme-toggle-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .theme-toggle-btn .material-icons {
            font-size: 24px;
            color: var(--gray-700);
            transition: color 0.3s ease;
        }
        
        /* Dark mode styles */
        body.dark-mode {
            --white: #1a1a1a;
            --gray-50: #262626;
            --gray-100: #333333;
            --gray-200: #404040;
            --gray-300: #525252;
            --gray-400: #666666;
            --gray-500: #808080;
            --gray-600: #999999;
            --gray-700: #b3b3b3;
            --gray-800: #cccccc;
            --gray-900: #e6e6e6;
            --black: #ffffff;
            
            background: #121212;
            color: #e0e0e0;
        }
        
        body.dark-mode .theme-toggle-btn {
            background: var(--gray-100);
            border-color: var(--gray-300);
        }
        
        body.dark-mode .theme-toggle-btn .material-icons {
            color: var(--accent-yellow);
        }
        
        body.dark-mode .app-header {
            background: var(--gray-100);
            border-bottom-color: var(--gray-300);
        }
        
        body.dark-mode .nav-item {
            color: var(--gray-700);
        }
        
        body.dark-mode .nav-item:hover {
            background: var(--gray-200);
        }
        
        body.dark-mode .nav-item.active {
            background: var(--primary-blue);
            color: var(--white);
        }
        
        body.dark-mode .user-menu-btn {
            background: var(--bg-secondary);
            border-color: var(--border-color);
            color: var(--text-primary);
        }
        
        body.dark-mode .user-menu-btn:hover {
            background: var(--bg-tertiary);
            border-color: var(--border-hover);
        }
        
        body.dark-mode .user-dropdown {
            background: var(--bg-secondary);
            border-color: var(--border-color);
            box-shadow: 0 4px 12px var(--shadow-color);
        }
        
        body.dark-mode .user-dropdown a {
            color: var(--text-primary);
        }
        
        body.dark-mode .user-dropdown a:hover {
            background: var(--bg-tertiary);
            color: var(--text-primary);
        }
        
        body.dark-mode .user-dropdown hr {
            border-color: var(--border-color);
        }
        
        body.dark-mode .modal-content {
            background: var(--gray-100);
            color: var(--gray-900);
        }
        
        body.dark-mode .card {
            background: var(--gray-100);
            border-color: var(--gray-300);
        }
        
        body.dark-mode input,
        body.dark-mode select,
        body.dark-mode textarea {
            background: var(--gray-50);
            border-color: var(--gray-300);
            color: var(--gray-900);
        }
        
        body.dark-mode .btn-secondary {
            background: var(--gray-200);
            color: var(--gray-900);
        }
        
        body.dark-mode .member-card {
            background: var(--gray-100);
            border-color: var(--gray-300);
        }
        
        body.dark-mode .tree-node {
            background: var(--gray-100);
            border-color: var(--gray-300);
            color: var(--gray-900);
        }
        
        body.dark-mode .app-footer {
            background: var(--gray-100);
            border-top-color: var(--gray-300);
        }
    `;
    document.head.appendChild(style);
    
    // Add to body
    document.body.appendChild(themeToggle);
    
    // Toggle function
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        
        // Store preference in both cookie and localStorage
        if (window.storeUserPreference) {
            window.storeUserPreference('theme', isDark ? 'dark' : 'light');
        } else {
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        }
        
        // Update icon
        themeToggle.querySelector('.material-icons').textContent = isDark ? 'brightness_7' : 'brightness_4';
    }
    
    // Apply saved theme on load
    const savedTheme = window.getUserPreference ? window.getUserPreference('theme', 'light') : (localStorage.getItem('theme') || 'light');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.querySelector('.material-icons').textContent = 'brightness_7';
    }
    
    // Add click event
    themeToggle.addEventListener('click', toggleDarkMode);
    
    // Add touch event for mobile
    themeToggle.addEventListener('touchend', function(e) {
        e.preventDefault(); // Prevent ghost clicks
        toggleDarkMode();
    });
    
    // Make function globally accessible
    window.toggleDarkMode = toggleDarkMode;
})();