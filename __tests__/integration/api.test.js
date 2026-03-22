const request = require('supertest');
const admin = require('firebase-admin');

// Import the test server app 
const app = require('../../server/test-server');

describe('API Integration Tests', () => {
  let authToken;
  let testUserId = 'test-user-integration-123';
  let testTreeId = 'test-tree-integration-123';

  beforeAll(async () => {
    // Mock Firebase Admin initialization
    admin.initializeApp.mockReturnValue({});
    
    // Create test auth token
    authToken = 'mock-auth-token';
    
    // Mock token verification
    admin.auth().verifyIdToken = jest.fn().mockResolvedValue({
      uid: testUserId,
      email: 'test@integration.com'
    });
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/register - should create new user', async () => {
      const newUser = {
        email: 'newuser@test.com',
        displayName: 'New Test User',
        familyTreeName: 'New Test Family'
      };

      // Mock Firebase Auth user creation
      admin.auth().createUser.mockResolvedValue({
        uid: 'new-user-123',
        email: newUser.email,
        displayName: newUser.displayName
      });

      // Mock Firestore operations
      const mockDoc = {
        set: jest.fn().mockResolvedValue()
      };
      admin.firestore().collection().doc.mockReturnValue(mockDoc);

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('uid');
      expect(response.body).toHaveProperty('email', newUser.email);
      expect(response.body).toHaveProperty('temporaryPassword');
    });

    test('POST /api/auth/reset-password - should send password reset', async () => {
      const resetRequest = {
        email: 'test@integration.com'
      };

      admin.auth().getUserByEmail.mockResolvedValue({
        uid: testUserId,
        email: resetRequest.email
      });

      admin.auth().generatePasswordResetLink = jest.fn()
        .mockResolvedValue('https://reset.link/token');

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetRequest)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('sent');
    });
  });

  describe('Family Tree Endpoints', () => {
    test('POST /api/trees - should create family tree', async () => {
      const treeData = {
        name: 'Integration Test Family',
        description: 'Test family tree for integration tests'
      };

      const mockTreeDoc = {
        id: testTreeId,
        set: jest.fn().mockResolvedValue()
      };

      admin.firestore().collection().doc.mockReturnValue(mockTreeDoc);

      const response = await request(app)
        .post('/api/trees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(treeData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', treeData.name);
      expect(response.body).toHaveProperty('ownerId', testUserId);
    });

    test('GET /api/trees/:id - should retrieve family tree', async () => {
      const mockTreeDoc = {
        exists: true,
        id: testTreeId,
        data: () => testHelpers.createMockFamilyTree({
          id: testTreeId,
          ownerId: testUserId,
          name: 'Integration Test Family'
        })
      };

      admin.firestore().collection().doc().get.mockResolvedValue(mockTreeDoc);

      const response = await request(app)
        .get(`/api/trees/${testTreeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testTreeId);
      expect(response.body).toHaveProperty('name', 'Integration Test Family');
      expect(response.body).toHaveProperty('ownerId', testUserId);
    });

    test('GET /api/trees/:id - should deny access to unauthorized users', async () => {
      const unauthorizedTreeId = 'unauthorized-tree-123';
      
      const mockTreeDoc = {
        exists: true,
        id: unauthorizedTreeId,
        data: () => testHelpers.createMockFamilyTree({
          id: unauthorizedTreeId,
          ownerId: 'other-user-123',
          memberIds: ['other-user-123']
        })
      };

      admin.firestore().collection().doc().get.mockResolvedValue(mockTreeDoc);

      const response = await request(app)
        .get(`/api/trees/${unauthorizedTreeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('access');
    });
  });

  describe('Member Management Endpoints', () => {
    test('POST /api/trees/:id/members - should add member to tree', async () => {
      const memberData = {
        firstName: 'Integration',
        lastName: 'Test',
        birthDate: '1990-01-01',
        biography: 'Test member for integration testing'
      };

      // Mock tree permission check
      const mockTreeDoc = {
        exists: true,
        data: () => testHelpers.createMockFamilyTree({
          id: testTreeId,
          ownerId: testUserId
        })
      };
      admin.firestore().collection().doc().get.mockResolvedValue(mockTreeDoc);

      // Mock member creation
      const mockMemberDoc = {
        id: 'new-member-123',
        set: jest.fn().mockResolvedValue()
      };
      admin.firestore().collection().doc().collection().doc.mockReturnValue(mockMemberDoc);

      const response = await request(app)
        .post(`/api/trees/${testTreeId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(memberData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('firstName', memberData.firstName);
      expect(response.body).toHaveProperty('lastName', memberData.lastName);
    });

    test('GET /api/trees/:id/members - should list tree members', async () => {
      const mockMembers = [
        testHelpers.createMockMember({ firstName: 'John', lastName: 'Doe' }),
        testHelpers.createMockMember({ firstName: 'Jane', lastName: 'Doe' })
      ];

      // Mock tree permission check
      const mockTreeDoc = {
        exists: true,
        data: () => testHelpers.createMockFamilyTree({
          id: testTreeId,
          ownerId: testUserId
        })
      };
      admin.firestore().collection().doc().get.mockResolvedValue(mockTreeDoc);

      // Mock members collection query
      admin.firestore().collection().doc().collection().get.mockResolvedValue({
        docs: mockMembers.map(member => ({
          id: member.id,
          data: () => member
        }))
      });

      const response = await request(app)
        .get(`/api/trees/${testTreeId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('members');
      expect(response.body.members).toHaveLength(2);
      expect(response.body.members[0]).toHaveProperty('firstName', 'John');
    });

    test('PUT /api/trees/:id/members/:memberId - should update member', async () => {
      const memberId = 'test-member-123';
      const updateData = {
        firstName: 'Updated',
        biography: 'Updated biography'
      };

      // Mock tree permission check
      const mockTreeDoc = {
        exists: true,
        data: () => testHelpers.createMockFamilyTree({
          id: testTreeId,
          ownerId: testUserId
        })
      };
      admin.firestore().collection().doc().get.mockResolvedValue(mockTreeDoc);

      // Mock member update
      const mockMemberDoc = {
        update: jest.fn().mockResolvedValue(),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => testHelpers.createMockMember({
            id: memberId,
            ...updateData
          })
        })
      };
      admin.firestore().collection().doc().collection().doc.mockReturnValue(mockMemberDoc);

      const response = await request(app)
        .put(`/api/trees/${testTreeId}/members/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('firstName', updateData.firstName);
      expect(response.body).toHaveProperty('biography', updateData.biography);
      expect(mockMemberDoc.update).toHaveBeenCalled();
    });
  });

  describe('Search Endpoints', () => {
    test('GET /api/trees/:id/search - should search members', async () => {
      const searchQuery = 'john';
      const mockResults = [
        testHelpers.createMockMember({ firstName: 'John', lastName: 'Smith' }),
        testHelpers.createMockMember({ firstName: 'Johnny', lastName: 'Doe' })
      ];

      // Mock tree permission check
      const mockTreeDoc = {
        exists: true,
        data: () => testHelpers.createMockFamilyTree({
          id: testTreeId,
          ownerId: testUserId
        })
      };
      admin.firestore().collection().doc().get.mockResolvedValue(mockTreeDoc);

      // Mock search results
      admin.firestore().collection().doc().collection().where().get.mockResolvedValue({
        docs: mockResults.map(member => ({
          id: member.id,
          data: () => member
        }))
      });

      const response = await request(app)
        .get(`/api/trees/${testTreeId}/search`)
        .query({ q: searchQuery })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(2);
      expect(response.body).toHaveProperty('query', searchQuery);
    });

    test('GET /api/trees/:id/search - should handle empty results', async () => {
      const searchQuery = 'nonexistent';

      // Mock tree permission check
      const mockTreeDoc = {
        exists: true,
        data: () => testHelpers.createMockFamilyTree({
          id: testTreeId,
          ownerId: testUserId
        })
      };
      admin.firestore().collection().doc().get.mockResolvedValue(mockTreeDoc);

      // Mock empty search results
      admin.firestore().collection().doc().collection().where().get.mockResolvedValue({
        docs: []
      });

      const response = await request(app)
        .get(`/api/trees/${testTreeId}/search`)
        .query({ q: searchQuery })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(0);
      expect(response.body).toHaveProperty('query', searchQuery);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing authentication token', async () => {
      const response = await request(app)
        .get(`/api/trees/${testTreeId}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('authentication');
    });

    test('should handle invalid tree ID format', async () => {
      const invalidTreeId = 'invalid-id-format';
      
      const response = await request(app)
        .get(`/api/trees/${invalidTreeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('invalid');
    });

    test('should handle Firestore errors gracefully', async () => {
      // Mock Firestore error
      admin.firestore().collection().doc().get.mockRejectedValue(
        new Error('Firestore connection failed')
      );

      const response = await request(app)
        .get(`/api/trees/${testTreeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('server error');
    });
  });
});