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
    card.className = 'member-list-card';
    
    // Photo section
    const photoSection = document.createElement('div');
    photoSection.className = 'member-list-photo';
    if (member.photoUrl) {
        const img = document.createElement('img');
        img.src = member.photoUrl;
        img.alt = `${member.firstName} ${member.lastName}`;
        photoSection.appendChild(img);
    } else {
        const icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.textContent = member.gender === 'female' ? 'face_3' : 'face';
        photoSection.appendChild(icon);
    }
    card.appendChild(photoSection);
    
    // Info section
    const infoSection = document.createElement('div');
    infoSection.className = 'member-list-info';
    
    // Name
    const name = document.createElement('h4');
    name.textContent = `${member.firstName} ${member.lastName}`;
    infoSection.appendChild(name);
    
    // Details
    const details = document.createElement('div');
    details.className = 'member-list-details';
    
    if (member.birthDate) {
        const birthYear = new Date(member.birthDate).getFullYear();
        const age = new Date().getFullYear() - birthYear;
        details.innerHTML += `<span><span class="material-icons">cake</span> ${birthYear} (${age} ${t('yearsOld') || 'years'})</span>`;
    }
    
    if (member.relationship) {
        details.innerHTML += `<span><span class="material-icons">family_restroom</span> ${t(member.relationship)}</span>`;
    }
    
    infoSection.appendChild(details);
    
    // Biography preview
    if (member.biography) {
        const bio = document.createElement('p');
        bio.className = 'member-list-bio';
        bio.textContent = member.biography.substring(0, 100) + (member.biography.length > 100 ? '...' : '');
        infoSection.appendChild(bio);
    }
    
    card.appendChild(infoSection);
    
    // Actions section
    const actionsSection = document.createElement('div');
    actionsSection.className = 'member-list-actions';
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn-icon';
    viewBtn.innerHTML = '<span class="material-icons">visibility</span>';
    viewBtn.title = t('view');
    viewBtn.onclick = () => showMemberDetails(member);
    actionsSection.appendChild(viewBtn);
    
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon';
    editBtn.innerHTML = '<span class="material-icons">edit</span>';
    editBtn.title = t('edit');
    editBtn.onclick = () => showAddMemberModal(member);
    actionsSection.appendChild(editBtn);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon btn-danger';
    deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
    deleteBtn.title = t('delete');
    deleteBtn.onclick = () => deleteMember(member);
    actionsSection.appendChild(deleteBtn);
    
    card.appendChild(actionsSection);
    
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