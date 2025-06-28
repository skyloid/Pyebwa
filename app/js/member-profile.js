// Enhanced Member Profile System for Pyebwa Family Tree
(function() {
    'use strict';
    
    // Load social media scripts if not already loaded
    if (!window.socialConnect) {
        const socialConnectScript = document.createElement('script');
        socialConnectScript.src = '/app/js/social-connect.js';
        document.head.appendChild(socialConnectScript);
    }
    
    const MemberProfile = {
        // Current member being viewed
        currentMember: null,
        currentMemberId: null,
        
        // Initialize profile system
        init() {
            this.createProfileModal();
            this.setupEventListeners();
            this.isInitialized = true;
        },
        
        // Get modal content HTML
        getModalContent() {
            return `
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
                                    <img class="profile-photo" src="/app/images/default-avatar.svg" alt="">
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
                                    <button class="btn-icon invite-member" title="${t('inviteMember') || 'Invite to claim profile'}">
                                        <i class="material-icons">person_add</i>
                                    </button>
                                    <button class="btn-icon privacy-settings" title="${t('documentPrivacy') || 'Document Privacy'}">
                                        <i class="material-icons">lock</i>
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
                            <button class="profile-tab" data-tab="videos">
                                <i class="material-icons">videocam</i>
                                <span>${t('videos') || 'Videos'}</span>
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
                            <div class="profile-tab-content" id="videos-tab"></div>
                            <div class="profile-tab-content" id="family-tab"></div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        // Create profile modal structure
        createProfileModal() {
            const modal = document.createElement('div');
            modal.id = 'memberProfileModal';
            modal.className = 'profile-modal';
            modal.innerHTML = this.getModalContent();
            
            document.body.appendChild(modal);
        },
        
        // Remove event listeners to prevent duplicates
        removeEventListeners() {
            const modal = document.getElementById('memberProfileModal');
            if (this.editClickHandler) {
                const editBtn = modal.querySelector('.edit-profile');
                if (editBtn) {
                    editBtn.removeEventListener('click', this.editClickHandler);
                }
            }
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
            
            // Edit profile button - store handler for removal
            this.editClickHandler = () => {
                // Store member data in a temporary global variable to ensure it's not lost
                window._tempEditMember = this.currentMember;
                
                this.closeProfile();
                
                // Small delay to ensure modal is closed before opening edit modal
                setTimeout(() => {
                    if (window.showAddMemberModal && window._tempEditMember) {
                        window.showAddMemberModal(window._tempEditMember);
                        // Clean up
                        delete window._tempEditMember;
                    }
                }, 100);
            };
            
            const editBtn = modal.querySelector('.edit-profile');
            if (editBtn) {
                editBtn.addEventListener('click', this.editClickHandler);
            }
            
            // Invite member button
            modal.querySelector('.invite-member').addEventListener('click', () => this.inviteMember());
            
            // Privacy settings button
            modal.querySelector('.privacy-settings').addEventListener('click', () => this.showPrivacySettings());
            
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
            
            try {
                // Get member data
                const member = window.familyMembers.find(m => m.id === memberId);
                if (!member) {
                    throw new Error('Member not found');
                }
                
                this.currentMember = member;
                this.currentTreeId = member.treeId || window.currentFamilyTreeId || window.userFamilyTreeId;
                
                // Show modal first
                const modal = document.getElementById('memberProfileModal');
                modal.classList.add('active');
                
                // Reset modal content if it was replaced by loading state
                if (!modal.querySelector('.profile-container')) {
                    // Recreate the modal content
                    modal.innerHTML = this.getModalContent();
                    // Re-setup event listeners (remove old ones first)
                    this.removeEventListeners();
                    this.setupEventListeners();
                }
                
                // Populate profile data
                this.populateProfile(member);
                
                // Load default tab
                this.switchTab('overview');
                
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
            const photoUrl = member.photoUrl || '/app/images/default-avatar.svg';
            modal.querySelector('.profile-photo').src = photoUrl;
            
            // Relationship
            if (member.relationship) {
                modal.querySelector('.profile-relationship').textContent = t(member.relationship) || member.relationship;
            }
            
            // Show/hide invite button based on whether profile is claimed
            const inviteBtn = modal.querySelector('.invite-member');
            if (inviteBtn) {
                if (member.userId) {
                    // Profile is claimed - hide invite button and show claimed indicator
                    inviteBtn.style.display = 'none';
                    
                    // Add claimed indicator if not already present
                    if (!modal.querySelector('.profile-claimed-indicator')) {
                        const claimedIndicator = document.createElement('div');
                        claimedIndicator.className = 'profile-claimed-indicator';
                        claimedIndicator.innerHTML = `
                            <i class="material-icons">verified_user</i>
                            <span>${t('profileClaimed') || 'Profile claimed'}</span>
                        `;
                        modal.querySelector('.profile-info').appendChild(claimedIndicator);
                    }
                } else {
                    // Profile not claimed - show invite button
                    inviteBtn.style.display = '';
                    
                    // Remove claimed indicator if present
                    const claimedIndicator = modal.querySelector('.profile-claimed-indicator');
                    if (claimedIndicator) {
                        claimedIndicator.remove();
                    }
                }
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
                case 'videos':
                    this.loadVideos(container);
                    break;
                case 'family':
                    this.loadFamily(container);
                    break;
            }
        },
        
        // Load overview tab
        async loadOverview(container) {
            const member = this.currentMember;
            
            container.innerHTML = `
                <div class="content-section">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="material-icons">person</i>
                            ${t('personalInfo') || 'Personal Information'}
                        </h3>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">${t('fullName') || 'Full Name'}</div>
                            <div class="info-value">${member.firstName} ${member.lastName}</div>
                        </div>
                        ${member.gender ? `
                            <div class="info-item">
                                <div class="info-label">${t('gender') || 'Gender'}</div>
                                <div class="info-value">${t(member.gender) || member.gender}</div>
                            </div>
                        ` : ''}
                        ${member.birthDate ? `
                            <div class="info-item">
                                <div class="info-label">${t('birthDate') || 'Birth Date'}</div>
                                <div class="info-value">${this.formatDate(member.birthDate)}</div>
                            </div>
                        ` : ''}
                        ${member.deathDate ? `
                            <div class="info-item">
                                <div class="info-label">${t('deathDate') || 'Death Date'}</div>
                                <div class="info-value">${this.formatDate(member.deathDate)}</div>
                            </div>
                        ` : ''}
                        ${member.birthPlace ? `
                            <div class="info-item">
                                <div class="info-label">${t('birthPlace') || 'Birth Place'}</div>
                                <div class="info-value">${member.birthPlace}</div>
                            </div>
                        ` : ''}
                        ${member.email ? `
                            <div class="info-item">
                                <div class="info-label">${t('email') || 'Email'}</div>
                                <div class="info-value">${member.email}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${member.biography ? `
                    <div class="content-section">
                        <div class="section-header">
                            <h3 class="section-title">
                                <i class="material-icons">book</i>
                                ${t('biography') || 'Biography'}
                            </h3>
                        </div>
                        <div class="biography-section">
                            <div class="biography-text">${member.biography}</div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="content-section">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="material-icons">analytics</i>
                            ${t('quickStats') || 'Quick Stats'}
                        </h3>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">${t('age') || 'Age'}</div>
                            <div class="info-value">${this.calculateAge(member)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">${t('photos') || 'Photos'}</div>
                            <div class="info-value">${member.photos?.length || 0}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">${t('documents') || 'Documents'}</div>
                            <div class="info-value">${member.documents?.length || 0}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">${t('stories') || 'Stories'}</div>
                            <div class="info-value">${member.stories?.length || 0}</div>
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
                        <h3>${t('noTimelineEvents') || 'No Timeline Events'}</h3>
                        <p>${t('noEventsYet') || 'No life events recorded yet'}</p>
                        <div class="empty-state-action">
                            <button class="btn" onclick="pyebwaMemberProfile.addEvent()">
                                <i class="material-icons">add</i>
                                ${t('addEvent') || 'Add Event'}
                            </button>
                        </div>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="content-section">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="material-icons">timeline</i>
                            ${t('lifeEvents') || 'Life Events'}
                        </h3>
                        <div class="section-action">
                            <button class="btn btn-primary" onclick="pyebwaMemberProfile.addEvent()">
                                <i class="material-icons">add</i>
                                ${t('addEvent') || 'Add Event'}
                            </button>
                        </div>
                    </div>
                    <div class="timeline-container">
                        <div class="timeline-line"></div>
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
            const canEdit = event.type !== 'birth' && event.type !== 'death';
            
            return `
                <div class="timeline-item" data-event-id="${event.id || ''}">
                    <div class="timeline-marker">
                        <i class="material-icons">${event.icon || 'event'}</i>
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <h4>${event.title}</h4>
                            ${canEdit && event.id ? `
                                <div class="timeline-actions">
                                    <button class="btn-icon btn-small" onclick="pyebwaMemberProfile.editEvent('${event.id}')" title="${t('edit') || 'Edit'}">
                                        <i class="material-icons">edit</i>
                                    </button>
                                    <button class="btn-icon btn-small" onclick="pyebwaMemberProfile.deleteEvent('${event.id}')" title="${t('delete') || 'Delete'}">
                                        <i class="material-icons">delete</i>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                        <div class="timeline-date">${dateStr}</div>
                        ${event.description ? `<p class="timeline-description">${event.description}</p>` : ''}
                        ${event.location ? `<p class="timeline-location"><i class="material-icons">place</i> ${event.location}</p>` : ''}
                    </div>
                </div>
            `;
        },
        
        // Edit event
        editEvent(eventId) {
            const event = this.currentMember.events?.find(e => e.id === eventId);
            if (event) {
                this.showEventModal(event);
            }
        },
        
        // Delete event
        async deleteEvent(eventId) {
            if (!confirm(t('confirmDeleteEvent') || 'Are you sure you want to delete this event?')) {
                return;
            }
            
            try {
                const events = this.currentMember.events?.filter(e => e.id !== eventId) || [];
                this.currentMember.events = events;
                
                await window.updateFamilyMember(this.currentMember.id, {
                    events: events
                });
                
                // Refresh timeline
                const timelineContainer = document.getElementById('timeline-tab');
                this.loadTimeline(timelineContainer);
                
                if (window.showSuccess) {
                    window.showSuccess(t('eventDeleted') || 'Event deleted successfully');
                }
            } catch (error) {
                console.error('Error deleting event:', error);
                if (window.showError) {
                    window.showError(t('errorDeletingEvent') || 'Error deleting event');
                }
            }
        },
        
        // Load gallery tab
        loadGallery(container) {
            const member = this.currentMember;
            const photos = member.photos || [];
            
            console.log('Loading gallery for member:', member.id);
            console.log('Member photos count:', photos.length);
            console.log('Has profile photo:', !!member.photoUrl);
            
            // Debug: Check if delete buttons are rendered
            setTimeout(() => {
                const deleteButtons = container.querySelectorAll('.photo-delete-btn');
                console.log('Delete buttons found in gallery:', deleteButtons.length);
                deleteButtons.forEach((btn, index) => {
                    console.log(`Delete button ${index}:`, {
                        visible: window.getComputedStyle(btn).opacity,
                        display: window.getComputedStyle(btn).display,
                        zIndex: window.getComputedStyle(btn).zIndex
                    });
                });
            }, 100);
            
            // Check if user can view photos
            const canView = window.canViewField || (() => true);
            if (!canView(member, 'photos')) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="material-icons">lock</i>
                        <h3>${t('photosPrivate') || 'Photos are Private'}</h3>
                        <p>${t('photosPrivateMessage') || 'You do not have permission to view these photos'}</p>
                    </div>
                `;
                return;
            }
            
            if (photos.length === 0 && !member.photoUrl) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="material-icons">photo_library</i>
                        <h3>${t('noPhotosTitle') || 'No Photos Yet'}</h3>
                        <p>${t('noPhotosYet') || 'No photos uploaded yet'}</p>
                        <div class="empty-state-action">
                            <button class="btn" onclick="pyebwaMemberProfile.addPhoto()">
                                <i class="material-icons">add_a_photo</i>
                                ${t('addPhoto') || 'Add Photo'}
                            </button>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Include main photo in gallery
            const allPhotos = member.photoUrl ? [{url: member.photoUrl, caption: 'Profile Photo', isMain: true}, ...photos] : photos;
            
            console.log('All photos for display:', allPhotos.length);
            console.log('Photos array:', allPhotos);
            
            container.innerHTML = `
                <div class="content-section">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="material-icons">photo_library</i>
                            ${t('photoGallery') || 'Photo Gallery'}
                        </h3>
                        <div class="section-action">
                            ${allPhotos.length > 0 ? `
                                <button class="btn btn-secondary" onclick="pyebwaMemberProfile.startSlideshow()">
                                    <i class="material-icons">play_arrow</i>
                                    ${t('slideshow') || 'Slideshow'}
                                </button>
                            ` : ''}
                            <button class="btn btn-primary" onclick="pyebwaMemberProfile.addPhoto()">
                                <i class="material-icons">add_a_photo</i>
                                ${t('addPhoto') || 'Add Photo'}
                            </button>
                        </div>
                    </div>
                    <div class="photo-gallery">
                        ${allPhotos.map((photo, index) => {
                            // Calculate the actual index in the photos array (excluding main photo)
                            const actualIndex = photo.isMain ? -1 : (member.photoUrl ? index - 1 : index);
                            return `
                                <div class="gallery-item" onclick="pyebwaMemberProfile.viewPhoto(${index})">
                                    <img src="${photo.url}" alt="${photo.caption || ''}">
                                    ${photo.isMain ? '<span class="photo-badge">Main</span>' : ''}
                                    ${photo.caption ? `<div class="photo-caption">${photo.caption}</div>` : ''}
                                    ${!photo.isMain ? `
                                        <button class="photo-delete-btn" onclick="event.stopPropagation(); pyebwaMemberProfile.deletePhoto(${actualIndex})" title="${t('deletePhoto') || 'Delete photo'}">
                                            <i class="material-icons">delete</i>
                                        </button>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
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
            const size = this.formatFileSize(doc.fileSize);
            
            return `
                <div class="document-item">
                    <div class="document-icon">
                        <i class="material-icons">${icon}</i>
                    </div>
                    <div class="document-info">
                        <h4>${doc.title}</h4>
                        <p>${this.getDocumentTypeName(doc.type)} • ${size} • ${this.formatDate(doc.uploadedAt)}</p>
                        ${doc.notes ? `<p class="document-notes">${doc.notes}</p>` : ''}
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
            const personalStories = member.stories || [];
            const relatedStories = member.relatedStories || [];
            
            // Combine personal and related stories
            const allStories = [...personalStories];
            
            // Add related stories with additional info
            relatedStories.forEach(relatedStory => {
                // Find the full story from the author's data
                const author = window.familyMembers.find(m => m.id === relatedStory.authorId);
                if (author && author.stories) {
                    const fullStory = author.stories.find(s => s.id === relatedStory.id);
                    if (fullStory) {
                        allStories.push({
                            ...fullStory,
                            isRelated: true,
                            authorName: relatedStory.authorName
                        });
                    }
                }
            });
            
            if (allStories.length === 0) {
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
            
            // Sort stories by date (newest first)
            allStories.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            
            container.innerHTML = `
                <div class="stories-container">
                    <div class="stories-header">
                        <h3>${t('lifeStories') || 'Life Stories'}</h3>
                        <button class="btn btn-primary" onclick="pyebwaMemberProfile.addStory()">
                            <i class="material-icons">add</i>
                            ${t('addStory') || 'Add Story'}
                        </button>
                    </div>
                    ${personalStories.length > 0 ? `
                        <div class="stories-section">
                            <h4>${t('personalStories') || 'Personal Stories'}</h4>
                            <div class="stories-list">
                                ${personalStories.map(story => this.renderStory(story)).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${relatedStories.length > 0 ? `
                        <div class="stories-section">
                            <h4>${t('relationshipStories') || 'Relationship Stories'}</h4>
                            <div class="stories-list">
                                ${allStories.filter(s => s.isRelated).map(story => this.renderStory(story)).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        },
        
        // Render story item
        renderStory(story) {
            const preview = story.content.length > 200 ? story.content.substring(0, 200) + '...' : story.content;
            const isOwner = !story.isRelated;
            
            return `
                <div class="story-card ${story.storyType === 'relationship' ? 'relationship-story' : ''}" data-story-id="${story.id}">
                    <div class="story-header">
                        <h4>${story.title}</h4>
                        <div class="story-actions">
                            <button class="btn-icon" onclick="pyebwaMemberProfile.viewStory('${story.id}')" title="View">
                                <i class="material-icons">visibility</i>
                            </button>
                            ${isOwner ? `
                                <button class="btn-icon" onclick="pyebwaMemberProfile.editStory('${story.id}')" title="Edit">
                                    <i class="material-icons">edit</i>
                                </button>
                                <button class="btn-icon" onclick="pyebwaMemberProfile.deleteStory('${story.id}')" title="Delete">
                                    <i class="material-icons">delete</i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="story-meta">
                        <i class="material-icons">calendar_today</i>
                        <span>${this.formatDate(story.date)}</span>
                        ${story.isRelated ? `
                            <i class="material-icons">person</i>
                            <span>${t('by') || 'By'} ${story.authorName}</span>
                        ` : ''}
                        ${story.storyType === 'relationship' ? `
                            <i class="material-icons">people</i>
                            <span>${t('relationshipStory') || 'Relationship Story'}</span>
                        ` : ''}
                        ${story.audioUrl ? `
                            <i class="material-icons">mic</i>
                            <span>${t('audioRecording') || 'Audio Recording'}</span>
                        ` : ''}
                    </div>
                    <p class="story-content">${preview.replace(/\n/g, '<br>')}</p>
                    ${story.relatedMembers && story.relatedMembers.length > 0 ? `
                        <div class="related-members-info">
                            <i class="material-icons">group</i>
                            <span>${t('involving') || 'Involving'}: ${this.getRelatedMemberNames(story.relatedMembers).join(', ')}</span>
                        </div>
                    ` : ''}
                    ${story.tags?.length > 0 ? `
                        <div class="story-tags">
                            ${story.tags.map(tag => `<span class="story-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        },
        
        // Get related member names
        getRelatedMemberNames(memberIds) {
            return memberIds.map(id => {
                const member = window.familyMembers.find(m => m.id === id);
                return member ? `${member.firstName} ${member.lastName}` : '';
            }).filter(name => name);
        },
        
        // Edit story
        editStory(storyId) {
            const story = this.currentMember.stories?.find(s => s.id === storyId);
            if (story) {
                this.showStoryModal(story);
            }
        },
        
        // Delete story
        async deleteStory(storyId) {
            if (!confirm(t('confirmDeleteStory') || 'Are you sure you want to delete this story?')) {
                return;
            }
            
            try {
                const stories = this.currentMember.stories?.filter(s => s.id !== storyId) || [];
                this.currentMember.stories = stories;
                
                await window.updateFamilyMember(this.currentMember.id, {
                    stories: stories
                });
                
                // Refresh stories tab
                const storiesContainer = document.getElementById('stories-tab');
                this.loadStories(storiesContainer);
                
                if (window.showSuccess) {
                    window.showSuccess(t('storyDeleted') || 'Story deleted successfully');
                }
            } catch (error) {
                console.error('Error deleting story:', error);
                if (window.showError) {
                    window.showError(t('errorDeletingStory') || 'Error deleting story');
                }
            }
        },
        
        // Load videos tab
        loadVideos(container) {
            const member = this.currentMember;
            const videos = member.videoMessages || [];
            
            if (videos.length === 0) {
                container.innerHTML = `
                    <div class="videos-container">
                        <div class="videos-empty">
                            <i class="material-icons">videocam_off</i>
                            <h3>${t('noVideosYet') || 'No video messages yet'}</h3>
                            <p>${t('recordFirstVideo') || 'Record a video message to share with your family'}</p>
                            <button class="btn btn-primary" onclick="pyebwaVideoMessages.showVideoMessageModal()">
                                <i class="material-icons">videocam</i>
                                ${t('recordVideoMessage') || 'Record Video Message'}
                            </button>
                        </div>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="videos-container">
                    <div class="videos-header">
                        <h3>${t('videoMessages') || 'Video Messages'} (${videos.length})</h3>
                        <button class="btn btn-primary" onclick="pyebwaVideoMessages.showVideoMessageModal()">
                            <i class="material-icons">videocam</i>
                            ${t('recordNew') || 'Record New'}
                        </button>
                    </div>
                    
                    <div class="videos-grid">
                        ${videos.map(video => this.renderVideoCard(video)).join('')}
                    </div>
                </div>
            `;
        },
        
        // Render video card
        renderVideoCard(video) {
            const privacyIcons = {
                'family': 'group',
                'spouse_children': 'family_restroom',
                'private': 'lock'
            };
            
            return `
                <div class="video-card" onclick="pyebwaVideoMessages.viewVideoMessage('${video.id}')">
                    <div class="video-thumbnail">
                        <div class="play-icon">
                            <i class="material-icons">play_arrow</i>
                        </div>
                        <span class="video-duration">${this.formatDuration(video.duration || 0)}</span>
                        <div class="video-actions">
                            <button onclick="event.stopPropagation(); pyebwaVideoMessages.deleteVideoMessage('${video.id}')" title="${t('deleteVideo') || 'Delete video'}">
                                <i class="material-icons">delete</i>
                            </button>
                        </div>
                    </div>
                    <div class="video-card-content">
                        <h4>${video.title}</h4>
                        ${video.description ? `<p>${video.description}</p>` : ''}
                        <div class="video-meta">
                            <span><i class="material-icons">person</i> ${video.recordedByName || 'Unknown'}</span>
                            <span><i class="material-icons">calendar_today</i> ${this.formatDate(video.recordedAt)}</span>
                            ${video.privacy ? `
                                <span class="privacy-badge">
                                    <i class="material-icons">${privacyIcons[video.privacy] || 'lock'}</i>
                                    ${t(video.privacy) || video.privacy}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        },
        
        // Format duration helper
        formatDuration(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            const photoUrl = member.photoUrl || '/app/images/default-avatar.svg';
            
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
                'birth_certificate': 'child_care',
                'death_certificate': 'sentiment_very_dissatisfied',
                'marriage_certificate': 'favorite',
                'passport': 'flight_takeoff',
                'diploma': 'school',
                'letter': 'mail',
                'newspaper': 'newspaper',
                'legal': 'gavel',
                'medical': 'local_hospital',
                'other': 'description'
            };
            return icons[type] || 'insert_drive_file';
        },
        
        getDocumentTypeName(type) {
            const names = {
                'birth_certificate': 'Birth Certificate',
                'death_certificate': 'Death Certificate',
                'marriage_certificate': 'Marriage Certificate',
                'passport': 'Passport',
                'diploma': 'Diploma/Degree',
                'letter': 'Letter',
                'newspaper': 'Newspaper Clipping',
                'legal': 'Legal Document',
                'medical': 'Medical Record',
                'other': 'Other Document'
            };
            return t(type) || names[type] || 'Document';
        },
        
        // Get relation icon
        getRelationIcon(relation) {
            const icons = {
                'parents': 'escalator_warning',
                'children': 'child_care',
                'spouses': 'favorite',
                'siblings': 'group',
                'grandparents': 'elderly',
                'grandchildren': 'child_friendly'
            };
            return icons[relation] || 'people';
        },
        
        // Get relation title
        getRelationTitle(relation) {
            const titles = {
                'parents': t('parents') || 'Parents',
                'children': t('children') || 'Children',
                'spouses': t('spouses') || 'Spouses',
                'siblings': t('siblings') || 'Siblings',
                'grandparents': t('grandparents') || 'Grandparents',
                'grandchildren': t('grandchildren') || 'Grandchildren'
            };
            return titles[relation] || relation;
        },
        
        // Group family by relation
        groupFamilyByRelation(familyMembers) {
            const grouped = {};
            
            familyMembers.forEach(member => {
                const relation = member.relationType || 'other';
                if (!grouped[relation]) {
                    grouped[relation] = [];
                }
                grouped[relation].push(member);
            });
            
            return grouped;
        },
        
        // Get family members
        getFamilyMembers(member) {
            // This would typically fetch from the database
            // For now, return empty array or mock data
            return [];
        },
        
        // View story
        viewStory(storyId) {
            const story = this.currentMember.stories?.find(s => s.id === storyId);
            if (story) {
                // Create a modal to view the full story
                const modal = document.createElement('div');
                modal.className = 'story-view-modal';
                modal.innerHTML = `
                    <div class="story-view-content">
                        <button class="close-modal" onclick="this.closest('.story-view-modal').remove()">
                            <i class="material-icons">close</i>
                        </button>
                        <h2>${story.title}</h2>
                        <div class="story-date">${this.formatDate(story.date)}</div>
                        <div class="story-full-content">${story.content.replace(/\n/g, '<br>')}</div>
                        ${story.audioUrl ? `
                            <audio controls class="story-audio">
                                <source src="${story.audioUrl}" type="audio/mpeg">
                            </audio>
                        ` : ''}
                        ${story.tags?.length > 0 ? `
                            <div class="story-tags">
                                ${story.tags.map(tag => `<span class="story-tag">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
                document.body.appendChild(modal);
            }
        },
        
        // Get privacy indicator
        getPrivacyIndicator(member, field) {
            if (!member.privacy || !member.privacy[field]) {
                return '';
            }
            
            const privacy = member.privacy[field];
            const icons = {
                private: 'lock',
                family: 'group',
                public: 'public'
            };
            
            return `<span class="privacy-indicator ${privacy}">
                <i class="material-icons">${icons[privacy]}</i>
            </span>`;
        },
        
        // Show loading state
        showProfileLoading() {
            const modal = document.getElementById('memberProfileModal');
            modal.classList.add('active');
            const container = modal.querySelector('.profile-container');
            if (container) {
                container.innerHTML = `
                    <div class="profile-loading">
                        <div class="spinner"></div>
                        <p>${t('loadingProfile') || 'Loading profile...'}</p>
                    </div>
                `;
            }
        },
        
        // Close profile
        closeProfile() {
            document.getElementById('memberProfileModal').classList.remove('active');
            this.currentMember = null;
            this.currentMemberId = null;
        },
        
        // Share profile
        shareProfile() {
            // Use the new share card feature
            if (window.ShareCard && this.currentMember) {
                window.ShareCard.openShareModal(this.currentMember);
            } else if (window.navigator.share && this.currentMember) {
                // Fallback to native share
                window.navigator.share({
                    title: `${this.currentMember.firstName} ${this.currentMember.lastName}`,
                    text: `View ${this.currentMember.firstName}'s family profile`,
                    url: window.location.href
                });
            } else {
                // Final fallback - copy link
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
        
        // Invite member to claim profile
        async inviteMember() {
            if (!this.currentMember) return;
            
            try {
                // Check if member already has a linked user account
                if (this.currentMember.userId) {
                    if (window.showInfo) {
                        window.showInfo(t('memberAlreadyClaimed') || 'This profile has already been claimed by a user');
                    }
                    return;
                }
                
                // Show loading
                if (window.showLoading) {
                    window.showLoading(t('generatingInvite') || 'Generating invite link...');
                }
                
                // Get current user
                const user = firebase.auth().currentUser;
                if (!user) {
                    throw new Error('User not authenticated');
                }
                
                // Get family tree ID from stored value
                let treeId = this.currentTreeId;
                
                // Add debug logging
                console.log('Invite generation - Tree ID sources:');
                console.log('- this.currentTreeId:', this.currentTreeId);
                console.log('- member.treeId:', this.currentMember.treeId);
                console.log('- window.currentFamilyTreeId:', window.currentFamilyTreeId);
                console.log('- window.userFamilyTreeId:', window.userFamilyTreeId);
                
                // Fallback methods if stored ID is not available
                if (!treeId) {
                    treeId = this.currentMember.treeId || 
                             window.currentFamilyTreeId || 
                             window.userFamilyTreeId;
                }
                
                // As last resort, try to get user's default tree
                if (!treeId) {
                    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        treeId = userData.familyTreeId || userData.lastTreeAccessed || (userData.familyTrees && userData.familyTrees[0]);
                    }
                }
                
                console.log('Final tree ID for invite:', treeId);
                
                if (!treeId) {
                    throw new Error('Could not determine family tree ID');
                }
                
                // Generate invite link via API
                const idToken = await user.getIdToken();
                const response = await fetch('/api/invites/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({
                        treeId: treeId,
                        personId: this.currentMember.id
                    })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to generate invite');
                }
                
                const result = await response.json();
                
                // Hide loading
                if (window.hideLoading) {
                    window.hideLoading();
                }
                
                // Show invite modal
                this.showInviteModal(result);
                
            } catch (error) {
                console.error('Error generating invite:', error);
                if (window.hideLoading) {
                    window.hideLoading();
                }
                if (window.showError) {
                    window.showError(error.message || t('errorGeneratingInvite') || 'Failed to generate invite link');
                }
            }
        },
        
        // Show invite modal with link and options
        showInviteModal(inviteData) {
            const modal = document.createElement('div');
            modal.className = 'invite-modal-overlay';
            modal.innerHTML = `
                <div class="invite-modal">
                    <div class="invite-modal-header">
                        <h3>${t('inviteFamilyMember') || 'Invite Family Member'}</h3>
                        <button class="close-modal" onclick="this.closest('.invite-modal-overlay').remove()">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                    <div class="invite-modal-body">
                        <div class="invite-info">
                            <p>${t('inviteDescription') || 'Share this link with'} <strong>${inviteData.personName}</strong> ${t('toClaimProfile') || 'to let them claim and manage their profile'}:</p>
                        </div>
                        
                        <div class="invite-link-container">
                            <input type="text" class="invite-link-input" value="${inviteData.inviteUrl}" readonly>
                            <button class="btn-icon copy-invite-link" title="${t('copyLink') || 'Copy link'}">
                                <i class="material-icons">content_copy</i>
                            </button>
                        </div>
                        
                        <div class="invite-options">
                            <button class="btn btn-primary share-invite-email" data-email="${this.currentMember.email || ''}">
                                <i class="material-icons">email</i>
                                ${t('sendViaEmail') || 'Send via Email'}
                            </button>
                            <button class="btn btn-secondary share-invite-whatsapp">
                                <i class="material-icons">chat</i>
                                ${t('shareViaWhatsApp') || 'Share via WhatsApp'}
                            </button>
                            <button class="btn btn-secondary share-invite-native">
                                <i class="material-icons">share</i>
                                ${t('shareOther') || 'Share Other Ways'}
                            </button>
                        </div>
                        
                        <div class="invite-expiry">
                            <i class="material-icons">schedule</i>
                            <span>${t('linkExpiresOn') || 'This link expires on'} ${new Date(inviteData.expiresAt).toLocaleDateString()}</span>
                        </div>
                        
                        <div class="invite-instructions">
                            <h4>${t('whatHappensNext') || 'What happens next?'}</h4>
                            <ol>
                                <li>${t('inviteStep1') || 'The family member clicks the link'}</li>
                                <li>${t('inviteStep2') || 'They create an account or sign in'}</li>
                                <li>${t('inviteStep3') || 'They can then add photos, videos, and stories to their profile'}</li>
                                <li>${t('inviteStep4') || 'They will have access to view and contribute to the family tree'}</li>
                            </ol>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Copy link button
            modal.querySelector('.copy-invite-link').addEventListener('click', async () => {
                const input = modal.querySelector('.invite-link-input');
                input.select();
                try {
                    await navigator.clipboard.writeText(input.value);
                    if (window.showSuccess) {
                        window.showSuccess(t('linkCopied') || 'Link copied to clipboard!');
                    }
                } catch (err) {
                    document.execCommand('copy');
                }
            });
            
            // Email share
            modal.querySelector('.share-invite-email').addEventListener('click', () => {
                const email = this.currentMember.email || '';
                const subject = encodeURIComponent(t('inviteEmailSubject') || 'You\'re invited to join our family tree!');
                const body = encodeURIComponent(
                    (t('inviteEmailBody') || 'Hi {{name}},\n\nI\'ve added you to our family tree on Pyebwa. Click the link below to claim your profile and add your own photos, videos, and stories:\n\n{{link}}\n\nThis link will expire on {{expiry}}.\n\nLooking forward to seeing your contributions to our family history!')
                        .replace('{{name}}', inviteData.personName)
                        .replace('{{link}}', inviteData.inviteUrl)
                        .replace('{{expiry}}', new Date(inviteData.expiresAt).toLocaleDateString())
                );
                window.open(`mailto:${email}?subject=${subject}&body=${body}`);
            });
            
            // WhatsApp share
            modal.querySelector('.share-invite-whatsapp').addEventListener('click', () => {
                const text = encodeURIComponent(
                    (t('inviteWhatsAppText') || 'Hi {{name}}! I\'ve added you to our family tree on Pyebwa. Click here to claim your profile and add your photos and stories: {{link}}')
                        .replace('{{name}}', inviteData.personName.split(' ')[0])
                        .replace('{{link}}', inviteData.inviteUrl)
                );
                window.open(`https://wa.me/?text=${text}`);
            });
            
            // Native share
            modal.querySelector('.share-invite-native').addEventListener('click', async () => {
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: t('inviteShareTitle') || 'Family Tree Invitation',
                            text: (t('inviteShareText') || 'Join our family tree on Pyebwa!')
                                .replace('{{name}}', inviteData.personName),
                            url: inviteData.inviteUrl
                        });
                    } catch (err) {
                        console.log('Share cancelled or failed:', err);
                    }
                } else {
                    // Fallback - just copy the link
                    const input = modal.querySelector('.invite-link-input');
                    input.select();
                    document.execCommand('copy');
                    if (window.showSuccess) {
                        window.showSuccess(t('linkCopied') || 'Link copied to clipboard!');
                    }
                }
            });
            
            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        },
        
        // Show privacy settings modal
        showPrivacySettings() {
            if (!this.currentMember) return;
            
            const modal = document.createElement('div');
            modal.className = 'privacy-modal-overlay';
            modal.innerHTML = `
                <div class="privacy-modal">
                    <div class="privacy-modal-header">
                        <h3>${t('documentPrivacy') || 'Document Privacy'}</h3>
                        <button class="close-modal" onclick="this.closest('.privacy-modal-overlay').remove()">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                    <div class="privacy-modal-body">
                        <p class="privacy-intro">${t('documentPrivacyDescription') || 'Control who can see documents for this family member'}</p>
                        
                        <form id="privacySettingsForm">
                            <div class="privacy-fields">
                                ${this.createDocumentPrivacyRow('documents', t('documents') || 'Documents', this.currentMember.privacy?.documents || 'family')}
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" onclick="this.closest('.privacy-modal-overlay').remove()">
                                    ${t('cancel') || 'Cancel'}
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="material-icons">save</i>
                                    ${t('saveChanges') || 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Handle form submission
            const form = modal.querySelector('#privacySettingsForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const submitBtn = form.querySelector('[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.textContent = t('loading') || 'Saving...';
                
                try {
                    // Get existing privacy settings or create new object
                    const existingPrivacy = this.currentMember.privacy || {};
                    
                    // Only update document privacy, preserve other settings
                    const updatedPrivacy = {
                        ...existingPrivacy,
                        documents: form.querySelector('.privacy-select[data-field="documents"]').value
                    };
                    
                    // Update member privacy settings
                    await window.updateFamilyMember(this.currentMember.id, {
                        privacy: updatedPrivacy
                    });
                    
                    // Update local member data
                    this.currentMember.privacy = updatedPrivacy;
                    
                    // Show success message
                    if (window.showSuccess) {
                        window.showSuccess(t('savedSuccessfully') || 'Privacy settings updated successfully!');
                    }
                    
                    // Close modal
                    modal.remove();
                    
                    // Refresh the profile view to show updated privacy indicators
                    this.populateProfile(this.currentMember);
                    const activeTab = document.querySelector('.profile-tab.active')?.dataset.tab || 'overview';
                    this.switchTab(activeTab);
                    
                } catch (error) {
                    console.error('Error updating privacy settings:', error);
                    if (window.showError) {
                        window.showError(t('errorSaving') || 'Failed to save privacy settings');
                    }
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = t('saveChanges') || 'Save Changes';
                }
            });
        },
        
        // Create privacy setting row
        createPrivacySettingRow(field, label, currentValue) {
            return `
                <div class="privacy-setting-row">
                    <label>${label}</label>
                    <select class="privacy-select" data-field="${field}">
                        <option value="private" ${currentValue === 'private' ? 'selected' : ''}>
                            <i class="material-icons">lock</i>
                            ${t('private') || 'Only Me'}
                        </option>
                        <option value="family" ${currentValue === 'family' ? 'selected' : ''}>
                            <i class="material-icons">group</i>
                            ${t('familyOnly') || 'Family Only'}
                        </option>
                        <option value="public" ${currentValue === 'public' ? 'selected' : ''}>
                            <i class="material-icons">public</i>
                            ${t('public') || 'Public'}
                        </option>
                    </select>
                </div>
            `;
        },
        
        // Create document privacy row with specific options
        createDocumentPrivacyRow(field, label, currentValue) {
            return `
                <div class="privacy-setting-row">
                    <label>${label}</label>
                    <select class="privacy-select" data-field="${field}">
                        <option value="family" ${currentValue === 'family' ? 'selected' : ''}>
                            <i class="material-icons">group</i>
                            ${t('myEntireFamily') || 'My Entire Family'}
                        </option>
                        <option value="spouse_children" ${currentValue === 'spouse_children' ? 'selected' : ''}>
                            <i class="material-icons">family_restroom</i>
                            ${t('mySpouseAndChildren') || 'My Spouse and Children'}
                        </option>
                        <option value="spouse" ${currentValue === 'spouse' ? 'selected' : ''}>
                            <i class="material-icons">favorite</i>
                            ${t('mySpouse') || 'My Spouse'}
                        </option>
                        <option value="private" ${currentValue === 'private' ? 'selected' : ''}>
                            <i class="material-icons">lock</i>
                            ${t('private') || 'Private'}
                        </option>
                    </select>
                </div>
            `;
        },
        
        // Add event functionality
        addEvent() {
            this.showEventModal();
        },
        
        // Show event modal
        showEventModal(eventToEdit = null) {
            const isEdit = eventToEdit !== null;
            const modal = document.createElement('div');
            modal.className = 'event-modal-overlay';
            modal.innerHTML = `
                <div class="event-modal">
                    <div class="event-modal-header">
                        <h3>${isEdit ? t('editEvent') || 'Edit Event' : t('addEvent') || 'Add Life Event'}</h3>
                        <button class="close-modal" onclick="this.closest('.event-modal-overlay').remove()">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                    <div class="event-modal-body">
                        <form id="eventForm">
                            <div class="form-group">
                                <label>${t('eventType') || 'Event Type'}</label>
                                <select name="type" required>
                                    <option value="">${t('selectEventType') || 'Select event type...'}</option>
                                    <option value="birth">${t('birth') || 'Birth'}</option>
                                    <option value="baptism">${t('baptism') || 'Baptism'}</option>
                                    <option value="education">${t('education') || 'Education'}</option>
                                    <option value="graduation">${t('graduation') || 'Graduation'}</option>
                                    <option value="employment">${t('employment') || 'Employment'}</option>
                                    <option value="marriage">${t('marriage') || 'Marriage'}</option>
                                    <option value="child">${t('childBirth') || 'Child Birth'}</option>
                                    <option value="residence">${t('residence') || 'Residence'}</option>
                                    <option value="travel">${t('travel') || 'Travel'}</option>
                                    <option value="achievement">${t('achievement') || 'Achievement'}</option>
                                    <option value="military">${t('military') || 'Military Service'}</option>
                                    <option value="retirement">${t('retirement') || 'Retirement'}</option>
                                    <option value="death">${t('death') || 'Death'}</option>
                                    <option value="other">${t('other') || 'Other'}</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>${t('eventTitle') || 'Event Title'} *</label>
                                <input type="text" name="title" required 
                                    placeholder="${t('eventTitlePlaceholder') || 'e.g., Graduated from University'}"
                                    value="${eventToEdit?.title || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label>${t('date') || 'Date'} *</label>
                                <input type="date" name="date" required 
                                    value="${eventToEdit?.date || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label>${t('location') || 'Location'}</label>
                                <input type="text" name="location" 
                                    placeholder="${t('locationPlaceholder') || 'e.g., Port-au-Prince, Haiti'}"
                                    value="${eventToEdit?.location || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label>${t('description') || 'Description'}</label>
                                <textarea name="description" rows="4" 
                                    placeholder="${t('descriptionPlaceholder') || 'Add more details about this event...'}">${eventToEdit?.description || ''}</textarea>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" onclick="this.closest('.event-modal-overlay').remove()">
                                    ${t('cancel') || 'Cancel'}
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    ${isEdit ? t('saveChanges') || 'Save Changes' : t('addEvent') || 'Add Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Handle form submission
            const form = modal.querySelector('#eventForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const eventData = {
                    type: formData.get('type'),
                    title: formData.get('title'),
                    date: formData.get('date'),
                    location: formData.get('location'),
                    description: formData.get('description'),
                    icon: this.getEventIcon(formData.get('type'))
                };
                
                await this.saveEvent(eventData, isEdit ? eventToEdit.id : null);
                modal.remove();
            });
            
            // Update title based on event type selection
            const typeSelect = form.querySelector('select[name="type"]');
            const titleInput = form.querySelector('input[name="title"]');
            typeSelect.addEventListener('change', () => {
                if (!titleInput.value && typeSelect.value) {
                    titleInput.value = this.getDefaultEventTitle(typeSelect.value);
                }
            });
        },
        
        // Get event icon based on type
        getEventIcon(type) {
            const icons = {
                birth: 'child_care',
                baptism: 'water_drop',
                education: 'school',
                graduation: 'school',
                employment: 'work',
                marriage: 'favorite',
                child: 'child_friendly',
                residence: 'home',
                travel: 'flight',
                achievement: 'emoji_events',
                military: 'military_tech',
                retirement: 'beach_access',
                death: 'sentiment_very_dissatisfied',
                other: 'event'
            };
            return icons[type] || 'event';
        },
        
        // Get default event title based on type
        getDefaultEventTitle(type) {
            const titles = {
                birth: t('born') || 'Born',
                baptism: t('baptized') || 'Baptized',
                education: t('startedSchool') || 'Started School',
                graduation: t('graduated') || 'Graduated',
                employment: t('startedWork') || 'Started Work',
                marriage: t('married') || 'Got Married',
                child: t('childBorn') || 'Child Born',
                residence: t('movedTo') || 'Moved to New Home',
                travel: t('traveledTo') || 'Traveled',
                achievement: t('achieved') || 'Achievement',
                military: t('militaryService') || 'Military Service',
                retirement: t('retired') || 'Retired',
                death: t('passedAway') || 'Passed Away',
                other: t('lifeEvent') || 'Life Event'
            };
            return titles[type] || '';
        },
        
        // Save event to Firebase
        async saveEvent(eventData, eventId = null) {
            try {
                if (!this.currentMember.events) {
                    this.currentMember.events = [];
                }
                
                if (eventId !== null) {
                    // Update existing event
                    const index = this.currentMember.events.findIndex(e => e.id === eventId);
                    if (index !== -1) {
                        this.currentMember.events[index] = { ...eventData, id: eventId };
                    }
                } else {
                    // Add new event
                    eventData.id = Date.now().toString();
                    this.currentMember.events.push(eventData);
                }
                
                // Update member in Firebase
                await window.updateFamilyMember(this.currentMember.id, {
                    events: this.currentMember.events
                });
                
                // Refresh timeline
                const timelineContainer = document.getElementById('timeline-tab');
                this.loadTimeline(timelineContainer);
                
                if (window.showSuccess) {
                    window.showSuccess(eventId ? t('eventUpdated') || 'Event updated successfully' : t('eventAdded') || 'Event added successfully');
                }
            } catch (error) {
                console.error('Error saving event:', error);
                if (window.showError) {
                    window.showError(t('errorSavingEvent') || 'Error saving event');
                }
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
        
        // Add story functionality
        addStory() {
            this.showStoryModal();
        },
        
        // Show story modal with templates
        showStoryModal(storyToEdit = null) {
            const isEdit = storyToEdit !== null;
            const modal = document.createElement('div');
            modal.className = 'story-modal-overlay';
            modal.innerHTML = `
                <div class="story-modal">
                    <div class="story-modal-header">
                        <h3>${isEdit ? t('editStory') || 'Edit Story' : t('addStory') || 'Add Life Story'}</h3>
                        <button class="close-modal" onclick="this.closest('.story-modal-overlay').remove()">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                    <div class="story-modal-body">
                        <div class="template-selector" ${isEdit ? 'style="display:none"' : ''}>
                            <h4>${t('chooseTemplate') || 'Choose a Story Template'}</h4>
                            <div class="template-grid">
                                ${this.getStoryTemplates().map(template => `
                                    <div class="template-card" data-template="${template.id}">
                                        <i class="material-icons">${template.icon}</i>
                                        <h5>${template.title}</h5>
                                        <p>${template.description}</p>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="divider">
                                <span>${t('or') || 'OR'}</span>
                            </div>
                            <button class="btn btn-secondary start-blank">
                                <i class="material-icons">note_add</i>
                                ${t('startBlank') || 'Start with Blank Story'}
                            </button>
                        </div>
                        
                        <form id="storyForm" style="${isEdit ? '' : 'display:none'}">
                            <div class="form-group">
                                <label>${t('storyTitle') || 'Story Title'} *</label>
                                <input type="text" name="title" required 
                                    placeholder="${t('storyTitlePlaceholder') || 'Give your story a title...'}"
                                    value="${storyToEdit?.title || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label>${t('storyType') || 'Story Type'}</label>
                                <div class="story-type-selector">
                                    <label class="radio-option">
                                        <input type="radio" name="storyType" value="personal" ${!storyToEdit || storyToEdit.storyType !== 'relationship' ? 'checked' : ''}>
                                        <span class="radio-label">
                                            <i class="material-icons">person</i>
                                            ${t('personalStory') || 'Personal Story'}
                                        </span>
                                    </label>
                                    <label class="radio-option">
                                        <input type="radio" name="storyType" value="relationship" ${storyToEdit?.storyType === 'relationship' ? 'checked' : ''}>
                                        <span class="radio-label">
                                            <i class="material-icons">people</i>
                                            ${t('relationshipStory') || 'Relationship Story'}
                                        </span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="form-group relationship-members" style="${storyToEdit?.storyType === 'relationship' ? '' : 'display:none'}">
                                <label>${t('relatedMembers') || 'Related Members'}</label>
                                <div class="related-members-selector">
                                    <select name="relatedMembers" multiple class="form-control">
                                        ${window.familyMembers && window.familyMembers.filter(m => m.id !== this.currentMember.id).map(member => `
                                            <option value="${member.id}" ${storyToEdit?.relatedMembers?.includes(member.id) ? 'selected' : ''}>
                                                ${member.firstName} ${member.lastName}
                                            </option>
                                        `).join('')}
                                    </select>
                                    <small>${t('relatedMembersHelp') || 'Select the family members involved in this story'}</small>
                                </div>
                            </div>
                            
                            <div class="form-group template-prompts" style="display:none">
                                <label>${t('storyPrompts') || 'Story Prompts'}</label>
                                <div class="prompts-container"></div>
                                <button type="button" class="btn btn-text use-prompts">
                                    <i class="material-icons">lightbulb</i>
                                    ${t('usePrompts') || 'Use these prompts to guide your story'}
                                </button>
                            </div>
                            
                            <div class="form-group">
                                <label>${t('storyContent') || 'Story Content'} *</label>
                                <textarea name="content" rows="12" required 
                                    placeholder="${t('storyContentPlaceholder') || 'Write your story here...'}">${storyToEdit?.content || ''}</textarea>
                            </div>
                            
                            <div class="form-group">
                                <label>${t('audioRecording') || 'Audio Recording'}</label>
                                <div class="audio-recording-container">
                                    <div class="audio-controls">
                                        <button type="button" class="btn btn-secondary record-btn" data-recording="false">
                                            <i class="material-icons">mic</i>
                                            <span class="record-text">${t('startRecording') || 'Start Recording'}</span>
                                        </button>
                                        <div class="recording-timer" style="display:none">
                                            <i class="material-icons recording-indicator">fiber_manual_record</i>
                                            <span class="timer-text">00:00</span>
                                        </div>
                                    </div>
                                    <div class="audio-preview" style="${storyToEdit?.audioUrl ? '' : 'display:none'}">
                                        <audio controls id="audioPreview" ${storyToEdit?.audioUrl ? `src="${storyToEdit.audioUrl}"` : ''}>
                                            Your browser does not support the audio element.
                                        </audio>
                                        <button type="button" class="btn btn-text remove-audio">
                                            <i class="material-icons">delete</i>
                                            ${t('removeAudio') || 'Remove Audio'}
                                        </button>
                                    </div>
                                    <input type="hidden" name="audioUrl" value="${storyToEdit?.audioUrl || ''}">
                                    <input type="hidden" name="audioDuration" value="${storyToEdit?.audioDuration || ''}">
                                    <small class="help-text">${t('audioHelp') || 'Record your story in your own voice (max 5 minutes)'}</small>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>${t('storyDate') || 'Story Date'}</label>
                                <input type="date" name="date" value="${storyToEdit?.date || new Date().toISOString().split('T')[0]}">
                            </div>
                            
                            <div class="form-group">
                                <label>${t('storyTags') || 'Tags'}</label>
                                <input type="text" name="tags" 
                                    placeholder="${t('storyTagsPlaceholder') || 'e.g., childhood, education, career'}"
                                    value="${storyToEdit?.tags?.join(', ') || ''}">
                                <small>${t('storyTagsHelp') || 'Separate tags with commas'}</small>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary back-to-templates" style="${isEdit ? 'display:none' : ''}">
                                    <i class="material-icons">arrow_back</i>
                                    ${t('backToTemplates') || 'Back to Templates'}
                                </button>
                                <button type="button" class="btn btn-secondary" onclick="this.closest('.story-modal-overlay').remove()">
                                    ${t('cancel') || 'Cancel'}
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    ${isEdit ? t('saveChanges') || 'Save Changes' : t('saveStory') || 'Save Story'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Handle template selection
            const templateSelector = modal.querySelector('.template-selector');
            const storyForm = modal.querySelector('#storyForm');
            const templateCards = modal.querySelectorAll('.template-card');
            const startBlankBtn = modal.querySelector('.start-blank');
            const backBtn = modal.querySelector('.back-to-templates');
            const promptsContainer = modal.querySelector('.prompts-container');
            const templatePromptsSection = modal.querySelector('.template-prompts');
            
            // Template card click
            templateCards.forEach(card => {
                card.addEventListener('click', () => {
                    const templateId = card.dataset.template;
                    const template = this.getStoryTemplates().find(t => t.id === templateId);
                    if (template) {
                        this.applyTemplate(template, modal);
                        templateSelector.style.display = 'none';
                        storyForm.style.display = 'block';
                    }
                });
            });
            
            // Start blank
            startBlankBtn.addEventListener('click', () => {
                templateSelector.style.display = 'none';
                storyForm.style.display = 'block';
            });
            
            // Back to templates
            backBtn?.addEventListener('click', () => {
                templateSelector.style.display = 'block';
                storyForm.style.display = 'none';
                storyForm.reset();
                templatePromptsSection.style.display = 'none';
            });
            
            // Story type change
            const storyTypeRadios = modal.querySelectorAll('input[name="storyType"]');
            const relationshipMembersGroup = modal.querySelector('.relationship-members');
            storyTypeRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.value === 'relationship') {
                        relationshipMembersGroup.style.display = 'block';
                    } else {
                        relationshipMembersGroup.style.display = 'none';
                    }
                });
            });
            
            // Use prompts button
            modal.querySelector('.use-prompts')?.addEventListener('click', (e) => {
                e.preventDefault();
                const prompts = Array.from(promptsContainer.querySelectorAll('.prompt-item')).map(p => p.textContent).join('\n\n');
                const contentTextarea = storyForm.querySelector('textarea[name="content"]');
                contentTextarea.value = prompts + '\n\n' + contentTextarea.value;
                templatePromptsSection.style.display = 'none';
            });
            
            // Handle form submission
            const form = modal.querySelector('#storyForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                
                // Get selected related members
                const relatedMembersSelect = form.querySelector('select[name="relatedMembers"]');
                const relatedMembers = relatedMembersSelect ? 
                    Array.from(relatedMembersSelect.selectedOptions).map(opt => opt.value) : [];
                
                const storyData = {
                    title: formData.get('title'),
                    content: formData.get('content'),
                    date: formData.get('date'),
                    tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag),
                    storyType: formData.get('storyType') || 'personal',
                    relatedMembers: relatedMembers,
                    audioUrl: formData.get('audioUrl') || null,
                    audioDuration: formData.get('audioDuration') || null,
                    id: isEdit ? storyToEdit.id : Date.now().toString()
                };
                
                await this.saveStory(storyData, isEdit ? storyToEdit.id : null);
                modal.remove();
            });
            
            // Handle audio recording
            const recordBtn = modal.querySelector('.record-btn');
            const recordingTimer = modal.querySelector('.recording-timer');
            const timerText = modal.querySelector('.timer-text');
            const audioPreview = modal.querySelector('.audio-preview');
            const audioElement = modal.querySelector('#audioPreview');
            const removeAudioBtn = modal.querySelector('.remove-audio');
            const audioUrlInput = modal.querySelector('input[name="audioUrl"]');
            const audioDurationInput = modal.querySelector('input[name="audioDuration"]');
            
            let mediaRecorder = null;
            let audioChunks = [];
            let recordingStartTime = null;
            let timerInterval = null;
            
            // Initialize audio recording
            recordBtn?.addEventListener('click', async () => {
                const isRecording = recordBtn.dataset.recording === 'true';
                
                if (!isRecording) {
                    // Start recording
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        mediaRecorder = new MediaRecorder(stream);
                        audioChunks = [];
                        
                        mediaRecorder.ondataavailable = (event) => {
                            audioChunks.push(event.data);
                        };
                        
                        mediaRecorder.onstop = async () => {
                            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                            const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
                            
                            // Upload audio to Firebase Storage
                            const audioUrl = await this.uploadAudioBlob(audioBlob);
                            if (audioUrl) {
                                audioUrlInput.value = audioUrl;
                                audioDurationInput.value = duration;
                                audioElement.src = audioUrl;
                                audioPreview.style.display = 'block';
                            }
                            
                            // Stop all tracks
                            stream.getTracks().forEach(track => track.stop());
                        };
                        
                        mediaRecorder.start();
                        recordingStartTime = Date.now();
                        
                        // Update UI
                        recordBtn.dataset.recording = 'true';
                        recordBtn.classList.add('recording');
                        recordBtn.querySelector('.record-text').textContent = t('stopRecording') || 'Stop Recording';
                        recordBtn.querySelector('.material-icons').textContent = 'stop';
                        recordingTimer.style.display = 'flex';
                        
                        // Start timer
                        timerInterval = setInterval(() => {
                            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
                            const minutes = Math.floor(elapsed / 60);
                            const seconds = elapsed % 60;
                            timerText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                            
                            // Stop at 5 minutes
                            if (elapsed >= 300) {
                                recordBtn.click();
                            }
                        }, 100);
                        
                    } catch (error) {
                        console.error('Error starting recording:', error);
                        alert(t('microphoneError') || 'Could not access microphone. Please check your permissions.');
                    }
                } else {
                    // Stop recording
                    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                        mediaRecorder.stop();
                        
                        // Update UI
                        recordBtn.dataset.recording = 'false';
                        recordBtn.classList.remove('recording');
                        recordBtn.querySelector('.record-text').textContent = t('startRecording') || 'Start Recording';
                        recordBtn.querySelector('.material-icons').textContent = 'mic';
                        recordingTimer.style.display = 'none';
                        
                        // Stop timer
                        if (timerInterval) {
                            clearInterval(timerInterval);
                            timerInterval = null;
                        }
                    }
                }
            });
            
            // Remove audio
            removeAudioBtn?.addEventListener('click', () => {
                audioUrlInput.value = '';
                audioDurationInput.value = '';
                audioElement.src = '';
                audioPreview.style.display = 'none';
            });
        },
        
        // Get story templates
        getStoryTemplates() {
            return [
                {
                    id: 'childhood',
                    title: t('childhoodMemories') || 'Childhood Memories',
                    description: t('childhoodMemoriesDesc') || 'Share stories from early years',
                    icon: 'child_care',
                    prompts: [
                        t('childhoodPrompt1') || 'Where did you grow up? Describe your childhood home and neighborhood.',
                        t('childhoodPrompt2') || 'What are your earliest memories?',
                        t('childhoodPrompt3') || 'Who were the important people in your childhood?',
                        t('childhoodPrompt4') || 'What games did you play? What were your favorite toys?',
                        t('childhoodPrompt5') || 'Describe a typical day in your childhood.'
                    ]
                },
                {
                    id: 'education',
                    title: t('educationJourney') || 'Education Journey',
                    description: t('educationJourneyDesc') || 'Document school experiences and achievements',
                    icon: 'school',
                    prompts: [
                        t('educationPrompt1') || 'What schools did you attend?',
                        t('educationPrompt2') || 'Who were your favorite teachers and why?',
                        t('educationPrompt3') || 'What subjects did you excel in or struggle with?',
                        t('educationPrompt4') || 'Share a memorable school experience.',
                        t('educationPrompt5') || 'What did you learn that still impacts you today?'
                    ]
                },
                {
                    id: 'career',
                    title: t('careerPath') || 'Career Path',
                    description: t('careerPathDesc') || 'Tell the story of your work life',
                    icon: 'work',
                    prompts: [
                        t('careerPrompt1') || 'What was your first job? How did you get it?',
                        t('careerPrompt2') || 'Describe your career progression.',
                        t('careerPrompt3') || 'What were your biggest professional challenges?',
                        t('careerPrompt4') || 'What achievements are you most proud of?',
                        t('careerPrompt5') || 'What advice would you give about work and career?'
                    ]
                },
                {
                    id: 'love',
                    title: t('loveAndRelationships') || 'Love & Relationships',
                    description: t('loveAndRelationshipsDesc') || 'Share stories of love and friendship',
                    icon: 'favorite',
                    prompts: [
                        t('lovePrompt1') || 'How did you meet your spouse/partner?',
                        t('lovePrompt2') || 'Describe your wedding day or commitment ceremony.',
                        t('lovePrompt3') || 'What makes your relationship special?',
                        t('lovePrompt4') || 'Share a funny or touching moment together.',
                        t('lovePrompt5') || 'What have you learned about love?'
                    ]
                },
                {
                    id: 'parenthood',
                    title: t('parenthoodStories') || 'Parenthood Stories',
                    description: t('parenthoodStoriesDesc') || 'Memories of raising children',
                    icon: 'child_friendly',
                    prompts: [
                        t('parentPrompt1') || 'Describe the day your children were born.',
                        t('parentPrompt2') || 'What were your children like as babies?',
                        t('parentPrompt3') || 'Share a funny parenting moment.',
                        t('parentPrompt4') || 'What values did you try to teach?',
                        t('parentPrompt5') || 'What are your hopes for your children?'
                    ]
                },
                {
                    id: 'traditions',
                    title: t('familyTraditions') || 'Family Traditions',
                    description: t('familyTraditionsDesc') || 'Preserve cultural heritage and customs',
                    icon: 'celebration',
                    prompts: [
                        t('traditionPrompt1') || 'What family traditions do you celebrate?',
                        t('traditionPrompt2') || 'Describe holiday celebrations in your family.',
                        t('traditionPrompt3') || 'What recipes have been passed down?',
                        t('traditionPrompt4') || 'What cultural customs do you maintain?',
                        t('traditionPrompt5') || 'What traditions do you want to continue?'
                    ]
                },
                {
                    id: 'challenges',
                    title: t('overcomingChallenges') || 'Overcoming Challenges',
                    description: t('overcomingChallengesDesc') || 'Stories of resilience and growth',
                    icon: 'psychology',
                    prompts: [
                        t('challengePrompt1') || 'What was the biggest challenge you faced?',
                        t('challengePrompt2') || 'How did you overcome it?',
                        t('challengePrompt3') || 'Who helped you during difficult times?',
                        t('challengePrompt4') || 'What did you learn from the experience?',
                        t('challengePrompt5') || 'How did it change you?'
                    ]
                },
                {
                    id: 'wisdom',
                    title: t('lifeWisdom') || 'Life Wisdom',
                    description: t('lifeWisdomDesc') || 'Share lessons learned and advice',
                    icon: 'lightbulb',
                    prompts: [
                        t('wisdomPrompt1') || 'What are the most important lessons you\'ve learned?',
                        t('wisdomPrompt2') || 'What advice would you give your younger self?',
                        t('wisdomPrompt3') || 'What do you wish you had known earlier?',
                        t('wisdomPrompt4') || 'What values guide your life?',
                        t('wisdomPrompt5') || 'What legacy do you want to leave?'
                    ]
                }
            ];
        },
        
        // Apply template to form
        applyTemplate(template, modal) {
            const form = modal.querySelector('#storyForm');
            const promptsContainer = modal.querySelector('.prompts-container');
            const templatePromptsSection = modal.querySelector('.template-prompts');
            
            // Set title suggestion
            form.querySelector('input[name="title"]').placeholder = template.title + ' - ' + (t('yourStory') || 'Your Story');
            
            // Show prompts
            if (template.prompts && template.prompts.length > 0) {
                promptsContainer.innerHTML = template.prompts.map(prompt => `
                    <div class="prompt-item">
                        <i class="material-icons">help_outline</i>
                        ${prompt}
                    </div>
                `).join('');
                templatePromptsSection.style.display = 'block';
            }
            
            // Set suggested tags
            const tagsMap = {
                'childhood': 'childhood, early years, family, growing up',
                'education': 'education, school, learning, teachers',
                'career': 'career, work, profession, achievement',
                'love': 'love, relationship, marriage, partnership',
                'parenthood': 'parenting, children, family, raising kids',
                'traditions': 'traditions, culture, heritage, customs',
                'challenges': 'challenges, resilience, growth, overcoming',
                'wisdom': 'wisdom, advice, lessons, reflection'
            };
            form.querySelector('input[name="tags"]').value = tagsMap[template.id] || '';
        },
        
        // Save story to Firebase
        // Upload audio blob to Firebase Storage
        async uploadAudioBlob(audioBlob) {
            try {
                const storage = firebase.storage();
                const timestamp = Date.now();
                const fileName = `audio_stories/${window.userFamilyTreeId}/${this.currentMember.id}/story_${timestamp}.webm`;
                const storageRef = storage.ref(fileName);
                
                // Upload the blob
                const snapshot = await storageRef.put(audioBlob, {
                    contentType: 'audio/webm'
                });
                
                // Get the download URL
                const downloadUrl = await snapshot.ref.getDownloadURL();
                return downloadUrl;
            } catch (error) {
                console.error('Error uploading audio:', error);
                alert(t('audioUploadError') || 'Failed to upload audio. Please try again.');
                return null;
            }
        },
        
        async saveStory(storyData, storyId = null) {
            try {
                if (!this.currentMember.stories) {
                    this.currentMember.stories = [];
                }
                
                // Add author information
                storyData.authorId = this.currentMember.id;
                storyData.authorName = `${this.currentMember.firstName} ${this.currentMember.lastName}`;
                
                if (storyId !== null) {
                    // Update existing story
                    const index = this.currentMember.stories.findIndex(s => s.id === storyId);
                    if (index !== -1) {
                        this.currentMember.stories[index] = { ...storyData, id: storyId };
                    }
                } else {
                    // Add new story
                    this.currentMember.stories.push(storyData);
                }
                
                // Update member in Firebase
                await window.updateFamilyMember(this.currentMember.id, {
                    stories: this.currentMember.stories
                });
                
                // If it's a relationship story, also add reference to related members
                if (storyData.storyType === 'relationship' && storyData.relatedMembers && storyData.relatedMembers.length > 0) {
                    // Create a reference to this story for related members
                    const storyReference = {
                        id: storyData.id,
                        title: storyData.title,
                        date: storyData.date,
                        authorId: this.currentMember.id,
                        authorName: storyData.authorName,
                        type: 'relationship'
                    };
                    
                    // Update each related member
                    for (const memberId of storyData.relatedMembers) {
                        const relatedMember = window.familyMembers.find(m => m.id === memberId);
                        if (relatedMember) {
                            if (!relatedMember.relatedStories) {
                                relatedMember.relatedStories = [];
                            }
                            
                            // Check if story reference already exists
                            const existingIndex = relatedMember.relatedStories.findIndex(s => s.id === storyData.id);
                            if (existingIndex !== -1) {
                                relatedMember.relatedStories[existingIndex] = storyReference;
                            } else {
                                relatedMember.relatedStories.push(storyReference);
                            }
                            
                            // Update the related member in Firebase
                            await window.updateFamilyMember(memberId, {
                                relatedStories: relatedMember.relatedStories
                            });
                        }
                    }
                }
                
                // Refresh stories tab
                const storiesContainer = document.getElementById('stories-tab');
                this.loadStories(storiesContainer);
                
                if (window.showSuccess) {
                    window.showSuccess(storyId ? t('storyUpdated') || 'Story updated successfully' : t('storyAdded') || 'Story added successfully');
                }
            } catch (error) {
                console.error('Error saving story:', error);
                if (window.showError) {
                    window.showError(t('errorSavingStory') || 'Error saving story');
                }
            }
        },
        
        // Start slideshow
        startSlideshow() {
            if (window.pyebwaPhotoGallery) {
                window.pyebwaPhotoGallery.startSlideshow();
            }
        },
        
        // View photo in lightbox
        viewPhoto(index) {
            if (window.pyebwaPhotoGallery) {
                window.pyebwaPhotoGallery.viewPhotoInLightbox(index);
            }
        },
        
        // Delete photo from gallery
        async deletePhoto(index) {
            const photos = this.currentMember.photos || [];
            const photoToDelete = photos[index];
            
            if (!photoToDelete) {
                console.error('Photo not found at index:', index);
                return;
            }
            
            // Confirm deletion
            if (!confirm(t('confirmDeletePhoto') || 'Are you sure you want to delete this photo?')) {
                return;
            }
            
            try {
                // Delete from Firebase Storage
                if (photoToDelete.url) {
                    const storage = firebase.storage();
                    const storageRef = storage.refFromURL(photoToDelete.url);
                    await storageRef.delete();
                }
                
                // Remove from photos array
                photos.splice(index, 1);
                
                // Update member in Firestore
                await window.updateFamilyMember(this.currentMember.id, {
                    photos: photos
                });
                
                // Update local member data
                this.currentMember.photos = photos;
                
                // Refresh gallery
                const galleryContainer = document.getElementById('gallery-tab');
                this.loadGallery(galleryContainer);
                
                if (window.showSuccess) {
                    window.showSuccess(t('photoDeleted') || 'Photo deleted successfully');
                }
            } catch (error) {
                console.error('Error deleting photo:', error);
                if (window.showError) {
                    window.showError(t('errorDeletingPhoto') || 'Error deleting photo');
                }
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