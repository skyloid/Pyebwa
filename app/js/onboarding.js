// Modern Onboarding Experience

// Check if user needs onboarding
function shouldShowOnboarding() {
    return !localStorage.getItem('pyebwaOnboardingComplete') && familyMembers.length === 0;
}

// Create onboarding modal
function showOnboarding() {
    const modal = document.createElement('div');
    modal.className = 'modal onboarding-modal';
    modal.innerHTML = `
        <div class="modal-content onboarding-content">
            <div class="onboarding-slides">
                <!-- Slide 1: Welcome -->
                <div class="onboarding-slide active" data-slide="1">
                    <div class="onboarding-illustration">
                        <div class="onboarding-icon">🌳</div>
                    </div>
                    <h2>${t('welcomeToPyebwa') || 'Welcome to Pyebwa'}</h2>
                    <p>${t('onboardingWelcomeText') || 'Build and preserve your family tree with our beautiful, easy-to-use platform.'}</p>
                </div>
                
                <!-- Slide 2: Features -->
                <div class="onboarding-slide" data-slide="2">
                    <div class="onboarding-features">
                        <div class="feature-item">
                            <span class="material-icons">account_tree</span>
                            <h4>${t('visualFamilyTree') || 'Visual Family Tree'}</h4>
                            <p>${t('visualTreeDesc') || 'See your family connections in a beautiful tree view'}</p>
                        </div>
                        <div class="feature-item">
                            <span class="material-icons">photo_camera</span>
                            <h4>${t('photoMemories') || 'Photo Memories'}</h4>
                            <p>${t('photoMemoriesDesc') || 'Add photos to preserve precious memories'}</p>
                        </div>
                        <div class="feature-item">
                            <span class="material-icons">history_edu</span>
                            <h4>${t('familyStories') || 'Family Stories'}</h4>
                            <p>${t('familyStoriesDesc') || 'Document and share family stories for generations'}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Slide 3: Get Started -->
                <div class="onboarding-slide" data-slide="3">
                    <div class="onboarding-illustration">
                        <div class="onboarding-icon">👨‍👩‍👧‍👦</div>
                    </div>
                    <h2>${t('letsGetStarted') || "Let's Get Started"}</h2>
                    <p>${t('addFirstMemberPrompt') || 'Add your first family member to begin building your tree.'}</p>
                </div>
            </div>
            
            <div class="onboarding-navigation">
                <div class="onboarding-dots">
                    <span class="dot active" data-slide="1"></span>
                    <span class="dot" data-slide="2"></span>
                    <span class="dot" data-slide="3"></span>
                </div>
                <div class="onboarding-buttons">
                    <button class="btn btn-secondary" id="onboardingSkip">${t('skip') || 'Skip'}</button>
                    <button class="btn btn-primary" id="onboardingNext">
                        <span>${t('next') || 'Next'}</span>
                        <span class="material-icons">arrow_forward</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    let currentSlide = 1;
    const totalSlides = 3;
    
    // Navigation handlers
    const skipBtn = document.getElementById('onboardingSkip');
    const nextBtn = document.getElementById('onboardingNext');
    
    skipBtn.addEventListener('click', () => {
        completeOnboarding();
        modal.remove();
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentSlide < totalSlides) {
            goToSlide(currentSlide + 1);
        } else {
            completeOnboarding();
            modal.remove();
            showAddMemberModal();
        }
    });
    
    // Dot navigation
    document.querySelectorAll('.onboarding-dots .dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const slideNum = parseInt(dot.dataset.slide);
            goToSlide(slideNum);
        });
    });
    
    function goToSlide(slideNum) {
        // Update slides
        document.querySelectorAll('.onboarding-slide').forEach(slide => {
            slide.classList.remove('active');
        });
        document.querySelector(`.onboarding-slide[data-slide="${slideNum}"]`).classList.add('active');
        
        // Update dots
        document.querySelectorAll('.onboarding-dots .dot').forEach(dot => {
            dot.classList.remove('active');
        });
        document.querySelector(`.onboarding-dots .dot[data-slide="${slideNum}"]`).classList.add('active');
        
        // Update button text
        if (slideNum === totalSlides) {
            nextBtn.innerHTML = `
                <span>${t('getStarted') || 'Get Started'}</span>
                <span class="material-icons">rocket_launch</span>
            `;
        } else {
            nextBtn.innerHTML = `
                <span>${t('next') || 'Next'}</span>
                <span class="material-icons">arrow_forward</span>
            `;
        }
        
        currentSlide = slideNum;
    }
}

// Mark onboarding as complete
function completeOnboarding() {
    localStorage.setItem('pyebwaOnboardingComplete', 'true');
    showSuccess(t('welcomeMessage') || 'Welcome to your family tree!');
}

// Add CSS for onboarding
const onboardingStyles = `
<style>
.onboarding-modal .modal-content {
    max-width: 800px;
    padding: 0;
    overflow: hidden;
}

.onboarding-content {
    position: relative;
}

.onboarding-slides {
    height: 450px;
    position: relative;
    overflow: hidden;
}

.onboarding-slide {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 40px;
    text-align: center;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.onboarding-slide.active {
    opacity: 1;
    transform: translateX(0);
}

.onboarding-illustration {
    margin-bottom: 32px;
}

.onboarding-icon {
    font-size: 120px;
    line-height: 1;
    animation: float 3s ease-in-out infinite;
}

.onboarding-slide h2 {
    font-size: 32px;
    margin-bottom: 16px;
    background: linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-red) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.onboarding-slide p {
    font-size: 18px;
    color: var(--gray-600);
    max-width: 500px;
    line-height: 1.6;
}

.onboarding-features {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 40px;
    width: 100%;
    max-width: 700px;
}

.feature-item {
    text-align: center;
}

.feature-item .material-icons {
    font-size: 48px;
    color: var(--primary-blue);
    margin-bottom: 16px;
    display: block;
}

.feature-item h4 {
    font-size: 18px;
    margin-bottom: 8px;
    color: var(--gray-900);
}

.feature-item p {
    font-size: 14px;
    color: var(--gray-600);
    line-height: 1.5;
}

.onboarding-navigation {
    padding: 24px 40px;
    background: var(--gray-50);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.onboarding-dots {
    display: flex;
    gap: 8px;
}

.onboarding-dots .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--gray-300);
    cursor: pointer;
    transition: all 0.3s;
}

.onboarding-dots .dot.active {
    width: 24px;
    border-radius: 4px;
    background: var(--primary-blue);
}

.onboarding-buttons {
    display: flex;
    gap: 12px;
}

@media (max-width: 768px) {
    .onboarding-features {
        grid-template-columns: 1fr;
        gap: 24px;
    }
    
    .onboarding-slide {
        padding: 40px 20px;
    }
    
    .onboarding-icon {
        font-size: 80px;
    }
    
    .onboarding-slide h2 {
        font-size: 24px;
    }
    
    .onboarding-slide p {
        font-size: 16px;
    }
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', onboardingStyles);

// Export functions
window.shouldShowOnboarding = shouldShowOnboarding;
window.showOnboarding = showOnboarding;