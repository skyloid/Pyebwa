// Modern Dashboard Component

// Slideshow management
let slideshowInterval = null;
let currentMemberId = null;

// Get random family member photo
function getRandomFamilyMemberPhoto(excludeMemberId = null) {
    const membersWithPhotos = (window.familyMembers || [])
        .filter(member => member.photoUrl);
    
    if (membersWithPhotos.length === 0) {
        console.log('No family members with photos found');
        return null;
    }
    
    console.log(`Found ${membersWithPhotos.length} members with photos`);
    
    // If only one photo, return it
    if (membersWithPhotos.length === 1) {
        const member = membersWithPhotos[0];
        return {
            url: member.photoUrl,
            memberId: member.id,
            memberName: `${member.firstName} ${member.lastName}`
        };
    }
    
    // Filter out the current member if specified
    let availableMembers = membersWithPhotos;
    if (excludeMemberId) {
        availableMembers = membersWithPhotos.filter(m => m.id !== excludeMemberId);
        console.log(`Excluding member ${excludeMemberId}, ${availableMembers.length} members available`);
    }
    
    // If all were filtered out (shouldn't happen), use all
    if (availableMembers.length === 0) {
        availableMembers = membersWithPhotos;
    }
    
    // Select random member
    const randomMember = availableMembers[
        Math.floor(Math.random() * availableMembers.length)
    ];
    
    return {
        url: randomMember.photoUrl,
        memberId: randomMember.id,
        memberName: `${randomMember.firstName} ${randomMember.lastName}`
    };
}

// Transition to new image with fade effect
function transitionToNewImage(container, photoData) {
    const slideshowContainer = container.querySelector('.dashboard-bg-slideshow');
    if (!slideshowContainer) return;
    
    const activeImage = slideshowContainer.querySelector('.slideshow-image.active');
    const inactiveImage = slideshowContainer.querySelector('.slideshow-image:not(.active)');
    
    if (!activeImage || !inactiveImage) return;
    
    // Preload new image
    const img = new Image();
    img.onload = () => {
        // Set new image on inactive div
        inactiveImage.style.backgroundImage = `url('${photoData.url}')`;
        
        // Swap active states for smooth transition
        activeImage.classList.remove('active');
        inactiveImage.classList.add('active');
        
        currentMemberId = photoData.memberId;
        console.log(`Transitioned to photo of ${photoData.memberName} (ID: ${photoData.memberId})`);
    };
    img.onerror = () => {
        console.error(`Failed to load photo for ${photoData.memberName}`);
    };
    img.src = photoData.url;
}

// Start the family photo slideshow
function startFamilyPhotoSlideshow(containerElement) {
    // Clear any existing interval
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
    }
    
    // Get initial photo
    const initialPhoto = getRandomFamilyMemberPhoto();
    if (!initialPhoto) {
        console.log('No photos available for slideshow');
        return;
    }
    
    // Set initial image
    const slideshowContainer = containerElement.querySelector('.dashboard-bg-slideshow');
    if (slideshowContainer) {
        const firstImage = slideshowContainer.querySelector('.slideshow-image.active');
        if (firstImage) {
            firstImage.style.backgroundImage = `url('${initialPhoto.url}')`;
            currentMemberId = initialPhoto.memberId;
            console.log(`Starting slideshow with photo of ${initialPhoto.memberName} (ID: ${initialPhoto.memberId})`);
        }
    }
    
    // Change image every 10 seconds
    slideshowInterval = setInterval(() => {
        const nextPhoto = getRandomFamilyMemberPhoto(currentMemberId);
        if (nextPhoto) {
            transitionToNewImage(containerElement, nextPhoto);
        }
    }, 10000);
}

// Stop the slideshow
window.stopDashboardSlideshow = function() {
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
        currentMemberId = null; // Reset current member
        console.log('Dashboard slideshow stopped');
    }
};

