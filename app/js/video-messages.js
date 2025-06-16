// Video Message Recording for Member Profiles
(function() {
    'use strict';
    
    const VideoMessages = {
        currentMemberId: null,
        mediaRecorder: null,
        recordedChunks: [],
        videoStream: null,
        recordingStartTime: null,
        maxDuration: 120, // 2 minutes max
        
        // Initialize video messages
        init() {
            // Add video message method to member profile
            if (window.pyebwaMemberProfile) {
                window.pyebwaMemberProfile.addVideoMessage = () => this.showVideoMessageModal();
                window.pyebwaMemberProfile.viewVideoMessage = (videoId) => this.viewVideoMessage(videoId);
                window.pyebwaMemberProfile.deleteVideoMessage = (videoId) => this.deleteVideoMessage(videoId);
            }
        },
        
        // Show video message modal
        showVideoMessageModal() {
            this.currentMemberId = window.pyebwaMemberProfile?.currentMemberId;
            
            const modal = document.createElement('div');
            modal.className = 'video-message-modal active';
            modal.id = 'videoMessageModal';
            modal.innerHTML = `
                <div class="video-message-content">
                    <div class="modal-header">
                        <h3>${t('recordVideoMessage') || 'Record Video Message'}</h3>
                        <button class="modal-close" onclick="pyebwaVideoMessages.closeModal()">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                    
                    <div class="video-message-body">
                        <!-- Video Preview -->
                        <div class="video-container">
                            <video id="videoPreview" autoplay muted playsinline></video>
                            <video id="recordedVideo" controls style="display: none;"></video>
                            
                            <div class="video-overlay" id="videoOverlay">
                                <div class="recording-indicator" style="display: none;">
                                    <i class="material-icons">fiber_manual_record</i>
                                    <span class="recording-time">00:00</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Video Info Form -->
                        <div class="video-info-form">
                            <div class="form-group">
                                <label>${t('videoTitle') || 'Title'} *</label>
                                <input type="text" id="videoTitle" 
                                       placeholder="${t('videoTitlePlaceholder') || 'e.g., Birthday wishes, Life advice...'}" 
                                       required>
                            </div>
                            
                            <div class="form-group">
                                <label>${t('videoDescription') || 'Description'}</label>
                                <textarea id="videoDescription" rows="3" 
                                          placeholder="${t('videoDescriptionPlaceholder') || 'Add a brief description...'}"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label>${t('videoPrivacy') || 'Who can see this video?'}</label>
                                <select id="videoPrivacy">
                                    <option value="family">${t('myEntireFamily') || 'My Entire Family'}</option>
                                    <option value="spouse_children">${t('mySpouseAndChildren') || 'My Spouse and Children'}</option>
                                    <option value="private">${t('onlyMe') || 'Only Me'}</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Controls -->
                        <div class="video-controls">
                            <button class="btn btn-secondary" id="setupBtn" onclick="pyebwaVideoMessages.setupCamera()">
                                <i class="material-icons">videocam</i>
                                ${t('setupCamera') || 'Setup Camera'}
                            </button>
                            
                            <button class="btn btn-primary" id="recordBtn" onclick="pyebwaVideoMessages.toggleRecording()" style="display: none;">
                                <i class="material-icons">videocam</i>
                                ${t('startRecording') || 'Start Recording'}
                            </button>
                            
                            <button class="btn btn-secondary" id="retakeBtn" onclick="pyebwaVideoMessages.retakeVideo()" style="display: none;">
                                <i class="material-icons">refresh</i>
                                ${t('retake') || 'Retake'}
                            </button>
                            
                            <button class="btn btn-primary" id="saveBtn" onclick="pyebwaVideoMessages.saveVideo()" style="display: none;" disabled>
                                <i class="material-icons">save</i>
                                ${t('saveVideo') || 'Save Video'}
                            </button>
                        </div>
                        
                        <div class="video-tips">
                            <p><i class="material-icons">info</i> ${t('videoTips') || 'Tips: Find good lighting, speak clearly, and keep it under 2 minutes.'}</p>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        },
        
        // Setup camera
        async setupCamera() {
            try {
                const constraints = {
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user'
                    },
                    audio: true
                };
                
                this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                const videoPreview = document.getElementById('videoPreview');
                videoPreview.srcObject = this.videoStream;
                
                // Update UI
                document.getElementById('setupBtn').style.display = 'none';
                document.getElementById('recordBtn').style.display = 'inline-flex';
                
            } catch (error) {
                console.error('Error accessing camera:', error);
                if (window.showError) {
                    window.showError(t('cameraAccessError') || 'Unable to access camera. Please check permissions.');
                }
            }
        },
        
        // Toggle recording
        toggleRecording() {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        },
        
        // Start recording
        startRecording() {
            this.recordedChunks = [];
            
            const options = {
                mimeType: 'video/webm;codecs=vp9,opus'
            };
            
            // Fallback for browsers that don't support vp9
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }
            
            try {
                this.mediaRecorder = new MediaRecorder(this.videoStream, options);
                
                this.mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        this.recordedChunks.push(event.data);
                    }
                };
                
                this.mediaRecorder.onstop = () => {
                    this.processRecording();
                };
                
                this.mediaRecorder.start();
                this.recordingStartTime = Date.now();
                
                // Update UI
                const recordBtn = document.getElementById('recordBtn');
                recordBtn.innerHTML = `
                    <i class="material-icons">stop</i>
                    ${t('stopRecording') || 'Stop Recording'}
                `;
                recordBtn.classList.add('recording');
                
                // Show recording indicator
                document.querySelector('.recording-indicator').style.display = 'flex';
                
                // Start timer
                this.startTimer();
                
                // Auto-stop after max duration
                this.recordingTimeout = setTimeout(() => {
                    this.stopRecording();
                }, this.maxDuration * 1000);
                
            } catch (error) {
                console.error('Error starting recording:', error);
                if (window.showError) {
                    window.showError(t('recordingError') || 'Error starting recording');
                }
            }
        },
        
        // Stop recording
        stopRecording() {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
                
                // Clear timeout
                if (this.recordingTimeout) {
                    clearTimeout(this.recordingTimeout);
                }
                
                // Stop timer
                if (this.timerInterval) {
                    clearInterval(this.timerInterval);
                }
                
                // Update UI
                const recordBtn = document.getElementById('recordBtn');
                recordBtn.style.display = 'none';
                recordBtn.classList.remove('recording');
                
                // Hide recording indicator
                document.querySelector('.recording-indicator').style.display = 'none';
            }
        },
        
        // Start timer
        startTimer() {
            const timerElement = document.querySelector('.recording-time');
            
            this.timerInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                // Show warning at 1:45
                if (elapsed === 105) {
                    timerElement.style.color = '#ff4444';
                }
            }, 100);
        },
        
        // Process recording
        processRecording() {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(blob);
            
            // Show recorded video
            const videoPreview = document.getElementById('videoPreview');
            const recordedVideo = document.getElementById('recordedVideo');
            
            videoPreview.style.display = 'none';
            recordedVideo.style.display = 'block';
            recordedVideo.src = videoUrl;
            
            // Stop camera stream
            if (this.videoStream) {
                this.videoStream.getTracks().forEach(track => track.stop());
            }
            
            // Update UI
            document.getElementById('retakeBtn').style.display = 'inline-flex';
            document.getElementById('saveBtn').style.display = 'inline-flex';
            
            // Enable save button if title is filled
            this.checkSaveEnabled();
            
            // Store blob for upload
            this.videoBlob = blob;
        },
        
        // Retake video
        retakeVideo() {
            // Reset UI
            document.getElementById('videoPreview').style.display = 'block';
            document.getElementById('recordedVideo').style.display = 'none';
            document.getElementById('retakeBtn').style.display = 'none';
            document.getElementById('saveBtn').style.display = 'none';
            
            // Clear recorded data
            this.recordedChunks = [];
            this.videoBlob = null;
            
            // Restart camera
            this.setupCamera();
        },
        
        // Check if save button should be enabled
        checkSaveEnabled() {
            const titleInput = document.getElementById('videoTitle');
            const saveBtn = document.getElementById('saveBtn');
            
            if (titleInput.value.trim() && this.videoBlob) {
                saveBtn.disabled = false;
            } else {
                saveBtn.disabled = true;
            }
        },
        
        // Save video
        async saveVideo() {
            const title = document.getElementById('videoTitle').value.trim();
            const description = document.getElementById('videoDescription').value.trim();
            const privacy = document.getElementById('videoPrivacy').value;
            
            if (!title || !this.videoBlob) {
                return;
            }
            
            try {
                // Show loading
                const saveBtn = document.getElementById('saveBtn');
                saveBtn.disabled = true;
                saveBtn.innerHTML = `<i class="material-icons">hourglass_empty</i> ${t('uploading') || 'Uploading...'}`;
                
                // Upload to Firebase Storage
                const storage = firebase.storage();
                const timestamp = Date.now();
                const fileName = `video_messages/${window.userFamilyTreeId}/${this.currentMemberId}/video_${timestamp}.webm`;
                const storageRef = storage.ref(fileName);
                
                const uploadTask = storageRef.put(this.videoBlob);
                
                // Monitor upload progress
                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        saveBtn.innerHTML = `<i class="material-icons">hourglass_empty</i> ${Math.round(progress)}%`;
                    },
                    (error) => {
                        console.error('Upload error:', error);
                        throw error;
                    }
                );
                
                // Wait for upload to complete
                await uploadTask;
                const downloadUrl = await storageRef.getDownloadURL();
                
                // Get video duration
                const duration = await this.getVideoDuration(this.videoBlob);
                
                // Create video message object
                const videoMessage = {
                    id: timestamp.toString(),
                    title: title,
                    description: description,
                    url: downloadUrl,
                    duration: duration,
                    privacy: privacy,
                    recordedAt: new Date().toISOString(),
                    recordedBy: window.currentUser?.uid || '',
                    recordedByName: window.currentUser?.displayName || ''
                };
                
                // Get current member data
                const member = window.pyebwaMemberProfile.currentMember;
                if (!member.videoMessages) {
                    member.videoMessages = [];
                }
                
                // Add video message
                member.videoMessages.push(videoMessage);
                
                // Update member in Firestore
                await window.updateFamilyMember(this.currentMemberId, {
                    videoMessages: member.videoMessages
                });
                
                // Show success
                if (window.showSuccess) {
                    window.showSuccess(t('videoSaved') || 'Video message saved successfully!');
                }
                
                // Close modal
                this.closeModal();
                
                // Refresh the profile view if on videos tab
                const activeTab = document.querySelector('.profile-tab.active')?.dataset.tab;
                if (activeTab === 'videos') {
                    window.pyebwaMemberProfile.loadVideos(document.getElementById('videos-tab'));
                }
                
            } catch (error) {
                console.error('Error saving video:', error);
                if (window.showError) {
                    window.showError(t('errorSavingVideo') || 'Error saving video message');
                }
                
                // Reset save button
                const saveBtn = document.getElementById('saveBtn');
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<i class="material-icons">save</i> ${t('saveVideo') || 'Save Video'}`;
            }
        },
        
        // Get video duration
        getVideoDuration(blob) {
            return new Promise((resolve) => {
                const video = document.createElement('video');
                video.onloadedmetadata = () => {
                    resolve(Math.floor(video.duration));
                    URL.revokeObjectURL(video.src);
                };
                video.src = URL.createObjectURL(blob);
            });
        },
        
        // View video message
        viewVideoMessage(videoId) {
            const member = window.pyebwaMemberProfile.currentMember;
            const video = member.videoMessages?.find(v => v.id === videoId);
            
            if (!video) return;
            
            const modal = document.createElement('div');
            modal.className = 'video-view-modal active';
            modal.innerHTML = `
                <div class="video-view-content">
                    <button class="modal-close" onclick="this.closest('.video-view-modal').remove()">
                        <i class="material-icons">close</i>
                    </button>
                    
                    <div class="video-player">
                        <video controls autoplay>
                            <source src="${video.url}" type="video/webm">
                            ${t('browserNotSupported') || 'Your browser does not support video playback.'}
                        </video>
                    </div>
                    
                    <div class="video-info">
                        <h3>${video.title}</h3>
                        ${video.description ? `<p>${video.description}</p>` : ''}
                        <div class="video-meta">
                            <span><i class="material-icons">person</i> ${video.recordedByName}</span>
                            <span><i class="material-icons">schedule</i> ${this.formatDuration(video.duration)}</span>
                            <span><i class="material-icons">calendar_today</i> ${this.formatDate(video.recordedAt)}</span>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        },
        
        // Delete video message
        async deleteVideoMessage(videoId) {
            if (!confirm(t('confirmDeleteVideo') || 'Are you sure you want to delete this video message?')) {
                return;
            }
            
            try {
                const member = window.pyebwaMemberProfile.currentMember;
                const videoIndex = member.videoMessages?.findIndex(v => v.id === videoId);
                
                if (videoIndex === -1) return;
                
                const video = member.videoMessages[videoIndex];
                
                // Delete from Storage
                if (video.url) {
                    try {
                        const storage = firebase.storage();
                        const storageRef = storage.refFromURL(video.url);
                        await storageRef.delete();
                    } catch (error) {
                        console.error('Error deleting video file:', error);
                    }
                }
                
                // Remove from array
                member.videoMessages.splice(videoIndex, 1);
                
                // Update in Firestore
                await window.updateFamilyMember(this.currentMemberId, {
                    videoMessages: member.videoMessages
                });
                
                // Refresh videos tab
                window.pyebwaMemberProfile.loadVideos(document.getElementById('videos-tab'));
                
                if (window.showSuccess) {
                    window.showSuccess(t('videoDeleted') || 'Video message deleted successfully');
                }
                
            } catch (error) {
                console.error('Error deleting video:', error);
                if (window.showError) {
                    window.showError(t('errorDeletingVideo') || 'Error deleting video message');
                }
            }
        },
        
        // Format duration
        formatDuration(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        },
        
        // Format date
        formatDate(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleDateString(window.currentLanguage || 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        },
        
        // Close modal
        closeModal() {
            // Stop any active streams
            if (this.videoStream) {
                this.videoStream.getTracks().forEach(track => track.stop());
            }
            
            // Clear intervals
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            if (this.recordingTimeout) {
                clearTimeout(this.recordingTimeout);
            }
            
            // Remove modal
            const modal = document.getElementById('videoMessageModal');
            if (modal) {
                modal.remove();
            }
            
            // Reset state
            this.mediaRecorder = null;
            this.recordedChunks = [];
            this.videoStream = null;
            this.videoBlob = null;
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => VideoMessages.init());
    } else {
        VideoMessages.init();
    }
    
    // Export for global access
    window.pyebwaVideoMessages = VideoMessages;
    
    // Add event listener for title input
    document.addEventListener('input', (e) => {
        if (e.target.id === 'videoTitle') {
            VideoMessages.checkSaveEnabled();
        }
    });
})();