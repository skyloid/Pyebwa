// Debug utilities for Pyebwa app
// Extracted from app.js for modularity

// Global debug logging function
window.pyebwaLog = function(msg) {
    console.log(msg);
    const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
    logs.push(`${new Date().toISOString()}: ${msg}`);
    localStorage.setItem('pyebwaDebugLogs', JSON.stringify(logs.slice(-20)));
};

// Debug helper - type this in console to see logs
window.showDebugLogs = function() {
    const logs = JSON.parse(localStorage.getItem('pyebwaDebugLogs') || '[]');
    console.log('=== Debug Logs ===');
    logs.forEach(log => console.log(log));
    return logs;
};

// Clear debug logs
window.clearDebugLogs = function() {
    localStorage.removeItem('pyebwaDebugLogs');
    console.log('Debug logs cleared');
};

// Debug Firestore to find missing members
window.debugFirestore = async function() {
    console.log('=== FIRESTORE DEBUG ===');
    console.log('Current User:', window.currentUser);
    console.log('User Family Tree ID:', window.userFamilyTreeId);

    if (!window.userFamilyTreeId) {
        console.error('No family tree ID available');
        return;
    }

    try {
        const treeDoc = await db.collection('familyTrees').doc(window.userFamilyTreeId).get();
        console.log('Family Tree Document Exists:', treeDoc.exists);
        if (treeDoc.exists) {
            console.log('Family Tree Data:', JSON.stringify(treeDoc.data(), null, 2));
        }

        console.log('\n--- Attempting basic members query ---');
        const basicQuery = await db.collection('familyTrees')
            .doc(window.userFamilyTreeId)
            .collection('members')
            .get();
        console.log('Basic query - Document count:', basicQuery.size);

        console.log('\n--- Attempting members query without orderBy ---');
        const noOrderQuery = await db.collection('familyTrees')
            .doc(window.userFamilyTreeId)
            .collection('members')
            .limit(5)
            .get();
        console.log('No orderBy query - Document count:', noOrderQuery.size);

        if (noOrderQuery.size > 0) {
            console.log('Sample member documents:');
            noOrderQuery.forEach(doc => {
                console.log('Document ID:', doc.id);
                console.log('Document data:', JSON.stringify(doc.data(), null, 2));
            });
        }
    } catch (error) {
        console.error('Debug error:', error);
    }
    console.log('=== END FIRESTORE DEBUG ===');
};

// Test Firestore access
window.testFirestore = async function() {
    console.log('Testing Firestore access...');
    try {
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        console.log('User doc exists:', userDoc.exists);

        await db.collection('users').doc(auth.currentUser.uid).set({
            testField: 'test',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('Write to users collection: SUCCESS');

        const treesQuery = await db.collection('familyTrees')
            .where('ownerId', '==', auth.currentUser.uid)
            .get();
        console.log('Found', treesQuery.size, 'family trees');
    } catch (error) {
        console.error('Firestore test error:', error);
    }
};
