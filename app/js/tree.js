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

function isInLawRelationship(rel) {
    return !!(rel && rel.isInLaw);
}

function hasRelationship(member, targetId, type) {
    return getRelationshipList(member).some(rel =>
        rel.type === type &&
        rel.personId === targetId &&
        ((type !== 'parent' && type !== 'child') || !isInLawRelationship(rel))
    );
}

function hasRelationshipForDisplay(member, targetId, type) {
    return getRelationshipList(member).some(rel => rel.type === type && rel.personId === targetId);
}

function hasActiveSpouseRelationship(member, targetId) {
    return getRelationshipList(member).some(rel =>
        rel.type === 'spouse' &&
        rel.personId === targetId &&
        rel.maritalStatus !== 'divorced'
    );
}

function listsChildOf(member, parentId) {
    if (!member) return false;
    if (member.relationship === 'child' && member.relatedTo === parentId) return true;
    return getRelationshipList(member).some(rel =>
        rel.type === 'child' &&
        rel.personId === parentId &&
        !isInLawRelationship(rel)
    );
}

function listsParentOf(member, childId) {
    if (!member) return false;
    if (member.relationship === 'parent' && member.relatedTo === childId) return true;
    return getRelationshipList(member).some(rel =>
        rel.type === 'parent' &&
        rel.personId === childId &&
        !isInLawRelationship(rel)
    );
}

function personIsChildOf(member, parentId) {
    return listsChildOf(member, parentId) || (member && parentId ? familyMembers.some(m => m.id === parentId && listsParentOf(m, member.id)) : false);
}

function personHasChildren(memberId) {
    return familyMembers.some(m => personIsChildOf(m, memberId)) ||
        familyMembers.some(m =>
            m.id === memberId &&
            getRelationshipList(m).some(rel => rel.type === 'parent' && !isInLawRelationship(rel))
        );
}

function compareMembersForPlacement(a, b) {
    if (a.birthDate && b.birthDate) {
        return new Date(a.birthDate) - new Date(b.birthDate);
    }
    if (a.birthDate && !b.birthDate) return -1;
    if (!a.birthDate && b.birthDate) return 1;
    if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt) - new Date(b.createdAt);
    }
    if (a.createdAt && !b.createdAt) return -1;
    if (!a.createdAt && b.createdAt) return 1;
    return familyMembers.findIndex(m => m.id === a.id) - familyMembers.findIndex(m => m.id === b.id);
}

function getLinkedParents(child) {
    return familyMembers.filter(parent => parent.id !== child.id && personIsChildOf(child, parent.id));
}

