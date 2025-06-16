// Share Card Module for Pyebwa Family Tree
// Generates downloadable profile cards with member information and QR codes

(function() {
    'use strict';
    
    const ShareCard = {
        // Available card themes
        themes: {
            classic: {
                name: 'Classic',
                bgGradient: ['#00217D', '#D41125'],
                textColor: '#FFFFFF',
                accentColor: '#FFD700'
            },
            modern: {
                name: 'Modern',
                bgGradient: ['#1a1a1a', '#333333'],
                textColor: '#FFFFFF',
                accentColor: '#00D4FF'
            },
            vintage: {
                name: 'Vintage',
                bgGradient: ['#F5E6D3', '#E8D5B7'],
                textColor: '#3E2723',
                accentColor: '#8B4513'
            },
            nature: {
                name: 'Nature',
                bgGradient: ['#2E7D32', '#66BB6A'],
                textColor: '#FFFFFF',
                accentColor: '#FFF59D'
            }
        },
        
        // Current settings
        currentTheme: 'classic',
        includeOptions: {
            photo: true,
            birthDate: true,
            deathDate: true,
            birthPlace: true,
            biography: true,
            qrCode: true
        },
        
        // Initialize the share card system
        init() {
            this.loadQRLibrary();
        },
        
        // Load QR code library dynamically
        loadQRLibrary() {
            if (window.QRCode) return Promise.resolve();
            
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        },
        
        // Open share card modal
        async openShareModal(member) {
            if (!member) return;
            
            await this.loadQRLibrary();
            this.createShareModal(member);
        },
        
        // Create the share modal
        createShareModal(member) {
            const modal = document.createElement('div');
            modal.className = 'share-card-modal-overlay';
            modal.innerHTML = `
                <div class="share-card-modal">
                    <div class="share-card-header">
                        <h3>${t('shareProfileCard') || 'Share Profile Card'}</h3>
                        <button class="close-modal" onclick="this.closest('.share-card-modal-overlay').remove()">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                    <div class="share-card-body">
                        <div class="share-card-preview-container">
                            <canvas id="shareCardCanvas" width="800" height="1200"></canvas>
                            <div class="share-card-loading">
                                <div class="spinner"></div>
                                <p>${t('generatingCard') || 'Generating card...'}</p>
                            </div>
                        </div>
                        <div class="share-card-controls">
                            <div class="control-section">
                                <h4>${t('selectTheme') || 'Select Theme'}</h4>
                                <div class="theme-selector">
                                    ${Object.entries(this.themes).map(([key, theme]) => `
                                        <button class="theme-option ${key === this.currentTheme ? 'active' : ''}" 
                                                data-theme="${key}"
                                                style="background: linear-gradient(135deg, ${theme.bgGradient[0]}, ${theme.bgGradient[1]})">
                                            <span style="color: ${theme.textColor}">${t(theme.name.toLowerCase()) || theme.name}</span>
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="control-section">
                                <h4>${t('includeInformation') || 'Include Information'}</h4>
                                <div class="include-options">
                                    ${this.renderIncludeOption('photo', t('photo') || 'Photo')}
                                    ${this.renderIncludeOption('birthDate', t('birthDate') || 'Birth Date')}
                                    ${member.deathDate ? this.renderIncludeOption('deathDate', t('deathDate') || 'Death Date') : ''}
                                    ${this.renderIncludeOption('birthPlace', t('birthPlace') || 'Birth Place')}
                                    ${this.renderIncludeOption('biography', t('shortBio') || 'Short Bio')}
                                    ${this.renderIncludeOption('qrCode', t('qrCode') || 'QR Code')}
                                </div>
                            </div>
                            
                            <div class="share-card-actions">
                                <button class="btn btn-primary download-card">
                                    <i class="material-icons">download</i>
                                    ${t('downloadCard') || 'Download Card'}
                                </button>
                                <div class="share-buttons">
                                    <button class="btn btn-icon share-facebook" title="Share on Facebook">
                                        <i class="material-icons">facebook</i>
                                    </button>
                                    <button class="btn btn-icon share-twitter" title="Share on Twitter">
                                        <i class="material-icons">share</i>
                                    </button>
                                    <button class="btn btn-icon share-whatsapp" title="Share on WhatsApp">
                                        <i class="material-icons">whatsapp</i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Setup event listeners
            this.setupModalEventListeners(modal, member);
            
            // Generate initial card
            this.generateCard(member);
        },
        
        // Render include option checkbox
        renderIncludeOption(key, label) {
            return `
                <label class="include-option">
                    <input type="checkbox" data-include="${key}" ${this.includeOptions[key] ? 'checked' : ''}>
                    <span>${label}</span>
                </label>
            `;
        },
        
        // Setup modal event listeners
        setupModalEventListeners(modal, member) {
            // Theme selection
            modal.querySelectorAll('.theme-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.currentTheme = btn.dataset.theme;
                    this.generateCard(member);
                });
            });
            
            // Include options
            modal.querySelectorAll('.include-option input').forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    this.includeOptions[checkbox.dataset.include] = checkbox.checked;
                    this.generateCard(member);
                });
            });
            
            // Download button
            modal.querySelector('.download-card').addEventListener('click', () => {
                this.downloadCard(member);
            });
            
            // Share buttons
            modal.querySelector('.share-facebook').addEventListener('click', () => {
                this.shareOnFacebook(member);
            });
            
            modal.querySelector('.share-twitter').addEventListener('click', () => {
                this.shareOnTwitter(member);
            });
            
            modal.querySelector('.share-whatsapp').addEventListener('click', () => {
                this.shareOnWhatsApp(member);
            });
        },
        
        // Generate the card on canvas
        async generateCard(member) {
            const canvas = document.getElementById('shareCardCanvas');
            const ctx = canvas.getContext('2d');
            const theme = this.themes[this.currentTheme];
            
            // Show loading
            const loading = document.querySelector('.share-card-loading');
            loading.style.display = 'flex';
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw background gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, theme.bgGradient[0]);
            gradient.addColorStop(1, theme.bgGradient[1]);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add decorative pattern
            this.drawDecorativePattern(ctx, theme);
            
            // Draw content based on theme
            switch (this.currentTheme) {
                case 'classic':
                    await this.drawClassicCard(ctx, member, theme);
                    break;
                case 'modern':
                    await this.drawModernCard(ctx, member, theme);
                    break;
                case 'vintage':
                    await this.drawVintageCard(ctx, member, theme);
                    break;
                case 'nature':
                    await this.drawNatureCard(ctx, member, theme);
                    break;
                default:
                    await this.drawClassicCard(ctx, member, theme);
            }
            
            // Hide loading
            loading.style.display = 'none';
        },
        
        // Draw decorative pattern
        drawDecorativePattern(ctx, theme) {
            ctx.save();
            ctx.globalAlpha = 0.1;
            
            // Draw circles pattern
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * ctx.canvas.width;
                const y = Math.random() * ctx.canvas.height;
                const radius = Math.random() * 100 + 50;
                
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.strokeStyle = theme.accentColor;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            ctx.restore();
        },
        
        // Draw classic theme card
        async drawClassicCard(ctx, member, theme) {
            const canvas = ctx.canvas;
            const padding = 60;
            let yOffset = padding;
            
            // Draw header bar
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, 200);
            
            // Title
            ctx.fillStyle = theme.textColor;
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(t('familyProfile') || 'Family Profile', canvas.width / 2, 80);
            
            // Decorative line
            ctx.strokeStyle = theme.accentColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2 - 150, 110);
            ctx.lineTo(canvas.width / 2 + 150, 110);
            ctx.stroke();
            
            yOffset = 250;
            
            // Photo
            if (this.includeOptions.photo) {
                await this.drawMemberPhoto(ctx, member, canvas.width / 2, yOffset + 120, 120, theme);
                yOffset += 280;
            }
            
            // Name
            ctx.fillStyle = theme.textColor;
            ctx.font = 'bold 56px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${member.firstName} ${member.lastName}`, canvas.width / 2, yOffset);
            yOffset += 80;
            
            // Dates
            if (this.includeOptions.birthDate || this.includeOptions.deathDate) {
                ctx.font = '32px Arial';
                ctx.fillStyle = theme.accentColor;
                
                const dates = [];
                if (this.includeOptions.birthDate && member.birthDate) {
                    dates.push(`${t('born') || 'Born'}: ${this.formatDate(member.birthDate)}`);
                }
                if (this.includeOptions.deathDate && member.deathDate) {
                    dates.push(`${t('died') || 'Died'}: ${this.formatDate(member.deathDate)}`);
                }
                
                ctx.fillText(dates.join(' • '), canvas.width / 2, yOffset);
                yOffset += 60;
            }
            
            // Birth place
            if (this.includeOptions.birthPlace && member.birthPlace) {
                ctx.font = '28px Arial';
                ctx.fillStyle = theme.textColor;
                ctx.fillText(member.birthPlace, canvas.width / 2, yOffset);
                yOffset += 80;
            }
            
            // Biography
            if (this.includeOptions.biography && member.biography) {
                yOffset += 20;
                this.drawWrappedText(ctx, member.biography, padding, yOffset, canvas.width - (padding * 2), 28, theme.textColor);
                yOffset += 150;
            }
            
            // QR Code
            if (this.includeOptions.qrCode) {
                yOffset = canvas.height - 280;
                await this.drawQRCode(ctx, member, canvas.width / 2 - 75, yOffset, 150);
                
                // QR Code label
                ctx.font = '20px Arial';
                ctx.fillStyle = theme.textColor;
                ctx.textAlign = 'center';
                ctx.fillText(t('scanToViewProfile') || 'Scan to view full profile', canvas.width / 2, yOffset + 180);
            }
            
            // Footer
            ctx.font = '18px Arial';
            ctx.fillStyle = theme.textColor;
            ctx.textAlign = 'center';
            ctx.fillText('pyebwa.com', canvas.width / 2, canvas.height - 30);
        },
        
        // Draw modern theme card
        async drawModernCard(ctx, member, theme) {
            const canvas = ctx.canvas;
            const padding = 60;
            let yOffset = padding;
            
            // Geometric shapes
            ctx.fillStyle = theme.accentColor;
            ctx.globalAlpha = 0.1;
            ctx.fillRect(0, 0, 400, 400);
            ctx.fillRect(canvas.width - 300, canvas.height - 300, 300, 300);
            ctx.globalAlpha = 1;
            
            // Side bar
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(0, 0, 80, canvas.height);
            
            yOffset = 100;
            
            // Name with modern styling
            ctx.fillStyle = theme.accentColor;
            ctx.font = 'bold 64px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(member.firstName, padding + 100, yOffset);
            yOffset += 70;
            
            ctx.font = '48px Arial';
            ctx.fillStyle = theme.textColor;
            ctx.fillText(member.lastName, padding + 100, yOffset);
            yOffset += 100;
            
            // Photo with modern frame
            if (this.includeOptions.photo) {
                await this.drawMemberPhoto(ctx, member, 200, yOffset + 100, 100, theme, 'square');
                
                // Decorative frame
                ctx.strokeStyle = theme.accentColor;
                ctx.lineWidth = 3;
                ctx.strokeRect(90, yOffset - 10, 220, 220);
                yOffset += 250;
            }
            
            // Info sections with icons
            ctx.font = '24px Arial';
            ctx.fillStyle = theme.textColor;
            
            if (this.includeOptions.birthDate && member.birthDate) {
                this.drawInfoRow(ctx, '📅', `${t('born') || 'Born'}: ${this.formatDate(member.birthDate)}`, padding + 100, yOffset);
                yOffset += 40;
            }
            
            if (this.includeOptions.deathDate && member.deathDate) {
                this.drawInfoRow(ctx, '✝️', `${t('died') || 'Died'}: ${this.formatDate(member.deathDate)}`, padding + 100, yOffset);
                yOffset += 40;
            }
            
            if (this.includeOptions.birthPlace && member.birthPlace) {
                this.drawInfoRow(ctx, '📍', member.birthPlace, padding + 100, yOffset);
                yOffset += 60;
            }
            
            // Biography with modern styling
            if (this.includeOptions.biography && member.biography) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(padding + 80, yOffset, canvas.width - padding - 160, 140);
                
                yOffset += 20;
                this.drawWrappedText(ctx, member.biography, padding + 100, yOffset, canvas.width - padding - 200, 24, theme.textColor);
                yOffset += 140;
            }
            
            // QR Code in corner
            if (this.includeOptions.qrCode) {
                await this.drawQRCode(ctx, member, canvas.width - 200, canvas.height - 200, 120);
            }
        },
        
        // Draw vintage theme card
        async drawVintageCard(ctx, member, theme) {
            const canvas = ctx.canvas;
            const padding = 80;
            let yOffset = padding;
            
            // Vintage border
            ctx.strokeStyle = theme.accentColor;
            ctx.lineWidth = 8;
            ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
            
            // Inner border
            ctx.lineWidth = 2;
            ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);
            
            // Ornamental corners
            this.drawOrnamentalCorners(ctx, theme);
            
            yOffset = 150;
            
            // Title with vintage font style
            ctx.fillStyle = theme.textColor;
            ctx.font = 'italic 36px Georgia';
            ctx.textAlign = 'center';
            ctx.fillText(t('familyRecord') || 'Family Record', canvas.width / 2, yOffset);
            yOffset += 80;
            
            // Photo with vintage frame
            if (this.includeOptions.photo) {
                // Sepia overlay effect
                await this.drawMemberPhoto(ctx, member, canvas.width / 2, yOffset + 100, 100, theme, 'circle', true);
                
                // Ornamental frame
                ctx.strokeStyle = theme.accentColor;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(canvas.width / 2, yOffset + 100, 110, 0, Math.PI * 2);
                ctx.stroke();
                
                yOffset += 240;
            }
            
            // Name in elegant script
            ctx.font = 'bold 48px Georgia';
            ctx.fillStyle = theme.textColor;
            ctx.fillText(`${member.firstName} ${member.lastName}`, canvas.width / 2, yOffset);
            yOffset += 70;
            
            // Decorative divider
            this.drawVintageDivider(ctx, canvas.width / 2, yOffset, theme);
            yOffset += 40;
            
            // Information in vintage style
            ctx.font = '26px Georgia';
            
            if (this.includeOptions.birthDate && member.birthDate) {
                ctx.fillText(`Born on the ${this.formatDateVintage(member.birthDate)}`, canvas.width / 2, yOffset);
                yOffset += 40;
            }
            
            if (this.includeOptions.birthPlace && member.birthPlace) {
                ctx.fillText(`in ${member.birthPlace}`, canvas.width / 2, yOffset);
                yOffset += 40;
            }
            
            if (this.includeOptions.deathDate && member.deathDate) {
                ctx.fillText(`Departed ${this.formatDateVintage(member.deathDate)}`, canvas.width / 2, yOffset);
                yOffset += 60;
            }
            
            // Biography in vintage style
            if (this.includeOptions.biography && member.biography) {
                ctx.font = 'italic 22px Georgia';
                yOffset += 20;
                this.drawWrappedText(ctx, member.biography, padding, yOffset, canvas.width - (padding * 2), 26, theme.textColor);
            }
            
            // QR Code with vintage label
            if (this.includeOptions.qrCode) {
                yOffset = canvas.height - 250;
                await this.drawQRCode(ctx, member, canvas.width / 2 - 60, yOffset, 120);
                
                ctx.font = 'italic 18px Georgia';
                ctx.fillText(t('modernConvenience') || 'For Modern Convenience', canvas.width / 2, yOffset + 140);
            }
        },
        
        // Draw nature theme card
        async drawNatureCard(ctx, member, theme) {
            const canvas = ctx.canvas;
            const padding = 60;
            let yOffset = padding;
            
            // Draw leaves pattern
            this.drawLeavesPattern(ctx, theme);
            
            // Tree trunk on side
            ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
            ctx.fillRect(0, 0, 100, canvas.height);
            
            yOffset = 120;
            
            // Title with nature theme
            ctx.fillStyle = theme.textColor;
            ctx.font = 'bold 42px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(t('familyTree') || 'Family Tree', canvas.width / 2, yOffset);
            
            // Branch decoration
            this.drawBranch(ctx, canvas.width / 2 - 150, yOffset + 20, canvas.width / 2 + 150, yOffset + 20, theme);
            yOffset += 100;
            
            // Photo with leaf frame
            if (this.includeOptions.photo) {
                await this.drawMemberPhoto(ctx, member, canvas.width / 2, yOffset + 100, 110, theme, 'circle');
                
                // Leaf decorations around photo
                this.drawLeafFrame(ctx, canvas.width / 2, yOffset + 100, 120, theme);
                yOffset += 250;
            }
            
            // Name with nature styling
            ctx.font = 'bold 52px Arial';
            ctx.fillStyle = theme.textColor;
            ctx.fillText(`${member.firstName} ${member.lastName}`, canvas.width / 2, yOffset);
            yOffset += 80;
            
            // Info with leaf bullets
            ctx.font = '28px Arial';
            
            if (this.includeOptions.birthDate && member.birthDate) {
                this.drawInfoWithLeaf(ctx, `${t('born') || 'Born'}: ${this.formatDate(member.birthDate)}`, canvas.width / 2, yOffset, theme);
                yOffset += 45;
            }
            
            if (this.includeOptions.deathDate && member.deathDate) {
                this.drawInfoWithLeaf(ctx, `${t('died') || 'Died'}: ${this.formatDate(member.deathDate)}`, canvas.width / 2, yOffset, theme);
                yOffset += 45;
            }
            
            if (this.includeOptions.birthPlace && member.birthPlace) {
                this.drawInfoWithLeaf(ctx, member.birthPlace, canvas.width / 2, yOffset, theme);
                yOffset += 60;
            }
            
            // Biography with nature background
            if (this.includeOptions.biography && member.biography) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(padding + 40, yOffset, canvas.width - padding - 80, 140);
                
                yOffset += 20;
                this.drawWrappedText(ctx, member.biography, padding + 60, yOffset, canvas.width - padding - 120, 24, theme.textColor);
                yOffset += 140;
            }
            
            // QR Code with roots
            if (this.includeOptions.qrCode) {
                yOffset = canvas.height - 280;
                await this.drawQRCode(ctx, member, canvas.width / 2 - 75, yOffset, 150);
                
                // Draw roots around QR code
                this.drawRoots(ctx, canvas.width / 2, yOffset + 150, theme);
                
                ctx.font = '20px Arial';
                ctx.fillStyle = theme.textColor;
                ctx.textAlign = 'center';
                ctx.fillText(t('deepRoots') || 'Deep Roots, Strong Branches', canvas.width / 2, yOffset + 180);
            }
        },
        
        // Helper function to draw member photo
        async drawMemberPhoto(ctx, member, x, y, size, theme, shape = 'circle', sepia = false) {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                img.onload = () => {
                    ctx.save();
                    
                    // Create clipping path based on shape
                    ctx.beginPath();
                    if (shape === 'circle') {
                        ctx.arc(x, y, size, 0, Math.PI * 2);
                    } else if (shape === 'square') {
                        ctx.rect(x - size, y - size, size * 2, size * 2);
                    }
                    ctx.closePath();
                    ctx.clip();
                    
                    // Draw image
                    ctx.drawImage(img, x - size, y - size, size * 2, size * 2);
                    
                    // Apply sepia effect if requested
                    if (sepia) {
                        ctx.fillStyle = 'rgba(112, 66, 20, 0.4)';
                        ctx.fillRect(x - size, y - size, size * 2, size * 2);
                    }
                    
                    ctx.restore();
                    
                    // Draw border
                    ctx.strokeStyle = theme.textColor;
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    if (shape === 'circle') {
                        ctx.arc(x, y, size, 0, Math.PI * 2);
                    } else if (shape === 'square') {
                        ctx.rect(x - size, y - size, size * 2, size * 2);
                    }
                    ctx.stroke();
                    
                    resolve();
                };
                
                img.onerror = () => {
                    // Draw placeholder
                    ctx.fillStyle = theme.textColor;
                    ctx.beginPath();
                    if (shape === 'circle') {
                        ctx.arc(x, y, size, 0, Math.PI * 2);
                    } else if (shape === 'square') {
                        ctx.rect(x - size, y - size, size * 2, size * 2);
                    }
                    ctx.fill();
                    
                    // Draw person icon
                    ctx.fillStyle = theme.bgGradient[0];
                    ctx.font = `${size}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('👤', x, y);
                    
                    resolve();
                };
                
                img.src = member.photoUrl || '/app/images/default-avatar.svg';
            });
        },
        
        // Draw QR code
        async drawQRCode(ctx, member, x, y, size) {
            return new Promise((resolve) => {
                // Create temporary div for QR code
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                document.body.appendChild(tempDiv);
                
                // Generate QR code
                const profileUrl = `${window.location.origin}/app/#member/${member.id}`;
                new QRCode(tempDiv, {
                    text: profileUrl,
                    width: size,
                    height: size,
                    correctLevel: QRCode.CorrectLevel.H
                });
                
                // Wait for QR code to generate
                setTimeout(() => {
                    const qrCanvas = tempDiv.querySelector('canvas');
                    if (qrCanvas) {
                        ctx.drawImage(qrCanvas, x, y, size, size);
                    }
                    
                    // Clean up
                    document.body.removeChild(tempDiv);
                    resolve();
                }, 100);
            });
        },
        
        // Draw wrapped text
        drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, color) {
            ctx.fillStyle = color;
            ctx.font = `${lineHeight - 4}px Arial`;
            ctx.textAlign = 'left';
            
            const words = text.split(' ');
            let line = '';
            let currentY = y;
            
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = ctx.measureText(testLine);
                
                if (metrics.width > maxWidth && i > 0) {
                    ctx.fillText(line, x, currentY);
                    line = words[i] + ' ';
                    currentY += lineHeight;
                    
                    // Stop if we're running out of space
                    if (currentY > y + 100) {
                        ctx.fillText('...', x + ctx.measureText(line).width, currentY);
                        break;
                    }
                } else {
                    line = testLine;
                }
            }
            
            if (currentY <= y + 100) {
                ctx.fillText(line, x, currentY);
            }
        },
        
        // Format date
        formatDate(dateStr) {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString(currentLanguage || 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },
        
        // Format date for vintage theme
        formatDateVintage(dateStr) {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const day = date.getDate();
            const suffix = this.getOrdinalSuffix(day);
            const month = date.toLocaleDateString(currentLanguage || 'en-US', { month: 'long' });
            const year = date.getFullYear();
            return `${day}${suffix} day of ${month}, ${year}`;
        },
        
        // Get ordinal suffix
        getOrdinalSuffix(day) {
            if (day > 3 && day < 21) return 'th';
            switch (day % 10) {
                case 1: return 'st';
                case 2: return 'nd';
                case 3: return 'rd';
                default: return 'th';
            }
        },
        
        // Draw ornamental corners for vintage theme
        drawOrnamentalCorners(ctx, theme) {
            ctx.strokeStyle = theme.accentColor;
            ctx.lineWidth = 3;
            
            const cornerSize = 60;
            const margin = 60;
            
            // Top left
            ctx.beginPath();
            ctx.moveTo(margin, margin + cornerSize);
            ctx.quadraticCurveTo(margin, margin, margin + cornerSize, margin);
            ctx.stroke();
            
            // Top right
            ctx.beginPath();
            ctx.moveTo(ctx.canvas.width - margin - cornerSize, margin);
            ctx.quadraticCurveTo(ctx.canvas.width - margin, margin, ctx.canvas.width - margin, margin + cornerSize);
            ctx.stroke();
            
            // Bottom left
            ctx.beginPath();
            ctx.moveTo(margin, ctx.canvas.height - margin - cornerSize);
            ctx.quadraticCurveTo(margin, ctx.canvas.height - margin, margin + cornerSize, ctx.canvas.height - margin);
            ctx.stroke();
            
            // Bottom right
            ctx.beginPath();
            ctx.moveTo(ctx.canvas.width - margin - cornerSize, ctx.canvas.height - margin);
            ctx.quadraticCurveTo(ctx.canvas.width - margin, ctx.canvas.height - margin, ctx.canvas.width - margin, ctx.canvas.height - margin - cornerSize);
            ctx.stroke();
        },
        
        // Draw vintage divider
        drawVintageDivider(ctx, x, y, theme) {
            ctx.strokeStyle = theme.accentColor;
            ctx.lineWidth = 2;
            
            // Center ornament
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // Left line with curl
            ctx.beginPath();
            ctx.moveTo(x - 100, y);
            ctx.quadraticCurveTo(x - 120, y - 10, x - 140, y);
            ctx.stroke();
            
            // Right line with curl
            ctx.beginPath();
            ctx.moveTo(x + 100, y);
            ctx.quadraticCurveTo(x + 120, y - 10, x + 140, y);
            ctx.stroke();
        },
        
        // Draw leaves pattern for nature theme
        drawLeavesPattern(ctx, theme) {
            ctx.save();
            ctx.globalAlpha = 0.1;
            
            for (let i = 0; i < 30; i++) {
                const x = Math.random() * ctx.canvas.width;
                const y = Math.random() * ctx.canvas.height;
                const size = Math.random() * 40 + 20;
                const rotation = Math.random() * Math.PI * 2;
                
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rotation);
                
                // Draw leaf shape
                ctx.beginPath();
                ctx.ellipse(0, 0, size / 2, size, 0, 0, Math.PI * 2);
                ctx.fillStyle = theme.accentColor;
                ctx.fill();
                
                ctx.restore();
            }
            
            ctx.restore();
        },
        
        // Draw branch
        drawBranch(ctx, x1, y1, x2, y2, theme) {
            ctx.strokeStyle = theme.accentColor;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(x1 + 50, y1 - 20, x2 - 50, y2 - 20, x2, y2);
            ctx.stroke();
            
            // Add small leaves
            for (let i = 0; i < 5; i++) {
                const t = i / 4;
                const x = x1 * (1 - t) + x2 * t;
                const y = y1 * (1 - t) + y2 * t - 10;
                
                ctx.beginPath();
                ctx.ellipse(x, y, 8, 15, Math.PI / 4, 0, Math.PI * 2);
                ctx.fillStyle = theme.accentColor;
                ctx.fill();
            }
        },
        
        // Draw leaf frame around photo
        drawLeafFrame(ctx, x, y, radius, theme) {
            const leafCount = 12;
            
            for (let i = 0; i < leafCount; i++) {
                const angle = (i / leafCount) * Math.PI * 2;
                const leafX = x + Math.cos(angle) * (radius + 20);
                const leafY = y + Math.sin(angle) * (radius + 20);
                
                ctx.save();
                ctx.translate(leafX, leafY);
                ctx.rotate(angle + Math.PI / 2);
                
                ctx.beginPath();
                ctx.ellipse(0, 0, 10, 20, 0, 0, Math.PI * 2);
                ctx.fillStyle = theme.accentColor;
                ctx.globalAlpha = 0.6;
                ctx.fill();
                
                ctx.restore();
            }
        },
        
        // Draw info with leaf bullet
        drawInfoWithLeaf(ctx, text, x, y, theme) {
            // Draw leaf bullet
            ctx.save();
            ctx.translate(x - ctx.measureText(text).width / 2 - 30, y - 5);
            ctx.beginPath();
            ctx.ellipse(0, 0, 8, 12, -Math.PI / 4, 0, Math.PI * 2);
            ctx.fillStyle = theme.accentColor;
            ctx.fill();
            ctx.restore();
            
            // Draw text
            ctx.fillStyle = theme.textColor;
            ctx.textAlign = 'center';
            ctx.fillText(text, x, y);
        },
        
        // Draw roots for nature theme
        drawRoots(ctx, x, y, theme) {
            ctx.strokeStyle = theme.accentColor;
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.5;
            
            // Draw multiple root lines
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(x + i * 30, y);
                ctx.quadraticCurveTo(
                    x + i * 40 + Math.random() * 20 - 10,
                    y + 40,
                    x + i * 50 + Math.random() * 30 - 15,
                    y + 80
                );
                ctx.stroke();
            }
            
            ctx.globalAlpha = 1;
        },
        
        // Draw info row for modern theme
        drawInfoRow(ctx, icon, text, x, y) {
            ctx.font = '32px Arial';
            ctx.fillText(icon, x, y);
            ctx.font = '24px Arial';
            ctx.fillText(text, x + 40, y);
        },
        
        // Download card
        downloadCard(member) {
            const canvas = document.getElementById('shareCardCanvas');
            const link = document.createElement('a');
            link.download = `${member.firstName}_${member.lastName}_profile.png`;
            
            canvas.toBlob((blob) => {
                link.href = URL.createObjectURL(blob);
                link.click();
                URL.revokeObjectURL(link.href);
                
                if (window.showSuccess) {
                    window.showSuccess(t('cardDownloaded') || 'Profile card downloaded successfully!');
                }
            });
        },
        
        // Share on Facebook
        shareOnFacebook(member) {
            const text = `Check out ${member.firstName} ${member.lastName}'s family profile on Pyebwa!`;
            const url = `${window.location.origin}/app/#member/${member.id}`;
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank');
        },
        
        // Share on Twitter
        shareOnTwitter(member) {
            const text = `Check out ${member.firstName} ${member.lastName}'s family profile on @Pyebwa!`;
            const url = `${window.location.origin}/app/#member/${member.id}`;
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        },
        
        // Share on WhatsApp
        shareOnWhatsApp(member) {
            const text = `Check out ${member.firstName} ${member.lastName}'s family profile: ${window.location.origin}/app/#member/${member.id}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }
    };
    
    // Export to global scope
    window.ShareCard = ShareCard;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ShareCard.init());
    } else {
        ShareCard.init();
    }
})();