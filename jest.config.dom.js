// Jest configuration for DOM-based tests (like theme toggle)
module.exports = {
  // Use jsdom for DOM testing
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Ignore non-DOM tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/'
  ],
  
  // Coverage settings
  collectCoverage: false, // Can be enabled with --coverage flag
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'app/js/**/*.js',
    '!**/node_modules/**',
    '!coverage/**',
    '!**/__tests__/**'
  ],
  
  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],
  modulePaths: ['<rootDir>/app/js', '<rootDir>'],
  
  // Transform settings
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Reset modules for each test
  resetModules: true,
  
  // Setup files
  setupFiles: ['<rootDir>/__tests__/setup/dom-setup.js'],
  
  // Global variables
  globals: {
    NODE_ENV: 'test'
  }
};
