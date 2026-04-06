// Family tree visualization
function getTreeInteractionState() {
    if (!window.pyebwaTreeInteractionState) {
        window.pyebwaTreeInteractionState = {
            mode: localStorage.getItem('pyebwaTreeMode') || 'view',
            focusPersonId: localStorage.getItem('pyebwaTreeFocusPerson') || null
        };
    }
    return window.pyebwaTreeInteractionState;
}

function getRelationshipList(member) {
    const relationships = Array.isArray(member.relationships) ? [...member.relationships] : [];

    if (member.relationship && member.relatedTo) {
        const hasFlatRelationship = relationships.some(rel =>
            rel.type === member.relationship && rel.personId === member.relatedTo
        );
        if (!hasFlatRelationship) {
            relationships.push({ type: member.relationship, personId: member.relatedTo });
        }
    }

    return relationships;
}

function hasRelationship(member, targetId, type) {
    return getRelationshipList(member).some(rel => rel.type === type && rel.personId === targetId);
}

function getDirectFamilyMembers(member) {
    const sourceMembers = window.allFamilyMembers || familyMembers;
    const family = {
        parents: [],
        spouses: [],
        children: [],
        siblings: []
    };

    sourceMembers.forEach(otherMember => {
        if (!otherMember || otherMember.id === member.id) return;

        if (hasRelationship(member, otherMember.id, 'child') || hasRelationship(otherMember, member.id, 'parent')) {
            family.parents.push(otherMember);
        }
        if (hasRelationship(member, otherMember.id, 'parent') || hasRelationship(otherMember, member.id, 'child')) {
            family.children.push(otherMember);
        }
        if (hasRelationship(member, otherMember.id, 'spouse') || hasRelationship(otherMember, member.id, 'spouse')) {
            family.spouses.push(otherMember);
        }
        if (hasRelationship(member, otherMember.id, 'sibling') || hasRelationship(otherMember, member.id, 'sibling')) {
            family.siblings.push(otherMember);
        }
    });

    Object.keys(family).forEach(key => {
        const seen = new Set();
        family[key] = family[key].filter(relative => {
            if (seen.has(relative.id)) return false;
            seen.add(relative.id);
            return true;
        });
    });

    return family;
}

function renderTreeFocusDetailMember(member, relationshipLabel) {
    const photoHtml = member.photoUrl
        ? `<div class="focus-member-photo" style="background-image:url('${member.photoUrl.replace(/'/g, "\\'")}')"></div>`
        : `<div class="focus-member-photo"><span class="material-icons">${member.gender === 'female' ? 'face_3' : 'face'}</span></div>`;

    return `
        <button type="button" class="focus-member-card" data-member-id="${member.id}">
            ${photoHtml}
            <div>
                <div class="focus-member-name">${member.firstName} ${member.lastName}</div>
                ${relationshipLabel ? `<div class="focus-member-rel">${relationshipLabel}</div>` : ''}
            </div>
        </button>
    `;
}

function buildTreeFocusSection(title, icon, members, computedRelationships) {
    if (!members || members.length === 0) return '';

    const cardsHtml = members.map(member => {
        const rel = computedRelationships ? computedRelationships.get(member.id) : null;
        const relationshipLabel = rel && rel.label ? rel.label : '';
        return renderTreeFocusDetailMember(member, relationshipLabel);
    }).join('');

    return `
        <div class="focus-section">
            <h4><span class="material-icons">${icon}</span>${title}</h4>
            <div class="focus-section-grid">${cardsHtml}</div>
        </div>
    `;
}

function ensureTreeFocusDetail() {
    const treeView = document.getElementById('treeView');
    const treeContainer = document.getElementById('treeContainer');
    if (!treeView || !treeContainer) return null;

    let detail = document.getElementById('treeFocusDetail');
    if (!detail) {
        detail = document.createElement('div');
        detail.id = 'treeFocusDetail';
        detail.className = 'tree-focus-detail';
        treeContainer.insertAdjacentElement('afterend', detail);
    }

    return detail;
}

function clearTreeFocusState() {
    const treeContainer = document.getElementById('treeContainer');
    const detail = document.getElementById('treeFocusDetail');

    if (treeContainer) {
        treeContainer.classList.remove('focus-active');
        treeContainer.querySelectorAll('.member-card').forEach(card => {
            card.classList.remove('focus-highlight', 'focus-family');
        });
    }

    if (detail) {
        detail.style.display = 'none';
        detail.innerHTML = '';
    }
}

