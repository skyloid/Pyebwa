// Firebase testing utilities (mock implementation for now)

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => {
  // Mock apps array to fix admin.apps.length issue
  const mockApps = [];
  mockApps.length = 0;
  const mockDoc = {
    id: 'mock-doc-id',
    exists: true,
    get: jest.fn(() => Promise.resolve({
      exists: true,
      id: 'mock-doc-id',
      data: () => ({ mockData: true })
    })),
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
    collection: jest.fn(() => mockCollection)
  };

  const mockCollection = {
    doc: jest.fn(() => mockDoc),
    add: jest.fn(() => Promise.resolve({ id: 'new-doc-id' })),
    where: jest.fn(() => ({
      where: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({
          docs: []
        }))
      })),
      get: jest.fn(() => Promise.resolve({
        docs: []
      }))
    })),
    get: jest.fn(() => Promise.resolve({
      docs: []
    }))
  };

  return {
    apps: mockApps,
    initializeApp: jest.fn(),
    auth: jest.fn(() => ({
      createUser: jest.fn(),
      getUserByEmail: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      setCustomUserClaims: jest.fn(),
      generatePasswordResetLink: jest.fn()
    })),
    firestore: jest.fn(() => ({
      collection: jest.fn(() => mockCollection),
      FieldValue: {
        serverTimestamp: jest.fn(() => new Date())
      }
    })),
    // Add the FieldValue directly to admin for compatibility
    FieldValue: {
      serverTimestamp: jest.fn(() => new Date())
    },
    storage: jest.fn(() => ({
      bucket: jest.fn(() => ({
        file: jest.fn(() => ({
          save: jest.fn(),
          delete: jest.fn(),
          getSignedUrl: jest.fn()
        }))
      }))
    }))
  };
});

// Mock SendGrid
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(() => Promise.resolve([{
    statusCode: 202,
    body: {},
    headers: {}
  }]))
}));

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