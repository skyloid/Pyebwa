// Test Fixtures for Theme Toggle
// Provides mock data and test scenarios

export const themeColors = {
  light: {
    white: '#ffffff',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
    primary: '#5a8ab9',
    primaryHover: '#4a7aa9',
    success: '#4ade80',
    danger: '#f87171',
    warning: '#fbbf24',
    info: '#60a5fa'
  },
  dark: {
    white: '#1a1a1a',
    gray50: '#262626',
    gray100: '#333333',
    gray200: '#404040',
    gray300: '#525252',
    gray400: '#666666',
    gray500: '#808080',
    gray600: '#999999',
    gray700: '#b3b3b3',
    gray800: '#cccccc',
    gray900: '#e6e6e6',
    primary: '#7da7ce',
    primaryHover: '#6d97be',
    success: '#5de88a',
    danger: '#ff8181',
    warning: '#fccf34',
    info: '#70b5ff'
  }
};

export const mockPageContent = {
  simple: `
    <div class="container">
      <h1>Test Page</h1>
      <p>Simple test content</p>
    </div>
  `,
  complex: `
    <header class="site-header">
      <nav class="navigation">
        <a href="/" class="logo">Pyebwa</a>
        <ul class="nav-links">
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>
    </header>
    <main class="content">
      <section class="hero">
        <h1>Welcome to Pyebwa</h1>
        <p>Family connections made simple</p>
      </section>
      <section class="features">
        <div class="feature-card">
          <h3>Feature 1</h3>
          <p>Description</p>
        </div>
        <div class="feature-card">
          <h3>Feature 2</h3>
          <p>Description</p>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <p>&copy; 2024 Pyebwa. All rights reserved.</p>
    </footer>
  `,
  withExistingTheme: `
    <div class="container">
      <h1>Page with existing theme</h1>
      <button id="existingThemeBtn">Existing Theme Button</button>
    </div>
  `
};

export const browserScenarios = {
  modernBrowser: {
    localStorage: true,
    cssVariables: true,
    classList: true,
    touchEvents: true
  },
  oldBrowser: {
    localStorage: false,
    cssVariables: false,
    classList: true,
    touchEvents: false
  },
  mobileBrowser: {
    localStorage: true,
    cssVariables: true,
    classList: true,
    touchEvents: true,
    isMobile: true
  }
};

export const localStorageScenarios = {
  empty: {},
  withLightTheme: {
    theme: 'light',
    darkMode: 'disabled'
  },
  withDarkTheme: {
    theme: 'dark',
    darkMode: 'enabled'
  },
  corrupted: {
    theme: 'invalid',
    darkMode: '123'
  },
  partial: {
    theme: 'dark'
    // Missing darkMode key
  }
};

export const cssVariableTests = [
  { variable: '--white', light: '#ffffff', dark: '#1a1a1a' },
  { variable: '--primary', light: '#5a8ab9', dark: '#7da7ce' },
  { variable: '--gray-700', light: '#374151', dark: '#b3b3b3' }
];

export const iconStates = {
  light: {
    iconName: 'brightness_4',
    tooltip: 'Enable dark mode'
  },
  dark: {
    iconName: 'brightness_7',
    tooltip: 'Enable light mode'
  }
};

export const transitionDurations = {
  button: '0.3s',
  theme: '0.3s',
  hover: '0.2s'
};

export const mockEvents = {
  click: () => new MouseEvent('click', { 
    bubbles: true, 
    cancelable: true,
    clientX: 100,
    clientY: 50
  }),
  touch: () => new TouchEvent('touchend', {
    bubbles: true,
    cancelable: true,
    touches: [],
    changedTouches: [{
      identifier: 0,
      clientX: 100,
      clientY: 50,
      screenX: 100,
      screenY: 50,
      pageX: 100,
      pageY: 50,
      target: null
    }]
  }),
  keyboard: (key) => new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: key,
    code: key === 'Enter' ? 'Enter' : 'Space'
  })
};

/**
 * Create a mock theme toggle button
 * @param {boolean} isDark - Initial dark mode state
 * @returns {HTMLElement}
 */
export function createMockThemeButton(isDark = false) {
  const button = document.createElement('button');
  button.id = 'themeToggle';
  button.className = 'theme-toggle-btn';
  button.setAttribute('aria-label', 'Toggle dark mode');
  
  const icon = document.createElement('span');
  icon.className = 'material-icons';
  icon.textContent = isDark ? 'brightness_7' : 'brightness_4';
  
  button.appendChild(icon);
  return button;
}

/**
 * Verify CSS variable values
 * @param {boolean} isDarkMode - Whether dark mode is active
 * @returns {Array} Test results
 */
export function verifyCSSVariables(isDarkMode) {
  const results = [];
  const root = document.documentElement;
  const computedStyle = window.getComputedStyle(root);
  
  cssVariableTests.forEach(test => {
    const value = computedStyle.getPropertyValue(test.variable);
    const expected = isDarkMode ? test.dark : test.light;
    
    results.push({
      variable: test.variable,
      actual: value.trim(),
      expected: expected,
      passed: value.trim() === expected
    });
  });
  
  return results;
}

/**
 * Simulate localStorage quota exceeded error
 */
export function simulateQuotaExceeded() {
  const mockLocalStorage = {
    getItem: jest.fn((key) => null),
    setItem: jest.fn(() => {
      const error = new DOMException('QuotaExceededError');
      error.code = 22;
      error.name = 'QuotaExceededError';
      throw error;
    }),
    removeItem: jest.fn(),
    clear: jest.fn()
  };
  
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true
  });
  
  return mockLocalStorage;
}

/**
 * Simulate private browsing mode
 */
export function simulatePrivateBrowsing() {
  let store = {};
  const mockLocalStorage = {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      // Simulate iOS Safari private browsing
      const error = new Error('localStorage is not available');
      throw error;
    }),
    removeItem: jest.fn((key) => delete store[key]),
    clear: jest.fn(() => store = {})
  };
  
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true
  });
  
  return mockLocalStorage;
}