function getPrimaryParentId(child) {
    const parents = getLinkedParents(child);
    if (parents.length <= 1) {
        return parents[0] ? parents[0].id : null;
    }

    const explicitChildLinks = parents.filter(parent => listsChildOf(child, parent.id));
    const candidates = explicitChildLinks.length > 0 ? explicitChildLinks : parents;
    candidates.sort(compareMembersForPlacement);
    return candidates[0].id;
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

        if (hasRelationshipForDisplay(member, otherMember.id, 'child') || hasRelationshipForDisplay(otherMember, member.id, 'parent')) {
            family.parents.push(otherMember);
        }
        if (hasRelationshipForDisplay(member, otherMember.id, 'parent') || hasRelationshipForDisplay(otherMember, member.id, 'child')) {
            family.children.push(otherMember);
        }
        if (hasActiveSpouseRelationship(member, otherMember.id) || hasActiveSpouseRelationship(otherMember, member.id)) {
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

    family.children.sort(compareMembersForPlacement);

    return family;
}

function renderTreeFocusDetailMember(member, relationshipLabel) {
    const memberName = window.getMemberDisplayName ? window.getMemberDisplayName(member) : `${member.firstName} ${member.lastName}`.trim();
    const photoHtml = member.photoUrl
        ? `<div class="focus-member-photo" style="background-image:url('${member.photoUrl.replace(/'/g, "\\'")}')"></div>`
        : `<div class="focus-member-photo"><span class="material-icons">${member.gender === 'female' ? 'face_3' : 'face'}</span></div>`;

    return `
        <button type="button" class="focus-member-card" data-member-id="${member.id}">
            ${photoHtml}
            <div>
                <div class="focus-member-name">${memberName}</div>
                ${relationshipLabel ? `<div class="focus-member-rel">${relationshipLabel}</div>` : ''}
            </div>
        </button>
    `;
}

function formatFocusDetailDate(dateValue) {
    if (!dateValue) return '—';
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatFocusDetailGender(gender) {
    if (gender === 'female') return t('female') || 'Female';
    if (gender === 'male') return t('male') || 'Male';
    return '—';
}

function getFocusSlideshowPhotos(member) {
    const seen = new Set();
    const memberId = String(member.id);

    return (member.photos || []).filter(photo => {
        if (!photo || !photo.url || seen.has(photo.url)) return false;
        seen.add(photo.url);
        return Array.isArray(photo.taggedMemberIds) && photo.taggedMemberIds.map(String).includes(memberId);
    });
}

function clearFocusSlideshowTimer() {
    if (window.pyebwaFocusSlideshowTimer) {
        clearInterval(window.pyebwaFocusSlideshowTimer);
        window.pyebwaFocusSlideshowTimer = null;
    }
}

function initializeFocusSlideshow() {
    clearFocusSlideshowTimer();

    const slideshow = document.querySelector('#treeFocusMemberCard .focus-detail-slideshow');
    if (!slideshow) return;

    const slides = Array.from(slideshow.querySelectorAll('.focus-detail-slide'));
    const dots = Array.from(slideshow.querySelectorAll('.focus-detail-dot'));
    if (slides.length <= 1) return;

    let index = 0;
    const render = nextIndex => {
        index = nextIndex;
        slides.forEach((slide, slideIndex) => {
            slide.classList.toggle('active', slideIndex === index);
        });
        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle('active', dotIndex === index);
        });
    };

    dots.forEach((dot, dotIndex) => {
        dot.addEventListener('click', () => render(dotIndex));
    });

    window.pyebwaFocusSlideshowTimer = setInterval(() => {
        render((index + 1) % slides.length);
    }, 3500);
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

function ensureTreeFocusPanels() {
    const treeView = document.getElementById('treeView');
    const treeContainer = document.getElementById('treeContainer');
    if (!treeView || !treeContainer) return null;

    let layout = document.getElementById('treeFocusLayout');
    if (!layout) {
        layout = document.createElement('div');
        layout.id = 'treeFocusLayout';
        layout.className = 'tree-focus-layout';
        treeContainer.insertAdjacentElement('afterend', layout);
    }

    let detail = document.getElementById('treeFocusDetail');
    if (!detail) {
        detail = document.createElement('div');
        detail.id = 'treeFocusDetail';
        detail.className = 'tree-focus-detail';
        layout.appendChild(detail);
    }

    let memberCard = document.getElementById('treeFocusMemberCard');
    if (!memberCard) {
        memberCard = document.createElement('aside');
        memberCard.id = 'treeFocusMemberCard';
        memberCard.className = 'focus-member-detail-card';
        layout.appendChild(memberCard);
    }

    return { layout, detail, memberCard };
}

function clearTreeFocusState() {
    const treeContainer = document.getElementById('treeContainer');
    const detail = document.getElementById('treeFocusDetail');
    const memberCard = document.getElementById('treeFocusMemberCard');
    const layout = document.getElementById('treeFocusLayout');

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

    if (memberCard) {
        memberCard.style.display = 'none';
        memberCard.innerHTML = '';
    }

    if (layout) {
        layout.style.display = 'none';
    }

    clearFocusSlideshowTimer();
}

function applyTreeFocusState(options = {}) {
    const state = getTreeInteractionState();
    const treeContainer = document.getElementById('treeContainer');
    const panels = ensureTreeFocusPanels();
    const sourceMembers = window.allFamilyMembers || familyMembers;
    const shouldScrollDetailIntoView = options.scrollDetail === true;

    if (!treeContainer || !panels) return;
    const { layout, detail, memberCard } = panels;

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
    const focusMemberName = window.getMemberDisplayName ? window.getMemberDisplayName(focusMember) : `${focusMember.firstName} ${focusMember.lastName}`.trim();
    const slideshowPhotos = getFocusSlideshowPhotos(focusMember);
    const family = getDirectFamilyMembers(focusMember);
    const sectionsHtml = [
        buildTreeFocusSection(t('children') || 'Children', 'north', family.children, computedRelationships),
        buildTreeFocusSection(t('spouse') || 'Spouse', 'favorite', family.spouses, computedRelationships),
        buildTreeFocusSection(t('siblings') || 'Siblings', 'people', family.siblings, computedRelationships),
        buildTreeFocusSection(t('parents') || 'Parents', 'north', family.parents, computedRelationships)
    ].filter(Boolean).join('');

    detail.innerHTML = `
        <div class="focus-detail-header">
            <div class="focus-detail-profile">
                ${photoHtml}
                <div>
                    <h3>${focusMemberName}</h3>
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
    memberCard.innerHTML = `
        ${slideshowPhotos.length ? `
            <div class="focus-detail-slideshow">
                <div class="focus-detail-slides">
                    ${slideshowPhotos.map((photo, index) => `
                        <div class="focus-detail-slide ${index === 0 ? 'active' : ''}">
                            <img src="${photo.url}" alt="${focusMemberName}">
                        </div>
                    `).join('')}
                </div>
                ${slideshowPhotos.length > 1 ? `
                    <div class="focus-detail-dots">
                        ${slideshowPhotos.map((_, index) => `
                            <button type="button" class="focus-detail-dot ${index === 0 ? 'active' : ''}" aria-label="Photo ${index + 1}"></button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        ` : ''}
    `;
    layout.style.display = 'grid';
    detail.style.display = 'block';
    memberCard.style.display = 'flex';
    initializeFocusSlideshow();
    if (shouldScrollDetailIntoView) {
        setTimeout(() => detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }

    detail.querySelector('#treeFocusEditBtn')?.addEventListener('click', () => showAddMemberModal(focusMember));
    detail.querySelector('#treeFocusClearBtn')?.addEventListener('click', () => {
        state.focusPersonId = null;
        localStorage.removeItem('pyebwaTreeFocusPerson');
        clearTreeFocusState();
    });
    detail.querySelectorAll('.focus-member-card').forEach(button => {
        button.addEventListener('click', () => {
            const memberId = button.getAttribute('data-member-id');
            focusTreeMember(memberId, { zoom: 82 });
        });
    });
}

function focusTreeMember(memberId, options = {}) {
    const state = getTreeInteractionState();
    state.focusPersonId = memberId;
    localStorage.setItem('pyebwaTreeFocusPerson', memberId);
    applyTreeFocusState({ scrollDetail: options.scrollDetail !== false });

    if (options.navigate !== false && window.pyebwaTreeControls?.focusOnMember) {
        window.pyebwaTreeControls.focusOnMember(memberId, options);
    }
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

    // Apply mode class to container so CSS can reflect it
    const container = document.getElementById('treeContainer');
    if (container) {
        container.setAttribute('data-tree-mode', state.mode);
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
    if (window.pyebwaTreeDragState && window.pyebwaTreeDragState.suppressClickUntil > Date.now()) {
        return;
    }

    const state = getTreeInteractionState();

    if (state.mode === 'edit') {
        showAddMemberModal(member);
        return;
    }

    focusTreeMember(member.id, { zoom: 85 });
}

function getDirectChildTreeNodes(nodeElement) {
    return Array.from(nodeElement.querySelectorAll(':scope > .tree-children > .tree-child > .tree-node'));
}

function getDirectParentTreeNodes(nodeElement) {
    return Array.from(nodeElement.querySelectorAll(':scope > .tree-parents > .tree-parent > .tree-node'));
}

function getElementCenter(element, treeRect, edge = 'center') {
    const rect = element.getBoundingClientRect();
    const x = rect.left - treeRect.left + (rect.width / 2);
    let y = rect.top - treeRect.top + (rect.height / 2);

    if (edge === 'top') {
        y = rect.top - treeRect.top;
    } else if (edge === 'bottom') {
        y = rect.bottom - treeRect.top;
    }

    return { x, y };
}

function buildCurvedConnectionPath(start, end) {
    const verticalDistance = Math.abs(end.y - start.y);
    const controlOffset = Math.max(28, Math.min(120, verticalDistance * 0.45));
    const direction = end.y >= start.y ? 1 : -1;
    const c1 = { x: start.x, y: start.y + (controlOffset * direction) };
    const c2 = { x: end.x, y: end.y - (controlOffset * direction) };
    return `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
}

function ensureTreeConnectionsLayer(treeElement) {
    let svg = treeElement.querySelector('.tree-svg-connections');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'tree-svg-connections');
        svg.setAttribute('aria-hidden', 'true');
        treeElement.prepend(svg);
    }
    return svg;
}

function drawTreeConnections() {
    const treeElement = document.querySelector('#treeContainer .tree');
    if (!treeElement) return;

    const svg = ensureTreeConnectionsLayer(treeElement);
    const treeRect = treeElement.getBoundingClientRect();
    const width = Math.max(1, Math.ceil(treeRect.width));
    const height = Math.max(1, Math.ceil(treeRect.height));

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.innerHTML = '';

    const appendPath = (className, start, end) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', className);
        path.setAttribute('d', buildCurvedConnectionPath(start, end));
        svg.appendChild(path);
    };

    treeElement.querySelectorAll('.tree-node').forEach(nodeElement => {
        const membersContainer = nodeElement.querySelector(':scope > .tree-members');
        if (!membersContainer) return;

        const cards = Array.from(membersContainer.querySelectorAll(':scope > .member-card'));
        if (cards.length > 1) {
            const leftAnchor = getElementCenter(cards[0], treeRect, 'center');
            const rightAnchor = getElementCenter(cards[cards.length - 1], treeRect, 'center');
            appendPath('tree-connection tree-connection-spouse', leftAnchor, rightAnchor);
        }

        const parentAnchor = getElementCenter(membersContainer, treeRect, 'top');
        getDirectChildTreeNodes(nodeElement).forEach(childNode => {
            const childMembers = childNode.querySelector(':scope > .tree-members');
            if (!childMembers) return;
            const childAnchor = getElementCenter(childMembers, treeRect, 'bottom');
            appendPath('tree-connection tree-connection-child', parentAnchor, childAnchor);
        });

        const childAnchor = getElementCenter(membersContainer, treeRect, 'bottom');
        getDirectParentTreeNodes(nodeElement).forEach(parentNode => {
            const parentMembers = parentNode.querySelector(':scope > .tree-members');
            if (!parentMembers) return;
            const parentAnchor = getElementCenter(parentMembers, treeRect, 'top');
            appendPath('tree-connection tree-connection-parent', childAnchor, parentAnchor);
        });
    });
}

