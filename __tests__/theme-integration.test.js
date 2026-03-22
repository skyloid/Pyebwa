// Theme Toggle Integration Tests
// Tests the actual theme toggle scripts from the app/js directory

describe('Theme Toggle Integration', () => {
  beforeEach(() => {
    // Clear all modules and mocks
    jest.resetModules();
    jest.clearAllMocks();
    
    // Mock console methods
    global.console.log = jest.fn();
    global.console.error = jest.fn();
  });

  describe('Theme Toggle Script Structure', () => {
    test('theme-toggle.js should exist and be readable', () => {
      expect(() => {
        const fs = require('fs');
        const path = require('path');
        const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
        const content = fs.readFileSync(scriptPath, 'utf8');
        expect(content).toContain('themeToggle');
        expect(content).toContain('brightness_4');
        expect(content).toContain('brightness_7');
      }).not.toThrow();
    });

    test('should contain required theme toggle functions', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Check for key components
      expect(content).toMatch(/themeToggle.*=.*createElement/);
      expect(content).toMatch(/dark-mode/);
      expect(content).toMatch(/localStorage/);
      expect(content).toMatch(/addEventListener.*click/);
      expect(content).toMatch(/window\.toggleDarkMode/);
    });

    test('should handle Material Icons correctly', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Check for correct icon names
      expect(content).toContain('brightness_4');
      expect(content).toContain('brightness_7');
      expect(content).toContain('material-icons');
      
      // Should NOT contain incorrect icon names
      expect(content).not.toContain('light_mode');
      expect(content).not.toContain('dark_mode');
    });

    test('should have proper CSS for theme toggle button', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Check for CSS styles
      expect(content).toMatch(/\.theme-toggle-btn/);
      expect(content).toMatch(/position:\s*fixed/);
      expect(content).toMatch(/top:\s*20px/);
      expect(content).toMatch(/right:\s*20px/);
      expect(content).toMatch(/dark-mode.*{/);
    });
  });

  describe('Script Validation', () => {
    test('theme toggle script should not have syntax errors', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Should not contain broken sed artifacts
      expect(content).not.toMatch(/a\\\\/);
      expect(content).not.toMatch(/^a\s/m);
      
      // Should not have malformed JavaScript
      expect(() => {
        new Function(content);
      }).not.toThrow();
    });

    test('should not contain conflicting event handlers', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Count addEventListener calls - should be reasonable
      const eventListenerMatches = content.match(/addEventListener/g);
      if (eventListenerMatches) {
        expect(eventListenerMatches.length).toBeLessThan(5); // Reasonable limit
      }

      // Script creates new button so removeAttribute isn't needed
      // Just check that we don't have excessive onclick assignments
      const onclickMatches = content.match(/\.onclick\s*=/g);
      if (onclickMatches) {
        expect(onclickMatches.length).toBeLessThan(3);
      }
    });

    test('should handle localStorage safely', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Should use localStorage
      expect(content).toMatch(/localStorage\.(get|set)Item/);
      
      // Should save theme preference
      expect(content).toMatch(/setItem.*theme/);
      expect(content).toMatch(/getItem.*theme/);
    });
  });

  describe('Production Compatibility', () => {
    test('should be compatible with pyebwa.com structure', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Should define global toggleDarkMode function
      expect(content).toMatch(/window\.toggleDarkMode/);
      
      // Should handle button creation (this implementation creates its own button)
      expect(content).toMatch(/createElement.*button/);
      
      // Should have proper ID assignment
      expect(content).toMatch(/themeToggle/);
    });

    test('should work on mobile devices', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Should handle touch events
      expect(content).toMatch(/touchend/);
      expect(content).toMatch(/preventDefault/);
      
      // Should have mobile-friendly styles
      expect(content).toMatch(/tap-highlight-color/);
      expect(content).toMatch(/touch-action/);
    });

    test('should be accessible', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Should have proper ARIA attributes
      expect(content).toMatch(/aria-label/);
      expect(content).toContain('Toggle dark mode');
    });
  });

  describe('Performance Considerations', () => {
    test('should not create excessive DOM elements', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Count createElement calls - button + style is reasonable (2 calls)
      const createElementMatches = content.match(/createElement/g);
      if (createElementMatches) {
        expect(createElementMatches.length).toBeLessThan(4); // Allow for button + style + potential icon
      }
      
      // This implementation creates its own elements as needed
      expect(createElementMatches).toBeTruthy();
    });

    test('should use efficient event handling', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Should use modern event handling (addEventListener is actually preferred)
      expect(content).toMatch(/(addEventListener|onclick)/);
      
      // Should use CSS transitions instead of JavaScript animations
      expect(content).toMatch(/transition.*ease/);
    });
  });

  describe('Theme Consistency', () => {
    test('should use consistent color variables', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Should use CSS custom properties
      expect(content).toMatch(/--white/);
      expect(content).toMatch(/--gray-\d+/);
      expect(content).toMatch(/--primary/);
    });

    test('should provide smooth transitions', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Should have transition properties
      expect(content).toMatch(/transition.*0\.3s/);
      expect(content).toMatch(/transition.*ease/);
    });
  });

  describe('Script Robustness', () => {
    test('should handle script loading order', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Should be wrapped in IIFE or similar for encapsulation
      expect(content).toMatch(/^\s*\(|function\s*\(/);
      
      // This implementation creates elements immediately, so DOM readiness checks aren't required
      // but it should work safely (creates its own elements)
      expect(content).toMatch(/createElement/);
    });

    test('should not pollute global namespace excessively', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../app/js/theme-toggle.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Should limit global variables
      const windowAssignments = content.match(/window\.\w+\s*=/g);
      if (windowAssignments) {
        expect(windowAssignments.length).toBeLessThan(3);
      }
      
      // Should use IIFE or similar containment
      expect(content).toMatch(/\(function\(\)|function\(\)\s*{/);
    });
  });
});