function createDashboard() {
    console.log('Creating dashboard...');
    
    // Calculate statistics
    const stats = calculateFamilyStats();
    
    // Check if we have family photos
    const hasPhotos = (window.familyMembers || []).some(member => member.photoUrl);
    
    const dashboard = document.createElement('div');
    dashboard.className = 'dashboard-container';
    dashboard.innerHTML = `
        <style>
            .slideshow-image {
                opacity: 0 !important;
            }
            .slideshow-image.active {
                opacity: 0.4 !important;
            }
        </style>
        <!-- Welcome Section -->
        <div class="dashboard-welcome card" style="
            position: relative; 
            overflow: hidden; 
            min-height: 250px; 
            padding: 0;
            background: linear-gradient(135deg, #00217D 0%, #D41125 100%);
        ">
            ${hasPhotos ? `
                <!-- Slideshow container for family photos -->
                <div class="dashboard-bg-slideshow" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                ">
                    <div class="slideshow-image active" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-size: cover;
                        background-position: center;
                        background-repeat: no-repeat;
                        opacity: 0.4;
                        transition: opacity 1.5s ease-in-out;
                    "></div>
                    <div class="slideshow-image" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-size: cover;
                        background-position: center;
                        background-repeat: no-repeat;
                        opacity: 0;
                        transition: opacity 1.5s ease-in-out;
                    "></div>
                </div>
            ` : ''}
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(0,33,125,0.7) 0%, rgba(212,17,37,0.5) 100%);
            "></div>
            <div style="position: relative; z-index: 2; padding: 40px;">
                <h2 style="color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); margin-bottom: 15px;">${t('welcomeBack') || 'Welcome back'}, ${currentUser?.displayName || currentUser?.email || 'User'}!</h2>
                <p style="color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); font-size: 18px; line-height: 1.5;">${t('familyTreeSummary') || 'Your family tree has'} <strong>${stats.totalMembers}</strong> ${t('members') || 'members'} ${t('acrossGenerations') || 'across'} <strong>${stats.generations}</strong> ${t('generations') || 'generations'}.</p>
                ${!hasPhotos && stats.totalMembers > 0 ? `
                    <p style="color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); font-size: 14px; margin-top: 15px; opacity: 0.9;">
                        <span class="material-icons" style="font-size: 16px; vertical-align: middle;">photo_camera</span>
                        ${t('addPhotosPrompt') || 'Add photos to your family members to see them here!'}
                    </p>
                ` : ''}
            </div>
        </div>
        
        <!-- Statistics Grid -->
        <div class="dashboard-stats-grid">
            <div class="stat-card card">
                <div class="stat-icon">
                    <span class="material-icons">people</span>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.totalMembers}</div>
                    <div class="stat-label">${t('totalMembers') || 'Total Members'}</div>
                </div>
            </div>
            
            <div class="stat-card card">
                <div class="stat-icon" style="background: linear-gradient(135deg, var(--primary-blue) 0%, var(--blue-light) 100%);">
                    <span class="material-icons">face</span>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.males}</div>
                    <div class="stat-label">${t('males') || 'Males'}</div>
                </div>
            </div>
            
            <div class="stat-card card">
                <div class="stat-icon" style="background: linear-gradient(135deg, var(--primary-red) 0%, var(--red-light) 100%);">
                    <span class="material-icons">face_3</span>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.females}</div>
                    <div class="stat-label">${t('females') || 'Females'}</div>
                </div>
            </div>
            
            <div class="stat-card card">
                <div class="stat-icon" style="background: linear-gradient(135deg, var(--accent-yellow) 0%, var(--yellow-light) 100%);">
                    <span class="material-icons">account_tree</span>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.generations}</div>
                    <div class="stat-label">${t('generations') || 'Generations'}</div>
                </div>
            </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="dashboard-actions">
            <h3>${t('quickActions') || 'Quick Actions'}</h3>
            <div class="action-cards">
                <button class="action-card card" onclick="showAddMemberModal()">
                    <span class="material-icons">person_add</span>
                    <span>${t('addMember') || 'Add Member'}</span>
                </button>
                
                <button class="action-card card" onclick="showView('tree')">
                    <span class="material-icons">park</span>
                    <span>${t('viewTree') || 'View Tree'}</span>
                </button>
                
                <button class="action-card card" onclick="showView('members')">
                    <span class="material-icons">group</span>
                    <span>${t('browsemembers') || 'Browse Members'}</span>
                </button>
                
                <button class="action-card card" onclick="showExportOptions()">
                    <span class="material-icons">download</span>
                    <span>${t('exportTree') || 'Export Tree'}</span>
                </button>
            </div>
        </div>
        
        <!-- Recent Activity -->
        <div class="dashboard-activity card">
            <h3>${t('recentActivity') || 'Recent Activity'}</h3>
            <div class="activity-list">
                ${generateRecentActivity()}
            </div>
        </div>
        
        <!-- Family Insights -->
        <div class="dashboard-insights card">
            <h3>${t('familyInsights') || 'Family Insights'}</h3>
            <div class="insights-grid">
                <div class="insight-item">
                    <span class="material-icons">cake</span>
                    <div>
                        <div class="insight-label">${t('averageAge') || 'Average Age'}</div>
                        <div class="insight-value">${stats.averageAge} ${t('years') || 'years'}</div>
                    </div>
                </div>
                
                <div class="insight-item">
                    <span class="material-icons">child_friendly</span>
                    <div>
                        <div class="insight-label">${t('youngestMember') || 'Youngest Member'}</div>
                        <div class="insight-value">${stats.youngest?.name || 'N/A'}</div>
                    </div>
                </div>
                
                <div class="insight-item">
                    <span class="material-icons">elderly</span>
                    <div>
                        <div class="insight-label">${t('oldestMember') || 'Oldest Member'}</div>
                        <div class="insight-value">${stats.oldest?.name || 'N/A'}</div>
                    </div>
                </div>
                
                <div class="insight-item">
                    <span class="material-icons">photo_library</span>
                    <div>
                        <div class="insight-label">${t('photosUploaded') || 'Photos Uploaded'}</div>
                        <div class="insight-value">${stats.photosCount}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Start slideshow if we have photos
    if (hasPhotos) {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            startFamilyPhotoSlideshow(dashboard);
        }, 100);
    }
    
    return dashboard;
}

// Calculate family statistics
function calculateFamilyStats() {
    const stats = {
        totalMembers: familyMembers.length,
        males: 0,
        females: 0,
        generations: 0,
        averageAge: 0,
        youngest: null,
        oldest: null,
        photosCount: 0
    };
    
    if (familyMembers.length === 0) return stats;
    
    let totalAge = 0;
    let agesCount = 0;
    let youngestAge = Infinity;
    let oldestAge = 0;
    
    // Calculate basic stats
    familyMembers.forEach(member => {
        if (member.gender === 'male') stats.males++;
        if (member.gender === 'female') stats.females++;
        if (member.photoUrl) stats.photosCount++;
        
        if (member.birthDate) {
            const age = new Date().getFullYear() - new Date(member.birthDate).getFullYear();
            totalAge += age;
            agesCount++;
            
            if (age < youngestAge) {
                youngestAge = age;
                stats.youngest = { name: `${member.firstName} ${member.lastName}`, age };
            }
            
            if (age > oldestAge) {
                oldestAge = age;
                stats.oldest = { name: `${member.firstName} ${member.lastName}`, age };
            }
        }
    });
    
    stats.averageAge = agesCount > 0 ? Math.round(totalAge / agesCount) : 0;
    
    // Calculate generations (simplified)
    const generationSet = new Set();
    familyMembers.forEach(member => {
        if (member.birthDate) {
            const birthYear = new Date(member.birthDate).getFullYear();
            const generation = Math.floor((new Date().getFullYear() - birthYear) / 25);
            generationSet.add(generation);
        }
    });
    stats.generations = Math.max(generationSet.size, 1);
    
    return stats;
}

// Generate recent activity HTML
function generateRecentActivity() {
    // This would ideally come from a real activity log
    const activities = [
        { icon: 'person_add', text: t('memberAdded') || 'New member added', time: t('today') || 'Today' },
        { icon: 'photo_camera', text: t('photoUploaded') || 'Photo uploaded', time: t('yesterday') || 'Yesterday' },
        { icon: 'edit', text: t('profileUpdated') || 'Profile updated', time: t('daysAgo', { days: 2 }) || '2 days ago' }
    ];
    
    return activities.map(activity => `
        <div class="activity-item">
            <span class="material-icons">${activity.icon}</span>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        </div>
    `).join('');
}

// Show export options modal
function showExportOptions() {
    // Remove any existing modal
    const existingModal = document.getElementById('exportOptionsModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'exportOptionsModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content export-modal">
            <div class="modal-header">
                <h3>${t('exportFamilyTree') || 'Export Family Tree'}</h3>
                <button class="modal-close" onclick="closeExportModal()">&times;</button>
            </div>
            <div class="export-options">
                <div class="export-option recommended" onclick="exportPDF()">
                    <div class="export-icon">
                        <span class="material-icons">picture_as_pdf</span>
                    </div>
                    <div class="export-details">
                        <h4>${t('exportAsPDF') || 'Export as PDF'}</h4>
                        <p>${t('pdfDescription') || 'Visual family tree with charts and demographic statistics'}</p>
                        <span class="recommended-badge">${t('recommended') || 'Recommended'}</span>
                    </div>
                </div>
                
                <div class="export-option" onclick="exportJSON()">
                    <div class="export-icon">
                        <span class="material-icons">code</span>
                    </div>
                    <div class="export-details">
                        <h4>${t('exportAsJSON') || 'Export as JSON'}</h4>
                        <p>${t('jsonDescription') || 'Raw data format for backup or data analysis'}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Close export modal
function closeExportModal() {
    const modal = document.getElementById('exportOptionsModal');
    if (modal) modal.remove();
}

// Export as PDF
function exportPDF() {
    closeExportModal();
    if (window.exportFamilyTreePDF) {
        window.exportFamilyTreePDF();
    } else {
        showError(t('pdfExportNotAvailable') || 'PDF export is loading, please try again.');
    }
}

// Export as JSON
function exportJSON() {
    closeExportModal();
    
    const data = {
        familyTree: {
            exportDate: new Date().toISOString(),
            exportVersion: '1.0',
            user: {
                email: currentUser?.email,
                name: currentUser?.displayName
            },
            members: familyMembers,
            statistics: calculateFamilyStats(),
            demographics: window.calculateDemographics ? window.calculateDemographics() : null
        }
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `pyebwa-family-tree-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showSuccess(t('jsonExported') || 'Family tree data exported successfully!');
}

