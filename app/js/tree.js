// Family tree visualization
function renderFamilyTree(viewMode = 'full') {
    const container = document.getElementById('treeContainer');
    
    // Store original members if not already stored
    if (!window.allFamilyMembers) {
        window.allFamilyMembers = [...familyMembers];
    }
    
    // Apply view filter
    if (viewMode !== 'full' && window.pyebwaTreeViews) {
        familyMembers = window.pyebwaTreeViews.getFilteredMembers(viewMode);
    } else {
        familyMembers = [...window.allFamilyMembers];
    }
    
    if (familyMembers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🌳</div>
                <h3>${t('noMembersYet')}</h3>
                <p>${t('startBuilding')}</p>
                <button class="btn btn-primary" onclick="showAddMemberModal()">
                    <span class="material-icons">person_add</span>
                    ${t('addMember')}
                </button>
            </div>
        `;
        return;
    }
    
    // Create tree structure
    const treeData = buildTreeStructure();
    container.innerHTML = '<div class="tree-wrapper tree-scale-auto"><div class="tree"></div></div>';
    const treeElement = container.querySelector('.tree');
    
    // Render tree nodes
    renderTreeNode(treeElement, treeData);
    
    // Initialize tree controls if available
    if (window.pyebwaTreeControls) {
        setTimeout(() => {
            window.pyebwaTreeControls.centerTree();
        }, 100);
    }
}

// Build tree structure from flat member list
function buildTreeStructure() {
    console.log('Building tree structure from members:', familyMembers);
    
    // Create a map for quick lookup
    const memberMap = new Map();
    familyMembers.forEach(m => memberMap.set(m.id, m));
    
    // Find root members (those who are not children of anyone else)
    const roots = familyMembers.filter(member => {
        // If no relationship defined, they're a root
        if (!member.relationship || !member.relatedTo) {
            return true;
        }
        
        // If they're marked as parent, they're a root
        if (member.relationship === 'parent') {
            return true;
        }
        
        // If they're a child but their parent isn't in the tree, they're a root
        if (member.relationship === 'child') {
            const parent = memberMap.get(member.relatedTo);
            return !parent;
        }
        
        // Spouses are not roots unless their partner isn't in the tree
        if (member.relationship === 'spouse') {
            const partner = memberMap.get(member.relatedTo);
            return !partner;
        }
        
        // Siblings without parents in tree are roots
        if (member.relationship === 'sibling') {
            return true;
        }
        
        return false;
    });
    
    // Sort roots by birthDate (oldest first)
    roots.sort((a, b) => {
        // If both have birthdates, compare them
        if (a.birthDate && b.birthDate) {
            return new Date(a.birthDate) - new Date(b.birthDate);
        }
        // If only one has birthdate, put the one with birthdate first
        if (a.birthDate && !b.birthDate) return -1;
        if (!a.birthDate && b.birthDate) return 1;
        // If neither has birthdate, maintain original order
        return 0;
    });
    
    console.log('Root members:', roots);
    
    // Build tree for each root
    const trees = roots.map(root => buildMemberTree(root));
    
    // If multiple trees, create a virtual root
    if (trees.length > 1) {
        return {
            isVirtualRoot: true,
            children: trees
        };
    }
    
    return trees[0] || { isVirtualRoot: true, children: [] };
}

// Build tree for a member and their descendants
function buildMemberTree(member, processed = new Set()) {
    // Prevent infinite loops
    if (processed.has(member.id)) {
        console.warn('Already processed member:', member.id);
        return null;
    }
    processed.add(member.id);
    
    const node = {
        ...member,
        children: [],
        spouse: null
    };
    
    // Find spouse
    const spouse = familyMembers.find(m => 
        m.id !== member.id && 
        m.relatedTo === member.id && 
        m.relationship === 'spouse'
    );
    if (spouse && !processed.has(spouse.id)) {
        node.spouse = spouse;
        processed.add(spouse.id);
    }
    
    // Find children (those who list this member or spouse as parent)
    const children = familyMembers.filter(m => {
        if (m.relationship !== 'child') return false;
        return m.relatedTo === member.id || (spouse && m.relatedTo === spouse.id);
    });
    
    // Sort children by birthDate (oldest first)
    children.sort((a, b) => {
        // If both have birthdates, compare them
        if (a.birthDate && b.birthDate) {
            return new Date(a.birthDate) - new Date(b.birthDate);
        }
        // If only one has birthdate, put the one with birthdate first
        if (a.birthDate && !b.birthDate) return -1;
        if (!a.birthDate && b.birthDate) return 1;
        // If neither has birthdate, maintain original order
        return 0;
    });
    
    console.log(`Children of ${member.firstName}:`, children);
    
    // Recursively build tree for children
    node.children = children
        .map(child => buildMemberTree(child, processed))
        .filter(child => child !== null);
    
    return node;
}

// Render tree node
function renderTreeNode(container, node) {
    if (node.isVirtualRoot) {
        // Render multiple root trees
        const rootsContainer = document.createElement('div');
        rootsContainer.className = 'tree-roots';
        
        node.children.forEach(child => {
            const rootWrapper = document.createElement('div');
            rootWrapper.className = 'tree-root';
            renderTreeNode(rootWrapper, child);
            rootsContainer.appendChild(rootWrapper);
        });
        
        container.appendChild(rootsContainer);
        return;
    }
    
    // Create node element
    const nodeElement = document.createElement('div');
    nodeElement.className = 'tree-node';
    
    // Create member card(s)
    const membersContainer = document.createElement('div');
    membersContainer.className = 'tree-members';
    
    // Add main member
    membersContainer.appendChild(createMemberCard(node));
    
    // Add spouse if exists
    if (node.spouse) {
        membersContainer.appendChild(createMemberCard(node.spouse));
    }
    
    nodeElement.appendChild(membersContainer);
    
    // Add children
    if (node.children.length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';
        
        node.children.forEach(child => {
            const childWrapper = document.createElement('div');
            childWrapper.className = 'tree-child';
            renderTreeNode(childWrapper, child);
            childrenContainer.appendChild(childWrapper);
        });
        
        nodeElement.appendChild(childrenContainer);
    }
    
    container.appendChild(nodeElement);
}

// Create member card for tree
function createMemberCard(member) {
    const card = document.createElement('div');
    card.className = `member-card ${member.gender || 'unknown'}`;
    card.onclick = () => showMemberDetails(member);
    
    // Photo or icon
    const photo = document.createElement('div');
    photo.className = 'member-photo';
    if (member.photoUrl) {
        photo.style.backgroundImage = `url(${member.photoUrl})`;
    } else {
        photo.innerHTML = `<span class="material-icons">${member.gender === 'female' ? 'face_3' : 'face'}</span>`;
    }
    card.appendChild(photo);
    
    // Name
    const name = document.createElement('div');
    name.className = 'member-name';
    name.textContent = `${member.firstName} ${member.lastName}`;
    card.appendChild(name);
    
    // Birth year
    if (member.birthDate) {
        const year = document.createElement('div');
        year.className = 'member-year';
        year.textContent = new Date(member.birthDate).getFullYear();
        card.appendChild(year);
    }
    
    return card;
}

// Export functions for use in other modules
window.buildTreeStructure = buildTreeStructure;

// Show member details
function showMemberDetails(member) {
    // Open the add/edit modal with this member's data
    showAddMemberModal(member);
}