function requestTreeConnectionRedraw() {
    if (window.pyebwaTreeConnectionFrame) {
        cancelAnimationFrame(window.pyebwaTreeConnectionFrame);
    }

    window.pyebwaTreeConnectionFrame = requestAnimationFrame(() => {
        window.pyebwaTreeConnectionFrame = null;
        drawTreeConnections();
    });
}

function redrawTreeConnectionsNow() {
    if (window.pyebwaTreeConnectionFrame) {
        cancelAnimationFrame(window.pyebwaTreeConnectionFrame);
        window.pyebwaTreeConnectionFrame = null;
    }

    drawTreeConnections();
}

function getTreeMembersMotionState(element) {
    if (!window.pyebwaTreeMotionStates) {
        window.pyebwaTreeMotionStates = new WeakMap();
    }

    let state = window.pyebwaTreeMotionStates.get(element);
    if (!state) {
        state = {
            dragX: 0,
            dragY: 0,
            bounceX: 0,
            bounceY: 0,
            hoverScale: 1,
            bounceFrame: null,
            hoverFrame: null
        };
        window.pyebwaTreeMotionStates.set(element, state);
    }

    return state;
}

function applyTreeMembersTransform(element) {
    const state = getTreeMembersMotionState(element);
    const translateX = state.dragX + state.bounceX;
    const translateY = state.dragY + state.bounceY;

    element.style.transform = `
        translate(${translateX}px, ${translateY}px)
        scale(${state.hoverScale})
    `;
}