function applyTreeFocusState() {
    const state = getTreeInteractionState();
    const treeContainer = document.getElementById('treeContainer');
    const detail = ensureTreeFocusDetail();
    const sourceMembers = window.allFamilyMembers || familyMembers;

    if (!treeContainer || !detail) return;

    if (state.mode !== 'view' || !state.focusPersonId) {
        clearTreeFocusState();
        return;
    }

    const focusMember = sourceMembers.find(member => member.id === state.focusPersonId);
    if (!focusMember) {
        clearTreeFocusState();
        return;
    }

    let computedRelationships = null;
    if (window.pyebwaRelationshipEngine) {
        computedRelationships = window.pyebwaRelationshipEngine.computeAll(state.focusPersonId, sourceMembers);
    }

    treeContainer.classList.add('focus-active');
    treeContainer.querySelectorAll('.member-card').forEach(card => {
        const memberId = card.getAttribute('data-member-id');
        card.classList.remove('focus-highlight', 'focus-family');

        if (!memberId) return;
        if (memberId === state.focusPersonId) {
            card.classList.add('focus-highlight');
            return;
        }

        const rel = computedRelationships ? computedRelationships.get(memberId) : null;
        if (rel && rel.category !== 'other') {
            card.classList.add('focus-family');
            return;
        }

        const directFamily = getDirectFamilyMembers(focusMember);
        const inDirectFamily = Object.values(directFamily).some(group => group.some(member => member.id === memberId));
        if (inDirectFamily) {
            card.classList.add('focus-family');
        }
    });

    const photoHtml = focusMember.photoUrl
        ? `<img class="focus-detail-photo" src="${focusMember.photoUrl}" alt="${focusMember.firstName} ${focusMember.lastName}">`
        : `<div class="focus-detail-avatar"><span class="material-icons">${focusMember.gender === 'female' ? 'face_3' : 'face'}</span></div>`;

    const family = getDirectFamilyMembers(focusMember);
    const sectionsHtml = [
        buildTreeFocusSection(t('parents') || 'Parents', 'north', family.parents, computedRelationships),
        buildTreeFocusSection(t('spouse') || 'Spouse', 'favorite', family.spouses, computedRelationships),
        buildTreeFocusSection(t('children') || 'Children', 'south', family.children, computedRelationships),
        buildTreeFocusSection(t('siblings') || 'Siblings', 'people', family.siblings, computedRelationships)
    ].filter(Boolean).join('');

    detail.innerHTML = `
        <div class="focus-detail-header">
            <div class="focus-detail-profile">
                ${photoHtml}
                <div>
                    <h3>${focusMember.firstName} ${focusMember.lastName}</h3>
                    <p class="focus-detail-info">${t('familyTree') || 'Family Tree'} ${state.mode === 'view' ? '• View Mode' : ''}</p>
                </div>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
                <button type="button" class="btn btn-secondary" id="treeFocusEditBtn">${t('edit') || 'Edit'}</button>
                <button type="button" class="btn btn-secondary" id="treeFocusClearBtn">${t('close') || 'Close'}</button>
            </div>
        </div>
        <div class="focus-detail-family">
            ${sectionsHtml || `<p class="focus-detail-info">${t('noFamilyMembers') || 'No related family members found.'}</p>`}
        </div>
    `;
    detail.style.display = 'block';

    detail.querySelector('#treeFocusEditBtn')?.addEventListener('click', () => showAddMemberModal(focusMember));
    detail.querySelector('#treeFocusClearBtn')?.addEventListener('click', () => {
        state.focusPersonId = null;
        localStorage.removeItem('pyebwaTreeFocusPerson');
        clearTreeFocusState();
    });
    detail.querySelectorAll('.focus-member-card').forEach(button => {
        button.addEventListener('click', () => {
            state.focusPersonId = button.getAttribute('data-member-id');
            localStorage.setItem('pyebwaTreeFocusPerson', state.focusPersonId);
            applyTreeFocusState();
        });
    });
}

function setTreeInteractionMode(mode) {
    const state = getTreeInteractionState();
    state.mode = mode === 'edit' ? 'edit' : 'view';
    localStorage.setItem('pyebwaTreeMode', state.mode);

    const toggle = document.getElementById('treeModeToggle');
    if (toggle) {
        toggle.querySelectorAll('.mode-btn').forEach(button => {
            button.classList.toggle('active', button.getAttribute('data-mode') === state.mode);
        });
    }

    if (state.mode === 'edit') {
        clearTreeFocusState();
    } else {
        applyTreeFocusState();
    }
}

