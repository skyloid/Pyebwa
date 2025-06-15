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
                            <button class="btn btn-primary" onclick="document.getElementById('photoFileInput').click()">
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
            const validFiles = Array.from(files).filter(file => 
                file.type.startsWith('image/') && file.size < 10 * 1024 * 1024 // 10MB limit
            );
            
            if (validFiles.length === 0) {
                if (window.showError) {
                    window.showError('Please select valid image files (max 10MB)');
                }
                return;
            }
            
            const previewGrid = document.getElementById('photoPreviewGrid');
            const uploadActions = document.querySelector('.upload-actions');
            
            validFiles.forEach(file => {
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
            });
            
            uploadActions.style.display = 'flex';
        },
        
        // Clear all previews
        clearPreviews() {
            document.getElementById('photoPreviewGrid').innerHTML = '';
            document.querySelector('.upload-actions').style.display = 'none';
        },
        
        // Upload photos
        async uploadPhotos() {
            const previews = document.querySelectorAll('.photo-preview-item');
            if (previews.length === 0) return;
            
            const uploadBtn = document.querySelector('.upload-actions .btn-primary');
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="material-icons rotating">sync</i> Uploading...';
            
            try {
                const uploadPromises = Array.from(previews).map(async (preview) => {
                    const file = preview.fileData;
                    const caption = preview.querySelector('.photo-caption-input').value;
                    
                    // Upload to Firebase Storage
                    const photoUrl = await this.uploadPhotoToStorage(file);
                    
                    // Add to member's photos array
                    await this.addPhotoToMember(photoUrl, caption);
                    
                    return { url: photoUrl, caption };
                });
                
                const uploadedPhotos = await Promise.all(uploadPromises);
                
                if (window.showSuccess) {
                    window.showSuccess(`${uploadedPhotos.length} photos uploaded successfully!`);
                }
                
                // Close modal and refresh gallery
                document.querySelector('.photo-upload-modal').remove();
                
                // Reload profile tab
                if (window.pyebwaMemberProfile) {
                    window.pyebwaMemberProfile.switchTab('gallery');
                }
                
            } catch (error) {
                console.error('Photo upload error:', error);
                if (window.showError) {
                    window.showError('Failed to upload photos. Please try again.');
                }
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="material-icons">upload</i> Upload Photos';
            }
        },
        
        // Upload photo to Firebase Storage
        async uploadPhotoToStorage(file) {
            if (!window.firebase || !this.currentMemberId) {
                throw new Error('Firebase not initialized or member not selected');
            }
            
            const storage = firebase.storage();
            const timestamp = Date.now();
            const fileName = `${this.currentMemberId}/gallery/${timestamp}_${file.name}`;
            const storageRef = storage.ref(fileName);
            
            // Upload file with metadata
            const metadata = {
                contentType: file.type,
                customMetadata: {
                    uploadedBy: window.currentUser?.uid || 'anonymous',
                    uploadedAt: new Date().toISOString(),
                    memberID: this.currentMemberId
                }
            };
            
            const snapshot = await storageRef.put(file, metadata);
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            return downloadURL;
        },
        
        // Add photo to member document
        async addPhotoToMember(photoUrl, caption) {
            if (!this.currentMemberId) return;
            
            const memberRef = firebase.firestore()
                .collection('familyTrees')
                .doc(window.userFamilyTreeId)
                .collection('members')
                .doc(this.currentMemberId);
            
            // Get current photos array
            const doc = await memberRef.get();
            const currentPhotos = doc.data()?.photos || [];
            
            // Add new photo
            currentPhotos.push({
                url: photoUrl,
                caption: caption || '',
                uploadedAt: firebase.firestore.Timestamp.now(),
                uploadedBy: window.currentUser?.uid || 'anonymous'
            });
            
            // Update member document
            await memberRef.update({
                photos: currentPhotos
            });
            
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
                    
                    <button class="lightbox-nav prev" onclick="pyebwaPhotoGallery.navigateLightbox(-1, ${index})">
                        <i class="material-icons">chevron_left</i>
                    </button>
                    
                    <div class="lightbox-image-container">
                        <img src="${allPhotos[index].url}" alt="${allPhotos[index].caption || ''}">
                        ${allPhotos[index].caption ? `
                            <div class="lightbox-caption">${allPhotos[index].caption}</div>
                        ` : ''}
                    </div>
                    
                    <button class="lightbox-nav next" onclick="pyebwaPhotoGallery.navigateLightbox(1, ${index})">
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
                if (e.key === 'ArrowLeft') this.navigateLightbox(-1, lightbox.currentIndex);
                if (e.key === 'ArrowRight') this.navigateLightbox(1, lightbox.currentIndex);
                if (e.key === 'Escape') lightbox.remove();
            });
        },
        
        // Navigate lightbox
        navigateLightbox(direction, currentIndex) {
            const lightbox = document.querySelector('.photo-lightbox');
            if (!lightbox) return;
            
            const photos = lightbox.photos;
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