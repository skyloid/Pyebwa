const admin = require('firebase-admin');

describe('Family Tree Service', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = admin.firestore();
  });

  describe('Tree Creation', () => {
    test('should create family tree with valid data', async () => {
      const treeData = {
        name: 'Smith Family Tree',
        ownerId: 'user-123',
        description: 'Our family history'
      };

      const mockTreeRef = {
        id: 'tree-123',
        set: jest.fn().mockResolvedValue()
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn(() => mockTreeRef)
      });

      // Mock the family tree service
      const FamilyTreeService = require('../../server/services/family-tree');
      const result = await FamilyTreeService.createFamilyTree(treeData);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', treeData.name);
      expect(result).toHaveProperty('ownerId', treeData.ownerId);
      expect(mockTreeRef.set).toHaveBeenCalledWith(expect.objectContaining({
        name: treeData.name,
        ownerId: treeData.ownerId,
        memberIds: [treeData.ownerId],
        createdAt: expect.any(Object),
        updatedAt: expect.any(Object)
      }));
    });

    test('should validate required fields', async () => {
      const invalidTreeData = {
        name: '', // Missing required name
        ownerId: 'user-123'
      };

      const FamilyTreeService = require('../../server/services/family-tree');
      
      await expect(FamilyTreeService.createFamilyTree(invalidTreeData))
        .rejects.toThrow('Tree name is required');
    });

    test('should set proper default values', async () => {
      const minimalTreeData = {
        name: 'Test Tree',
        ownerId: 'user-123'
      };

      const mockTreeRef = {
        id: 'tree-123',
        set: jest.fn().mockResolvedValue()
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn(() => mockTreeRef)
      });

      const FamilyTreeService = require('../../server/services/family-tree');
      await FamilyTreeService.createFamilyTree(minimalTreeData);

      expect(mockTreeRef.set).toHaveBeenCalledWith(expect.objectContaining({
        isPublic: false,
        memberIds: [minimalTreeData.ownerId],
        settings: expect.any(Object)
      }));
    });
  });

  describe('Member Management', () => {
    test('should add member to family tree', async () => {
      const treeId = 'tree-123';
      const memberData = {
        firstName: 'John',
        lastName: 'Smith',
        birthDate: '1990-05-15',
        biography: 'Family patriarch'
      };

      const mockMemberRef = {
        id: 'member-123',
        set: jest.fn().mockResolvedValue()
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn(() => ({
          collection: jest.fn(() => ({
            doc: jest.fn(() => mockMemberRef)
          }))
        }))
      });

      const FamilyTreeService = require('../../server/services/family-tree');
      const result = await FamilyTreeService.addMember(treeId, memberData);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('firstName', memberData.firstName);
      expect(mockMemberRef.set).toHaveBeenCalledWith(expect.objectContaining({
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        birthDate: memberData.birthDate,
        createdAt: expect.any(Object)
      }));
    });

    test('should validate member data', async () => {
      const treeId = 'tree-123';
      const invalidMemberData = {
        firstName: '', // Missing required field
        lastName: 'Smith'
      };

      const FamilyTreeService = require('../../server/services/family-tree');
      
      await expect(FamilyTreeService.addMember(treeId, invalidMemberData))
        .rejects.toThrow('First name is required');
    });

    test('should handle relationships correctly', async () => {
      const treeId = 'tree-123';
      const memberData = {
        firstName: 'Jane',
        lastName: 'Smith',
        relationships: [
          { type: 'spouse', memberId: 'member-456' },
          { type: 'child', memberId: 'member-789' }
        ]
      };

      const mockMemberRef = {
        id: 'member-123',
        set: jest.fn().mockResolvedValue()
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn(() => ({
          collection: jest.fn(() => ({
            doc: jest.fn(() => mockMemberRef)
          }))
        }))
      });

      const FamilyTreeService = require('../../server/services/family-tree');
      await FamilyTreeService.addMember(treeId, memberData);

      expect(mockMemberRef.set).toHaveBeenCalledWith(expect.objectContaining({
        relationships: expect.arrayContaining([
          expect.objectContaining({ type: 'spouse', memberId: 'member-456' }),
          expect.objectContaining({ type: 'child', memberId: 'member-789' })
        ])
      }));
    });
  });

  describe('Tree Permissions', () => {
    test('should check owner permissions', async () => {
      const treeId = 'tree-123';
      const userId = 'user-123';

      const mockTreeDoc = {
        exists: true,
        data: () => testHelpers.createMockFamilyTree({
          id: treeId,
          ownerId: userId
        })
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(mockTreeDoc)
        }))
      });

      const FamilyTreeService = require('../../server/services/family-tree');
      const hasPermission = await FamilyTreeService.hasWritePermission(treeId, userId);

      expect(hasPermission).toBe(true);
    });

    test('should check member permissions', async () => {
      const treeId = 'tree-123';
      const userId = 'user-456';

      const mockTreeDoc = {
        exists: true,
        data: () => testHelpers.createMockFamilyTree({
          id: treeId,
          ownerId: 'user-123',
          memberIds: ['user-123', 'user-456']
        })
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(mockTreeDoc)
        }))
      });

      const FamilyTreeService = require('../../server/services/family-tree');
      const hasPermission = await FamilyTreeService.hasWritePermission(treeId, userId);

      expect(hasPermission).toBe(true);
    });

    test('should deny permission to non-members', async () => {
      const treeId = 'tree-123';
      const userId = 'user-unauthorised';

      const mockTreeDoc = {
        exists: true,
        data: () => testHelpers.createMockFamilyTree({
          id: treeId,
          ownerId: 'user-123',
          memberIds: ['user-123', 'user-456']
        })
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(mockTreeDoc)
        }))
      });

      const FamilyTreeService = require('../../server/services/family-tree');
      const hasPermission = await FamilyTreeService.hasWritePermission(treeId, userId);

      expect(hasPermission).toBe(false);
    });
  });

  describe('Search Functionality', () => {
    test('should search members by name', async () => {
      const treeId = 'tree-123';
      const searchQuery = 'john';

      const mockMembers = [
        testHelpers.createMockMember({ firstName: 'John', lastName: 'Smith' }),
        testHelpers.createMockMember({ firstName: 'Johnny', lastName: 'Doe' })
      ];

      mockDb.collection.mockReturnValue({
        doc: jest.fn(() => ({
          collection: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                docs: mockMembers.map(member => ({
                  id: member.id,
                  data: () => member
                }))
              })
            }))
          }))
        }))
      });

      const FamilyTreeService = require('../../server/services/family-tree');
      const results = await FamilyTreeService.searchMembers(treeId, searchQuery);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('firstName', 'John');
      expect(results[1]).toHaveProperty('firstName', 'Johnny');
    });

    test('should handle empty search results', async () => {
      const treeId = 'tree-123';
      const searchQuery = 'xyz';

      mockDb.collection.mockReturnValue({
        doc: jest.fn(() => ({
          collection: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                docs: []
              })
            }))
          }))
        }))
      });

      const FamilyTreeService = require('../../server/services/family-tree');
      const results = await FamilyTreeService.searchMembers(treeId, searchQuery);

      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });
  });
});