function cancelTreeMembersBounce(element) {
    const state = getTreeMembersMotionState(element);
    if (state.bounceFrame) {
        cancelAnimationFrame(state.bounceFrame);
        state.bounceFrame = null;
    }
    state.bounceX = 0;
    state.bounceY = 0;
}

function tweenTreeMembersHover(element, target) {
    const state = getTreeMembersMotionState(element);
    if (state.hoverFrame) {
        cancelAnimationFrame(state.hoverFrame);
    }

    const startScale = state.hoverScale;
    const targetScale = target.scale || 1;
    const startTime = performance.now();
    const duration = target.duration || 260;
    const easeOut = progress => 1 - Math.pow(1 - progress, 3);
    const easeOutBack = progress => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
    };
    const easing = target.overshoot ? easeOutBack : easeOut;

    const frame = now => {
        const progress = Math.min(1, (now - startTime) / duration);
        const eased = easing(progress);

        state.hoverScale = startScale + ((targetScale - startScale) * eased);

        applyTreeMembersTransform(element);
        redrawTreeConnectionsNow();

        if (progress < 1) {
            state.hoverFrame = requestAnimationFrame(frame);
        } else {
            state.hoverFrame = null;
        }
    };

    state.hoverFrame = requestAnimationFrame(frame);
}

