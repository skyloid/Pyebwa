const treeQueries = require('../db/queries/family-trees');
const personQueries = require('../db/queries/persons');

class FamilyTreeService {
    static async createFamilyTree(treeData) {
        if (!treeData.name || treeData.name.trim() === '') {
            throw new Error('Tree name is required');
        }
        if (!treeData.ownerId) {
            throw new Error('Owner ID is required');
        }

        const tree = await treeQueries.create({
            name: treeData.name,
            description: treeData.description || '',
            owner_id: treeData.ownerId,
            is_public: false,
            settings: {
                allowMemberInvites: true,
                moderateContent: false
            }
        });

        return tree;
    }

    static async addMember(treeId, memberData) {
        if (!memberData.firstName || memberData.firstName.trim() === '') {
            throw new Error('First name is required');
        }

        const person = await personQueries.create({
            family_tree_id: treeId,
            first_name: memberData.firstName,
            last_name: memberData.lastName || '',
            birth_date: memberData.birthDate || null,
            biography: memberData.biography || '',
            photos: memberData.photos || [],
            relationships: memberData.relationships || []
        });

        return person;
    }

    static async hasWritePermission(treeId, userId) {
        return treeQueries.hasAccess(treeId, userId);
    }

    static async searchMembers(treeId, searchQuery) {
        return personQueries.search(treeId, searchQuery);
    }
}

module.exports = FamilyTreeService;
