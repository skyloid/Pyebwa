// Shared Jest setup utilities for the current Supabase/Postgres codebase.

// Mock fetch for Resend-backed email requests in tests that don't override it.
if (!global.fetch) {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ id: 'test-email-id' }),
    text: () => Promise.resolve('')
  }));
}

// Mock Express request and response objects
global.mockReq = (body = {}, params = {}, query = {}, headers = {}) => ({
  body,
  params,
  query,
  headers,
  get: jest.fn((header) => headers[header])
});

global.mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// Mock console to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Test data factories
global.testHelpers = {
  createMockUser: (overrides = {}) => ({
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    emailVerified: true,
    disabled: false,
    metadata: {
      creationTime: '2023-01-01T00:00:00.000Z',
      lastSignInTime: '2023-01-01T00:00:00.000Z'
    },
    customClaims: {},
    ...overrides
  }),

  createMockFamilyTree: (overrides = {}) => ({
    id: 'test-tree-123',
    name: 'Test Family Tree',
    ownerId: 'test-user-123',
    memberIds: ['test-user-123'],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    isPublic: false,
    ...overrides
  }),

  createMockMember: (overrides = {}) => ({
    id: 'test-member-123',
    firstName: 'John',
    lastName: 'Doe',
    biography: 'Test biography',
    birthDate: '1990-01-01',
    photos: [],
    relationships: [],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    ...overrides
  })
};

// Custom Jest matchers
expect.extend({
  toBeValidUser(received) {
    const pass = received && 
                 typeof received.uid === 'string' &&
                 typeof received.email === 'string' &&
                 received.email.includes('@');
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid user`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid user with uid and email`,
        pass: false
      };
    }
  },

  toBeValidFamilyTree(received) {
    const pass = received &&
                 typeof received.id === 'string' &&
                 typeof received.name === 'string' &&
                 typeof received.ownerId === 'string' &&
                 Array.isArray(received.memberIds);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid family tree`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid family tree`,
        pass: false
      };
    }
  }
});

// Setup and teardown
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Suppress console warnings in tests unless debugging
if (process.env.NODE_ENV === 'test' && !process.env.DEBUG_TESTS) {
  console.warn = jest.fn();
}

// Add a placeholder test to prevent "no tests" error
describe('Jest Setup', () => {
  test('should initialize test environment', () => {
    expect(true).toBe(true);
  });
});
