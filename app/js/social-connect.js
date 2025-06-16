// Social Media Connection Handler for Pyebwa
(function() {
    'use strict';
    
    console.log('[SocialConnect] Initializing social connection module');
    
    // Configuration
    const SOCIAL_PLATFORMS = {
        facebook: {
            name: 'Facebook',
            icon: 'facebook',
            color: '#1877F2',
            urlPattern: 'https://facebook.com/{username}',
            placeholder: 'Facebook username or profile URL'
        },
        instagram: {
            name: 'Instagram',
            icon: 'instagram',
            color: '#E4405F',
            urlPattern: 'https://instagram.com/{username}',
            placeholder: '@username'
        },
        twitter: {
            name: 'Twitter/X',
            icon: 'twitter',
            color: '#1DA1F2',
            urlPattern: 'https://twitter.com/{username}',
            placeholder: '@username'
        },
        linkedin: {
            name: 'LinkedIn',
            icon: 'linkedin',
            color: '#0077B5',
            urlPattern: 'https://linkedin.com/in/{username}',
            placeholder: 'LinkedIn profile URL'
        },
        tiktok: {
            name: 'TikTok',
            icon: 'tiktok',
            color: '#000000',
            urlPattern: 'https://tiktok.com/@{username}',
            placeholder: '@username'
        }
    };
    
    // Social Connection Manager
    class SocialConnectionManager {
        constructor() {
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.currentMember = null;
        }
        
        // Initialize connection manager
        initialize() {
            console.log('[SocialConnect] Connection manager initialized');
            
            // Listen for connection events
            window.addEventListener('connectSocialProfile', (e) => {
                this.connectProfile(e.detail);
            });
            
            window.addEventListener('disconnectSocialProfile', (e) => {
                this.disconnectProfile(e.detail);
            });
        }
        
        // Connect social profile to family member
        async connectProfile(options) {
            const { memberId, platform, username } = options;
            
            if (!memberId || !platform || !username) {
                console.error('[SocialConnect] Missing required parameters');
                return;
            }
            
            try {
                const user = this.auth.currentUser;
                if (!user) throw new Error('No authenticated user');
                
                // Validate and format username
                const formattedUsername = this.formatUsername(username, platform);
                const profileUrl = this.generateProfileUrl(formattedUsername, platform);
                
                // Get user's family tree ID
                const userDoc = await this.db.collection('users').doc(user.uid).get();
                const familyTreeId = userDoc.data()?.familyTreeId;
                
                if (!familyTreeId) {
                    throw new Error('No family tree found');
                }
                
                // Update member's social connections
                const memberRef = this.db.collection('familyTrees')
                    .doc(familyTreeId)
                    .collection('members')
                    .doc(memberId);
                
                await memberRef.update({
                    [`socialProfiles.${platform}`]: {
                        username: formattedUsername,
                        url: profileUrl,
                        connected: true,
                        connectedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        visibility: 'family' // Default visibility
                    }
                });
                
                console.log(`[SocialConnect] Connected ${platform} profile for member ${memberId}`);
                
                // Emit success event
                window.dispatchEvent(new CustomEvent('socialProfileConnected', {
                    detail: {
                        memberId,
                        platform,
                        username: formattedUsername,
                        url: profileUrl
                    }
                }));
                
            } catch (error) {
                console.error('[SocialConnect] Error connecting profile:', error);
                
                // Emit error event
                window.dispatchEvent(new CustomEvent('socialConnectionError', {
                    detail: {
                        memberId,
                        platform,
                        error: error.message
                    }
                }));
            }
        }
        
        // Disconnect social profile from family member
        async disconnectProfile(options) {
            const { memberId, platform } = options;
            
            if (!memberId || !platform) {
                console.error('[SocialConnect] Missing required parameters');
                return;
            }
            
            try {
                const user = this.auth.currentUser;
                if (!user) throw new Error('No authenticated user');
                
                // Get user's family tree ID
                const userDoc = await this.db.collection('users').doc(user.uid).get();
                const familyTreeId = userDoc.data()?.familyTreeId;
                
                if (!familyTreeId) {
                    throw new Error('No family tree found');
                }
                
                // Remove social connection
                const memberRef = this.db.collection('familyTrees')
                    .doc(familyTreeId)
                    .collection('members')
                    .doc(memberId);
                
                await memberRef.update({
                    [`socialProfiles.${platform}`]: firebase.firestore.FieldValue.delete()
                });
                
                console.log(`[SocialConnect] Disconnected ${platform} profile for member ${memberId}`);
                
                // Emit success event
                window.dispatchEvent(new CustomEvent('socialProfileDisconnected', {
                    detail: {
                        memberId,
                        platform
                    }
                }));
                
            } catch (error) {
                console.error('[SocialConnect] Error disconnecting profile:', error);
                
                // Emit error event
                window.dispatchEvent(new CustomEvent('socialConnectionError', {
                    detail: {
                        memberId,
                        platform,
                        error: error.message
                    }
                }));
            }
        }
        
        // Update social profile visibility
        async updateProfileVisibility(memberId, platform, visibility) {
            try {
                const user = this.auth.currentUser;
                if (!user) throw new Error('No authenticated user');
                
                // Get user's family tree ID
                const userDoc = await this.db.collection('users').doc(user.uid).get();
                const familyTreeId = userDoc.data()?.familyTreeId;
                
                if (!familyTreeId) {
                    throw new Error('No family tree found');
                }
                
                // Update visibility
                const memberRef = this.db.collection('familyTrees')
                    .doc(familyTreeId)
                    .collection('members')
                    .doc(memberId);
                
                await memberRef.update({
                    [`socialProfiles.${platform}.visibility`]: visibility
                });
                
                console.log(`[SocialConnect] Updated ${platform} visibility to ${visibility}`);
                
            } catch (error) {
                console.error('[SocialConnect] Error updating visibility:', error);
                throw error;
            }
        }
        
        // Get all social connections for a member
        async getMemberSocialProfiles(memberId) {
            try {
                const user = this.auth.currentUser;
                if (!user) throw new Error('No authenticated user');
                
                // Get user's family tree ID
                const userDoc = await this.db.collection('users').doc(user.uid).get();
                const familyTreeId = userDoc.data()?.familyTreeId;
                
                if (!familyTreeId) {
                    throw new Error('No family tree found');
                }
                
                // Get member document
                const memberDoc = await this.db.collection('familyTrees')
                    .doc(familyTreeId)
                    .collection('members')
                    .doc(memberId)
                    .get();
                
                if (!memberDoc.exists) {
                    throw new Error('Member not found');
                }
                
                const memberData = memberDoc.data();
                return memberData.socialProfiles || {};
                
            } catch (error) {
                console.error('[SocialConnect] Error getting social profiles:', error);
                return {};
            }
        }
        
        // Format username based on platform requirements
        formatUsername(username, platform) {
            // Remove whitespace
            username = username.trim();
            
            // Extract username from URL if full URL provided
            if (username.includes('://')) {
                const urlParts = username.split('/');
                username = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
            }
            
            // Platform-specific formatting
            switch (platform) {
                case 'instagram':
                case 'twitter':
                case 'tiktok':
                    // Remove @ if present
                    username = username.replace(/^@/, '');
                    break;
                case 'linkedin':
                    // Extract from LinkedIn URL
                    if (username.includes('linkedin.com/in/')) {
                        username = username.split('linkedin.com/in/')[1].split('/')[0];
                    }
                    break;
                case 'facebook':
                    // Extract from Facebook URL
                    if (username.includes('facebook.com/')) {
                        username = username.split('facebook.com/')[1].split('/')[0];
                    }
                    break;
            }
            
            // Remove query parameters
            username = username.split('?')[0];
            
            return username;
        }
        
        // Generate profile URL
        generateProfileUrl(username, platform) {
            const template = SOCIAL_PLATFORMS[platform]?.urlPattern;
            if (!template) return '';
            
            return template.replace('{username}', username);
        }
        
        // Validate social profile URL
        validateProfileUrl(url, platform) {
            const patterns = {
                facebook: /^https?:\/\/(www\.)?facebook\.com\/.+/,
                instagram: /^https?:\/\/(www\.)?instagram\.com\/.+/,
                twitter: /^https?:\/\/(www\.)?(twitter|x)\.com\/.+/,
                linkedin: /^https?:\/\/(www\.)?linkedin\.com\/in\/.+/,
                tiktok: /^https?:\/\/(www\.)?tiktok\.com\/@.+/
            };
            
            const pattern = patterns[platform];
            return pattern ? pattern.test(url) : false;
        }
        
        // Create social profile UI component
        createSocialProfileUI(memberId, profiles = {}) {
            const container = document.createElement('div');
            container.className = 'social-profiles-container';
            
            // Add header
            const header = document.createElement('h3');
            header.className = 'social-profiles-header';
            header.innerHTML = '<i class="material-icons">share</i> Social Media Profiles';
            container.appendChild(header);
            
            // Create grid of social platforms
            const grid = document.createElement('div');
            grid.className = 'social-profiles-grid';
            
            Object.entries(SOCIAL_PLATFORMS).forEach(([platform, config]) => {
                const profile = profiles[platform];
                const profileItem = document.createElement('div');
                profileItem.className = 'social-profile-item';
                profileItem.dataset.platform = platform;
                
                if (profile?.connected) {
                    // Connected profile
                    profileItem.classList.add('connected');
                    profileItem.innerHTML = `
                        <div class="social-profile-icon" style="background-color: ${config.color}">
                            <i class="fab fa-${config.icon}"></i>
                        </div>
                        <div class="social-profile-info">
                            <div class="social-profile-name">${config.name}</div>
                            <a href="${profile.url}" target="_blank" rel="noopener noreferrer" class="social-profile-link">
                                ${profile.username}
                            </a>
                        </div>
                        <div class="social-profile-actions">
                            <button class="social-visibility-btn" data-visibility="${profile.visibility || 'family'}">
                                <i class="material-icons">${this.getVisibilityIcon(profile.visibility)}</i>
                            </button>
                            <button class="social-disconnect-btn">
                                <i class="material-icons">link_off</i>
                            </button>
                        </div>
                    `;
                    
                    // Add disconnect handler
                    const disconnectBtn = profileItem.querySelector('.social-disconnect-btn');
                    disconnectBtn.addEventListener('click', () => {
                        if (confirm(`Disconnect ${config.name} profile?`)) {
                            this.disconnectProfile({ memberId, platform });
                        }
                    });
                    
                    // Add visibility toggle
                    const visibilityBtn = profileItem.querySelector('.social-visibility-btn');
                    visibilityBtn.addEventListener('click', () => {
                        this.toggleVisibility(memberId, platform, profile.visibility);
                    });
                    
                } else {
                    // Not connected
                    profileItem.innerHTML = `
                        <div class="social-profile-icon" style="background-color: ${config.color}; opacity: 0.5">
                            <i class="fab fa-${config.icon}"></i>
                        </div>
                        <div class="social-profile-info">
                            <div class="social-profile-name">${config.name}</div>
                            <button class="social-connect-btn">Connect</button>
                        </div>
                    `;
                    
                    // Add connect handler
                    const connectBtn = profileItem.querySelector('.social-connect-btn');
                    connectBtn.addEventListener('click', () => {
                        this.showConnectDialog(memberId, platform, config);
                    });
                }
                
                grid.appendChild(profileItem);
            });
            
            container.appendChild(grid);
            
            return container;
        }
        
        // Show connect dialog
        showConnectDialog(memberId, platform, config) {
            // Create dialog
            const dialog = document.createElement('div');
            dialog.className = 'social-connect-dialog';
            dialog.innerHTML = `
                <div class="social-connect-content">
                    <h3>Connect ${config.name} Profile</h3>
                    <p>Enter the ${config.name} username or profile URL:</p>
                    <input type="text" 
                           class="social-username-input" 
                           placeholder="${config.placeholder}"
                           autocomplete="off">
                    <div class="social-connect-buttons">
                        <button class="btn-secondary cancel-btn">Cancel</button>
                        <button class="btn-primary connect-btn">Connect</button>
                    </div>
                </div>
            `;
            
            // Add to body
            document.body.appendChild(dialog);
            
            // Focus input
            const input = dialog.querySelector('.social-username-input');
            input.focus();
            
            // Handle connect
            const connectBtn = dialog.querySelector('.connect-btn');
            connectBtn.addEventListener('click', async () => {
                const username = input.value.trim();
                if (username) {
                    await this.connectProfile({ memberId, platform, username });
                    document.body.removeChild(dialog);
                }
            });
            
            // Handle cancel
            const cancelBtn = dialog.querySelector('.cancel-btn');
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(dialog);
            });
            
            // Handle enter key
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    connectBtn.click();
                }
            });
        }
        
        // Toggle visibility
        async toggleVisibility(memberId, platform, currentVisibility) {
            const visibilityOptions = ['public', 'family', 'private'];
            const currentIndex = visibilityOptions.indexOf(currentVisibility || 'family');
            const newVisibility = visibilityOptions[(currentIndex + 1) % visibilityOptions.length];
            
            await this.updateProfileVisibility(memberId, platform, newVisibility);
            
            // Update UI
            window.dispatchEvent(new CustomEvent('socialVisibilityUpdated', {
                detail: { memberId, platform, visibility: newVisibility }
            }));
        }
        
        // Get visibility icon
        getVisibilityIcon(visibility) {
            switch (visibility) {
                case 'public':
                    return 'public';
                case 'family':
                    return 'group';
                case 'private':
                    return 'lock';
                default:
                    return 'group';
            }
        }
        
        // Generate share card with social profiles
        async generateSocialShareCard(memberId) {
            try {
                const profiles = await this.getMemberSocialProfiles(memberId);
                const publicProfiles = {};
                
                // Filter only public profiles
                Object.entries(profiles).forEach(([platform, profile]) => {
                    if (profile.visibility === 'public' && profile.connected) {
                        publicProfiles[platform] = profile;
                    }
                });
                
                return publicProfiles;
                
            } catch (error) {
                console.error('[SocialConnect] Error generating share card:', error);
                return {};
            }
        }
    }
    
    // Create and export singleton instance
    window.socialConnect = new SocialConnectionManager();
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.socialConnect.initialize();
        });
    } else {
        window.socialConnect.initialize();
    }
    
})();