// Enhanced 3-Step Onboarding Flow for Pyebwa Fanmi
(function() {
    'use strict';
    
    const OnboardingFlow = {
        currentStep: 1,
        totalSteps: 3,
        onboardingData: {
            fullName: '',
            email: '',
            country: '',
            language: '',
            familyName: '',
            familyRegion: '',
            startChoice: 'me', // 'me' or 'ancestors'
            familyMembers: [],
            startedAt: null,
            completedAt: null
        },
        autoSaveTimer: null,
        
        // Initialize onboarding
        init() {
            // Detect browser language
            const browserLang = navigator.language || navigator.userLanguage;
            let detectedLang = 'en'; // default
            
            if (browserLang.startsWith('fr')) {
                detectedLang = 'fr';
            } else if (browserLang.startsWith('ht') || browserLang.includes('HT')) {
                detectedLang = 'ht';
            }
            
            this.onboardingData.language = detectedLang;
            
            // Pre-fill user data if available
            if (window.currentUser) {
                this.onboardingData.email = window.currentUser.email || '';
                this.onboardingData.fullName = window.currentUser.displayName || '';
            }
            
            this.onboardingData.startedAt = new Date().toISOString();
            
            // Load any saved progress
            this.loadProgress();
            
            // Create and show onboarding modal
            this.createOnboardingModal();
            this.showStep(this.currentStep);
            
            // Set language immediately
            if (this.onboardingData.language && window.setLanguage) {
                window.setLanguage(this.onboardingData.language);
            }
        },
        
        // Create the onboarding modal structure
        createOnboardingModal() {
            const modal = document.createElement('div');
            modal.id = 'onboardingFlowModal';
            modal.className = 'onboarding-flow-modal';
            modal.innerHTML = `
                <div class="onboarding-flow-container">
                    <!-- Progress Bar -->
                    <div class="onboarding-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 33.33%"></div>
                        </div>
                        <div class="progress-text">
                            <span class="step-counter">1 ${t('of') || 'of'} 3</span>
                        </div>
                    </div>
                    
                    <!-- Step Content -->
                    <div class="onboarding-content">
                        <!-- Step 1: Welcome & Family Setup -->
                        <div class="onboarding-step step-1 active" data-step="1">
                            <h2 class="step-title">${t('welcomeToPyebwaFanmi') || 'Welcome to Pyebwa Fanmi!'}</h2>
                            <p class="step-subtitle">${t('letsSetupYourFamilyTree') || "Let's set up your family tree"}</p>
                            
                            <form class="onboarding-form" id="step1Form">
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label for="fullName">${t('yourFullName') || 'Your Full Name'} *</label>
                                        <input type="text" id="fullName" name="fullName" required 
                                               value="${this.onboardingData.fullName}"
                                               placeholder="${t('enterYourFullName') || 'Enter your full name'}">
                                        <span class="error-message"></span>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="email">${t('email') || 'Email'}</label>
                                        <input type="email" id="email" name="email" 
                                               value="${this.onboardingData.email}" readonly>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="country">${t('country') || 'Country'}</label>
                                        <select id="country" name="country">
                                            <option value="">${t('selectCountry') || 'Select country'}</option>
                                            <option value="Haiti" ${this.onboardingData.country === 'Haiti' ? 'selected' : ''}>Haiti</option>
                                            <option value="United States">United States</option>
                                            <option value="Canada">Canada</option>
                                            <option value="France">France</option>
                                            <option value="Dominican Republic">Dominican Republic</option>
                                            <option value="Jamaica">Jamaica</option>
                                            <option value="Bahamas">Bahamas</option>
                                            <option value="Other">${t('other') || 'Other'}</option>
                                        </select>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="language">${t('preferredLanguage') || 'Preferred Language'}</label>
                                        <select id="language" name="language" onchange="pyebwaOnboarding.changeLanguage(this.value)">
                                            <option value="en" ${this.onboardingData.language === 'en' ? 'selected' : ''}>English</option>
                                            <option value="ht" ${this.onboardingData.language === 'ht' ? 'selected' : ''}>Kreyòl Ayisyen</option>
                                            <option value="fr" ${this.onboardingData.language === 'fr' ? 'selected' : ''}>Français</option>
                                        </select>
                                    </div>
                                    
                                    <div class="form-group full-width">
                                        <label for="familyName">${t('whatIsYourFamilyName') || 'What is your family name?'} *</label>
                                        <input type="text" id="familyName" name="familyName" required 
                                               value="${this.onboardingData.familyName}"
                                               placeholder="${t('enterFamilyName') || 'e.g., The Pierre Family'}">
                                        <span class="error-message"></span>
                                    </div>
                                    
                                    <div class="form-group full-width">
                                        <label for="familyRegion">${t('familyRegionOfOrigin') || "Family's region of origin"}</label>
                                        <select id="familyRegion" name="familyRegion">
                                            <option value="">${t('selectRegion') || 'Select region'}</option>
                                            <optgroup label="${t('haitianDepartments') || 'Haitian Departments'}">
                                                <option value="Artibonite">Artibonite</option>
                                                <option value="Centre">Centre</option>
                                                <option value="Grand'Anse">Grand'Anse</option>
                                                <option value="Nippes">Nippes</option>
                                                <option value="Nord">Nord</option>
                                                <option value="Nord-Est">Nord-Est</option>
                                                <option value="Nord-Ouest">Nord-Ouest</option>
                                                <option value="Ouest">Ouest</option>
                                                <option value="Sud">Sud</option>
                                                <option value="Sud-Est">Sud-Est</option>
                                            </optgroup>
                                            <option value="Other">${t('other') || 'Other'}</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="start-choice">
                                    <p class="choice-label">${t('howWouldYouLikeToStart') || 'How would you like to start?'}</p>
                                    <div class="choice-buttons">
                                        <button type="button" class="choice-btn ${this.onboardingData.startChoice === 'me' ? 'active' : ''}" 
                                                data-choice="me" onclick="pyebwaOnboarding.setStartChoice('me')">
                                            <i class="material-icons">person</i>
                                            <span>${t('startWithMe') || 'Start with me'}</span>
                                        </button>
                                        <button type="button" class="choice-btn ${this.onboardingData.startChoice === 'ancestors' ? 'active' : ''}" 
                                                data-choice="ancestors" onclick="pyebwaOnboarding.setStartChoice('ancestors')">
                                            <i class="material-icons">family_restroom</i>
                                            <span>${t('startWithMyAncestors') || 'Start with my ancestors'}</span>
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <!-- Step 2: Add First Family Members -->
                        <div class="onboarding-step step-2" data-step="2">
                            <h2 class="step-title">${t('letsAddYourFirstFamilyMembers') || "Let's add your first family members"}</h2>
                            <p class="step-subtitle">${t('addAtLeast2Members') || 'Add at least 2-3 members to see family connections'}</p>
                            
                            <div class="members-container">
                                <div class="members-form" id="membersForm">
                                    <!-- Members will be added dynamically -->
                                </div>
                                
                                <button type="button" class="btn btn-secondary add-member-btn" onclick="pyebwaOnboarding.addMemberForm()">
                                    <i class="material-icons">add</i>
                                    ${t('addAnotherMember') || 'Add another member'}
                                </button>
                            </div>
                            
                            <div class="tree-preview">
                                <h3>${t('preview') || 'Preview'}</h3>
                                <div id="miniTreePreview" class="mini-tree-container">
                                    <!-- Mini tree visualization will be rendered here -->
                                </div>
                            </div>
                        </div>
                        
                        <!-- Step 3: Interactive Tutorial -->
                        <div class="onboarding-step step-3" data-step="3">
                            <div class="tutorial-header">
                                <h2 class="step-title">${t('quickTour') || 'Quick Tour'}</h2>
                                <button type="button" class="skip-tutorial-btn" onclick="pyebwaOnboarding.skipTutorial()">
                                    ${t('skipTutorial') || 'Skip Tutorial'}
                                </button>
                            </div>
                            
                            <div class="tutorial-content">
                                <div class="sample-tree-container">
                                    <div id="sampleFamilyTree" class="sample-tree">
                                        <!-- Interactive sample tree will be rendered here -->
                                    </div>
                                </div>
                                
                                <div class="tutorial-tips">
                                    <div class="tip-card active" data-feature="add-members">
                                        <i class="material-icons">person_add</i>
                                        <h4>${t('howToAddMembers') || 'How to add members'}</h4>
                                        <p>${t('clickAddMemberButton') || 'Click the "Add Member" button to add family members to your tree'}</p>
                                    </div>
                                    
                                    <div class="tip-card" data-feature="connect-relationships">
                                        <i class="material-icons">link</i>
                                        <h4>${t('howToConnectRelationships') || 'How to connect relationships'}</h4>
                                        <p>${t('selectRelationshipType') || 'Select the relationship type when adding members to create connections'}</p>
                                    </div>
                                    
                                    <div class="tip-card" data-feature="upload-photos">
                                        <i class="material-icons">photo_camera</i>
                                        <h4>${t('howToUploadPhotos') || 'How to upload photos'}</h4>
                                        <p>${t('clickCameraIcon') || 'Click the camera icon on any member to add their photo'}</p>
                                    </div>
                                    
                                    <div class="tip-card" data-feature="share-tree">
                                        <i class="material-icons">share</i>
                                        <h4>${t('howToShareTree') || 'How to share your tree'}</h4>
                                        <p>${t('useShareButton') || 'Use the share button to invite family members to view or edit'}</p>
                                    </div>
                                    
                                    <div class="tip-card" data-feature="switch-languages">
                                        <i class="material-icons">language</i>
                                        <h4>${t('howToSwitchLanguages') || 'How to switch languages'}</h4>
                                        <p>${t('changeLanguageAnytime') || 'Change language anytime from the settings menu'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Navigation -->
                    <div class="onboarding-navigation">
                        <button type="button" class="btn btn-text back-btn" onclick="pyebwaOnboarding.previousStep()" style="display: none;">
                            <i class="material-icons">arrow_back</i>
                            ${t('back') || 'Back'}
                        </button>
                        
                        <button type="button" class="btn btn-primary next-btn" onclick="pyebwaOnboarding.nextStep()">
                            ${t('next') || 'Next'}
                            <i class="material-icons">arrow_forward</i>
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add initial member form if step 2
            if (this.onboardingData.familyMembers.length === 0) {
                this.addMemberForm();
                this.addMemberForm();
            }
        },
        
        // Show specific step
        showStep(stepNum) {
            // Update current step
            this.currentStep = stepNum;
            
            // Update progress bar
            const progressFill = document.querySelector('.progress-fill');
            const stepCounter = document.querySelector('.step-counter');
            progressFill.style.width = `${(stepNum / this.totalSteps) * 100}%`;
            stepCounter.textContent = `${stepNum} ${t('of') || 'of'} ${this.totalSteps}`;
            
            // Show/hide steps
            document.querySelectorAll('.onboarding-step').forEach(step => {
                step.classList.remove('active');
            });
            document.querySelector(`.onboarding-step[data-step="${stepNum}"]`).classList.add('active');
            
            // Update navigation buttons
            const backBtn = document.querySelector('.back-btn');
            const nextBtn = document.querySelector('.next-btn');
            
            backBtn.style.display = stepNum > 1 ? 'flex' : 'none';
            
            if (stepNum === this.totalSteps) {
                nextBtn.innerHTML = `${t('finishTour') || 'Finish Tour'} <i class="material-icons">check</i>`;
            } else {
                nextBtn.innerHTML = `${t('next') || 'Next'} <i class="material-icons">arrow_forward</i>`;
            }
            
            // Auto-save progress
            this.autoSave();
            
            // Initialize step-specific features
            if (stepNum === 2) {
                this.updateMiniTreePreview();
            } else if (stepNum === 3) {
                this.initializeTutorial();
            }
        },
        
        // Navigate to next step
        nextStep() {
            // Validate current step
            if (!this.validateStep(this.currentStep)) {
                return;
            }
            
            if (this.currentStep < this.totalSteps) {
                this.showStep(this.currentStep + 1);
            } else {
                this.completeOnboarding();
            }
        },
        
        // Navigate to previous step
        previousStep() {
            if (this.currentStep > 1) {
                this.showStep(this.currentStep - 1);
            }
        },
        
        // Validate step data
        validateStep(stepNum) {
            if (stepNum === 1) {
                const form = document.getElementById('step1Form');
                const fullName = form.fullName.value.trim();
                const familyName = form.familyName.value.trim();
                
                let isValid = true;
                
                // Validate full name
                if (!fullName) {
                    this.showFieldError('fullName', t('fullNameRequired') || 'Full name is required');
                    isValid = false;
                } else {
                    this.clearFieldError('fullName');
                }
                
                // Validate family name
                if (!familyName) {
                    this.showFieldError('familyName', t('familyNameRequired') || 'Family name is required');
                    isValid = false;
                } else {
                    this.clearFieldError('familyName');
                }
                
                if (isValid) {
                    // Save form data
                    this.onboardingData.fullName = fullName;
                    this.onboardingData.email = form.email.value;
                    this.onboardingData.country = form.country.value;
                    this.onboardingData.language = form.language.value;
                    this.onboardingData.familyName = familyName;
                    this.onboardingData.familyRegion = form.familyRegion.value;
                    this.autoSave();
                }
                
                return isValid;
            } else if (stepNum === 2) {
                // Validate at least 2 members added
                const validMembers = this.onboardingData.familyMembers.filter(m => m.fullName && m.fullName.trim());
                if (validMembers.length < 2) {
                    if (window.showError) {
                        window.showError(t('addAtLeast2Members') || 'Please add at least 2 family members');
                    }
                    return false;
                }
                return true;
            }
            
            return true;
        },
        
        // Show field error
        showFieldError(fieldId, message) {
            const field = document.getElementById(fieldId);
            const errorEl = field.parentElement.querySelector('.error-message');
            field.classList.add('error');
            if (errorEl) {
                errorEl.textContent = message;
            }
        },
        
        // Clear field error
        clearFieldError(fieldId) {
            const field = document.getElementById(fieldId);
            const errorEl = field.parentElement.querySelector('.error-message');
            field.classList.remove('error');
            if (errorEl) {
                errorEl.textContent = '';
            }
        },
        
        // Change language
        changeLanguage(lang) {
            this.onboardingData.language = lang;
            if (window.setLanguage) {
                window.setLanguage(lang);
                // Refresh the onboarding UI with new translations
                this.refreshUI();
            }
            this.autoSave();
        },
        
        // Set start choice
        setStartChoice(choice) {
            this.onboardingData.startChoice = choice;
            document.querySelectorAll('.choice-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.choice === choice);
            });
            this.autoSave();
        },
        
        // Add member form
        addMemberForm() {
            const container = document.getElementById('membersForm');
            const memberIndex = container.children.length;
            
            const memberDiv = document.createElement('div');
            memberDiv.className = 'member-form-item';
            memberDiv.dataset.index = memberIndex;
            
            // Get relationship options based on existing members
            const relationshipOptions = this.getRelationshipOptions(memberIndex);
            
            memberDiv.innerHTML = `
                <div class="member-header">
                    <h4>${t('member') || 'Member'} ${memberIndex + 1}</h4>
                    ${memberIndex >= 2 ? `
                        <button type="button" class="remove-member-btn" onclick="pyebwaOnboarding.removeMember(${memberIndex})">
                            <i class="material-icons">close</i>
                        </button>
                    ` : ''}
                </div>
                <div class="member-fields">
                    <div class="form-group">
                        <label>${t('fullName') || 'Full Name'} *</label>
                        <input type="text" name="memberName_${memberIndex}" 
                               placeholder="${t('enterFullName') || 'Enter full name'}"
                               onchange="pyebwaOnboarding.updateMember(${memberIndex}, 'fullName', this.value)">
                    </div>
                    
                    ${memberIndex > 0 ? `
                        <div class="form-group">
                            <label>${t('relationshipTo') || 'Relationship to'}</label>
                            <select name="relationship_${memberIndex}" onchange="pyebwaOnboarding.updateMember(${memberIndex}, 'relationship', this.value)">
                                <option value="">${t('selectRelationship') || 'Select relationship'}</option>
                                ${relationshipOptions}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>${t('relatedTo') || 'Related to'}</label>
                            <select name="relatedTo_${memberIndex}" onchange="pyebwaOnboarding.updateMember(${memberIndex}, 'relatedTo', this.value)">
                                <option value="">${t('selectPerson') || 'Select person'}</option>
                                ${this.getExistingMembersOptions(memberIndex)}
                            </select>
                        </div>
                    ` : ''}
                    
                    <div class="form-group">
                        <label>${t('birthYear') || 'Birth Year'}</label>
                        <input type="number" name="birthYear_${memberIndex}" 
                               placeholder="${t('optional') || 'Optional'}"
                               min="1800" max="${new Date().getFullYear()}"
                               onchange="pyebwaOnboarding.updateMember(${memberIndex}, 'birthYear', this.value)">
                    </div>
                    
                    <div class="form-group">
                        <label>${t('photo') || 'Photo'}</label>
                        <div class="photo-upload-compact">
                            <input type="file" id="photo_${memberIndex}" accept="image/*" style="display: none;"
                                   onchange="pyebwaOnboarding.handlePhotoUpload(${memberIndex}, this.files[0])">
                            <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('photo_${memberIndex}').click()">
                                <i class="material-icons">photo_camera</i>
                                ${t('uploadPhoto') || 'Upload Photo'}
                            </button>
                            <div class="photo-preview" id="photoPreview_${memberIndex}"></div>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(memberDiv);
            
            // Initialize member data if not exists
            if (!this.onboardingData.familyMembers[memberIndex]) {
                this.onboardingData.familyMembers[memberIndex] = {
                    fullName: '',
                    relationship: '',
                    relatedTo: '',
                    birthYear: '',
                    photoUrl: ''
                };
            }
        },
        
        // Get relationship options
        getRelationshipOptions(memberIndex) {
            const baseOptions = `
                <option value="parent">${t('parent') || 'Parent'}</option>
                <option value="child">${t('child') || 'Child'}</option>
                <option value="spouse">${t('spouse') || 'Spouse'}</option>
                <option value="sibling">${t('sibling') || 'Sibling'}</option>
            `;
            
            // Add more options based on start choice
            if (this.onboardingData.startChoice === 'ancestors') {
                return baseOptions + `
                    <option value="grandparent">${t('grandparent') || 'Grandparent'}</option>
                    <option value="grandchild">${t('grandchild') || 'Grandchild'}</option>
                `;
            }
            
            return baseOptions;
        },
        
        // Get existing members for relationship dropdown
        getExistingMembersOptions(currentIndex) {
            let options = '';
            
            // Add "Me" option if starting with self
            if (this.onboardingData.startChoice === 'me') {
                options += `<option value="me">${t('me') || 'Me'} (${this.onboardingData.fullName})</option>`;
            }
            
            // Add other members
            this.onboardingData.familyMembers.forEach((member, index) => {
                if (index < currentIndex && member.fullName) {
                    options += `<option value="${index}">${member.fullName}</option>`;
                }
            });
            
            return options;
        },
        
        // Update member data
        updateMember(index, field, value) {
            if (!this.onboardingData.familyMembers[index]) {
                this.onboardingData.familyMembers[index] = {};
            }
            this.onboardingData.familyMembers[index][field] = value;
            this.autoSave();
            this.updateMiniTreePreview();
        },
        
        // Remove member
        removeMember(index) {
            const container = document.getElementById('membersForm');
            const memberDiv = container.querySelector(`[data-index="${index}"]`);
            if (memberDiv) {
                memberDiv.remove();
            }
            
            // Remove from data array
            this.onboardingData.familyMembers.splice(index, 1);
            
            // Re-index remaining members
            container.querySelectorAll('.member-form-item').forEach((item, newIndex) => {
                item.dataset.index = newIndex;
                item.querySelector('.member-header h4').textContent = `${t('member') || 'Member'} ${newIndex + 1}`;
            });
            
            this.autoSave();
            this.updateMiniTreePreview();
        },
        
        // Handle photo upload
        async handlePhotoUpload(index, file) {
            if (!file || !file.type.startsWith('image/')) {
                return;
            }
            
            try {
                // Show loading state
                const previewEl = document.getElementById(`photoPreview_${index}`);
                previewEl.innerHTML = '<div class="photo-loading">Uploading...</div>';
                
                // Create a temporary URL for preview
                const tempUrl = URL.createObjectURL(file);
                
                // Upload to Firebase Storage
                const storage = firebase.storage();
                const timestamp = Date.now();
                const fileName = `onboarding/${window.currentUser.uid}/member_${index}_${timestamp}.jpg`;
                const storageRef = storage.ref(fileName);
                
                const snapshot = await storageRef.put(file);
                const downloadUrl = await snapshot.ref.getDownloadURL();
                
                // Update member data
                this.onboardingData.familyMembers[index].photoUrl = downloadUrl;
                
                // Show preview
                previewEl.innerHTML = `<img src="${downloadUrl}" alt="Member photo">`;
                
                // Clean up temp URL
                URL.revokeObjectURL(tempUrl);
                
                this.autoSave();
            } catch (error) {
                console.error('Error uploading photo:', error);
                if (window.showError) {
                    window.showError(t('errorUploadingPhoto') || 'Error uploading photo');
                }
            }
        },
        
        // Update mini tree preview
        updateMiniTreePreview() {
            const container = document.getElementById('miniTreePreview');
            if (!container) return;
            
            // Get valid members
            const members = this.onboardingData.familyMembers.filter(m => m.fullName);
            
            if (members.length === 0) {
                container.innerHTML = `<p class="empty-preview">${t('addMembersToSeePreview') || 'Add members to see preview'}</p>`;
                return;
            }
            
            // Create simple visual representation
            let html = '<div class="mini-tree">';
            
            // Add user if starting with self
            if (this.onboardingData.startChoice === 'me') {
                html += `
                    <div class="tree-node me">
                        <div class="node-content">
                            <i class="material-icons">person</i>
                            <span>${t('me') || 'Me'}</span>
                        </div>
                    </div>
                `;
            }
            
            // Add family members
            members.forEach((member, index) => {
                if (member.fullName) {
                    html += `
                        <div class="tree-node">
                            <div class="node-content">
                                ${member.photoUrl ? 
                                    `<img src="${member.photoUrl}" alt="${member.fullName}">` : 
                                    '<i class="material-icons">person</i>'
                                }
                                <span>${member.fullName}</span>
                            </div>
                        </div>
                    `;
                }
            });
            
            html += '</div>';
            container.innerHTML = html;
        },
        
        // Initialize tutorial
        initializeTutorial() {
            // Create sample tree visualization
            const sampleTree = document.getElementById('sampleFamilyTree');
            sampleTree.innerHTML = `
                <div class="sample-tree-visual">
                    <div class="tree-member grandparent">
                        <img src="/app/images/default-avatar.svg" alt="Grandparent">
                        <span>Marie Pierre</span>
                    </div>
                    <div class="tree-connection"></div>
                    <div class="tree-member parent highlight">
                        <img src="/app/images/default-avatar.svg" alt="Parent">
                        <span>Jean Pierre</span>
                        <div class="tooltip">
                            <i class="material-icons">info</i>
                            ${t('clickToViewProfile') || 'Click to view profile'}
                        </div>
                    </div>
                    <div class="tree-member you">
                        <img src="/app/images/default-avatar.svg" alt="You">
                        <span>${t('you') || 'You'}</span>
                    </div>
                </div>
            `;
            
            // Activate tutorial tips in sequence
            let currentTip = 0;
            const tips = document.querySelectorAll('.tip-card');
            
            const showNextTip = () => {
                tips.forEach(tip => tip.classList.remove('active'));
                if (currentTip < tips.length) {
                    tips[currentTip].classList.add('active');
                    currentTip++;
                    setTimeout(showNextTip, 3000);
                } else {
                    // Reset to first tip
                    currentTip = 0;
                    tips[0].classList.add('active');
                }
            };
            
            // Start tip rotation
            setTimeout(showNextTip, 1000);
        },
        
        // Skip tutorial
        skipTutorial() {
            this.completeOnboarding();
        },
        
        // Auto-save progress
        autoSave() {
            // Clear existing timer
            if (this.autoSaveTimer) {
                clearTimeout(this.autoSaveTimer);
            }
            
            // Set new timer
            this.autoSaveTimer = setTimeout(async () => {
                try {
                    // Save to Firestore
                    if (window.currentUser && window.db) {
                        await window.db.collection('users').doc(window.currentUser.uid).update({
                            onboardingProgress: {
                                currentStep: this.currentStep,
                                data: this.onboardingData,
                                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                            }
                        });
                    }
                    
                    // Save to localStorage as backup
                    localStorage.setItem('pyebwaOnboardingProgress', JSON.stringify({
                        currentStep: this.currentStep,
                        data: this.onboardingData
                    }));
                } catch (error) {
                    console.error('Error auto-saving onboarding progress:', error);
                }
            }, 1000); // Save after 1 second of inactivity
        },
        
        // Load saved progress
        async loadProgress() {
            try {
                // Try to load from Firestore first
                if (window.currentUser && window.db) {
                    const userDoc = await window.db.collection('users').doc(window.currentUser.uid).get();
                    if (userDoc.exists && userDoc.data().onboardingProgress) {
                        const progress = userDoc.data().onboardingProgress;
                        this.currentStep = progress.currentStep || 1;
                        this.onboardingData = { ...this.onboardingData, ...progress.data };
                        return;
                    }
                }
                
                // Fallback to localStorage
                const saved = localStorage.getItem('pyebwaOnboardingProgress');
                if (saved) {
                    const progress = JSON.parse(saved);
                    this.currentStep = progress.currentStep || 1;
                    this.onboardingData = { ...this.onboardingData, ...progress.data };
                }
            } catch (error) {
                console.error('Error loading onboarding progress:', error);
            }
        },
        
        // Complete onboarding
        async completeOnboarding() {
            try {
                this.onboardingData.completedAt = new Date().toISOString();
                
                // Show loading
                if (window.showLoadingState) {
                    window.showLoadingState(t('settingUpYourFamilyTree') || 'Setting up your family tree...');
                }
                
                // Update user profile
                await window.db.collection('users').doc(window.currentUser.uid).update({
                    fullName: this.onboardingData.fullName,
                    displayName: this.onboardingData.fullName,
                    country: this.onboardingData.country,
                    language: this.onboardingData.language,
                    onboardingComplete: true,
                    onboardingData: this.onboardingData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Update Firebase Auth display name
                if (window.currentUser) {
                    await window.currentUser.updateProfile({
                        displayName: this.onboardingData.fullName
                    });
                }
                
                // Create family tree with initial members
                if (this.onboardingData.familyMembers.length > 0) {
                    // Add the user as the first member if starting with self
                    if (this.onboardingData.startChoice === 'me') {
                        const userMember = {
                            firstName: this.onboardingData.fullName.split(' ')[0],
                            lastName: this.onboardingData.fullName.split(' ').slice(1).join(' '),
                            email: this.onboardingData.email,
                            userId: window.currentUser.uid,
                            isMainPerson: true,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        
                        if (window.addFamilyMember) {
                            await window.addFamilyMember(userMember);
                        }
                    }
                    
                    // Add other family members
                    for (const member of this.onboardingData.familyMembers) {
                        if (member.fullName) {
                            const nameParts = member.fullName.split(' ');
                            const memberData = {
                                firstName: nameParts[0],
                                lastName: nameParts.slice(1).join(' '),
                                birthDate: member.birthYear ? `${member.birthYear}-01-01` : '',
                                photoUrl: member.photoUrl || '',
                                relationship: member.relationship || '',
                                relatedTo: member.relatedTo || '',
                                createdAt: firebase.firestore.FieldValue.serverTimestamp()
                            };
                            
                            if (window.addFamilyMember) {
                                await window.addFamilyMember(memberData);
                            }
                        }
                    }
                }
                
                // Update family tree name
                if (window.userFamilyTreeId) {
                    await window.db.collection('familyTrees').doc(window.userFamilyTreeId).update({
                        name: this.onboardingData.familyName,
                        region: this.onboardingData.familyRegion,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                // Clear saved progress
                localStorage.removeItem('pyebwaOnboardingProgress');
                localStorage.setItem('pyebwaOnboardingComplete', 'true');
                
                // Remove onboarding modal
                const modal = document.getElementById('onboardingFlowModal');
                if (modal) {
                    modal.remove();
                }
                
                // Hide loading
                if (window.hideLoadingState) {
                    window.hideLoadingState();
                }
                
                // Reload family members
                if (window.loadFamilyMembers) {
                    await window.loadFamilyMembers();
                }
                
                // Show dashboard
                if (window.showView) {
                    window.showView('dashboard');
                }
                
                // Show dashboard tour prompt
                setTimeout(() => {
                    this.showDashboardTourPrompt();
                }, 1000);
                
            } catch (error) {
                console.error('Error completing onboarding:', error);
                if (window.hideLoadingState) {
                    window.hideLoadingState();
                }
                if (window.showError) {
                    window.showError(t('errorCompletingOnboarding') || 'Error completing setup. Please try again.');
                }
            }
        },
        
        // Show dashboard tour prompt
        showDashboardTourPrompt() {
            const modal = document.createElement('div');
            modal.className = 'modal tour-prompt-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>${t('welcomeToYourDashboard') || 'Welcome to your dashboard!'}</h3>
                    <p>${t('wouldYouLikeATour') || 'Would you like a guided tour of the dashboard?'}</p>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            ${t('noThanks') || 'No, thanks'}
                        </button>
                        <button class="btn btn-primary" onclick="pyebwaOnboarding.startDashboardTour()">
                            ${t('yesShowMe') || 'Yes, show me!'}
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },
        
        // Start dashboard tour
        startDashboardTour() {
            // Remove prompt modal
            const promptModal = document.querySelector('.tour-prompt-modal');
            if (promptModal) {
                promptModal.remove();
            }
            
            // Implement dashboard tour (placeholder for now)
            if (window.showSuccess) {
                window.showSuccess(t('dashboardTourComingSoon') || 'Dashboard tour coming soon!');
            }
            
            // Mark tour as completed
            if (window.currentUser && window.db) {
                window.db.collection('users').doc(window.currentUser.uid).update({
                    'onboardingData.dashboardTourCompleted': true
                });
            }
        },
        
        // Refresh UI with new translations
        refreshUI() {
            // This would ideally re-render the entire onboarding UI
            // For now, we'll rely on page refresh
            window.location.reload();
        }
    };
    
    // Export to global scope
    window.pyebwaOnboarding = OnboardingFlow;
    
    // Check if user needs onboarding
    window.shouldShowEnhancedOnboarding = async function() {
        try {
            // Check if user has completed onboarding
            if (window.currentUser && window.db) {
                const userDoc = await window.db.collection('users').doc(window.currentUser.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    // Show onboarding if not completed or if user has no family members
                    return !userData.onboardingComplete || (window.familyMembers && window.familyMembers.length === 0);
                }
            }
            return true; // Show onboarding by default for new users
        } catch (error) {
            console.error('Error checking onboarding status:', error);
            return false;
        }
    };
    
    // Initialize onboarding
    window.showEnhancedOnboarding = function() {
        OnboardingFlow.init();
    };
    
})();