// Dashboard styles
const dashboardStyles = `
<style>
/* Export Modal Styles */
.export-modal {
    max-width: 600px;
}

.export-options {
    padding: 20px 30px 30px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.export-option {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px;
    background: var(--gray-50);
    border: 2px solid var(--gray-200);
    border-radius: var(--border-radius-lg);
    cursor: pointer;
    transition: all var(--transition-base);
    position: relative;
}

.export-option:hover {
    background: white;
    border-color: var(--primary-blue);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.export-option.recommended {
    background: linear-gradient(135deg, rgba(0, 33, 125, 0.05) 0%, rgba(255, 199, 44, 0.05) 100%);
    border-color: var(--primary-blue);
}

.export-icon {
    width: 60px;
    height: 60px;
    background: white;
    border-radius: var(--border-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: var(--shadow-sm);
}

.export-icon .material-icons {
    font-size: 32px;
    color: var(--primary-blue);
}

.export-details {
    flex: 1;
}

.export-details h4 {
    font-size: 18px;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0 0 4px 0;
}

.export-details p {
    font-size: 14px;
    color: var(--gray-600);
    margin: 0;
}

.recommended-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background: var(--accent-yellow);
    color: var(--gray-900);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
}

@media (max-width: 768px) {
    .export-options {
        padding: 20px;
    }
    
    .export-option {
        flex-direction: column;
        text-align: center;
        padding: 16px;
    }
    
    .export-details h4 {
        font-size: 16px;
    }
}
.dashboard-container {
    display: grid;
    gap: 24px;
    animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.dashboard-welcome {
    /* Removed conflicting styles - using inline styles for background */
}

.dashboard-welcome h2 {
    margin-bottom: 8px;
    /* Color handled by inline styles */
}

.dashboard-welcome p {
    /* Color handled by inline styles */
    font-size: 16px;
}

.dashboard-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
}

.stat-card {
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    transition: all var(--transition-base);
}

.stat-card:hover {
    transform: translateY(-4px);
}

.stat-icon {
    width: 60px;
    height: 60px;
    border-radius: var(--border-radius);
    background: linear-gradient(135deg, var(--gray-200) 0%, var(--gray-300) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.stat-icon .material-icons {
    font-size: 28px;
    color: white;
}

.stat-content {
    flex: 1;
}

.stat-value {
    font-size: 32px;
    font-weight: 700;
    color: var(--gray-900);
    line-height: 1;
}

.stat-label {
    font-size: 14px;
    color: var(--gray-600);
    margin-top: 4px;
}

.dashboard-actions {
    margin-top: 32px;
}

.dashboard-actions h3 {
    margin-bottom: 16px;
    color: var(--gray-900);
}

.action-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
}

.action-card {
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    transition: all var(--transition-base);
    border: none;
    background: white;
    font-size: 14px;
    font-weight: 600;
    color: var(--gray-700);
}

.action-card:hover {
    color: var(--primary-blue);
}

.action-card .material-icons {
    font-size: 32px;
    color: var(--primary-blue);
}

.dashboard-activity {
    padding: 24px;
}

.dashboard-activity h3 {
    margin-bottom: 20px;
    color: var(--gray-900);
}

.activity-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.activity-item {
    display: flex;
    align-items: center;
    gap: 16px;
}

.activity-item .material-icons {
    color: var(--gray-400);
    font-size: 20px;
}

.activity-content {
    flex: 1;
}

.activity-text {
    font-size: 14px;
    color: var(--gray-700);
}

.activity-time {
    font-size: 12px;
    color: var(--gray-500);
    margin-top: 2px;
}

.dashboard-insights {
    padding: 24px;
}

.dashboard-insights h3 {
    margin-bottom: 20px;
    color: var(--gray-900);
}

.insights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
}

.insight-item {
    display: flex;
    align-items: center;
    gap: 16px;
}

.insight-item .material-icons {
    font-size: 32px;
    color: var(--primary-blue);
}

.insight-label {
    font-size: 12px;
    color: var(--gray-600);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.insight-value {
    font-size: 18px;
    font-weight: 600;
    color: var(--gray-900);
    margin-top: 2px;
}

body.dark-mode .stat-card,
body.dark-mode .action-card,
body.dark-mode .dashboard-activity,
body.dark-mode .dashboard-insights,
body.dark-mode .dashboard-welcome {
    background: var(--gray-100);
}

body.dark-mode .action-card {
    border: 1px solid var(--gray-200);
}

@media (max-width: 768px) {
    .dashboard-stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .action-cards {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .insights-grid {
        grid-template-columns: 1fr;
    }
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', dashboardStyles);

// Export functions
window.createDashboard = createDashboard;
window.calculateFamilyStats = calculateFamilyStats;
window.showExportOptions = showExportOptions;
window.closeExportModal = closeExportModal;
window.exportPDF = exportPDF;
window.exportJSON = exportJSON;