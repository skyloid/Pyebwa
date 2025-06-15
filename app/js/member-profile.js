// Enhanced Member Profile System for Pyebwa Family Tree
(function() {
    'use strict';
    
    const MemberProfile = {
        // Current member being viewed
        currentMember: null,
        currentMemberId: null,
        
        // Initialize profile system
        init() {
            this.createProfileModal();
            this.setupEventListeners();
        },
        
        // Create profile modal structure
        createProfileModal() {
            const modal = document.createElement('div');
            modal.id = 'memberProfileModal';
            modal.className = 'profile-modal';
            modal.innerHTML = `
                <div class="profile-modal-content">
                    <button class="profile-close" aria-label="Close">
                        <i class="material-icons">close</i>
                    </button>
                    
                    <div class="profile-container">
                        <!-- Header Section -->
                        <div class="profile-header">
                            <div class="profile-cover"></div>
                            <div class="profile-header-content">
                                <div class="profile-photo-container">
                                    <img class="profile-photo" src="/app/assets/images/default-avatar.png" alt="">
                                    <button class="photo-edit-btn" title="Change photo">
                                        <i class="material-icons">camera_alt</i>
                                    </button>
                                </div>
                                <div class="profile-info">
                                    <h1 class="profile-name"></h1>
                                    <div class="profile-dates"></div>
                                    <div class="profile-relationship"></div>
                                </div>
                                <div class="profile-actions">
                                    <button class="btn-icon edit-profile" title="Edit">
                                        <i class="material-icons">edit</i>
                                    </button>
                                    <button class="btn-icon share-profile" title="Share">
                                        <i class="material-icons">share</i>
                                    </button>
                                    <button class="btn-icon print-profile" title="Print">
                                        <i class="material-icons">print</i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Navigation Tabs -->
                        <div class="profile-tabs">
                            <button class="profile-tab active" data-tab="overview">
                                <i class="material-icons">person</i>
                                <span>${t('overview') || 'Overview'}</span>
                            </button>
                            <button class="profile-tab" data-tab="timeline">
                                <i class="material-icons">timeline</i>
                                <span>${t('timeline') || 'Timeline'}</span>
                            </button>
                            <button class="profile-tab" data-tab="gallery">
                                <i class="material-icons">photo_library</i>
                                <span>${t('gallery') || 'Gallery'}</span>
                            </button>
                            <button class="profile-tab" data-tab="documents">
                                <i class="material-icons">description</i>
                                <span>${t('documents') || 'Documents'}</span>
                            </button>
                            <button class="profile-tab" data-tab="stories">
                                <i class="material-icons">auto_stories</i>
                                <span>${t('stories') || 'Stories'}</span>
                            </button>
                            <button class="profile-tab" data-tab="family">
                                <i class="material-icons">group</i>
                                <span>${t('family') || 'Family'}</span>
                            </button>
                        </div>
                        
                        <!-- Tab Content -->
                        <div class="profile-content">
                            <div class="profile-tab-content active" id="overview-tab"></div>
                            <div class="profile-tab-content" id="timeline-tab"></div>
                            <div class="profile-tab-content" id="gallery-tab"></div>
                            <div class="profile-tab-content" id="documents-tab"></div>
                            <div class="profile-tab-content" id="stories-tab"></div>
                            <div class="profile-tab-content" id="family-tab"></div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        },
        
        // Setup event listeners
        setupEventListeners() {
            const modal = document.getElementById('memberProfileModal');
            
            // Close button
            modal.querySelector('.profile-close').addEventListener('click', () => this.closeProfile());
            
            // Click outside to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeProfile();
            });
            
            // Tab navigation
            modal.querySelectorAll('.profile-tab').forEach(tab => {
                tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
            });
            
            // Edit profile button
            modal.querySelector('.edit-profile').addEventListener('click', () => {
                this.closeProfile();
                if (window.showAddMemberModal) {
                    window.showAddMemberModal(this.currentMember);
                }
            });
            
            // Share profile button
            modal.querySelector('.share-profile').addEventListener('click', () => this.shareProfile());
            
            // Print profile button
            modal.querySelector('.print-profile').addEventListener('click', () => this.printProfile());
            
            // Photo edit button
            modal.querySelector('.photo-edit-btn').addEventListener('click', () => this.editPhoto());
        },
        
        // View member profile
        async viewProfile(memberId) {
            if (!memberId) return;
            
            this.currentMemberId = memberId;
            
            // Show loading state
            this.showProfileLoading();
            
            try {
                // Get member data
                const member = window.familyMembers.find(m => m.id === memberId);
                if (!member) {
                    throw new Error('Member not found');
                }
                
                this.currentMember = member;
                
                // Populate profile data
                this.populateProfile(member);
                
                // Load default tab
                this.switchTab('overview');
                
                // Show modal
                document.getElementById('memberProfileModal').classList.add('active');
                
            } catch (error) {
                console.error('Error loading profile:', error);
                if (window.showError) {
                    window.showError('Failed to load member profile');
                }
                this.closeProfile();
            }
        },
        
        // Populate profile with member data
        populateProfile(member) {
            const modal = document.getElementById('memberProfileModal');
            
            // Header info
            modal.querySelector('.profile-name').textContent = `${member.firstName} ${member.lastName}`;
            
            // Dates
            const dates = [];
            if (member.birthDate) {
                const birthYear = new Date(member.birthDate).getFullYear();
                dates.push(`${t('born') || 'Born'} ${birthYear}`);
            }
            if (member.deathDate) {
                const deathYear = new Date(member.deathDate).getFullYear();
                dates.push(`${t('died') || 'Died'} ${deathYear}`);
            }
            modal.querySelector('.profile-dates').textContent = dates.join(' • ');
            
            // Photo
            const photoUrl = member.photoUrl || '/app/assets/images/default-avatar.png';
            modal.querySelector('.profile-photo').src = photoUrl;
            
            // Relationship
            if (member.relationship) {
                modal.querySelector('.profile-relationship').textContent = t(member.relationship) || member.relationship;
            }
        },
        
        // Switch between tabs
        switchTab(tabName) {
            // Update active tab
            document.querySelectorAll('.profile-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });
            
            // Update active content
            document.querySelectorAll('.profile-tab-content').forEach(content => {
                content.classList.toggle('active', content.id === `${tabName}-tab`);
            });
            
            // Load tab content
            this.loadTabContent(tabName);
        },
        
        // Load content for specific tab
        loadTabContent(tabName) {
            const container = document.getElementById(`${tabName}-tab`);
            
            switch (tabName) {
                case 'overview':
                    this.loadOverview(container);
                    break;
                case 'timeline':
                    this.loadTimeline(container);
                    break;
                case 'gallery':
                    this.loadGallery(container);
                    break;
                case 'documents':
                    this.loadDocuments(container);
                    break;
                case 'stories':
                    this.loadStories(container);
                    break;
                case 'family':
                    this.loadFamily(container);
                    break;
            }
        },
        
        // Load overview tab
        loadOverview(container) {
            const member = this.currentMember;
            
            container.innerHTML = `
                <div class="overview-grid">
                    <div class="overview-section">
                        <h3>${t('personalInfo') || 'Personal Information'}</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <label>${t('fullName') || 'Full Name'}</label>
                                <span>${member.firstName} ${member.lastName}</span>
                            </div>
                            ${member.gender ? `
                                <div class="info-item">
                                    <label>${t('gender') || 'Gender'}</label>
                                    <span>${t(member.gender) || member.gender}</span>
                                </div>
                            ` : ''}
                            ${member.birthDate ? `
                                <div class="info-item">
                                    <label>${t('birthDate') || 'Birth Date'}</label>
                                    <span>${this.formatDate(member.birthDate)}</span>
                                </div>
                            ` : ''}
                            ${member.deathDate ? `
                                <div class="info-item">
                                    <label>${t('deathDate') || 'Death Date'}</label>
                                    <span>${this.formatDate(member.deathDate)}</span>
                                </div>
                            ` : ''}
                            ${member.birthPlace ? `
                                <div class="info-item">
                                    <label>${t('birthPlace') || 'Birth Place'}</label>
                                    <span>${member.birthPlace}</span>
                                </div>
                            ` : ''}
                            ${member.email ? `
                                <div class="info-item">
                                    <label>${t('email') || 'Email'}</label>
                                    <span>${member.email}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${member.biography ? `
                        <div class="overview-section">
                            <h3>${t('biography') || 'Biography'}</h3>
                            <div class="biography-content">${member.biography}</div>
                        </div>
                    ` : ''}
                    
                    <div class="overview-section">
                        <h3>${t('quickStats') || 'Quick Stats'}</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <i class="material-icons">cake</i>
                                <span class="stat-value">${this.calculateAge(member)}</span>
                                <span class="stat-label">${t('age') || 'Age'}</span>
                            </div>
                            <div class="stat-item">
                                <i class="material-icons">photo</i>
                                <span class="stat-value">${member.photos?.length || 0}</span>
                                <span class="stat-label">${t('photos') || 'Photos'}</span>
                            </div>
                            <div class="stat-item">
                                <i class="material-icons">description</i>
                                <span class="stat-value">${member.documents?.length || 0}</span>
                                <span class="stat-label">${t('documents') || 'Documents'}</span>
                            </div>
                            <div class="stat-item">
                                <i class="material-icons">auto_stories</i>
                                <span class="stat-value">${member.stories?.length || 0}</span>
                                <span class="stat-label">${t('stories') || 'Stories'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        // Load timeline tab
        loadTimeline(container) {
            const member = this.currentMember;
            const events = this.getMemberEvents(member);
            
            if (events.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="material-icons">timeline</i>
                        <p>${t('noEventsYet') || 'No life events recorded yet'}</p>
                        <button class="btn btn-primary" onclick="pyebwaMemberProfile.addEvent()">
                            <i class="material-icons">add</i>
                            ${t('addEvent') || 'Add Event'}
                        </button>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="timeline-container">
                    <button class="btn btn-primary add-event-btn" onclick="pyebwaMemberProfile.addEvent()">
                        <i class="material-icons">add</i>
                        ${t('addEvent') || 'Add Event'}
                    </button>
                    <div class="timeline">
                        ${events.map(event => this.renderTimelineEvent(event)).join('')}
                    </div>
                </div>
            `;
        },
        
        // Get member life events
        getMemberEvents(member) {
            const events = [];
            
            // Birth event
            if (member.birthDate) {
                events.push({
                    type: 'birth',
                    date: member.birthDate,
                    title: t('born') || 'Born',
                    location: member.birthPlace,
                    icon: 'child_care'
                });
            }
            
            // Custom events
            if (member.events) {
                events.push(...member.events);
            }
            
            // Death event
            if (member.deathDate) {
                events.push({
                    type: 'death',
                    date: member.deathDate,
                    title: t('passedAway') || 'Passed Away',
                    location: member.deathPlace,
                    icon: 'sentiment_very_dissatisfied'
                });
            }
            
            // Sort by date
            return events.sort((a, b) => new Date(a.date) - new Date(b.date));
        },
        
        // Render timeline event
        renderTimelineEvent(event) {
            const date = new Date(event.date);
            const year = date.getFullYear();
            const dateStr = this.formatDate(event.date);
            
            return `
                <div class="timeline-event">
                    <div class="timeline-date">
                        <div class="timeline-year">${year}</div>
                        <div class="timeline-full-date">${dateStr}</div>
                    </div>
                    <div class="timeline-marker">
                        <i class="material-icons">${event.icon || 'event'}</i>
                    </div>
                    <div class="timeline-content">
                        <h4>${event.title}</h4>
                        ${event.description ? `<p>${event.description}</p>` : ''}
                        ${event.location ? `<p class="timeline-location"><i class="material-icons">place</i> ${event.location}</p>` : ''}
                    </div>
                </div>
            `;
        },
        
        // Load gallery tab
        loadGallery(container) {
            const member = this.currentMember;
            const photos = member.photos || [];
            
            if (photos.length === 0 && !member.photoUrl) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="material-icons">photo_library</i>
                        <p>${t('noPhotosYet') || 'No photos uploaded yet'}</p>
                        <button class="btn btn-primary" onclick="pyebwaMemberProfile.addPhoto()">
                            <i class="material-icons">add_a_photo</i>
                            ${t('addPhoto') || 'Add Photo'}
                        </button>
                    </div>
                `;
                return;
            }
            
            // Include main photo in gallery
            const allPhotos = member.photoUrl ? [{url: member.photoUrl, caption: 'Profile Photo', isMain: true}, ...photos] : photos;
            
            container.innerHTML = `
                <div class="gallery-container">
                    <div class="gallery-header">
                        <h3>${t('photoGallery') || 'Photo Gallery'}</h3>
                        <button class="btn btn-primary" onclick="pyebwaMemberProfile.addPhoto()">
                            <i class="material-icons">add_a_photo</i>
                            ${t('addPhoto') || 'Add Photo'}
                        </button>
                    </div>
                    <div class="photo-gallery">
                        ${allPhotos.map((photo, index) => `
                            <div class="gallery-item" onclick="pyebwaMemberProfile.viewPhoto(${index})">
                                <img src="${photo.url}" alt="${photo.caption || ''}">
                                ${photo.isMain ? '<span class="photo-badge">Main</span>' : ''}
                                ${photo.caption ? `<div class="photo-caption">${photo.caption}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        },
        
        // Load documents tab
        loadDocuments(container) {
            const member = this.currentMember;
            const documents = member.documents || [];
            
            if (documents.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="material-icons">description</i>
                        <p>${t('noDocumentsYet') || 'No documents uploaded yet'}</p>
                        <button class="btn btn-primary" onclick="pyebwaMemberProfile.addDocument()">
                            <i class="material-icons">upload_file</i>
                            ${t('uploadDocument') || 'Upload Document'}
                        </button>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="documents-container">
                    <div class="documents-header">
                        <h3>${t('documents') || 'Documents'}</h3>
                        <button class="btn btn-primary" onclick="pyebwaMemberProfile.addDocument()">
                            <i class="material-icons">upload_file</i>
                            ${t('uploadDocument') || 'Upload Document'}
                        </button>
                    </div>
                    <div class="documents-list">
                        ${documents.map(doc => this.renderDocument(doc)).join('')}
                    </div>
                </div>
            `;
        },
        
        // Render document item
        renderDocument(doc) {
            const icon = this.getDocumentIcon(doc.type);
            const size = this.formatFileSize(doc.size);
            
            return `
                <div class="document-item">
                    <div class="document-icon">
                        <i class="material-icons">${icon}</i>
                    </div>
                    <div class="document-info">
                        <h4>${doc.name}</h4>
                        <p>${doc.type} • ${size} • ${this.formatDate(doc.uploadDate)}</p>
                    </div>
                    <div class="document-actions">
                        <button class="btn-icon" onclick="pyebwaMemberProfile.viewDocument('${doc.id}')" title="View">
                            <i class="material-icons">visibility</i>
                        </button>
                        <button class="btn-icon" onclick="pyebwaMemberProfile.downloadDocument('${doc.id}')" title="Download">
                            <i class="material-icons">download</i>
                        </button>
                    </div>
                </div>
            `;
        },
        
        // Load stories tab
        loadStories(container) {
            const member = this.currentMember;
            const stories = member.stories || [];
            
            if (stories.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="material-icons">auto_stories</i>
                        <p>${t('noStoriesYet') || 'No stories recorded yet'}</p>
                        <button class="btn btn-primary" onclick="pyebwaMemberProfile.addStory()">
                            <i class="material-icons">add</i>
                            ${t('addStory') || 'Add Story'}
                        </button>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="stories-container">
                    <div class="stories-header">
                        <h3>${t('lifeStories') || 'Life Stories'}</h3>
                        <button class="btn btn-primary" onclick="pyebwaMemberProfile.addStory()">
                            <i class="material-icons">add</i>
                            ${t('addStory') || 'Add Story'}
                        </button>
                    </div>
                    <div class="stories-list">
                        ${stories.map(story => this.renderStory(story)).join('')}
                    </div>
                </div>
            `;
        },
        
        // Render story item
        renderStory(story) {
            return `
                <div class="story-item">
                    <div class="story-header">
                        <h4>${story.title}</h4>
                        <span class="story-date">${this.formatDate(story.date)}</span>
                    </div>
                    <div class="story-content">${story.content}</div>
                    ${story.audioUrl ? `
                        <audio controls class="story-audio">
                            <source src="${story.audioUrl}" type="audio/mpeg">
                        </audio>
                    ` : ''}
                </div>
            `;
        },
        
        // Load family tab
        loadFamily(container) {
            const member = this.currentMember;
            const family = this.getMemberFamily(member);
            
            container.innerHTML = `
                <div class="family-container">
                    ${family.parents.length > 0 ? `
                        <div class="family-section">
                            <h3>${t('parents') || 'Parents'}</h3>
                            <div class="family-grid">
                                ${family.parents.map(p => this.renderFamilyMember(p)).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${family.spouses.length > 0 ? `
                        <div class="family-section">
                            <h3>${t('spouses') || 'Spouses'}</h3>
                            <div class="family-grid">
                                ${family.spouses.map(s => this.renderFamilyMember(s)).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${family.children.length > 0 ? `
                        <div class="family-section">
                            <h3>${t('children') || 'Children'}</h3>
                            <div class="family-grid">
                                ${family.children.map(c => this.renderFamilyMember(c)).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${family.siblings.length > 0 ? `
                        <div class="family-section">
                            <h3>${t('siblings') || 'Siblings'}</h3>
                            <div class="family-grid">
                                ${family.siblings.map(s => this.renderFamilyMember(s)).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        },
        
        // Get member's family relationships
        getMemberFamily(member) {
            const family = {
                parents: [],
                spouses: [],
                children: [],
                siblings: []
            };
            
            window.familyMembers.forEach(m => {
                if (m.id === member.id) return;
                
                // Direct relationships
                if (member.relationship === 'child' && member.relatedTo === m.id) {
                    family.parents.push(m);
                } else if (member.relationship === 'parent' && member.relatedTo === m.id) {
                    family.children.push(m);
                } else if (member.relationship === 'spouse' && member.relatedTo === m.id) {
                    family.spouses.push(m);
                } else if (member.relationship === 'sibling' && member.relatedTo === m.id) {
                    family.siblings.push(m);
                }
                
                // Reverse relationships
                if (m.relationship === 'parent' && m.relatedTo === member.id) {
                    family.parents.push(m);
                } else if (m.relationship === 'child' && m.relatedTo === member.id) {
                    family.children.push(m);
                } else if (m.relationship === 'spouse' && m.relatedTo === member.id) {
                    family.spouses.push(m);
                } else if (m.relationship === 'sibling' && m.relatedTo === member.id) {
                    family.siblings.push(m);
                }
            });
            
            return family;
        },
        
        // Render family member card
        renderFamilyMember(member) {
            const age = this.calculateAge(member);
            const photoUrl = member.photoUrl || '/app/assets/images/default-avatar.png';
            
            return `
                <div class="family-member-card" onclick="pyebwaMemberProfile.viewProfile('${member.id}')">
                    <img src="${photoUrl}" alt="${member.firstName}">
                    <h4>${member.firstName} ${member.lastName}</h4>
                    ${age ? `<p>${age} ${t('yearsOld') || 'years old'}</p>` : ''}
                </div>
            `;
        },
        
        // Helper functions
        formatDate(dateStr) {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString(currentLanguage || 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },
        
        calculateAge(member) {
            if (!member.birthDate) return null;
            const birth = new Date(member.birthDate);
            const death = member.deathDate ? new Date(member.deathDate) : new Date();
            const age = death.getFullYear() - birth.getFullYear();
            return age;
        },
        
        formatFileSize(bytes) {
            if (!bytes) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },
        
        getDocumentIcon(type) {
            const icons = {
                'pdf': 'picture_as_pdf',
                'image': 'image',
                'document': 'description',
                'certificate': 'verified',
                'default': 'insert_drive_file'
            };
            return icons[type] || icons.default;
        },
        
        // Show loading state
        showProfileLoading() {
            const modal = document.getElementById('memberProfileModal');
            modal.classList.add('active');
            modal.querySelector('.profile-container').innerHTML = `
                <div class="profile-loading">
                    <div class="spinner"></div>
                    <p>${t('loadingProfile') || 'Loading profile...'}</p>
                </div>
            `;
        },
        
        // Close profile
        closeProfile() {
            document.getElementById('memberProfileModal').classList.remove('active');
            this.currentMember = null;
            this.currentMemberId = null;
        },
        
        // Share profile
        shareProfile() {
            if (window.navigator.share && this.currentMember) {
                window.navigator.share({
                    title: `${this.currentMember.firstName} ${this.currentMember.lastName}`,
                    text: `View ${this.currentMember.firstName}'s family profile`,
                    url: window.location.href
                });
            } else {
                // Fallback - copy link
                navigator.clipboard.writeText(window.location.href);
                if (window.showSuccess) {
                    window.showSuccess('Profile link copied to clipboard!');
                }
            }
        },
        
        // Print profile
        printProfile() {
            window.print();
        },
        
        // Add event placeholder
        addEvent() {
            if (window.showSuccess) {
                window.showSuccess('Event editor coming soon!');
            }
        },
        
        // Add photo placeholder
        addPhoto() {
            if (window.showSuccess) {
                window.showSuccess('Photo upload coming soon!');
            }
        },
        
        // Edit photo placeholder
        editPhoto() {
            if (window.showSuccess) {
                window.showSuccess('Photo editor coming soon!');
            }
        },
        
        // Add document placeholder
        addDocument() {
            if (window.showSuccess) {
                window.showSuccess('Document upload coming soon!');
            }
        },
        
        // Add story placeholder
        addStory() {
            if (window.showSuccess) {
                window.showSuccess('Story editor coming soon!');
            }
        },
        
        // View photo in lightbox
        viewPhoto(index) {
            if (window.showSuccess) {
                window.showSuccess('Photo viewer coming soon!');
            }
        },
        
        // View document
        viewDocument(docId) {
            if (window.showSuccess) {
                window.showSuccess('Document viewer coming soon!');
            }
        },
        
        // Download document
        downloadDocument(docId) {
            if (window.showSuccess) {
                window.showSuccess('Document download coming soon!');
            }
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => MemberProfile.init());
    } else {
        MemberProfile.init();
    }
    
    // Export for use
    window.pyebwaMemberProfile = MemberProfile;
    window.viewMemberProfile = (memberId) => MemberProfile.viewProfile(memberId);
})();