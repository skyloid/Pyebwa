module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Ignore Playwright tests (they should run separately)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/'
  ],
  
  // Coverage settings
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server.js',
    '!**/*.config.js',
    '!**/node_modules/**',
    '!coverage/**',
    '!**/__tests__/**'
  ],
  
  // Coverage thresholds (relaxed for initial implementation)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.js'],
  
  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],
  modulePaths: ['<rootDir>/app/js', '<rootDir>/server'],
  
  // Transform settings
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,

  // Browser scripts in the DOM tests execute at import time, so each test needs
  // a fresh module instance after resetting document state.
  resetModules: true,
  
  // Verbose output for development
  verbose: process.env.NODE_ENV === 'development',
  
  // Global variables
  globals: {
    NODE_ENV: 'test'
  }
};
