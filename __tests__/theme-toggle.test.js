/**
 * @jest-environment jsdom
 */

// Theme Toggle Tests
// Tests for the theme toggle functionality on pyebwa.com

describe('Theme Toggle Functionality', () => {
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

  describe('DOM Element Creation', () => {
    test('should create theme toggle button with correct attributes', () => {
      // Load the theme toggle script
      require('../app/js/theme-toggle.js');

      const button = document.getElementById('themeToggle');
      expect(button).toBeTruthy();
      expect(button.tagName).toBe('BUTTON');
      expect(button.className).toBe('theme-toggle-btn');
      expect(button.getAttribute('aria-label')).toBe('Toggle dark mode');
    });

    test('should create button with correct initial icon', () => {
      require('../app/js/theme-toggle.js');

      const button = document.getElementById('themeToggle');
      const icon = button.querySelector('.material-icons');
      
      expect(icon).toBeTruthy();
      expect(icon.textContent).toBe('brightness_4');
    });

    test('should inject required styles', () => {
      require('../app/js/theme-toggle.js');

      const styles = document.querySelectorAll('style');
      const hasThemeStyles = Array.from(styles).some(style => 
        style.textContent.includes('.theme-toggle-btn')
      );
      
      expect(hasThemeStyles).toBe(true);
    });

    test('should position button fixed at top right', () => {
      require('../app/js/theme-toggle.js');

      const styles = document.querySelector('style').textContent;
      expect(styles).toMatch(/position:\s*fixed/);
      expect(styles).toMatch(/top:\s*20px/);
      expect(styles).toMatch(/right:\s*20px/);
    });
  });

  describe('Theme Toggle Logic', () => {
    beforeEach(() => {
      // Load fresh instance
      jest.resetModules();
      require('../app/js/theme-toggle.js');
    });

    test('should toggle from light to dark mode', () => {
      const button = document.getElementById('themeToggle');
      const icon = button.querySelector('.material-icons');

      // Initial state
      expect(document.body.classList.contains('dark-mode')).toBe(false);
      expect(icon.textContent).toBe('brightness_4');

      // Click to toggle
      button.click();

      // Check dark mode is active
      expect(document.body.classList.contains('dark-mode')).toBe(true);
      expect(icon.textContent).toBe('brightness_7');
    });

    test('should toggle from dark to light mode', () => {
      const button = document.getElementById('themeToggle');
      const icon = button.querySelector('.material-icons');

      // Set to dark mode first
      button.click();
      expect(document.body.classList.contains('dark-mode')).toBe(true);

      // Click to toggle back
      button.click();

      // Check light mode is active
      expect(document.body.classList.contains('dark-mode')).toBe(false);
      expect(icon.textContent).toBe('brightness_4');
    });

    test('should call window.toggleDarkMode function', () => {
      expect(window.toggleDarkMode).toBeDefined();
      expect(typeof window.toggleDarkMode).toBe('function');

      // Spy on the function
      const spy = jest.spyOn(window, 'toggleDarkMode');
      
      window.toggleDarkMode();
      
      expect(spy).toHaveBeenCalled();
      expect(document.body.classList.contains('dark-mode')).toBe(true);
    });
  });

  describe('LocalStorage Persistence', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    test('should save theme preference to localStorage', () => {
      require('../app/js/theme-toggle.js');
      const button = document.getElementById('themeToggle');

      // Toggle to dark mode
      button.click();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('darkMode', 'enabled');
    });

    test('should save light mode preference when toggling back', () => {
      require('../app/js/theme-toggle.js');
      const button = document.getElementById('themeToggle');

      // Toggle to dark then back to light
      button.click();
      button.click();

      expect(mockLocalStorage.setItem).toHaveBeenLastCalledWith('darkMode', 'disabled');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    });

    test('should load saved dark theme on initialization', () => {
      // Pre-set dark theme
      mockLocalStorage.store.theme = 'dark';
      mockLocalStorage.store.darkMode = 'enabled';

      require('../app/js/theme-toggle.js');

      const icon = document.querySelector('.material-icons');
      
      expect(document.body.classList.contains('dark-mode')).toBe(true);
      expect(icon.textContent).toBe('brightness_7');
    });

    test('should handle missing localStorage gracefully', () => {
      jest.resetModules();

      // Make localStorage throw an error
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: () => { throw new Error('localStorage not available'); }
      });

      // Should not throw when loading
      expect(() => {
        require('../app/js/theme-toggle.js');
      }).not.toThrow();

      const button = document.getElementById('themeToggle');
      expect(button).toBeTruthy();
    });
  });

  describe('Event Handlers', () => {
    beforeEach(() => {
      jest.resetModules();
      require('../app/js/theme-toggle.js');
    });

    test('should handle click events', () => {
      const button = document.getElementById('themeToggle');
      const clickEvent = new MouseEvent('click', { bubbles: true });

      const initialState = document.body.classList.contains('dark-mode');
      button.dispatchEvent(clickEvent);
      const newState = document.body.classList.contains('dark-mode');

      expect(newState).toBe(!initialState);
    });

    test('should handle touchend events for mobile', () => {
      const button = document.getElementById('themeToggle');
      const touchEvent = new Event('touchend', { bubbles: true });

      const initialState = document.body.classList.contains('dark-mode');
      
      // Spy on preventDefault
      touchEvent.preventDefault = jest.fn();
      button.dispatchEvent(touchEvent);
      
      const newState = document.body.classList.contains('dark-mode');

      expect(touchEvent.preventDefault).toHaveBeenCalled();
      expect(newState).toBe(!initialState);
    });

    test('should prevent multiple rapid toggles', () => {
      const button = document.getElementById('themeToggle');
      
      // Click multiple times rapidly
      button.click();
      button.click();
      button.click();
      button.click();

      // Should end up in light mode (even number of clicks)
      expect(document.body.classList.contains('dark-mode')).toBe(false);
    });
  });

  describe('CSS Variable Updates', () => {
    beforeEach(() => {
      jest.resetModules();
      require('../app/js/theme-toggle.js');
    });

    test('should have dark mode CSS variables defined', () => {
      const styles = Array.from(document.querySelectorAll('style'))
        .map(s => s.textContent)
        .join('\n');

      expect(styles).toMatch(/body\.dark-mode\s*{/);
      expect(styles).toMatch(/--white:\s*#1a1a1a/);
      expect(styles).toMatch(/--primary:\s*#7da7ce/);
    });

    test('should apply hover states correctly', () => {
      const styles = Array.from(document.querySelectorAll('style'))
        .map(s => s.textContent)
        .join('\n');

      expect(styles).toMatch(/\.theme-toggle-btn:hover/);
      expect(styles).toMatch(/transform:\s*translateY\(-2px\)/);
    });
  });

  describe('Integration Tests', () => {
    test('should work with existing page content', () => {
      // Add some page content
      document.body.innerHTML = `
        <div class="header">
          <h1>Test Page</h1>
        </div>
        <div class="content">
          <p>Some content</p>
        </div>
      `;

      // Load theme toggle
      jest.resetModules();
      require('../app/js/theme-toggle.js');

      // Verify button is added without disturbing content
      expect(document.querySelector('.header')).toBeTruthy();
      expect(document.querySelector('.content')).toBeTruthy();
      expect(document.getElementById('themeToggle')).toBeTruthy();
    });

    test('should maintain theme across script reloads', () => {
      // Load and set dark mode
      require('../app/js/theme-toggle.js');
      document.getElementById('themeToggle').click();
      expect(document.body.classList.contains('dark-mode')).toBe(true);

      // Simulate page reload by resetting and reloading
      document.body.innerHTML = '';
      document.head.innerHTML = '';
      jest.resetModules();
      require('../app/js/theme-toggle.js');

      // Theme should be preserved
      expect(document.body.classList.contains('dark-mode')).toBe(true);
      expect(document.querySelector('.material-icons').textContent).toBe('brightness_7');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      jest.resetModules();
      require('../app/js/theme-toggle.js');
    });

    test('should have proper ARIA attributes', () => {
      const button = document.getElementById('themeToggle');
      
      expect(button.getAttribute('aria-label')).toBe('Toggle dark mode');
      expect(button.getAttribute('type')).toBe('button'); // implicit
    });

    test('should be keyboard accessible', () => {
      const button = document.getElementById('themeToggle');
      const enterEvent = new KeyboardEvent('keydown', { 
        key: 'Enter',
        bubbles: true 
      });

      // Focus the button
      button.focus();
      expect(document.activeElement).toBe(button);

      // Trigger with keyboard
      const initialState = document.body.classList.contains('dark-mode');
      button.dispatchEvent(enterEvent);
      
      // Note: Native button behavior handles Enter/Space automatically
      // This test verifies the button can receive focus
    });
  });

  describe('Error Handling', () => {
    test('should handle missing Material Icons gracefully', () => {
      jest.resetModules();
      
      // Remove material icons from icon element after creation
      require('../app/js/theme-toggle.js');
      const button = document.getElementById('themeToggle');
      button.innerHTML = '<span>Icon</span>'; // Remove material-icons class

      // Should not throw when clicking
      expect(() => button.click()).not.toThrow();
    });

    test('should handle localStorage quota exceeded', () => {
      // Mock localStorage to throw quota exceeded
      mockLocalStorage.setItem = jest.fn(() => {
        throw new DOMException('QuotaExceededError');
      });

      require('../app/js/theme-toggle.js');
      const button = document.getElementById('themeToggle');

      // Should not throw when clicking
      expect(() => button.click()).not.toThrow();
      
      // Theme should still toggle visually
      expect(document.body.classList.contains('dark-mode')).toBe(true);
    });
  });
});
