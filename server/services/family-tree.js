const admin = require('firebase-admin');

class FamilyTreeService {
  static async createFamilyTree(treeData) {
    if (!treeData.name || treeData.name.trim() === '') {
      throw new Error('Tree name is required');
    }
    
    if (!treeData.ownerId) {
      throw new Error('Owner ID is required');
    }
    
    const db = admin.firestore();
    const treeRef = db.collection('familyTrees').doc();
    
    const treeDoc = {
      id: treeRef.id,
      name: treeData.name,
      ownerId: treeData.ownerId,
      description: treeData.description || '',
      memberIds: [treeData.ownerId],
      isPublic: false,
      settings: {
        allowMemberInvites: true,
        moderateContent: false
      },
      createdAt: admin.firestore().FieldValue.serverTimestamp(),
      updatedAt: admin.firestore().FieldValue.serverTimestamp()
    };
    
    await treeRef.set(treeDoc);
    
    return {
      id: treeRef.id,
      ...treeDoc,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  static async addMember(treeId, memberData) {
    if (!memberData.firstName || memberData.firstName.trim() === '') {
      throw new Error('First name is required');
    }
    
    const db = admin.firestore();
    const memberRef = db.collection('familyTrees').doc(treeId).collection('members').doc();
    
    const memberDoc = {
      id: memberRef.id,
      firstName: memberData.firstName,
      lastName: memberData.lastName || '',
      birthDate: memberData.birthDate || null,
      biography: memberData.biography || '',
      photos: memberData.photos || [],
      relationships: memberData.relationships || [],
      createdAt: admin.firestore().FieldValue.serverTimestamp(),
      updatedAt: admin.firestore().FieldValue.serverTimestamp()
    };
    
    await memberRef.set(memberDoc);
    
    return {
      id: memberRef.id,
      ...memberDoc,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  static async hasWritePermission(treeId, userId) {
    const db = admin.firestore();
    const treeDoc = await db.collection('familyTrees').doc(treeId).get();
    
    if (!treeDoc.exists) {
      return false;
    }
    
    const treeData = treeDoc.data();
    
    // Owner has full access
    if (treeData.ownerId === userId) {
      return true;
    }
    
    // Check if user is a member
    return treeData.memberIds && treeData.memberIds.includes(userId);
  }
  
  static async searchMembers(treeId, searchQuery) {
    const db = admin.firestore();
    const membersRef = db.collection('familyTrees').doc(treeId).collection('members');
    
    // Simple search implementation (in production, use Algolia or similar)
    const snapshot = await membersRef
      .where('firstName', '>=', searchQuery)
      .where('firstName', '<=', searchQuery + '\uf8ff')
      .get();
    
    const results = [];
    snapshot.forEach(doc => {
      results.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return results;
  }
}

module.exports = FamilyTreeService;