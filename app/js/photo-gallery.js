// Photo Gallery Management for Member Profiles
(function() {
    'use strict';
    
    const PhotoGallery = {
        // Current member for photo operations
        currentMemberId: null,
        
        // Initialize gallery
        init() {
            this.setupPhotoUpload();
        },
        
        // Setup photo upload handlers
        setupPhotoUpload() {
            // Override the addPhoto method in member profile
            if (window.pyebwaMemberProfile) {
                window.pyebwaMemberProfile.addPhoto = () => this.showPhotoUploadModal();
                window.pyebwaMemberProfile.editPhoto = () => this.showPhotoEditModal();
                window.pyebwaMemberProfile.viewPhoto = (index) => this.viewPhotoInLightbox(index);
            }
        },
        
        // Show photo upload modal
        showPhotoUploadModal() {
            const modal = document.createElement('div');
            modal.className = 'photo-upload-modal active';
            modal.innerHTML = `
                <div class="photo-upload-content">
                    <div class="modal-header">
                        <h3>${t('addPhoto') || 'Add Photo'}</h3>
                        <button class="modal-close" onclick="this.closest('.photo-upload-modal').remove()">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                    
                    <div class="photo-upload-body">
                        <div class="upload-area" id="photoUploadArea">
                            <input type="file" id="photoFileInput" accept="image/*" multiple hidden>
                            <i class="material-icons">cloud_upload</i>
                            <h4>${t('dragDropPhotos') || 'Drag & drop photos here'}</h4>
                            <p>${t('orClickToSelect') || 'or click to select files'}</p>
                            <button class="btn btn-primary" onclick="event.stopPropagation(); document.getElementById('photoFileInput').click()">
                                ${t('selectPhotos') || 'Select Photos'}
                            </button>
                        </div>
                        
                        <div class="photo-preview-grid" id="photoPreviewGrid"></div>
                        
                        <div class="upload-actions" style="display: none;">
                            <button class="btn btn-secondary" onclick="pyebwaPhotoGallery.clearPreviews()">
                                ${t('clear') || 'Clear'}
                            </button>
                            <button class="btn btn-primary" onclick="pyebwaPhotoGallery.uploadPhotos()">
                                <i class="material-icons">upload</i>
                                ${t('uploadPhotos') || 'Upload Photos'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Setup drag and drop
            const uploadArea = document.getElementById('photoUploadArea');
            const fileInput = document.getElementById('photoFileInput');
            
            uploadArea.addEventListener('click', () => fileInput.click());
            
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                this.handleFiles(e.dataTransfer.files);
            });
            
            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
            
            // Store current member ID
            this.currentMemberId = window.pyebwaMemberProfile?.currentMemberId;
        },
        
        // Handle selected files
        handleFiles(files) {
            console.log('Files selected:', files.length);
            
            const validFiles = Array.from(files).filter(file => 
                file.type.startsWith('image/') && file.size < 5 * 1024 * 1024 // 5MB limit to match storage rules
            );
            
            console.log('Valid files after filtering:', validFiles.length);
            
            if (validFiles.length === 0) {
                if (window.showError) {
                    window.showError('Please select valid image files (max 5MB)');
                }
                return;
            }
            
            const previewGrid = document.getElementById('photoPreviewGrid');
            const uploadActions = document.querySelector('.upload-actions');
            
            // Clear any existing previews to avoid confusion
            previewGrid.innerHTML = '';
            
            console.log('Processing files for preview...');
            
            // Process all files without any limit
            for (let i = 0; i < validFiles.length; i++) {
                const file = validFiles[i];
                console.log(`Processing file ${i + 1}:`, file.name);
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.createElement('div');
                    preview.className = 'photo-preview-item';
                    preview.innerHTML = `
                        <img src="${e.target.result}" alt="">
                        <button class="remove-preview" onclick="this.parentElement.remove()">
                            <i class="material-icons">close</i>
                        </button>
                        <input type="text" class="photo-caption-input" 
                               placeholder="${t('addCaption') || 'Add caption...'}"
                               data-file="${file.name}">
                    `;
                    previewGrid.appendChild(preview);
                    
                    // Store file reference
                    preview.fileData = file;
                };
                reader.readAsDataURL(file);
            }
            
            uploadActions.style.display = 'flex';
            console.log('Preview generation complete. Total previews:', previewGrid.children.length);
        },
        
        // Clear all previews
        clearPreviews() {
            document.getElementById('photoPreviewGrid').innerHTML = '';
            document.querySelector('.upload-actions').style.display = 'none';
        },
        
        // Upload photos
        async uploadPhotos() {
            const previews = document.querySelectorAll('.photo-preview-item');
            console.log('Starting upload, preview items found:', previews.length);
            if (previews.length === 0) return;
            
            const uploadBtn = document.querySelector('.upload-actions .btn-primary');
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="material-icons rotating">sync</i> Uploading...';
            
            try {
                // Check if Firebase is initialized
                if (!window.firebase) {
                    throw new Error('Firebase not initialized');
                }
                
                if (!window.firebase.storage) {
                    throw new Error('Firebase Storage not initialized');
                }
                
                if (!window.userFamilyTreeId) {
                    throw new Error('No family tree selected');
                }
                
                console.log('Starting photo upload for member:', this.currentMemberId);
                
                // First, upload all photos to storage
                console.log('Creating upload promises for', previews.length, 'photos');
                const uploadPromises = Array.from(previews).map(async (preview, index) => {
                    const file = preview.fileData;
                    const caption = preview.querySelector('.photo-caption-input').value;
                    
                    console.log(`Uploading photo ${index + 1}:`, file.name);
                    
                    // Upload to Firebase Storage
                    const photoUrl = await this.uploadPhotoToStorage(file);
                    
                    console.log(`Photo uploaded, URL:`, photoUrl);
                    
                    return { 
                        url: photoUrl, 
                        caption: caption || '',
                        uploadedAt: firebase.firestore.Timestamp.now(),
                        uploadedBy: window.currentUser?.uid || 'anonymous'
                    };
                });
                
                const uploadedPhotos = await Promise.all(uploadPromises);
                
                // Then add all photos to member document in a single update
                if (uploadedPhotos.length > 0) {
                    await this.addMultiplePhotosToMember(uploadedPhotos);
                }
                
                console.log('All photos uploaded successfully:', uploadedPhotos);
                
                if (window.showSuccess) {
                    window.showSuccess(`${uploadedPhotos.length} photos uploaded successfully!`);
                }
                
                // Close modal and refresh gallery
                document.querySelector('.photo-upload-modal').remove();
                
                // Reload member data from Firestore to get updated photos
                if (window.pyebwaMemberProfile && this.currentMemberId) {
                    await this.reloadMemberData(this.currentMemberId);
                    window.pyebwaMemberProfile.switchTab('gallery');
                }
                
            } catch (error) {
                console.error('Photo upload error:', error);
                console.error('Error details:', {
                    message: error.message,
                    code: error.code,
                    currentMemberId: this.currentMemberId,
                    userFamilyTreeId: window.userFamilyTreeId,
                    currentUser: window.currentUser?.uid
                });
                
                if (window.showError) {
                    const errorMessage = error.code === 'storage/unauthorized' 
                        ? 'You do not have permission to upload photos. Please check your login status.'
                        : error.message || 'Failed to upload photos. Please try again.';
                    window.showError(errorMessage);
                }
            } finally {
                if (uploadBtn) {
                    uploadBtn.disabled = false;
                    uploadBtn.innerHTML = '<i class="material-icons">upload</i> Upload Photos';
                }
            }
        },
        
        // Upload photo to Firebase Storage
        async uploadPhotoToStorage(file) {
            if (!window.firebase || !this.currentMemberId) {
                throw new Error('Firebase not initialized or member not selected');
            }
            
            if (!window.userFamilyTreeId) {
                throw new Error('No family tree ID available');
            }
            
            if (!window.currentUser?.uid) {
                throw new Error('User not authenticated');
            }
            
            console.log('Uploading photo with:', {
                familyTreeId: window.userFamilyTreeId,
                memberId: this.currentMemberId,
                userId: window.currentUser.uid,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
            });
            
            const storage = firebase.storage();
            const timestamp = Date.now();
            // Clean filename to match security rules pattern: ^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|webp)$
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
            const fileName = `familyTrees/${window.userFamilyTreeId}/photos/${this.currentMemberId}_${timestamp}_${cleanFileName}`;
            const storageRef = storage.ref(fileName);
            
            console.log('Storage path:', fileName);
            
            // Upload file with metadata
            const metadata = {
                contentType: file.type,
                uploadedBy: window.currentUser.uid,  // Required by security rules at top level
                customMetadata: {
                    uploadedBy: window.currentUser.uid,
                    uploadedAt: new Date().toISOString(),
                    memberID: this.currentMemberId,
                    familyTreeId: window.userFamilyTreeId
                }
            };
            
            try {
                const snapshot = await storageRef.put(file, metadata);
                const downloadURL = await snapshot.ref.getDownloadURL();
                console.log('Upload successful, download URL:', downloadURL);
                return downloadURL;
            } catch (error) {
                console.error('Storage upload error:', error);
                console.error('Error details:', {
                    code: error.code,
                    message: error.message,
                    serverResponse: error.serverResponse
                });
                throw error;
            }
        },
        
        // Add multiple photos to member document in a single update
        async addMultiplePhotosToMember(newPhotos) {
            if (!this.currentMemberId || !newPhotos || newPhotos.length === 0) return;
            
            const memberRef = firebase.firestore()
                .collection('familyTrees')
                .doc(window.userFamilyTreeId)
                .collection('members')
                .doc(this.currentMemberId);
            
            // Get current photos array
            const doc = await memberRef.get();
            const memberData = doc.data();
            const currentPhotos = memberData?.photos || [];
            
            console.log('Current photos before batch add:', currentPhotos.length);
            
            // Add all new photos
            const updatedPhotos = [...currentPhotos, ...newPhotos];
            
            console.log('Photos after batch add:', updatedPhotos.length);
            console.log('New photos added:', newPhotos.length);
            console.log('Updated photos array:', updatedPhotos);
            
            // Log the full array before saving
            console.log('About to save photos array:', JSON.stringify(updatedPhotos));
            
            // Update member document with all photos at once
            await memberRef.update({
                photos: updatedPhotos
            });
            
            console.log('All photos saved to Firestore');
            
            // Verify what was saved
            const verifyDoc = await memberRef.get();
            const savedPhotos = verifyDoc.data()?.photos || [];
            console.log('Verified saved photos count:', savedPhotos.length);
            console.log('First saved photo:', savedPhotos[0]);
            console.log('Last saved photo:', savedPhotos[savedPhotos.length - 1]);
            
            // Update local cache
            const member = window.familyMembers.find(m => m.id === this.currentMemberId);
            if (member) {
                member.photos = updatedPhotos;
            }
        },
        
        // Add single photo to member document (kept for backward compatibility)
        async addPhotoToMember(photoUrl, caption) {
            if (!this.currentMemberId) return;
            
            const memberRef = firebase.firestore()
                .collection('familyTrees')
                .doc(window.userFamilyTreeId)
                .collection('members')
                .doc(this.currentMemberId);
            
            // Get current photos array
            const doc = await memberRef.get();
            const memberData = doc.data();
            const currentPhotos = memberData?.photos || [];
            
            console.log('Current photos before adding:', currentPhotos.length);
            console.log('Current photos array:', currentPhotos);
            
            // Add new photo
            const newPhoto = {
                url: photoUrl,
                caption: caption || '',
                uploadedAt: firebase.firestore.Timestamp.now(),
                uploadedBy: window.currentUser?.uid || 'anonymous'
            };
            currentPhotos.push(newPhoto);
            
            console.log('Photos after adding:', currentPhotos.length);
            console.log('Updated photos array:', currentPhotos);
            
            // Update member document using arrayUnion to ensure proper array handling
            // First approach: Direct update with the full array
            try {
                await memberRef.update({
                    photos: currentPhotos
                });
                console.log('Photos saved to Firestore using direct update');
            } catch (error) {
                console.error('Direct update failed, trying alternative method:', error);
                
                // Alternative approach: Use set with merge
                await memberRef.set({
                    photos: currentPhotos
                }, { merge: true });
                console.log('Photos saved using set with merge');
            }
            
            // Update local cache
            const member = window.familyMembers.find(m => m.id === this.currentMemberId);
            if (member) {
                member.photos = currentPhotos;
            }
        },
        
        // View photo in lightbox
        viewPhotoInLightbox(index) {
            const member = window.familyMembers.find(m => m.id === window.pyebwaMemberProfile?.currentMemberId);
            if (!member) return;
            
            const allPhotos = member.photoUrl ? 
                [{url: member.photoUrl, caption: 'Profile Photo'}, ...(member.photos || [])] : 
                (member.photos || []);
            
            if (!allPhotos[index]) return;
            
            const lightbox = document.createElement('div');
            lightbox.className = 'photo-lightbox active';
            lightbox.innerHTML = `
                <div class="lightbox-content">
                    <button class="lightbox-close" onclick="this.closest('.photo-lightbox').remove()">
                        <i class="material-icons">close</i>
                    </button>
                    
                    <button class="lightbox-nav prev" onclick="pyebwaPhotoGallery.navigateLightbox(-1)">
                        <i class="material-icons">chevron_left</i>
                    </button>
                    
                    <div class="lightbox-image-container">
                        <img src="${allPhotos[index].url}" alt="${allPhotos[index].caption || ''}">
                        ${allPhotos[index].caption ? `
                            <div class="lightbox-caption">${allPhotos[index].caption}</div>
                        ` : ''}
                    </div>
                    
                    <button class="lightbox-nav next" onclick="pyebwaPhotoGallery.navigateLightbox(1)">
                        <i class="material-icons">chevron_right</i>
                    </button>
                    
                    <div class="lightbox-counter">
                        ${index + 1} / ${allPhotos.length}
                    </div>
                </div>
            `;
            
            document.body.appendChild(lightbox);
            
            // Store current index
            lightbox.currentIndex = index;
            lightbox.photos = allPhotos;
            
            // Keyboard navigation
            lightbox.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') this.navigateLightbox(-1);
                if (e.key === 'ArrowRight') this.navigateLightbox(1);
                if (e.key === 'Escape') lightbox.remove();
            });
        },
        
        // Navigate lightbox
        navigateLightbox(direction) {
            const lightbox = document.querySelector('.photo-lightbox');
            if (!lightbox) return;
            
            const photos = lightbox.photos;
            const currentIndex = lightbox.currentIndex || 0;
            let newIndex = currentIndex + direction;
            
            if (newIndex < 0) newIndex = photos.length - 1;
            if (newIndex >= photos.length) newIndex = 0;
            
            lightbox.currentIndex = newIndex;
            
            const img = lightbox.querySelector('.lightbox-image-container img');
            const caption = lightbox.querySelector('.lightbox-caption');
            const counter = lightbox.querySelector('.lightbox-counter');
            
            img.src = photos[newIndex].url;
            
            if (caption) {
                caption.textContent = photos[newIndex].caption || '';
                caption.style.display = photos[newIndex].caption ? 'block' : 'none';
            }
            
            counter.textContent = `${newIndex + 1} / ${photos.length}`;
        },
        
        // Show photo edit modal (for main profile photo)
        showPhotoEditModal() {
            const modal = document.createElement('div');
            modal.className = 'photo-edit-modal active';
            modal.innerHTML = `
                <div class="photo-edit-content">
                    <div class="modal-header">
                        <h3>${t('changeProfilePhoto') || 'Change Profile Photo'}</h3>
                        <button class="modal-close" onclick="this.closest('.photo-edit-modal').remove()">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                    
                    <div class="photo-edit-body">
                        <div class="current-photo">
                            <img src="${window.pyebwaMemberProfile?.currentMember?.photoUrl || '/app/images/default-avatar.svg'}" 
                                 alt="Current photo">
                        </div>
                        
                        <input type="file" id="newProfilePhoto" accept="image/*" hidden>
                        <button class="btn btn-primary" onclick="document.getElementById('newProfilePhoto').click()">
                            <i class="material-icons">photo_camera</i>
                            ${t('selectNewPhoto') || 'Select New Photo'}
                        </button>
                        
                        <div class="new-photo-preview" style="display: none;">
                            <img id="newPhotoPreview" src="" alt="New photo">
                            <button class="btn btn-primary" onclick="pyebwaPhotoGallery.updateProfilePhoto()">
                                ${t('savePhoto') || 'Save Photo'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Handle file selection
            document.getElementById('newProfilePhoto').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('newPhotoPreview').src = e.target.result;
                    document.querySelector('.new-photo-preview').style.display = 'block';
                    
                    // Store file for upload
                    modal.selectedFile = file;
                };
                reader.readAsDataURL(file);
            });
            
            this.currentMemberId = window.pyebwaMemberProfile?.currentMemberId;
        },
        
        // Reload member data from Firestore
        async reloadMemberData(memberId) {
            try {
                console.log('Reloading member data for:', memberId);
                
                const memberDoc = await firebase.firestore()
                    .collection('familyTrees')
                    .doc(window.userFamilyTreeId)
                    .collection('members')
                    .doc(memberId)
                    .get();
                
                if (memberDoc.exists) {
                    const updatedData = memberDoc.data();
                    console.log('Reloaded member data, photos count:', updatedData.photos?.length || 0);
                    console.log('Photos array:', updatedData.photos);
                    
                    // Log detailed info about photos
                    if (updatedData.photos) {
                        console.log('Photos array details:');
                        updatedData.photos.forEach((photo, idx) => {
                            console.log(`Photo ${idx + 1}: ${photo.url.substring(0, 50)}...`);
                        });
                    }
                    
                    // Update local cache
                    const memberIndex = window.familyMembers.findIndex(m => m.id === memberId);
                    if (memberIndex !== -1) {
                        window.familyMembers[memberIndex] = {
                            ...window.familyMembers[memberIndex],
                            ...updatedData,
                            id: memberId
                        };
                    }
                    
                    // Update current member in profile
                    if (window.pyebwaMemberProfile && window.pyebwaMemberProfile.currentMemberId === memberId) {
                        window.pyebwaMemberProfile.currentMember = {
                            ...window.pyebwaMemberProfile.currentMember,
                            ...updatedData,
                            id: memberId
                        };
                    }
                }
            } catch (error) {
                console.error('Error reloading member data:', error);
            }
        },
        
        // Start slideshow
        startSlideshow() {
            const member = window.familyMembers.find(m => m.id === window.pyebwaMemberProfile?.currentMemberId);
            if (!member) return;
            
            const allPhotos = member.photoUrl ? 
                [{url: member.photoUrl, caption: 'Profile Photo'}, ...(member.photos || [])] : 
                (member.photos || []);
            
            if (allPhotos.length === 0) {
                if (window.showError) {
                    window.showError('No photos to show');
                }
                return;
            }
            
            // Create slideshow container
            const slideshow = document.createElement('div');
            slideshow.className = 'photo-slideshow';
            slideshow.tabIndex = -1; // Make it focusable for keyboard events
            slideshow.innerHTML = `
                <div class="slideshow-content">
                    <div class="slideshow-header">
                        <button class="slideshow-btn" onclick="pyebwaPhotoGallery.toggleFullscreen()">
                            <i class="material-icons">fullscreen</i>
                        </button>
                        <button class="slideshow-btn" onclick="pyebwaPhotoGallery.togglePlayPause()">
                            <i class="material-icons">pause</i>
                        </button>
                        <button class="slideshow-btn slideshow-close" onclick="pyebwaPhotoGallery.closeSlideshow()">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                    
                    <div class="slideshow-main">
                        <button class="slideshow-nav prev" onclick="pyebwaPhotoGallery.slideshowPrev()">
                            <i class="material-icons">chevron_left</i>
                        </button>
                        
                        <div class="slideshow-image-container">
                            <img class="slideshow-image" src="${allPhotos[0].url}" alt="">
                            <div class="slideshow-caption">${allPhotos[0].caption || ''}</div>
                        </div>
                        
                        <button class="slideshow-nav next" onclick="pyebwaPhotoGallery.slideshowNext()">
                            <i class="material-icons">chevron_right</i>
                        </button>
                    </div>
                    
                    <div class="slideshow-footer">
                        <div class="slideshow-progress">
                            <div class="slideshow-progress-bar"></div>
                        </div>
                        <div class="slideshow-counter">1 / ${allPhotos.length}</div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(slideshow);
            
            // Initialize slideshow state
            this.slideshow = {
                container: slideshow,
                photos: allPhotos,
                currentIndex: 0,
                isPlaying: true,
                interval: null,
                duration: 10000 // 10 seconds per photo
            };
            
            // Start autoplay
            this.startAutoplay();
            
            // Keyboard controls
            slideshow.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') this.slideshowPrev();
                if (e.key === 'ArrowRight') this.slideshowNext();
                if (e.key === ' ') { // Spacebar
                    e.preventDefault();
                    this.togglePlayPause();
                }
                if (e.key === 'Escape') this.closeSlideshow();
                if (e.key === 'f' || e.key === 'F') this.toggleFullscreen();
            });
            
            // Focus for keyboard events
            slideshow.focus();
        },
        
        // Start autoplay
        startAutoplay() {
            if (!this.slideshow || !this.slideshow.isPlaying) return;
            
            // Clear any existing interval
            if (this.slideshow.interval) {
                clearInterval(this.slideshow.interval);
            }
            
            // Start progress animation
            const progressBar = this.slideshow.container.querySelector('.slideshow-progress-bar');
            progressBar.style.transition = `width ${this.slideshow.duration}ms linear`;
            progressBar.style.width = '100%';
            
            // Set interval for next photo
            this.slideshow.interval = setInterval(() => {
                this.slideshowNext(true);
            }, this.slideshow.duration);
        },
        
        // Stop autoplay
        stopAutoplay() {
            if (!this.slideshow) return;
            
            if (this.slideshow.interval) {
                clearInterval(this.slideshow.interval);
                this.slideshow.interval = null;
            }
            
            // Stop progress animation
            const progressBar = this.slideshow.container.querySelector('.slideshow-progress-bar');
            progressBar.style.transition = 'none';
            progressBar.style.width = '0';
        },
        
        // Toggle play/pause
        togglePlayPause() {
            if (!this.slideshow) return;
            
            this.slideshow.isPlaying = !this.slideshow.isPlaying;
            const btn = this.slideshow.container.querySelector('.slideshow-btn i');
            btn.textContent = this.slideshow.isPlaying ? 'pause' : 'play_arrow';
            
            if (this.slideshow.isPlaying) {
                this.startAutoplay();
            } else {
                this.stopAutoplay();
            }
        },
        
        // Navigate to previous photo
        slideshowPrev() {
            if (!this.slideshow) return;
            
            this.slideshow.currentIndex--;
            if (this.slideshow.currentIndex < 0) {
                this.slideshow.currentIndex = this.slideshow.photos.length - 1;
            }
            
            this.updateSlideshowDisplay();
            
            // Restart autoplay if playing
            if (this.slideshow.isPlaying) {
                this.startAutoplay();
            }
        },
        
        // Navigate to next photo
        slideshowNext(isAuto = false) {
            if (!this.slideshow) return;
            
            this.slideshow.currentIndex++;
            if (this.slideshow.currentIndex >= this.slideshow.photos.length) {
                this.slideshow.currentIndex = 0;
            }
            
            this.updateSlideshowDisplay();
            
            // Restart autoplay if playing and not auto-advanced
            if (this.slideshow.isPlaying && !isAuto) {
                this.startAutoplay();
            }
        },
        
        // Update slideshow display
        updateSlideshowDisplay() {
            if (!this.slideshow) return;
            
            const photo = this.slideshow.photos[this.slideshow.currentIndex];
            const img = this.slideshow.container.querySelector('.slideshow-image');
            const caption = this.slideshow.container.querySelector('.slideshow-caption');
            const counter = this.slideshow.container.querySelector('.slideshow-counter');
            const progressBar = this.slideshow.container.querySelector('.slideshow-progress-bar');
            
            // Update image with fade effect
            img.style.opacity = '0';
            setTimeout(() => {
                img.src = photo.url;
                img.style.opacity = '1';
            }, 200);
            
            // Update caption
            caption.textContent = photo.caption || '';
            caption.style.display = photo.caption ? 'block' : 'none';
            
            // Update counter
            counter.textContent = `${this.slideshow.currentIndex + 1} / ${this.slideshow.photos.length}`;
            
            // Reset progress bar
            progressBar.style.transition = 'none';
            progressBar.style.width = '0';
            
            // Restart progress animation after a brief delay
            if (this.slideshow.isPlaying) {
                setTimeout(() => {
                    progressBar.style.transition = `width ${this.slideshow.duration}ms linear`;
                    progressBar.style.width = '100%';
                }, 50);
            }
        },
        
        // Toggle fullscreen
        toggleFullscreen() {
            if (!this.slideshow) return;
            
            const elem = this.slideshow.container;
            const btn = elem.querySelector('.slideshow-btn i');
            
            if (!document.fullscreenElement) {
                elem.requestFullscreen().catch(err => {
                    console.error('Error attempting to enable fullscreen:', err);
                });
                btn.textContent = 'fullscreen_exit';
            } else {
                document.exitFullscreen();
                btn.textContent = 'fullscreen';
            }
        },
        
        // Close slideshow
        closeSlideshow() {
            if (!this.slideshow) return;
            
            this.stopAutoplay();
            this.slideshow.container.remove();
            
            // Exit fullscreen if active
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            
            this.slideshow = null;
        },
        
        // Update profile photo
        async updateProfilePhoto() {
            const modal = document.querySelector('.photo-edit-modal');
            const file = modal?.selectedFile;
            
            if (!file || !this.currentMemberId) return;
            
            const saveBtn = modal.querySelector('.btn-primary:last-child');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="material-icons rotating">sync</i> Uploading...';
            
            try {
                // Upload new photo
                const photoUrl = await this.uploadPhotoToStorage(file);
                
                // Update member document
                await firebase.firestore()
                    .collection('familyTrees')
                    .doc(window.userFamilyTreeId)
                    .collection('members')
                    .doc(this.currentMemberId)
                    .update({
                        photoUrl: photoUrl
                    });
                
                // Update local cache
                const member = window.familyMembers.find(m => m.id === this.currentMemberId);
                if (member) {
                    member.photoUrl = photoUrl;
                }
                
                // Update profile display
                document.querySelector('.profile-photo').src = photoUrl;
                
                if (window.showSuccess) {
                    window.showSuccess('Profile photo updated successfully!');
                }
                
                modal.remove();
                
            } catch (error) {
                console.error('Photo update error:', error);
                if (window.showError) {
                    window.showError('Failed to update photo. Please try again.');
                }
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '${t("savePhoto") || "Save Photo"}';
            }
        }
    };
    
    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
        /* Photo Upload Modal */
        .photo-upload-modal,
        .photo-edit-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 3000;
            padding: 20px;
        }
        
        .photo-upload-modal.active,
        .photo-edit-modal.active {
            display: flex;
        }
        
        .photo-upload-content,
        .photo-edit-content {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 800px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        
        .photo-upload-body,
        .photo-edit-body {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
        }
        
        .upload-area {
            border: 2px dashed #ddd;
            border-radius: 12px;
            padding: 60px 20px;
            text-align: center;
            transition: all 0.3s;
            cursor: pointer;
        }
        
        .upload-area.drag-over {
            border-color: var(--primary-color);
            background: rgba(0, 33, 125, 0.05);
        }
        
        .upload-area .material-icons {
            font-size: 64px;
            color: #999;
            margin-bottom: 16px;
        }
        
        .upload-area h4 {
            margin: 0 0 8px 0;
            font-size: 20px;
            color: #333;
        }
        
        .upload-area p {
            margin: 0 0 24px 0;
            color: #666;
        }
        
        .photo-preview-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 16px;
            margin-top: 24px;
        }
        
        .photo-preview-item {
            position: relative;
            border-radius: 8px;
            overflow: hidden;
            background: #f0f0f0;
            aspect-ratio: 1;
        }
        
        .photo-preview-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .remove-preview {
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(0, 0, 0, 0.6);
            color: white;
            border: none;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }
        
        .remove-preview:hover {
            background: rgba(0, 0, 0, 0.8);
        }
        
        .photo-caption-input {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.7);
            border: none;
            color: white;
            padding: 8px;
            font-size: 12px;
        }
        
        .upload-actions {
            display: flex;
            justify-content: space-between;
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #e0e0e0;
        }
        
        /* Photo Edit Modal */
        .current-photo {
            text-align: center;
            margin-bottom: 24px;
        }
        
        .current-photo img,
        .new-photo-preview img {
            width: 200px;
            height: 200px;
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid #e0e0e0;
        }
        
        .new-photo-preview {
            text-align: center;
            margin-top: 24px;
        }
        
        /* Photo Lightbox */
        .photo-lightbox {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 4000;
        }
        
        .photo-lightbox.active {
            display: flex;
        }
        
        .lightbox-content {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .lightbox-close {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: white;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10;
        }
        
        .lightbox-close:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .lightbox-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: white;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }
        
        .lightbox-nav:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .lightbox-nav.prev {
            left: 20px;
        }
        
        .lightbox-nav.next {
            right: 20px;
        }
        
        .lightbox-image-container {
            max-width: 90%;
            max-height: 90%;
            text-align: center;
        }
        
        .lightbox-image-container img {
            max-width: 100%;
            max-height: 80vh;
            object-fit: contain;
        }
        
        .lightbox-caption {
            color: white;
            margin-top: 20px;
            font-size: 16px;
            padding: 0 20px;
        }
        
        .lightbox-counter {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-size: 14px;
            background: rgba(0, 0, 0, 0.5);
            padding: 8px 16px;
            border-radius: 20px;
        }
        
        /* Rotating animation */
        @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .rotating {
            animation: rotate 1s linear infinite;
        }
        
        /* Slideshow Styles */
        .photo-slideshow {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            z-index: 5000;
            display: flex;
            align-items: center;
            justify-content: center;
            outline: none;
        }
        
        .slideshow-content {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            position: relative;
        }
        
        .slideshow-header {
            position: absolute;
            top: 0;
            right: 0;
            padding: 20px;
            display: flex;
            gap: 10px;
            z-index: 10;
        }
        
        .slideshow-btn {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: white;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .slideshow-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.1);
        }
        
        .slideshow-main {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            padding: 80px 60px;
        }
        
        .slideshow-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
            z-index: 5;
        }
        
        .slideshow-nav:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-50%) scale(1.1);
        }
        
        .slideshow-nav.prev {
            left: 20px;
        }
        
        .slideshow-nav.next {
            right: 20px;
        }
        
        .slideshow-image-container {
            max-width: 90%;
            max-height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .slideshow-image {
            max-width: 100%;
            max-height: calc(100vh - 200px);
            object-fit: contain;
            transition: opacity 0.3s;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        
        .slideshow-caption {
            color: white;
            text-align: center;
            margin-top: 20px;
            font-size: 18px;
            max-width: 800px;
            padding: 0 20px;
        }
        
        .slideshow-footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 20px;
            text-align: center;
        }
        
        .slideshow-progress {
            height: 4px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 10px;
        }
        
        .slideshow-progress-bar {
            height: 100%;
            background: white;
            width: 0;
            border-radius: 2px;
        }
        
        .slideshow-counter {
            color: white;
            font-size: 14px;
        }
        
        /* Fullscreen adjustments */
        .photo-slideshow:fullscreen {
            background: black;
        }
        
        .photo-slideshow:fullscreen .slideshow-image {
            max-height: 100vh;
        }
        
        /* Gallery header styles */
        .gallery-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .gallery-actions {
            display: flex;
            gap: 10px;
        }
        
        /* Mobile responsive slideshow */
        @media (max-width: 768px) {
            .slideshow-nav {
                width: 48px;
                height: 48px;
            }
            
            .slideshow-nav.prev {
                left: 10px;
            }
            
            .slideshow-nav.next {
                right: 10px;
            }
            
            .slideshow-main {
                padding: 60px 20px;
            }
            
            .slideshow-caption {
                font-size: 16px;
            }
        }
        
        /* Dark mode support */
        body.dark-mode .photo-upload-content,
        body.dark-mode .photo-edit-content {
            background: #1a1a1a;
            color: #f0f0f0;
        }
        
        body.dark-mode .upload-area {
            border-color: #444;
        }
        
        body.dark-mode .upload-area.drag-over {
            background: rgba(0, 33, 125, 0.2);
        }
        
        body.dark-mode .upload-actions {
            border-top-color: #444;
        }
    `;
    document.head.appendChild(style);
    
    // Initialize
    PhotoGallery.init();
    
    // Export for use
    window.pyebwaPhotoGallery = PhotoGallery;
})();