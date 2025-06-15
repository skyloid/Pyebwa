// Document Management System for Pyebwa Family Tree
(function() {
    'use strict';
    
    const DocumentManager = {
        // Current member for document operations
        currentMemberId: null,
        
        // Document type configurations
        documentTypes: {
            'birth_certificate': {
                name: 'Birth Certificate',
                icon: 'child_care',
                accept: '.pdf,.jpg,.jpeg,.png',
                maxSize: 10 * 1024 * 1024 // 10MB
            },
            'death_certificate': {
                name: 'Death Certificate',
                icon: 'sentiment_very_dissatisfied',
                accept: '.pdf,.jpg,.jpeg,.png',
                maxSize: 10 * 1024 * 1024
            },
            'marriage_certificate': {
                name: 'Marriage Certificate',
                icon: 'favorite',
                accept: '.pdf,.jpg,.jpeg,.png',
                maxSize: 10 * 1024 * 1024
            },
            'passport': {
                name: 'Passport',
                icon: 'flight_takeoff',
                accept: '.pdf,.jpg,.jpeg,.png',
                maxSize: 10 * 1024 * 1024
            },
            'diploma': {
                name: 'Diploma/Degree',
                icon: 'school',
                accept: '.pdf,.jpg,.jpeg,.png',
                maxSize: 10 * 1024 * 1024
            },
            'letter': {
                name: 'Letter/Correspondence',
                icon: 'mail',
                accept: '.pdf,.jpg,.jpeg,.png,.doc,.docx,.txt',
                maxSize: 10 * 1024 * 1024
            },
            'newspaper': {
                name: 'Newspaper Clipping',
                icon: 'newspaper',
                accept: '.pdf,.jpg,.jpeg,.png',
                maxSize: 10 * 1024 * 1024
            },
            'legal': {
                name: 'Legal Document',
                icon: 'gavel',
                accept: '.pdf,.doc,.docx',
                maxSize: 10 * 1024 * 1024
            },
            'medical': {
                name: 'Medical Record',
                icon: 'local_hospital',
                accept: '.pdf,.jpg,.jpeg,.png',
                maxSize: 10 * 1024 * 1024
            },
            'other': {
                name: 'Other Document',
                icon: 'description',
                accept: '.pdf,.jpg,.jpeg,.png,.doc,.docx,.txt',
                maxSize: 10 * 1024 * 1024
            }
        },
        
        // Initialize document manager
        init() {
            this.setupDocumentUpload();
        },
        
        // Setup document upload handlers
        setupDocumentUpload() {
            // Override the addDocument method in member profile
            if (window.pyebwaMemberProfile) {
                window.pyebwaMemberProfile.addDocument = () => this.showDocumentUploadModal();
                window.pyebwaMemberProfile.viewDocument = (docId) => this.viewDocument(docId);
                window.pyebwaMemberProfile.downloadDocument = (docId) => this.downloadDocument(docId);
            }
        },
        
        // Show document upload modal
        showDocumentUploadModal() {
            const modal = document.createElement('div');
            modal.className = 'document-upload-modal active';
            modal.innerHTML = `
                <div class="document-upload-content">
                    <div class="modal-header">
                        <h3>${t('uploadDocument') || 'Upload Document'}</h3>
                        <button class="modal-close" onclick="this.closest('.document-upload-modal').remove()">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                    
                    <div class="document-upload-body">
                        <!-- Document Type Selection -->
                        <div class="document-type-section">
                            <h4>${t('selectDocumentType') || 'Select Document Type'}</h4>
                            <div class="document-type-grid">
                                ${Object.entries(this.documentTypes).map(([key, type]) => `
                                    <button class="document-type-btn" data-type="${key}">
                                        <i class="material-icons">${type.icon}</i>
                                        <span>${t(key) || type.name}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Upload Area (hidden initially) -->
                        <div class="upload-section" style="display: none;">
                            <div class="selected-type-info">
                                <i class="material-icons"></i>
                                <span class="type-name"></span>
                            </div>
                            
                            <div class="document-upload-area" id="documentUploadArea">
                                <input type="file" id="documentFileInput" hidden>
                                <i class="material-icons">cloud_upload</i>
                                <h4>${t('dragDropDocument') || 'Drag & drop document here'}</h4>
                                <p>${t('orClickToSelectFile') || 'or click to select file'}</p>
                                <button class="btn btn-primary" onclick="event.stopPropagation(); document.getElementById('documentFileInput').click()">
                                    ${t('selectDocument') || 'Select Document'}
                                </button>
                            </div>
                            
                            <div class="document-preview" style="display: none;">
                                <div class="preview-content"></div>
                                <input type="text" class="document-title-input" 
                                       placeholder="${t('documentTitle') || 'Document title...'}" required>
                                <textarea class="document-notes-input" 
                                         placeholder="${t('additionalNotes') || 'Additional notes (optional)...'}"></textarea>
                                <div class="upload-actions">
                                    <button class="btn btn-secondary" onclick="pyebwaDocumentManager.resetUpload()">
                                        ${t('cancel') || 'Cancel'}
                                    </button>
                                    <button class="btn btn-primary" onclick="pyebwaDocumentManager.uploadDocument()">
                                        <i class="material-icons">upload</i>
                                        ${t('uploadDocument') || 'Upload Document'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Setup type selection
            modal.querySelectorAll('.document-type-btn').forEach(btn => {
                btn.addEventListener('click', () => this.selectDocumentType(btn.dataset.type));
            });
            
            // Store current member ID
            this.currentMemberId = window.pyebwaMemberProfile?.currentMemberId;
        },
        
        // Select document type
        selectDocumentType(type) {
            const modal = document.querySelector('.document-upload-modal');
            const typeConfig = this.documentTypes[type];
            
            // Hide type selection, show upload area
            modal.querySelector('.document-type-section').style.display = 'none';
            modal.querySelector('.upload-section').style.display = 'block';
            
            // Update selected type info
            modal.querySelector('.selected-type-info i').textContent = typeConfig.icon;
            modal.querySelector('.type-name').textContent = typeConfig.name;
            
            // Setup file input
            const fileInput = document.getElementById('documentFileInput');
            fileInput.accept = typeConfig.accept;
            
            // Setup upload area
            const uploadArea = document.getElementById('documentUploadArea');
            
            // Click to upload
            uploadArea.addEventListener('click', () => fileInput.click());
            
            // Drag and drop
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
                this.handleDocumentFile(e.dataTransfer.files[0], type);
            });
            
            // File input change
            fileInput.addEventListener('change', (e) => {
                this.handleDocumentFile(e.target.files[0], type);
            });
            
            // Store selected type
            modal.selectedType = type;
        },
        
        // Handle document file
        handleDocumentFile(file, type) {
            if (!file) return;
            
            const typeConfig = this.documentTypes[type];
            const modal = document.querySelector('.document-upload-modal');
            
            // Validate file type
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            if (!typeConfig.accept.includes(extension)) {
                if (window.showError) {
                    window.showError(`Invalid file type. Accepted types: ${typeConfig.accept}`);
                }
                return;
            }
            
            // Validate file size
            if (file.size > typeConfig.maxSize) {
                if (window.showError) {
                    window.showError(`File too large. Maximum size: ${this.formatFileSize(typeConfig.maxSize)}`);
                }
                return;
            }
            
            // Show preview
            const uploadArea = modal.querySelector('.document-upload-area').parentElement;
            uploadArea.style.display = 'none';
            
            const preview = modal.querySelector('.document-preview');
            preview.style.display = 'block';
            
            // Generate preview based on file type
            const previewContent = preview.querySelector('.preview-content');
            
            if (file.type.startsWith('image/')) {
                // Image preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewContent.innerHTML = `
                        <div class="document-image-preview">
                            <img src="${e.target.result}" alt="${file.name}">
                        </div>
                        <div class="document-info">
                            <i class="material-icons">${typeConfig.icon}</i>
                            <div>
                                <h4>${file.name}</h4>
                                <p>${this.formatFileSize(file.size)} • ${new Date().toLocaleDateString()}</p>
                            </div>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            } else if (file.type === 'application/pdf') {
                // PDF preview
                previewContent.innerHTML = `
                    <div class="document-pdf-preview">
                        <i class="material-icons">picture_as_pdf</i>
                        <div class="document-info">
                            <h4>${file.name}</h4>
                            <p>${this.formatFileSize(file.size)} • ${new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                `;
            } else {
                // Generic document preview
                previewContent.innerHTML = `
                    <div class="document-generic-preview">
                        <i class="material-icons">${typeConfig.icon}</i>
                        <div class="document-info">
                            <h4>${file.name}</h4>
                            <p>${this.formatFileSize(file.size)} • ${new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                `;
            }
            
            // Store file reference
            modal.selectedFile = file;
        },
        
        // Reset upload form
        resetUpload() {
            const modal = document.querySelector('.document-upload-modal');
            modal.querySelector('.upload-section').style.display = 'none';
            modal.querySelector('.document-type-section').style.display = 'block';
            modal.querySelector('.document-preview').style.display = 'none';
            modal.querySelector('.document-upload-area').parentElement.style.display = 'block';
            modal.selectedFile = null;
            modal.selectedType = null;
        },
        
        // Upload document
        async uploadDocument() {
            const modal = document.querySelector('.document-upload-modal');
            const file = modal.selectedFile;
            const type = modal.selectedType;
            const title = modal.querySelector('.document-title-input').value.trim();
            const notes = modal.querySelector('.document-notes-input').value.trim();
            
            if (!file || !type || !title) {
                if (window.showError) {
                    window.showError('Please provide a document title');
                }
                return;
            }
            
            const uploadBtn = modal.querySelector('.upload-actions .btn-primary');
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="material-icons rotating">sync</i> Uploading...';
            
            try {
                // Check if Firebase is initialized
                if (!window.firebase || !window.firebase.storage) {
                    throw new Error('Firebase Storage not initialized');
                }
                
                if (!window.userFamilyTreeId) {
                    throw new Error('No family tree selected');
                }
                
                // Upload to Firebase Storage
                const documentUrl = await this.uploadDocumentToStorage(file, type);
                
                // Create document record
                const documentData = {
                    url: documentUrl,
                    title: title,
                    type: type,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    notes: notes,
                    uploadedAt: firebase.firestore.Timestamp.now(),
                    uploadedBy: window.currentUser?.uid || 'anonymous'
                };
                
                // Add to member's documents
                await this.addDocumentToMember(documentData);
                
                if (window.showSuccess) {
                    window.showSuccess('Document uploaded successfully!');
                }
                
                // Close modal and refresh documents tab
                modal.remove();
                
                // Refresh member data
                if (window.pyebwaMemberProfile && this.currentMemberId) {
                    await this.reloadMemberData(this.currentMemberId);
                    window.pyebwaMemberProfile.switchTab('documents');
                }
                
            } catch (error) {
                console.error('Document upload error:', error);
                if (window.showError) {
                    window.showError(error.message || 'Failed to upload document');
                }
            } finally {
                if (uploadBtn) {
                    uploadBtn.disabled = false;
                    uploadBtn.innerHTML = '<i class="material-icons">upload</i> Upload Document';
                }
            }
        },
        
        // Upload document to Firebase Storage
        async uploadDocumentToStorage(file, type) {
            if (!window.firebase || !this.currentMemberId) {
                throw new Error('Firebase not initialized or member not selected');
            }
            
            const storage = firebase.storage();
            const timestamp = Date.now();
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
            const fileName = `familyTrees/${window.userFamilyTreeId}/documents/${this.currentMemberId}_${type}_${timestamp}_${cleanFileName}`;
            const storageRef = storage.ref(fileName);
            
            // Upload file with metadata
            const metadata = {
                contentType: file.type,
                uploadedBy: window.currentUser.uid,
                customMetadata: {
                    uploadedBy: window.currentUser.uid,
                    uploadedAt: new Date().toISOString(),
                    memberID: this.currentMemberId,
                    documentType: type,
                    familyTreeId: window.userFamilyTreeId
                }
            };
            
            const snapshot = await storageRef.put(file, metadata);
            const downloadURL = await snapshot.ref.getDownloadURL();
            return downloadURL;
        },
        
        // Add document to member
        async addDocumentToMember(documentData) {
            if (!this.currentMemberId) return;
            
            const memberRef = firebase.firestore()
                .collection('familyTrees')
                .doc(window.userFamilyTreeId)
                .collection('members')
                .doc(this.currentMemberId);
            
            // Get current documents array
            const doc = await memberRef.get();
            const memberData = doc.data();
            const currentDocuments = memberData?.documents || [];
            
            // Add new document with unique ID
            documentData.id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            currentDocuments.push(documentData);
            
            // Update member document
            await memberRef.update({
                documents: currentDocuments
            });
            
            // Update local cache
            const member = window.familyMembers.find(m => m.id === this.currentMemberId);
            if (member) {
                member.documents = currentDocuments;
            }
        },
        
        // View document
        async viewDocument(docId) {
            const member = window.familyMembers.find(m => m.id === window.pyebwaMemberProfile?.currentMemberId);
            if (!member) return;
            
            const document = member.documents?.find(d => d.id === docId);
            if (!document) return;
            
            // Create viewer modal
            const modal = document.createElement('div');
            modal.className = 'document-viewer-modal active';
            modal.innerHTML = `
                <div class="document-viewer-content">
                    <div class="viewer-header">
                        <h3>${document.title}</h3>
                        <div class="viewer-actions">
                            <button class="btn-icon" onclick="pyebwaDocumentManager.downloadDocument('${docId}')" title="Download">
                                <i class="material-icons">download</i>
                            </button>
                            <button class="btn-icon" onclick="this.closest('.document-viewer-modal').remove()" title="Close">
                                <i class="material-icons">close</i>
                            </button>
                        </div>
                    </div>
                    <div class="viewer-body">
                        ${this.getDocumentViewer(document)}
                    </div>
                    ${document.notes ? `
                        <div class="viewer-notes">
                            <h4>${t('notes') || 'Notes'}</h4>
                            <p>${document.notes}</p>
                        </div>
                    ` : ''}
                </div>
            `;
            
            document.body.appendChild(modal);
        },
        
        // Get appropriate viewer for document type
        getDocumentViewer(document) {
            if (document.fileType.startsWith('image/')) {
                return `<img src="${document.url}" alt="${document.title}" class="document-image-viewer">`;
            } else if (document.fileType === 'application/pdf') {
                return `
                    <iframe src="${document.url}" 
                            class="document-pdf-viewer"
                            width="100%" 
                            height="600px">
                    </iframe>
                `;
            } else {
                return `
                    <div class="document-preview-unavailable">
                        <i class="material-icons">description</i>
                        <p>${t('previewUnavailable') || 'Preview not available for this file type'}</p>
                        <button class="btn btn-primary" onclick="pyebwaDocumentManager.downloadDocument('${document.id}')">
                            <i class="material-icons">download</i>
                            ${t('downloadToView') || 'Download to View'}
                        </button>
                    </div>
                `;
            }
        },
        
        // Download document
        async downloadDocument(docId) {
            const member = window.familyMembers.find(m => m.id === window.pyebwaMemberProfile?.currentMemberId);
            if (!member) return;
            
            const document = member.documents?.find(d => d.id === docId);
            if (!document) return;
            
            try {
                // Create a temporary link and click it
                const link = document.createElement('a');
                link.href = document.url;
                link.download = document.fileName || document.title;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                if (window.showSuccess) {
                    window.showSuccess('Download started');
                }
            } catch (error) {
                console.error('Download error:', error);
                if (window.showError) {
                    window.showError('Failed to download document');
                }
            }
        },
        
        // Reload member data from Firestore
        async reloadMemberData(memberId) {
            try {
                const memberDoc = await firebase.firestore()
                    .collection('familyTrees')
                    .doc(window.userFamilyTreeId)
                    .collection('members')
                    .doc(memberId)
                    .get();
                
                if (memberDoc.exists) {
                    const updatedData = memberDoc.data();
                    
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
        
        // Helper functions
        formatFileSize(bytes) {
            if (!bytes) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    };
    
    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
        /* Document Upload Modal */
        .document-upload-modal {
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
        
        .document-upload-modal.active {
            display: flex;
        }
        
        .document-upload-content {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 700px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        
        .document-upload-body {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
        }
        
        /* Document Type Selection */
        .document-type-section h4 {
            margin: 0 0 20px 0;
            color: #333;
        }
        
        .document-type-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 12px;
        }
        
        .document-type-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px 10px;
            background: #f5f5f5;
            border: 2px solid transparent;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .document-type-btn:hover {
            background: #e8f0fe;
            border-color: var(--primary-color);
        }
        
        .document-type-btn i {
            font-size: 36px;
            color: #666;
            margin-bottom: 8px;
        }
        
        .document-type-btn span {
            font-size: 12px;
            text-align: center;
            color: #333;
        }
        
        /* Upload Section */
        .upload-section {
            animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        .selected-type-info {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: #f0f4f8;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .selected-type-info i {
            font-size: 24px;
            color: var(--primary-color);
        }
        
        .document-upload-area {
            border: 2px dashed #ddd;
            border-radius: 12px;
            padding: 40px 20px;
            text-align: center;
            transition: all 0.3s;
            cursor: pointer;
        }
        
        .document-upload-area.drag-over {
            border-color: var(--primary-color);
            background: rgba(0, 33, 125, 0.05);
        }
        
        .document-upload-area .material-icons {
            font-size: 64px;
            color: #999;
            margin-bottom: 16px;
        }
        
        .document-upload-area h4 {
            margin: 0 0 8px 0;
            font-size: 18px;
            color: #333;
        }
        
        .document-upload-area p {
            margin: 0 0 20px 0;
            color: #666;
        }
        
        /* Document Preview */
        .document-preview {
            animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .preview-content {
            margin-bottom: 20px;
        }
        
        .document-image-preview img {
            max-width: 100%;
            max-height: 300px;
            border-radius: 8px;
            margin-bottom: 16px;
        }
        
        .document-info {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: #f5f5f5;
            border-radius: 8px;
        }
        
        .document-info i {
            font-size: 36px;
            color: #666;
        }
        
        .document-info h4 {
            margin: 0 0 4px 0;
            font-size: 16px;
            color: #333;
        }
        
        .document-info p {
            margin: 0;
            font-size: 14px;
            color: #666;
        }
        
        .document-pdf-preview,
        .document-generic-preview {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 24px;
            background: #f5f5f5;
            border-radius: 8px;
        }
        
        .document-pdf-preview i,
        .document-generic-preview i {
            font-size: 64px;
            color: #666;
        }
        
        .document-title-input,
        .document-notes-input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            margin-bottom: 12px;
        }
        
        .document-notes-input {
            min-height: 80px;
            resize: vertical;
        }
        
        .upload-actions {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
        }
        
        /* Document Viewer Modal */
        .document-viewer-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 4000;
            padding: 20px;
        }
        
        .document-viewer-modal.active {
            display: flex;
        }
        
        .document-viewer-content {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 900px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        
        .viewer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .viewer-header h3 {
            margin: 0;
            font-size: 20px;
            color: #333;
        }
        
        .viewer-actions {
            display: flex;
            gap: 8px;
        }
        
        .viewer-body {
            flex: 1;
            overflow: auto;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
        }
        
        .document-image-viewer {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        
        .document-pdf-viewer {
            border: none;
            background: white;
        }
        
        .document-preview-unavailable {
            text-align: center;
            padding: 40px;
        }
        
        .document-preview-unavailable i {
            font-size: 64px;
            color: #999;
            margin-bottom: 16px;
        }
        
        .document-preview-unavailable p {
            color: #666;
            margin-bottom: 20px;
        }
        
        .viewer-notes {
            padding: 20px;
            border-top: 1px solid #e0e0e0;
            background: #f9f9f9;
        }
        
        .viewer-notes h4 {
            margin: 0 0 8px 0;
            font-size: 16px;
            color: #333;
        }
        
        .viewer-notes p {
            margin: 0;
            color: #666;
            white-space: pre-wrap;
        }
        
        /* Dark mode support */
        body.dark-mode .document-upload-content,
        body.dark-mode .document-viewer-content {
            background: #1a1a1a;
            color: #f0f0f0;
        }
        
        body.dark-mode .document-type-btn {
            background: #2a2a2a;
            color: #f0f0f0;
        }
        
        body.dark-mode .document-type-btn:hover {
            background: #3a3a3a;
        }
        
        body.dark-mode .document-upload-area {
            border-color: #444;
        }
        
        body.dark-mode .document-info,
        body.dark-mode .document-pdf-preview,
        body.dark-mode .document-generic-preview {
            background: #2a2a2a;
        }
        
        body.dark-mode .document-title-input,
        body.dark-mode .document-notes-input {
            background: #2a2a2a;
            border-color: #444;
            color: #f0f0f0;
        }
        
        body.dark-mode .viewer-header,
        body.dark-mode .viewer-notes {
            border-color: #444;
        }
        
        body.dark-mode .viewer-body {
            background: #2a2a2a;
        }
        
        /* Mobile responsive */
        @media (max-width: 768px) {
            .document-type-grid {
                grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
                gap: 8px;
            }
            
            .document-type-btn {
                padding: 15px 5px;
            }
            
            .document-type-btn i {
                font-size: 28px;
            }
            
            .document-type-btn span {
                font-size: 11px;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Initialize
    DocumentManager.init();
    
    // Export for use
    window.pyebwaDocumentManager = DocumentManager;
})();