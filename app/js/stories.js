// Stories functionality
function loadStories() {
    const container = document.getElementById('storiesList');
    
    // Placeholder for stories
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📖</div>
            <h3>${t('noStoriesYet') || 'No stories yet'}</h3>
            <p>${t('startSharing') || 'Start sharing your family stories and memories.'}</p>
            <button class="btn btn-primary" onclick="showAddStoryModal()">
                <span class="material-icons">add_circle</span>
                ${t('addStory')}
            </button>
        </div>
    `;
}

// Add story modal (placeholder)
function showAddStoryModal() {
    alert(t('comingSoon') || 'Stories feature coming soon!');
}