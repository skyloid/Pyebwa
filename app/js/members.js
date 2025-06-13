// Members list view functionality
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
    
    // Clear container
    container.innerHTML = '';
    
    // Render member cards
    familyMembers.forEach(member => {
        container.appendChild(createMemberListCard(member));
    });
}

// Create member card for list view
function createMemberListCard(member) {
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
    
    // Relationship
    if (member.relationship) {
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