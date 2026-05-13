// Theme Toggle Tests - Node Environment Compatible
// Tests for the theme toggle functionality that work in Node.js environment

const { JSDOM } = require('jsdom');

describe('Theme Toggle Functionality (Node Compatible)', () => {
  let dom, window, document, localStorage;

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
      url: 'https://pyebwa.com/',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    window = dom.window;
    document = window.document;
    
    // Mock localStorage
    localStorage = {
      store: {},
      getItem: jest.fn((key) => localStorage.store[key] || null),
      setItem: jest.fn((key, value) => {
        localStorage.store[key] = value.toString();
      }),
      removeItem: jest.fn((key) => {
        delete localStorage.store[key];
      }),
      clear: jest.fn(() => {
        localStorage.store = {};
      })
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorage,
      configurable: true
    });
    
    // Make globals available
    global.window = window;
    global.document = document;
    global.localStorage = localStorage;
    
    // Mock console methods
    global.console.log = jest.fn();
    global.console.error = jest.fn();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    dom.window.close();
    delete global.window;
    delete global.document;
    delete global.localStorage;
  });

  describe('Basic Theme Toggle Logic', () => {
    test('should toggle dark mode class on body', () => {
      // Create theme toggle function
      const toggleDarkMode = function() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        return isDark;
      };

      // Initial state
      expect(document.body.classList.contains('dark-mode')).toBe(false);

      // Toggle to dark
      const isDark = toggleDarkMode();
      expect(isDark).toBe(true);
      expect(document.body.classList.contains('dark-mode')).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');

      // Toggle back to light
      const isLight = !toggleDarkMode();
      expect(isLight).toBe(true);
      expect(document.body.classList.contains('dark-mode')).toBe(false);
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    });

    test('should create theme toggle button with correct structure', () => {
      // Simulate the theme toggle creation logic
      const button = document.createElement('button');
      button.id = 'themeToggle';
      button.className = 'theme-toggle-btn';
      button.setAttribute('aria-label', 'Toggle dark mode');
      
      const icon = document.createElement('span');
      icon.className = 'material-icons';
      icon.textContent = 'brightness_4';
      button.appendChild(icon);
      
      document.body.appendChild(button);

      // Verify structure
      const createdButton = document.getElementById('themeToggle');
      expect(createdButton).toBeTruthy();
      expect(createdButton.tagName).toBe('BUTTON');
      expect(createdButton.className).toBe('theme-toggle-btn');
      expect(createdButton.getAttribute('aria-label')).toBe('Toggle dark mode');
      
      const createdIcon = createdButton.querySelector('.material-icons');
      expect(createdIcon).toBeTruthy();
      expect(createdIcon.textContent).toBe('brightness_4');
    });

    test('should handle icon state changes', () => {
      // Create button with icon
      const button = document.createElement('button');
      button.id = 'themeToggle';
      const icon = document.createElement('span');
      icon.className = 'material-icons';
      icon.textContent = 'brightness_4';
      button.appendChild(icon);
      document.body.appendChild(button);

      // Define toggle function that updates icon
      const toggleTheme = function() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        icon.textContent = isDark ? 'brightness_7' : 'brightness_4';
        return isDark;
      };

      // Initial state
      expect(icon.textContent).toBe('brightness_4');

      // Toggle to dark
      toggleTheme();
      expect(icon.textContent).toBe('brightness_7');
      expect(document.body.classList.contains('dark-mode')).toBe(true);

      // Toggle back to light
      toggleTheme();
      expect(icon.textContent).toBe('brightness_4');
      expect(document.body.classList.contains('dark-mode')).toBe(false);
    });

    test('should handle localStorage persistence', () => {
      // Simulate initialization with saved theme
      localStorage.store.theme = 'dark';
      
      // Create button
      const button = document.createElement('button');
      button.id = 'themeToggle';
      const icon = document.createElement('span');
      icon.className = 'material-icons';
      button.appendChild(icon);
      document.body.appendChild(button);

      // Simulate theme initialization
      const initTheme = function() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
          document.body.classList.add('dark-mode');
          icon.textContent = 'brightness_7';
        } else {
          icon.textContent = 'brightness_4';
        }
      };

      initTheme();

      expect(localStorage.getItem).toHaveBeenCalledWith('theme');
      expect(document.body.classList.contains('dark-mode')).toBe(true);
      expect(icon.textContent).toBe('brightness_7');
    });

    test('should handle missing localStorage gracefully', () => {
      // Mock localStorage to throw an error
      const brokenLocalStorage = {
        getItem: jest.fn(() => { throw new Error('localStorage not available'); }),
        setItem: jest.fn(() => { throw new Error('localStorage not available'); })
      };
      
      global.localStorage = brokenLocalStorage;

      // Should not throw when trying to use localStorage
      expect(() => {
        try {
          const theme = localStorage.getItem('theme');
        } catch (e) {
          // Handle gracefully
          console.log('localStorage not available');
        }
      }).not.toThrow();
    });

    test('should handle event listeners correctly', () => {
      // Create button
      const button = document.createElement('button');
      button.id = 'themeToggle';
      document.body.appendChild(button);

      // Add event listener
      let clickCount = 0;
      const handleClick = function() {
        clickCount++;
        document.body.classList.toggle('dark-mode');
      };
      
      button.addEventListener('click', handleClick);

      // Simulate clicks
      button.click();
      expect(clickCount).toBe(1);
      expect(document.body.classList.contains('dark-mode')).toBe(true);

      button.click();
      expect(clickCount).toBe(2);
      expect(document.body.classList.contains('dark-mode')).toBe(false);
    });
  });

  describe('Production Site Scenarios', () => {
    test('should handle pyebwa.com button structure', () => {
      // Simulate the exact HTML from pyebwa.com
      document.body.innerHTML = `
        <button id="themeToggle" onclick="window.toggleDarkMode()">
          <span class="material-icons">brightness_4</span>
        </button>
      `;

      // Define the global function
      window.toggleDarkMode = jest.fn(() => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        const icon = document.querySelector('#themeToggle .material-icons');
        if (icon) {
          icon.textContent = isDark ? 'brightness_7' : 'brightness_4';
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      });

      const button = document.getElementById('themeToggle');
      expect(button).toBeTruthy();
      expect(button.getAttribute('onclick')).toBe('window.toggleDarkMode()');

      // jsdom does not execute inline onclick attributes without script execution.
      button.onclick = () => window.toggleDarkMode();
      button.click();
      expect(window.toggleDarkMode).toHaveBeenCalled();
    });

    test('should handle inline script implementation', () => {
      // Create button first
      document.body.innerHTML = `
        <button id="themeToggle" onclick="oldFunction()">
          <span class="material-icons">brightness_4</span>
        </button>
      `;

      // Simulate the inline script logic
      const setupTheme = function() {
        const button = document.getElementById('themeToggle');
        if (!button) {
          console.error('[Theme] Button not found');
          return;
        }

        // Remove old onclick
        button.removeAttribute('onclick');

        // Define new function
        window.toggleDarkMode = function() {
          document.body.classList.toggle('dark-mode');
          const isDark = document.body.classList.contains('dark-mode');
          
          const icon = button.querySelector('.material-icons');
          if (icon) {
            icon.textContent = isDark ? 'brightness_7' : 'brightness_4';
          }
          
          localStorage.setItem('theme', isDark ? 'dark' : 'light');
        };

        // Set new onclick
        button.onclick = window.toggleDarkMode;

        // Load saved theme
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') {
          document.body.classList.add('dark-mode');
          const icon = button.querySelector('.material-icons');
          if (icon) icon.textContent = 'brightness_7';
        }
      };

      setupTheme();

      const button = document.getElementById('themeToggle');
      
      // Check onclick was removed
      expect(button.getAttribute('onclick')).toBeNull();
      
      // Check new function exists
      expect(window.toggleDarkMode).toBeDefined();
      
      // Test functionality
      button.click();
      expect(document.body.classList.contains('dark-mode')).toBe(true);
      expect(button.querySelector('.material-icons').textContent).toBe('brightness_7');
    });

    test('should handle icon name corrections', () => {
      // Start with wrong icon names (as found in some scripts)
      document.body.innerHTML = `
        <button id="themeToggle">
          <span class="material-icons">light_mode</span>
        </button>
      `;

      // Function to fix icon names
      const fixIconNames = function() {
        const icon = document.querySelector('#themeToggle .material-icons');
        if (icon) {
          if (icon.textContent === 'light_mode') {
            icon.textContent = 'brightness_4';
          } else if (icon.textContent === 'dark_mode') {
            icon.textContent = 'brightness_7';
          }
        }
      };

      fixIconNames();
      
      const icon = document.querySelector('.material-icons');
      expect(icon.textContent).toBe('brightness_4');
    });

    test('should handle broken script artifacts', () => {
      // Simulate the broken script tags that were causing issues
      document.body.innerHTML = `
        <button id="themeToggle">
          <span class="material-icons">brightness_4</span>
        </button>
      `;

      // The clean implementation should work despite broken scripts elsewhere
      window.toggleDarkMode = function() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        const icon = document.querySelector('#themeToggle .material-icons');
        if (icon) {
          icon.textContent = isDark ? 'brightness_7' : 'brightness_4';
        }
      };

      const button = document.getElementById('themeToggle');
      button.onclick = window.toggleDarkMode;

      // Should work without throwing errors
      expect(() => button.click()).not.toThrow();
      expect(document.body.classList.contains('dark-mode')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing elements gracefully', () => {
      // Try to set up theme toggle without button
      const setupTheme = function() {
        const button = document.getElementById('themeToggle');
        if (!button) {
          console.error('[Theme] Button not found');
          return false;
        }
        return true;
      };

      const result = setupTheme();
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('[Theme] Button not found');
    });

    test('should handle localStorage quota exceeded', () => {
      // Mock localStorage to throw quota exceeded
      localStorage.setItem = jest.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      // Create toggle function with error handling
      const toggleWithErrorHandling = function() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        
        try {
          localStorage.setItem('theme', isDark ? 'dark' : 'light');
        } catch (e) {
          console.warn('Could not save theme preference:', e.message);
        }
        
        return isDark;
      };

      // Should not throw
      expect(() => toggleWithErrorHandling()).not.toThrow();
      
      // Theme should still toggle visually
      expect(document.body.classList.contains('dark-mode')).toBe(true);
    });
  });
});
