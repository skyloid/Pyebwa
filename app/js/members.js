// Members list view functionality
var _activeFilter = 'all';
var _focusPersonId = null;
var _computedRelationships = null;

function renderMembersList() {
    const container = document.getElementById('membersGrid');

    if (familyMembers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👥</div>
                <h3>${t('noMembersYet')}</h3>
                <p>${t('startBuilding')}</p>
            </div>
        `;
        return;
    }

    // Initialize focus person
    if (!_focusPersonId) {
        _focusPersonId = localStorage.getItem('pyebwaFocusPerson');
        // Default to logged-in user's person
        if (!_focusPersonId && window.currentUser) {
            var userPerson = familyMembers.find(m => m.email === window.currentUser.email);
            if (userPerson) _focusPersonId = userPerson.id;
        }
        if (!_focusPersonId && familyMembers.length > 0) _focusPersonId = familyMembers[0].id;
    }

    // Render focus selector and filters
    renderRelationshipControls();

    // Compute relationships
    if (window.pyebwaRelationshipEngine && _focusPersonId) {
        _computedRelationships = window.pyebwaRelationshipEngine.computeAll(_focusPersonId, familyMembers);
        console.log('[RelEngine] Focus:', _focusPersonId, 'Computed:', _computedRelationships ? _computedRelationships.size : 0, 'relationships');
        if (_computedRelationships) {
            _computedRelationships.forEach(function(r, id) {
                var m = familyMembers.find(function(mm) { return mm.id === id; });
                if (m) console.log('[RelEngine]', m.firstName, m.lastName, '->', r.label, '(' + r.type + ')');
            });
        }
    } else {
        console.warn('[RelEngine] Not available. Engine:', !!window.pyebwaRelationshipEngine, 'Focus:', _focusPersonId);
    }

    // Clear and render
    container.innerHTML = '';

    var lang = window.currentLanguage || 'en';
    var engine = window.pyebwaRelationshipEngine;
    var cats = engine ? engine.categories : {};

    // Update filter counts
    if (_computedRelationships && engine) {
        var cache = engine.getCache();
        if (cache.byCategory) {
            Object.keys(cache.byCategory).forEach(cat => {
                var chip = document.querySelector('.filter-chip[data-filter="' + cat + '"] .filter-count');
                if (chip) chip.textContent = cache.byCategory[cat].length || '';
            });
        }
    }

    familyMembers.forEach(member => {
        var rel = _computedRelationships ? _computedRelationships.get(member.id) : null;

        // Apply filter
        if (_activeFilter !== 'all' && rel && rel.category !== _activeFilter) return;
        if (_activeFilter !== 'all' && !rel) return;

        container.appendChild(createMemberListCard(member, rel));
    });
}

function renderRelationshipControls() {
    var existing = document.getElementById('relationshipControls');
    if (existing) existing.remove();

    var membersView = document.getElementById('membersView');
    if (!membersView) return;

    var header = membersView.querySelector('.view-header');
    if (!header) return;

    var lang = window.currentLanguage || 'en';
    var engine = window.pyebwaRelationshipEngine;
    var cats = engine ? engine.categories : {};

    var controls = document.createElement('div');
    controls.id = 'relationshipControls';
    controls.className = 'relationship-controls';

    // Focus person selector
    var focusHtml = '<div class="focus-person-selector">';
    focusHtml += '<label class="focus-label"><span class="material-icons" style="font-size:18px;vertical-align:middle;margin-right:4px;">person_pin</span>';
    focusHtml += (lang === 'fr' ? 'Voir comme' : lang === 'ht' ? 'W\u00e8 tankou' : 'View as') + ':</label>';
    focusHtml += '<select id="focusPersonSelect">';
    familyMembers.slice().sort((a, b) => (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName)).forEach(m => {
        var selected = m.id === _focusPersonId ? ' selected' : '';
        focusHtml += '<option value="' + m.id + '"' + selected + '>' + m.firstName + ' ' + m.lastName + '</option>';
    });
    focusHtml += '</select></div>';

    // Filter chips
    var filtersHtml = '<div class="relationship-filters">';
    var filterKeys = ['all', 'direct', 'extended', 'lateral', 'cousin', 'inlaw'];
    filterKeys.forEach(key => {
        var cat = cats[key] || { label: {}, icon: 'label' };
        var label = (cat.label && cat.label[lang]) || cat.label?.en || key;
        var active = _activeFilter === key ? ' active' : '';
        filtersHtml += '<button class="filter-chip' + active + '" data-filter="' + key + '">';
        filtersHtml += '<span class="material-icons">' + (cat.icon || 'label') + '</span> ';
        filtersHtml += label;
        filtersHtml += '<span class="filter-count"></span>';
        filtersHtml += '</button>';
    });
    filtersHtml += '</div>';

    controls.innerHTML = focusHtml + filtersHtml;
    header.after(controls);

    // Event listeners
    var select = controls.querySelector('#focusPersonSelect');
    if (select) {
        select.addEventListener('change', function() {
            _focusPersonId = this.value;
            localStorage.setItem('pyebwaFocusPerson', _focusPersonId);
            if (window.pyebwaRelationshipEngine) window.pyebwaRelationshipEngine.invalidate();
            renderMembersList();
        });
    }

    controls.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            _activeFilter = this.getAttribute('data-filter');
            controls.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            renderMembersList();
        });
    });
}

// Create member card for list view
function createMemberListCard(member, rel) {
    const card = document.createElement('div');
    card.className = 'member-card';
    card.onclick = () => showMemberDetails(member);
    
    // Card content wrapper
    const cardContent = document.createElement('div');
    cardContent.className = 'member-card-content';
    
    // Photo
    const photo = document.createElement('div');
    photo.className = 'member-photo';
    if (member.photoUrl) {
        photo.style.backgroundImage = `url(${member.photoUrl})`;
    } else {
        const icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.textContent = member.gender === 'female' ? 'face_3' : 'face';
        photo.appendChild(icon);
    }
    cardContent.appendChild(photo);
    
    // Info section
    const info = document.createElement('div');
    info.className = 'member-info';
    
    // Name
    const name = document.createElement('div');
    name.className = 'member-name';
    name.textContent = `${member.firstName} ${member.lastName}`;
    info.appendChild(name);
    
    // Computed relationship badge
    if (rel && rel.label && rel.type !== 'self') {
        const badge = document.createElement('div');
        badge.className = 'member-relationship-badge category-' + rel.category;
        badge.textContent = rel.label;
        info.appendChild(badge);
    } else if (member.relationship) {
        const relationship = document.createElement('div');
        relationship.className = 'member-relationship';
        relationship.textContent = t(member.relationship);
        info.appendChild(relationship);
    }
    
    // Dates
    if (member.birthDate) {
        const birthYear = new Date(member.birthDate).getFullYear();
        const age = new Date().getFullYear() - birthYear;
        const dates = document.createElement('div');
        dates.className = 'member-dates';
        dates.textContent = `${birthYear} • ${age} ${t('yearsOld') || 'years old'}`;
        info.appendChild(dates);
    }
    
    cardContent.appendChild(info);
    card.appendChild(cardContent);
    
    return card;
}

// Delete member
async function deleteMember(member) {
    const confirmMsg = t('confirmDelete', { name: `${member.firstName} ${member.lastName}` });
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        await db.collection('familyTrees')
            .doc(userFamilyTreeId)
            .collection('members')
            .doc(member.id)
            .delete();
        
        // Remove from search index
        if (window.pyebwaSearch && userFamilyTreeId) {
            try {
                await db.collection('familyTrees')
                    .doc(userFamilyTreeId)
                    .collection('searchIndex')
                    .doc(member.id)
                    .delete();
                console.log('Removed from search index:', member.firstName, member.lastName);
            } catch (searchError) {
                console.error('Failed to remove from search index:', searchError);
            }
        }
        
        // Reload members
        await loadFamilyMembers();
        showSuccess(t('deletedSuccessfully') || 'Deleted successfully!');
        
    } catch (error) {
        console.error('Error deleting member:', error);
        showError(t('errorDeleting') || 'Error deleting member');
    }
}

// Search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('memberSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterMembers(searchTerm);
        });
    }
});

// Filter members based on search
function filterMembers(searchTerm) {
    const cards = document.querySelectorAll('.member-list-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'flex' : 'none';
    });
}