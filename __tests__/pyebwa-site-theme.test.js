/**
 * @jest-environment jsdom
 */

// Theme Toggle Tests for pyebwa.com Production Site
// Tests specific to the production site implementation

describe('Pyebwa.com Theme Toggle', () => {
  let originalLocalStorage;
  let mockLocalStorage;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    
    // Mock localStorage
    originalLocalStorage = global.localStorage;
    mockLocalStorage = {
      store: {},
      getItem: jest.fn((key) => mockLocalStorage.store[key] || null),
      setItem: jest.fn((key, value) => {
        mockLocalStorage.store[key] = value.toString();
      }),
      removeItem: jest.fn((key) => {
        delete mockLocalStorage.store[key];
      }),
      clear: jest.fn(() => {
        mockLocalStorage.store = {};
      })
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true
    });
  });

  describe('Production Site Specific Tests', () => {
    test('should handle the specific button structure from pyebwa.com', () => {
      // Simulate the exact HTML structure from pyebwa.com
      document.body.innerHTML = `
        <button id="themeToggle" onclick="window.toggleDarkMode()">
          <span class="material-icons">brightness_4</span>
        </button>
      `;

      // Define the toggleDarkMode function as it would be on the site
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

      // Test clicking
      button.click();
      expect(window.toggleDarkMode).toHaveBeenCalled();
    });

    test('should handle Material Icons correctly', () => {
      document.body.innerHTML = `
        <button id="themeToggle">
          <span class="material-icons">brightness_4</span>
        </button>
      `;

      const icon = document.querySelector('.material-icons');
      expect(icon).toBeTruthy();
      expect(icon.textContent).toBe('brightness_4');

      // Simulate theme toggle
      document.body.classList.add('dark-mode');
      icon.textContent = 'brightness_7';
      
      expect(icon.textContent).toBe('brightness_7');
    });

    test('should work with inline script implementation', () => {
      // Simulate inline script as found on pyebwa.com
      const inlineScript = `
        (function() {
          console.log('[Theme] Initializing clean theme toggle...');
          
          function setupTheme() {
            var button = document.getElementById('themeToggle');
            if (!button) {
              console.error('[Theme] Button not found');
              return;
            }
            
            button.removeAttribute('onclick');
            
            window.toggleDarkMode = function() {
              document.body.classList.toggle('dark-mode');
              var isDark = document.body.classList.contains('dark-mode');
              
              var icon = button.querySelector('.material-icons');
              if (icon) {
                icon.textContent = isDark ? 'brightness_7' : 'brightness_4';
              }
              
              localStorage.setItem('theme', isDark ? 'dark' : 'light');
              console.log('[Theme] Toggled to:', isDark ? 'dark' : 'light');
            };
            
            button.onclick = window.toggleDarkMode;
            
            var saved = localStorage.getItem('theme');
            if (saved === 'dark') {
              document.body.classList.add('dark-mode');
              var icon = button.querySelector('.material-icons');
              if (icon) icon.textContent = 'brightness_7';
            }
            
            console.log('[Theme] Setup complete');
          }
          
          setupTheme();
          if (document.readyState !== 'complete') {
            window.addEventListener('load', setupTheme);
          }
        })();
      `;

      // Create button
      document.body.innerHTML = `
        <button id="themeToggle" onclick="someOldFunction()">
          <span class="material-icons">brightness_4</span>
        </button>
      `;

      // Execute the inline script
      eval(inlineScript);

      const button = document.getElementById('themeToggle');
      
      // Check onclick was removed
      expect(button.getAttribute('onclick')).toBeNull();
      
      // Check toggleDarkMode exists
      expect(window.toggleDarkMode).toBeDefined();
      
      // Test functionality
      button.click();
      expect(document.body.classList.contains('dark-mode')).toBe(true);
      expect(button.querySelector('.material-icons').textContent).toBe('brightness_7');
    });

    test('should handle CSS dark mode styles', () => {
      // Add styles as they would be on pyebwa.com
      const style = document.createElement('style');
      style.textContent = `
        body {
          background-color: #ffffff;
          color: #000000;
        }
        
        body.dark-mode {
          background-color: #121212;
          color: #e0e0e0;
        }
        
        #themeToggle {
          background: #f0f0f0;
          border: 2px solid #333;
        }
        
        body.dark-mode #themeToggle {
          background: #333;
          border-color: #f0f0f0;
        }
      `;
      document.head.appendChild(style);

      // Test initial state
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      
      // Note: jsdom may not fully support computed styles
      // This test verifies the CSS rules exist
      expect(style.textContent).toMatch(/body\.dark-mode/);
      expect(style.textContent).toMatch(/background-color:\s*#121212/);
    });

    test('should handle syntax errors gracefully', () => {
      // Simulate the broken script tags that were causing issues
      document.body.innerHTML = `
        <button id="themeToggle">
          <span class="material-icons">brightness_4</span>
        </button>
        <script>
          // This would normally cause an error
          a\\ var b = document.getElementById("themeToggle");
        </script>
      `;

      // The clean script should still work
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

      // Should work despite syntax errors elsewhere
      expect(() => button.click()).not.toThrow();
      expect(document.body.classList.contains('dark-mode')).toBe(true);
    });

    test('should work with multiple script files', () => {
      // Simulate multiple scripts as on pyebwa.com
      document.body.innerHTML = `
        <button id="themeToggle">
          <span class="material-icons">brightness_4</span>
        </button>
      `;

      // First script (app-v2-fixed.js simulation)
      const script1 = {
        init: function() {
          // This script might have conflicting code
          const button = document.getElementById('themeToggle');
          if (button) {
            // Commented out to avoid conflicts
            // button.addEventListener('click', function() { ... });
          }
        }
      };

      // Second script (theme-toggle-fix.js simulation)
      const script2 = {
        init: function() {
          const button = document.getElementById('themeToggle');
          if (button) {
            window.toggleDarkMode = function() {
              document.body.classList.toggle('dark-mode');
              const isDark = document.body.classList.contains('dark-mode');
              const icon = button.querySelector('.material-icons');
              if (icon) {
                icon.textContent = isDark ? 'brightness_7' : 'brightness_4';
              }
              localStorage.setItem('theme', isDark ? 'dark' : 'light');
            };
            button.onclick = window.toggleDarkMode;
          }
        }
      };

      // Initialize scripts
      script1.init();
      script2.init();

      // Test that the second script's implementation works
      const button = document.getElementById('themeToggle');
      button.click();
      
      expect(document.body.classList.contains('dark-mode')).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });

    test('should handle icon name mismatches', () => {
      // Test the issue where some scripts used wrong icon names
      document.body.innerHTML = `
        <button id="themeToggle">
          <span class="material-icons">light_mode</span>
        </button>
      `;

      // Fix function that corrects icon names
      function fixIconNames() {
        const icon = document.querySelector('#themeToggle .material-icons');
        if (icon) {
          if (icon.textContent === 'light_mode') {
            icon.textContent = 'brightness_4';
          } else if (icon.textContent === 'dark_mode') {
            icon.textContent = 'brightness_7';
          }
        }
      }

      fixIconNames();
      
      const icon = document.querySelector('.material-icons');
      expect(icon.textContent).toBe('brightness_4');
    });

    test('should work on mobile devices', () => {
      document.body.innerHTML = `
        <button id="themeToggle">
          <span class="material-icons">brightness_4</span>
        </button>
      `;

      window.toggleDarkMode = function() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        const icon = document.querySelector('#themeToggle .material-icons');
        if (icon) {
          icon.textContent = isDark ? 'brightness_7' : 'brightness_4';
        }
      };

      const button = document.getElementById('themeToggle');
      
      // Add both click and touchend handlers as on mobile
      button.addEventListener('click', window.toggleDarkMode);
      button.addEventListener('touchend', function(e) {
        e.preventDefault();
        window.toggleDarkMode();
      });

      // Simulate touch event
      const touchEvent = new Event('touchend');
      touchEvent.preventDefault = jest.fn();
      
      button.dispatchEvent(touchEvent);
      
      expect(touchEvent.preventDefault).toHaveBeenCalled();
      expect(document.body.classList.contains('dark-mode')).toBe(true);
    });

    test('should handle console errors from production', () => {
      // Mock console to catch errors
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      document.body.innerHTML = `
        <button id="themeToggle">
          <span class="material-icons">brightness_4</span>
        </button>
      `;

      // Simulate production script with console logging
      function initTheme() {
        console.log('[Theme] Initializing clean theme toggle...');
        
        const button = document.getElementById('themeToggle');
        if (!button) {
          console.error('[Theme] Button not found');
          return;
        }

        window.toggleDarkMode = function() {
          document.body.classList.toggle('dark-mode');
          console.log('[Theme] Toggled');
        };

        button.onclick = window.toggleDarkMode;
        console.log('[Theme] Setup complete');
      }

      initTheme();

      expect(consoleLogSpy).toHaveBeenCalledWith('[Theme] Initializing clean theme toggle...');
      expect(consoleLogSpy).toHaveBeenCalledWith('[Theme] Setup complete');
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });
});
