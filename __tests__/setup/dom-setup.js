// DOM Setup for Jest Tests
// Configures jsdom environment for theme toggle tests

// Polyfill for TouchEvent if not available
if (typeof TouchEvent === 'undefined') {
  global.TouchEvent = class TouchEvent extends Event {
    constructor(type, init = {}) {
      super(type, init);
      this.touches = init.touches || [];
      this.changedTouches = init.changedTouches || [];
      this.targetTouches = init.targetTouches || [];
    }
  };
}

// Mock localStorage if not available
if (!global.localStorage) {
  const localStorageMock = {
    store: {},
    getItem(key) {
      return this.store[key] || null;
    },
    setItem(key, value) {
      this.store[key] = value.toString();
    },
    removeItem(key) {
      delete this.store[key];
    },
    clear() {
      this.store = {};
    }
  };
  global.localStorage = localStorageMock;
}

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
};

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Ensure Material Icons font is "loaded"
Object.defineProperty(document, 'fonts', {
  value: {
    ready: Promise.resolve(),
    check: () => true,
    load: () => Promise.resolve()
  }
});