function initializeTreeModeToggle() {
    const toggle = document.getElementById('treeModeToggle');
    if (!toggle || toggle.dataset.initialized === 'true') return;

    toggle.dataset.initialized = 'true';
    toggle.querySelectorAll('.mode-btn').forEach(button => {
        button.addEventListener('click', () => setTreeInteractionMode(button.getAttribute('data-mode')));
    });

    setTreeInteractionMode(getTreeInteractionState().mode);
}

function handleTreeCardClick(member) {
    const state = getTreeInteractionState();

    if (state.mode === 'edit') {
        showAddMemberModal(member);
        return;
    }

    state.focusPersonId = member.id;
    localStorage.setItem('pyebwaTreeFocusPerson', member.id);
    applyTreeFocusState();
}

function renderFamilyTree(viewMode = 'full') {
    const container = document.getElementById('treeContainer');
    initializeTreeModeToggle();
    
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
        clearTreeFocusState();
        return;
    }
    
    // Create tree structure
    const treeData = buildTreeStructure(viewMode);
    
    // Get the family name from the oldest male member
    let familyNameHtml = '';
    if (familyMembers.length > 0) {
        // Find all male members
        const maleMembers = familyMembers.filter(member => member.gender === 'male');
        
        let oldestMember = null;
        
        if (maleMembers.length > 0) {
            // Sort male members by birthDate (oldest first)
            maleMembers.sort((a, b) => {
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
            oldestMember = maleMembers[0];
        } else {
            // No male members, fall back to oldest member regardless of gender
            const sortedMembers = [...familyMembers].sort((a, b) => {
                if (a.birthDate && b.birthDate) {
                    return new Date(a.birthDate) - new Date(b.birthDate);
                }
                if (a.birthDate && !b.birthDate) return -1;
                if (!a.birthDate && b.birthDate) return 1;
                return 0;
            });
            oldestMember = sortedMembers[0];
        }
        
        if (oldestMember && oldestMember.lastName) {
            const familyName = oldestMember.lastName;
            // Use translation system for family name format
            const familyNameFormat = t('familyNameFormat') || 'The {{name}} Family';
            // Escape HTML to prevent XSS from family names
            const escapedName = familyName.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            const formattedName = familyNameFormat.replace('{{name}}', escapedName);
            familyNameHtml = `<div class="family-name-header">${formattedName}</div>`;
        }
    }
    
    container.innerHTML = `
        ${familyNameHtml}
        <div class="tree-wrapper tree-scale-auto"><div class="tree"></div></div>
    `;
    const treeElement = container.querySelector('.tree');
    
    // Render tree nodes
    renderTreeNode(treeElement, treeData);
    applyTreeFocusState();
    
    // Initialize tree controls if available
    if (window.pyebwaTreeControls) {
        setTimeout(() => {
            // Refresh element references after tree is rendered
            var tc = window.pyebwaTreeControls;
            var treeContainer = document.getElementById('treeContainer');
            if (tc.elements && treeContainer) {
                tc.elements.treeContainer = treeContainer;
                tc.elements.treeWrapper = treeContainer.querySelector('.tree-wrapper');
                tc.elements.tree = treeContainer.querySelector('.tree');
            }
            tc.centerTree();
        }, 100);
    }
}

// Build tree structure from flat member list
function buildTreeStructure(viewMode = 'full') {
    console.log('Building tree structure from members:', familyMembers, 'Mode:', viewMode);
    
    // Create a map for quick lookup
    const memberMap = new Map();
    familyMembers.forEach(m => memberMap.set(m.id, m));
    
    // For ancestor/descendant views, we need a different approach
    if (viewMode !== 'full' && window.pyebwaTreeViews) {
        const focusPerson = window.pyebwaTreeViews.findFocusPerson();
        if (focusPerson) {
            if (viewMode === 'ancestors') {
                return buildAncestorTree(focusPerson, memberMap);
            } else if (viewMode === 'descendants') {
                return buildDescendantTree(focusPerson, memberMap);
            } else if (viewMode === 'hourglass') {
                return buildHourglassTree(focusPerson, memberMap);
            }
        }
    }
    
    // A person is a root if nobody in the tree lists them as their child
    // This is more reliable than checking the person's own relationship field
    const childOfMap = new Set(); // IDs of people who are someone's child
    familyMembers.forEach(member => {
        if (member.relationship === 'child' && member.relatedTo) {
            childOfMap.add(member.id);
        }
        // Also check full relationships array
        if (member.relationships) {
            member.relationships.forEach(r => {
                if (r.type === 'child' && r.personId) childOfMap.add(member.id);
            });
        }
        // Siblings — mark as child of same parent
        if (member.relationship === 'sibling' && member.relatedTo) {
            const sib = memberMap.get(member.relatedTo);
            if (sib && (sib.relationship === 'child' || (sib.relationships && sib.relationships.some(r => r.type === 'child')))) {
                childOfMap.add(member.id);
            }
        }
    });

    // Find who is listed as a spouse of a non-child (potential root pair)
    // Keep only one of each pair — the one who has children listing them as parent
    const spouseOfRoot = new Set();
    familyMembers.forEach(member => {
        if (!childOfMap.has(member.id) && member.relationship === 'spouse' && member.relatedTo) {
            const partner = memberMap.get(member.relatedTo);
            if (partner && !childOfMap.has(partner.id)) {
                // Both are non-children. Check who has children pointing to them.
                const memberHasKids = familyMembers.some(m =>
                    (m.relationship === 'child' && m.relatedTo === member.id) ||
                    (m.relationships && m.relationships.some(r => r.type === 'child' && r.personId === member.id))
                );
                const partnerHasKids = familyMembers.some(m =>
                    (m.relationship === 'child' && m.relatedTo === partner.id) ||
                    (m.relationships && m.relationships.some(r => r.type === 'child' && r.personId === partner.id))
                );
                // The one WITHOUT kids pointing to them is the spouse (non-root)
                if (partnerHasKids && !memberHasKids) {
                    spouseOfRoot.add(member.id);
                } else if (memberHasKids && !partnerHasKids) {
                    spouseOfRoot.add(partner.id);
                } else {
                    // Both or neither have kids — mark the one with relationship=spouse
                    spouseOfRoot.add(member.id);
                }
            }
        }
    });

    // Exclude anyone who is purely a spouse (not a child of anyone)
    // They'll be rendered alongside their partner by buildMemberTree.
    // Keep at least one member from a spouse-only pair as a root, otherwise
    // founder couples with no children disappear entirely.
    const pureSpouses = new Set();
    familyMembers.forEach(member => {
        if (childOfMap.has(member.id)) return; // Has a child relationship — not a pure spouse
        // Check if ALL their relationships are spouse
        var allSpouse = member.relationships && member.relationships.length > 0 &&
            member.relationships.every(r => r.type === 'spouse');
        if (allSpouse || (member.relationship === 'spouse' && (!member.relationships || member.relationships.length <= 1))) {
            // Only exclude if their partner IS in the tree
            var partnerId = member.relatedTo || (member.relationships && member.relationships[0] ? member.relationships[0].personId : null);
            if (partnerId && memberMap.has(partnerId)) {
                var memberHasKids = familyMembers.some(m =>
                    (m.relationship === 'child' && m.relatedTo === member.id) ||
                    (m.relationships && m.relationships.some(r => r.type === 'child' && r.personId === member.id))
                );
                var partnerHasKids = familyMembers.some(m =>
                    (m.relationship === 'child' && m.relatedTo === partnerId) ||
                    (m.relationships && m.relationships.some(r => r.type === 'child' && r.personId === partnerId))
                );

                if (partnerHasKids && !memberHasKids) {
                    pureSpouses.add(member.id);
                } else if (!partnerHasKids && !memberHasKids) {
                    // Founder couple with no children: keep one canonical partner as root.
                    if (String(member.id) > String(partnerId)) {
                        pureSpouses.add(member.id);
                    }
                }
            }
        }
    });

    const roots = familyMembers.filter(member => {
        return !childOfMap.has(member.id) && !pureSpouses.has(member.id);
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
    
    // Find spouse — check flat field AND relationships array in both directions
    function isSpouseOf(a, bId) {
        if (a.relationship === 'spouse' && a.relatedTo === bId) return true;
        if (a.relationships) return a.relationships.some(r => r.type === 'spouse' && r.personId === bId);
        return false;
    }
    const spouse = familyMembers.find(m =>
        m.id !== member.id && !processed.has(m.id) && (isSpouseOf(m, member.id) || isSpouseOf(member, m.id))
    );
    if (spouse && !processed.has(spouse.id)) {
        node.spouse = spouse;
        processed.add(spouse.id);
    }

    // Find children — check flat field AND relationships array
    const children = familyMembers.filter(m => {
        if (m.relationship === 'child' && (m.relatedTo === member.id || (spouse && m.relatedTo === spouse.id))) return true;
        if (m.relationships) return m.relationships.some(r =>
            r.type === 'child' && (r.personId === member.id || (spouse && r.personId === spouse.id))
        );
        return false;
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
    
    // Add parents (for ancestor/hourglass views)
    if (node.parents && node.parents.length > 0) {
        const parentsContainer = document.createElement('div');
        parentsContainer.className = 'tree-parents';
        
        node.parents.forEach(parent => {
            const parentWrapper = document.createElement('div');
            parentWrapper.className = 'tree-parent';
            renderTreeNode(parentWrapper, parent);
            parentsContainer.appendChild(parentWrapper);
        });
        
        nodeElement.appendChild(parentsContainer);
    }
    
    // Create member card(s)
    const membersContainer = document.createElement('div');
    membersContainer.className = 'tree-members';
    
    // Add main member
    membersContainer.appendChild(createMemberCard(node.member || node));
    
    // Add spouse if exists
    if (node.spouse) {
        membersContainer.appendChild(createMemberCard(node.spouse));
    }
    
    nodeElement.appendChild(membersContainer);
    
    // Add children
    if (node.children && node.children.length > 0) {
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
function createMemberCard(node) {
    // Handle both node objects and direct member objects
    const member = node.member || node;
    
    const card = document.createElement('div');
    card.className = `member-card ${member.gender || 'unknown'}`;
    card.setAttribute('data-member-id', member.id);
    card.onclick = () => handleTreeCardClick(member);
    
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
    // Show the enhanced member profile
    if (window.viewMemberProfile) {
        window.viewMemberProfile(member.id);
    } else {
        // Fallback to edit modal if profile viewer not available
        showAddMemberModal(member);
    }
}

// Build ancestor tree (showing only ancestors of focus person)
function buildAncestorTree(focusPerson, memberMap) {
    const tree = {
        member: focusPerson,
        children: [] // In ancestor view, we build upwards
    };
    
    // Find parents
    const parents = [];
    familyMembers.forEach(member => {
        if (member.relationship === 'parent' && member.relatedTo === focusPerson.id) {
            parents.push(member);
        }
    });
    
    // Also check if focus person is marked as child of someone
    if (focusPerson.relationship === 'child' && focusPerson.relatedTo) {
        const parent = memberMap.get(focusPerson.relatedTo);
        if (parent && !parents.find(p => p.id === parent.id)) {
            parents.push(parent);
        }
    }
    
    // Build parent nodes recursively
    if (parents.length > 0) {
        const parentNodes = parents.map(parent => buildAncestorTree(parent, memberMap));
        
        // Create a virtual parent node to hold both parents
        if (parentNodes.length === 2) {
            return {
                member: focusPerson,
                parents: parentNodes
            };
        } else {
            // Single parent
            return {
                member: focusPerson,
                parents: parentNodes
            };
        }
    }
    
    return tree;
}

// Build descendant tree (showing only descendants of focus person)
function buildDescendantTree(focusPerson, memberMap) {
    const tree = {
        member: focusPerson,
        children: []
    };
    
    // Find spouse
    const spouse = familyMembers.find(m => 
        m.relationship === 'spouse' && m.relatedTo === focusPerson.id
    );
    
    if (spouse) {
        tree.spouse = spouse;
    }
    
    // Find children
    const children = familyMembers.filter(member => 
        (member.relationship === 'child' && member.relatedTo === focusPerson.id) ||
        (focusPerson.relationship === 'parent' && focusPerson.relatedTo === member.id)
    );
    
    // Sort children by birth date
    children.sort((a, b) => {
        if (a.birthDate && b.birthDate) {
            return new Date(a.birthDate) - new Date(b.birthDate);
        }
        return 0;
    });
    
    // Build child nodes recursively
    tree.children = children.map(child => buildDescendantTree(child, memberMap));
    
    return tree;
}

// Build hourglass tree (ancestors above, descendants below)
function buildHourglassTree(focusPerson, memberMap) {
    // Start with descendant tree structure
    const tree = buildDescendantTree(focusPerson, memberMap);
    
    // Add ancestors
    const ancestors = buildAncestorTree(focusPerson, memberMap);
    if (ancestors.parents) {
        tree.parents = ancestors.parents;
    }
    
    return tree;
}

// Export functions for global use
window.renderFamilyTree = renderFamilyTree;
window.renderTreeNode = renderTreeNode;