function playTreeMembersReleaseBounce(element, velocityX, velocityY) {
    const state = getTreeMembersMotionState(element);
    cancelTreeMembersBounce(element);

    const startX = state.dragX;
    const startY = state.dragY;
    const overshootX = Math.max(-32, Math.min(32, (-startX * 0.28) + (velocityX * 0.12)));
    const overshootY = Math.max(-24, Math.min(24, (-startY * 0.26) + (velocityY * 0.12)));
    const startTime = performance.now();
    const settleDuration = 460;
    const easeOutCubic = progress => 1 - Math.pow(1 - progress, 3);
    const easeOutBack = progress => {
        const c1 = 2.25;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
    };

    const frame = now => {
        const elapsed = now - startTime;

        if (elapsed <= 170) {
            const progress = easeOutCubic(elapsed / 170);
            state.dragX = startX * (1 - progress);
            state.dragY = startY * (1 - progress);
            state.bounceX = overshootX * progress;
            state.bounceY = overshootY * progress;
        } else {
            const progress = Math.min(1, (elapsed - 170) / (settleDuration - 170));
            const eased = easeOutBack(progress);
            state.dragX = 0;
            state.dragY = 0;
            state.bounceX = overshootX * (1 - eased);
            state.bounceY = overshootY * (1 - eased);
        }

        applyTreeMembersTransform(element);
        redrawTreeConnectionsNow();

        if (elapsed < settleDuration) {
            state.bounceFrame = requestAnimationFrame(frame);
        } else {
            state.dragX = 0;
            state.dragY = 0;
            state.bounceX = 0;
            state.bounceY = 0;
            state.bounceFrame = null;
            applyTreeMembersTransform(element);
            redrawTreeConnectionsNow();
        }
    };

    state.bounceFrame = requestAnimationFrame(frame);
}

