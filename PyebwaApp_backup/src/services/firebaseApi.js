import firestore from '@react-native-firebase/firestore';

export const addPersonToTree = async (personData, familyTreeId) => {
  try {
    if (!personData || !familyTreeId) {
      throw new Error('Person data and family tree ID are required');
    }

    const personWithTimestamp = {
      ...personData,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    const personsCollectionRef = firestore()
      .collection('familyTrees')
      .doc(familyTreeId)
      .collection('persons');

    const docRef = await personsCollectionRef.add(personWithTimestamp);

    console.log('Person successfully added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding person to tree:', error);
    return null;
  }
};

export const getPersonsFromTree = async (familyTreeId) => {
  try {
    if (!familyTreeId) {
      throw new Error('Family tree ID is required');
    }

    const personsSnapshot = await firestore()
      .collection('familyTrees')
      .doc(familyTreeId)
      .collection('persons')
      .orderBy('createdAt', 'desc')
      .get();

    const persons = [];
    personsSnapshot.forEach((doc) => {
      persons.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return persons;
  } catch (error) {
    console.error('Error fetching persons from tree:', error);
    return null;
  }
};

export const updatePerson = async (familyTreeId, personId, updateData) => {
  try {
    if (!familyTreeId || !personId || !updateData) {
      throw new Error('Family tree ID, person ID, and update data are required');
    }

    const dataWithTimestamp = {
      ...updateData,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    await firestore()
      .collection('familyTrees')
      .doc(familyTreeId)
      .collection('persons')
      .doc(personId)
      .update(dataWithTimestamp);

    console.log('Person successfully updated');
    return true;
  } catch (error) {
    console.error('Error updating person:', error);
    return false;
  }
};

export const deletePerson = async (familyTreeId, personId) => {
  try {
    if (!familyTreeId || !personId) {
      throw new Error('Family tree ID and person ID are required');
    }

    await firestore()
      .collection('familyTrees')
      .doc(familyTreeId)
      .collection('persons')
      .doc(personId)
      .delete();

    console.log('Person successfully deleted');
    return true;
  } catch (error) {
    console.error('Error deleting person:', error);
    return false;
  }
};

export const createFamilyTree = async (treeData, userId) => {
  try {
    if (!treeData || !userId) {
      throw new Error('Tree data and user ID are required');
    }

    const treeWithMetadata = {
      ...treeData,
      ownerId: userId,
      memberIds: [userId],
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    const treeRef = await firestore()
      .collection('familyTrees')
      .add(treeWithMetadata);

    await firestore()
      .collection('users')
      .doc(userId)
      .update({
        familyTreeId: treeRef.id,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    console.log('Family tree successfully created with ID:', treeRef.id);
    return treeRef.id;
  } catch (error) {
    console.error('Error creating family tree:', error);
    return null;
  }
};