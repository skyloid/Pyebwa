// DOM Helper Utilities for Testing
// Provides utilities for DOM manipulation and testing

/**
 * Wait for an element to appear in the DOM
 * @param {string} selector - CSS selector
 * @param {number} timeout - Maximum wait time in ms
 * @returns {Promise<Element>}
 */
export function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      return resolve(element);
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found after ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Simulate a user click with all events
 * @param {Element} element - Element to click
 */
export function simulateClick(element) {
  const mouseDownEvent = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  
  const mouseUpEvent = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });

  element.dispatchEvent(mouseDownEvent);
  element.dispatchEvent(mouseUpEvent);
  element.dispatchEvent(clickEvent);
}

/**
 * Simulate touch event for mobile testing
 * @param {Element} element - Element to touch
 */
export function simulateTouch(element) {
  const touchStartEvent = new TouchEvent('touchstart', {
    bubbles: true,
    cancelable: true,
    touches: [{ clientX: 0, clientY: 0 }]
  });
  
  const touchEndEvent = new TouchEvent('touchend', {
    bubbles: true,
    cancelable: true,
    touches: []
  });

  element.dispatchEvent(touchStartEvent);
  element.dispatchEvent(touchEndEvent);
}

/**
 * Get computed style value
 * @param {Element} element - Element to check
 * @param {string} property - CSS property name
 * @returns {string}
 */
export function getComputedStyleValue(element, property) {
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Wait for CSS transition to complete
 * @param {Element} element - Element with transition
 * @returns {Promise<void>}
 */
export function waitForTransition(element) {
  return new Promise(resolve => {
    const computedStyle = window.getComputedStyle(element);
    const duration = computedStyle.transitionDuration;
    
    if (duration === '0s') {
      return resolve();
    }

    element.addEventListener('transitionend', function handler() {
      element.removeEventListener('transitionend', handler);
      resolve();
    });

    // Fallback timeout
    const durationMs = parseFloat(duration) * 1000;
    setTimeout(resolve, durationMs + 100);
  });
}

/**
 * Create a mock localStorage
 * @returns {Object} Mock localStorage object
 */
export function createMockLocalStorage() {
  const store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    __store: store // Expose store for testing
  };
}

/**
 * Setup DOM environment for theme testing
 * @returns {Object} Cleanup functions and utilities
 */
export function setupThemeTestEnvironment() {
  const originalHTML = document.body.innerHTML;
  const originalHead = document.head.innerHTML;
  const originalLocalStorage = window.localStorage;

  // Create mock localStorage
  const mockLocalStorage = createMockLocalStorage();
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true
  });

  // Add Material Icons if not present
  if (!document.querySelector('link[href*="Material+Icons"]')) {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  return {
    cleanup: () => {
      document.body.innerHTML = originalHTML;
      document.head.innerHTML = originalHead;
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
        configurable: true
      });
    },
    mockLocalStorage,
    waitForElement,
    simulateClick,
    simulateTouch,
    getComputedStyleValue,
    waitForTransition
  };
}

/**
 * Check if element is visible
 * @param {Element} element - Element to check
 * @returns {boolean}
 */
export function isElementVisible(element) {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

/**
 * Get all CSS rules for a selector
 * @param {string} selector - CSS selector
 * @returns {Array<CSSRule>}
 */
export function getCSSRulesForSelector(selector) {
  const rules = [];
  const styleSheets = Array.from(document.styleSheets);
  
  styleSheets.forEach(sheet => {
    try {
      const cssRules = Array.from(sheet.cssRules || []);
      cssRules.forEach(rule => {
        if (rule.selectorText && rule.selectorText.includes(selector)) {
          rules.push(rule);
        }
      });
    } catch (e) {
      // Handle cross-origin stylesheets
    }
  });
  
  return rules;
}

/**
 * Verify theme colors are applied correctly
 * @param {boolean} isDarkMode - Whether dark mode should be active
 * @returns {Object} Test results
 */
export function verifyThemeColors(isDarkMode) {
  const body = document.body;
  const bgColor = getComputedStyleValue(body, 'background-color');
  const textColor = getComputedStyleValue(body, 'color');
  
  const results = {
    backgroundColor: bgColor,
    textColor: textColor,
    isDark: false,
    isValid: false
  };

  // Parse RGB values
  const bgMatch = bgColor.match(/\d+/g);
  const textMatch = textColor.match(/\d+/g);
  
  if (bgMatch && textMatch) {
    const bgLuminance = (parseInt(bgMatch[0]) + parseInt(bgMatch[1]) + parseInt(bgMatch[2])) / 3;
    const textLuminance = (parseInt(textMatch[0]) + parseInt(textMatch[1]) + parseInt(textMatch[2])) / 3;
    
    results.isDark = bgLuminance < 128;
    results.isValid = isDarkMode ? results.isDark : !results.isDark;
  }
  
  return results;
}