function initializeTreeNodeDragging() {
    const treeElement = document.querySelector('#treeContainer .tree');
    if (!treeElement) return;

    const dragState = window.pyebwaTreeDragState || (window.pyebwaTreeDragState = {
        activeElement: null,
        pointerId: null,
        startX: 0,
        startY: 0,
        translateX: 0,
        translateY: 0,
        lastMoveTime: 0,
        velocityX: 0,
        velocityY: 0,
        moved: false,
        isDragging: false,
        suppressClickUntil: 0
    });

    treeElement.querySelectorAll('.tree-members').forEach(membersContainer => {
        if (membersContainer.dataset.dragInitialized === 'true') return;
        membersContainer.dataset.dragInitialized = 'true';
        const motionState = getTreeMembersMotionState(membersContainer);

        membersContainer.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            if (!event.target.closest('.member-card')) return;

            cancelTreeMembersBounce(membersContainer);
            if (motionState.hoverFrame) {
                cancelAnimationFrame(motionState.hoverFrame);
                motionState.hoverFrame = null;
            }

            dragState.activeElement = membersContainer;
            dragState.pointerId = event.pointerId;
            dragState.startX = event.clientX;
            dragState.startY = event.clientY;
            dragState.translateX = 0;
            dragState.translateY = 0;
            dragState.lastMoveTime = performance.now();
            dragState.velocityX = 0;
            dragState.velocityY = 0;
            dragState.moved = false;
            dragState.isDragging = false;

            motionState.dragX = 0;
            motionState.dragY = 0;
            motionState.hoverScale = 1;
            membersContainer.classList.remove('tree-members-hovered');
            membersContainer.style.setProperty('--tree-hover-x', '50%');
            membersContainer.style.setProperty('--tree-hover-y', '50%');
            applyTreeMembersTransform(membersContainer);

            event.stopPropagation();
        });

        membersContainer.addEventListener('pointermove', event => {
            if (dragState.activeElement !== membersContainer || dragState.pointerId !== event.pointerId) return;

            const now = performance.now();
            const deltaTime = Math.max(16, now - dragState.lastMoveTime);
            dragState.translateX = event.clientX - dragState.startX;
            dragState.translateY = event.clientY - dragState.startY;
            dragState.velocityX = (dragState.translateX - motionState.dragX) / deltaTime * 16;
            dragState.velocityY = (dragState.translateY - motionState.dragY) / deltaTime * 16;
            dragState.lastMoveTime = now;
            if (Math.abs(dragState.translateX) > 4 || Math.abs(dragState.translateY) > 4) {
                dragState.moved = true;
            }

            if (!dragState.moved) {
                return;
            }

            if (!dragState.isDragging) {
                dragState.isDragging = true;
                membersContainer.classList.add('tree-members-dragging');
                membersContainer.setPointerCapture(event.pointerId);
            }

            motionState.dragX = dragState.translateX;
            motionState.dragY = dragState.translateY;
            applyTreeMembersTransform(membersContainer);
            event.preventDefault();
            redrawTreeConnectionsNow();
        });

        const releaseDrag = event => {
            if (dragState.activeElement !== membersContainer || dragState.pointerId !== event.pointerId) return;

            if (dragState.isDragging) {
                membersContainer.releasePointerCapture(event.pointerId);
                membersContainer.classList.remove('tree-members-dragging');
                playTreeMembersReleaseBounce(membersContainer, dragState.velocityX, dragState.velocityY);
            }

            if (dragState.moved) {
                dragState.suppressClickUntil = Date.now() + 250;
            }

            dragState.activeElement = null;
            dragState.pointerId = null;
            dragState.translateX = 0;
            dragState.translateY = 0;
            dragState.moved = false;
            dragState.isDragging = false;
        };

        membersContainer.addEventListener('pointerup', releaseDrag);
        membersContainer.addEventListener('pointercancel', releaseDrag);
        membersContainer.addEventListener('pointerenter', event => {
            if (!event.target.closest('.member-card')) return;
            if (dragState.activeElement === membersContainer) return;
            membersContainer.classList.add('tree-members-hovered');
        });
        membersContainer.addEventListener('pointermove', event => {
            if (dragState.activeElement === membersContainer) return;
            if (!event.target.closest('.member-card')) return;

            const rect = membersContainer.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            membersContainer.style.setProperty('--tree-hover-x', `${x}px`);
            membersContainer.style.setProperty('--tree-hover-y', `${y}px`);
            tweenTreeMembersHover(membersContainer, {
                scale: 1.08,
                duration: 280,
                overshoot: true
            });
        });
        membersContainer.addEventListener('pointerleave', () => {
            membersContainer.classList.remove('tree-members-hovered');
            membersContainer.style.setProperty('--tree-hover-x', '50%');
            membersContainer.style.setProperty('--tree-hover-y', '50%');
            if (dragState.activeElement === membersContainer) return;
            tweenTreeMembersHover(membersContainer, {
                scale: 1,
                duration: 220
            });
        });
    });

    if (!window.pyebwaTreeConnectionEventsBound) {
        window.pyebwaTreeConnectionEventsBound = true;
        window.addEventListener('resize', requestTreeConnectionRedraw);
        document.getElementById('treeContainer')?.addEventListener('scroll', requestTreeConnectionRedraw, { passive: true });
    }
}

function renderFamilyTree(viewMode = 'full') {
    const container = document.getElementById('treeContainer');
    initializeTreeModeToggle();

    // Keep the tree source in sync with the latest loaded members.
    const latestMembers = Array.isArray(window.allFamilyMembers) ? window.allFamilyMembers : familyMembers;
    window.allFamilyMembers = [...latestMembers];
    
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
            const familyNameFormat = t('familyNameFormat') || 'The {{name}} Family';
            const escapedName = familyName.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            familyNameHtml = familyNameFormat.replace('{{name}}', escapedName);
        }
    }

    // Render family name above the toolbar when controls exist
    let nameDisplay = document.getElementById('familyNameDisplay');
    const treeView = container.closest('#treeView');
    const controls = treeView?.querySelector('.tree-controls');
    const anchor = controls || container;
    if (!nameDisplay) {
        nameDisplay = document.createElement('div');
        nameDisplay.id = 'familyNameDisplay';
    }
    if (nameDisplay.previousElementSibling !== anchor.previousElementSibling || nameDisplay.nextElementSibling !== anchor) {
        anchor.insertAdjacentElement('beforebegin', nameDisplay);
    }
    if (familyNameHtml) {
        nameDisplay.className = 'family-name-header';
        nameDisplay.textContent = familyNameHtml;
        nameDisplay.style.display = '';
    } else {
        nameDisplay.style.display = 'none';
    }

    container.innerHTML = `<div class="tree-wrapper tree-scale-auto"><div class="tree"></div></div>`;
    const treeElement = container.querySelector('.tree');
    
    // Render tree nodes
    renderTreeNode(treeElement, treeData);
    container.classList.add('has-svg-connections');
    initializeTreeNodeDragging();
    requestTreeConnectionRedraw();
    // Apply current mode attribute so CSS reflects it
    container.setAttribute('data-tree-mode', getTreeInteractionState().mode);
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
        if (member.relationship === 'parent' && member.relatedTo) {
            childOfMap.add(member.relatedTo);
        }
        // Also check full relationships array
        if (member.relationships) {
            member.relationships.forEach(r => {
                if (r.type === 'child' && r.personId) childOfMap.add(member.id);
                if (r.type === 'parent' && r.personId) childOfMap.add(r.personId);
            });
        }
        // Siblings — mark as child of same parent
        if (member.relationship === 'sibling' && member.relatedTo) {
            const sib = memberMap.get(member.relatedTo);
            if (sib && (sib.relationship === 'child' || sib.relationship === 'parent' ||
                (sib.relationships && sib.relationships.some(r => r.type === 'child' || r.type === 'parent')))) {
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
                const memberHasKids = personHasChildren(member.id);
                const partnerHasKids = personHasChildren(partner.id);
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
                var memberHasKids = personHasChildren(member.id);
                var partnerHasKids = personHasChildren(partnerId);

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
    // Share processed set across all root trees to prevent members appearing twice
    const globalProcessed = new Set();
    const trees = roots.map(root => {
        if (globalProcessed.has(root.id)) return null;
        return buildMemberTree(root, globalProcessed);
    }).filter(Boolean);
    
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
        if (a.relationships) {
            return a.relationships.some(r =>
                r.type === 'spouse' &&
                r.personId === bId &&
                r.maritalStatus !== 'divorced'
            );
        }
        return false;
    }

    const spouse = familyMembers.find(m =>
        m.id !== member.id &&
        !processed.has(m.id) &&
        (
            isSpouseOf(m, member.id) ||
            isSpouseOf(member, m.id)
        )
    );
    if (spouse && !processed.has(spouse.id)) {
        node.spouse = spouse;
        processed.add(spouse.id);
    }

    // Find children — check flat field AND relationships array
    const linkedChildren = familyMembers.filter(m => {
        if (m.id === member.id || (spouse && m.id === spouse.id)) return false;

        const linkedToMember = personIsChildOf(m, member.id) || listsParentOf(member, m.id);
        const linkedToSpouse = spouse ? (personIsChildOf(m, spouse.id) || listsParentOf(spouse, m.id)) : false;
        if (!linkedToMember && !linkedToSpouse) return false;

        const primaryParentId = getPrimaryParentId(m);
        if (!primaryParentId) return linkedToMember || linkedToSpouse;

        return primaryParentId === member.id || (spouse && primaryParentId === spouse.id);
    });
    const children = linkedChildren;
    const connectedChildren = familyMembers.filter(m => {
        if (m.id === member.id || (spouse && m.id === spouse.id)) return false;
        const linkedToMember = personIsChildOf(m, member.id) || listsParentOf(member, m.id);
        const linkedToSpouse = spouse ? (personIsChildOf(m, spouse.id) || listsParentOf(spouse, m.id)) : false;
        if (!linkedToMember && !linkedToSpouse) return false;
        return !children.some(child => child.id === m.id);
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
    node.connectedChildren = connectedChildren;
    
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
    name.textContent = window.getMemberDisplayName ? window.getMemberDisplayName(member) : `${member.firstName} ${member.lastName}`.trim();
    card.appendChild(name);
    
    // Birth year
    if (member.birthDate) {
        const year = document.createElement('div');
        year.className = 'member-year';
        year.textContent = new Date(member.birthDate).getFullYear();
        card.appendChild(year);
    }

    const connectedChildren = node.connectedChildren || member.connectedChildren;
    if (connectedChildren && connectedChildren.length > 0) {
        const note = document.createElement('button');
        note.type = 'button';
        note.className = 'member-relationship-badge category-extended';
        if (connectedChildren.length === 1) {
            note.textContent = `Connected through ${connectedChildren[0].firstName}`;
            note.addEventListener('click', (event) => {
                event.stopPropagation();
                handleTreeCardClick(connectedChildren[0]);
            });
        } else {
            note.textContent = `Connected through ${connectedChildren.length} children`;
            note.addEventListener('click', (event) => {
                event.stopPropagation();
                handleTreeCardClick(connectedChildren[0]);
            });
        }
        card.appendChild(note);
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
        if (member.relationships) {
            member.relationships.forEach(rel => {
                if (rel.type === 'parent' && rel.personId === focusPerson.id && !parents.find(p => p.id === member.id)) {
                    parents.push(member);
                }
            });
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
        personIsChildOf(member, focusPerson.id) ||
        listsParentOf(focusPerson, member.id)
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
window.requestTreeConnectionRedraw = requestTreeConnectionRedraw;
window.redrawTreeConnectionsNow = redrawTreeConnectionsNow;
window.setTreeInteractionMode = setTreeInteractionMode;
