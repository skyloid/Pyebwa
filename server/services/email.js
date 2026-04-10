const path = require('path');
const fs = require('fs').promises;
const handlebars = require('handlebars');

// Register custom Handlebars helpers
handlebars.registerHelper('equals', function(a, b) {
    return a === b;
});

// Initialize Resend with API key
const resendApiKey = process.env.RESEND_API_KEY;
if (resendApiKey) {
    console.log('✅ Resend email service initialized');
} else {
    console.warn('⚠️  Resend API key not configured - email sending disabled');
}

async function sendViaResend(to, subject, html, from) {
    if (!resendApiKey) {
        return { success: false, reason: 'No email provider configured' };
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: from || process.env.AUTH_EMAIL_FROM || 'Pyebwa <noreply@pyebwa.com>',
            to: [to],
            subject,
            html
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend send failed: ${response.status} ${errorText}`);
    }

    return { success: true };
}

function formatTreeDisplayName(treeName) {
    const normalized = String(treeName || '').trim().replace(/\s+/g, ' ');
    return normalized || 'your family tree';
}

// Email service class
class EmailService {
    constructor() {
        this.templates = new Map();
        this.sender = {
            email: process.env.SENDER_EMAIL || 'noreply@pyebwa.com',
            name: process.env.SENDER_NAME || 'Pyebwa Family Tree'
        };
        this.isConfigured = Boolean(resendApiKey);
    }

    // Load and compile email templates
    async loadTemplate(templateName) {
        // Whitelist allowed template names to prevent path traversal
        const allowedTemplates = ['invite', 'welcome', 'password-reset', 'family-update', 'announcement'];
        if (!allowedTemplates.includes(templateName)) {
            throw new Error(`Unknown email template: ${templateName}`);
        }

        if (this.templates.has(templateName)) {
            return this.templates.get(templateName);
        }

        try {
            const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
            const templateContent = await fs.readFile(templatePath, 'utf8');
            const compiledTemplate = handlebars.compile(templateContent);
            this.templates.set(templateName, compiledTemplate);
            return compiledTemplate;
        } catch (error) {
            console.error(`Error loading email template ${templateName}:`, error);
            throw new Error(`Email template ${templateName} not found`);
        }
    }

    // Send an email
    async sendEmail(to, subject, templateName, data = {}) {
        try {
            // Load template
            const template = await this.loadTemplate(templateName);
            const html = template(data);

            if (this.isConfigured) {
                const result = await sendViaResend(
                    to,
                    subject,
                    html,
                    `${this.sender.name} <${this.sender.email}>`
                );
                console.log(`✅ Email sent successfully via Resend to ${to}`);
                return result;
            }
            return { success: false, error: 'Resend email service not configured' };

        } catch (error) {
            console.error('Error sending email:', error);
            return { success: false, error: error.message };
        }
    }

    // Send invite email
    async sendInviteEmail(to, inviteData) {
        const treeDisplayName = formatTreeDisplayName(inviteData.familyName);
        const subject = inviteData.inviterName 
            ? `${inviteData.inviterName} invited you to join ${treeDisplayName}`
            : `You're invited to join ${treeDisplayName}`;

        return this.sendEmail(to, subject, 'invite', {
            ...inviteData,
            treeDisplayName,
            currentYear: new Date().getFullYear()
        });
    }

    // Send welcome email
    async sendWelcomeEmail(to, userData) {
        const subject = 'Welcome to Pyebwa - Your Family Tree Awaits';
        
        return this.sendEmail(to, subject, 'welcome', {
            ...userData,
            currentYear: new Date().getFullYear()
        });
    }

    // Send password reset email
    async sendPasswordResetEmail(to, resetData) {
        const subject = 'Reset Your Pyebwa Password';
        
        return this.sendEmail(to, subject, 'password-reset', {
            ...resetData,
            currentYear: new Date().getFullYear()
        });
    }

    // Send family update notification
    async sendFamilyUpdateEmail(to, updateData) {
        const subject = `New update in your ${updateData.familyName} family tree`;
        
        return this.sendEmail(to, subject, 'family-update', {
            ...updateData,
            currentYear: new Date().getFullYear()
        });
    }

    // Send announcement email
    async sendAnnouncementEmail(to, announcementData) {
        const subject = announcementData.subject || 'Important Family Announcement';
        
        return this.sendEmail(to, subject, 'announcement', {
            ...announcementData,
            currentYear: new Date().getFullYear()
        });
    }

    // Convert HTML to plain text (basic implementation)
    htmlToText(html) {
        return html
            .replace(/<style[^>]*>.*?<\/style>/gi, '')
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Send bulk emails (with rate limiting)
    async sendBulkEmails(recipients, subject, templateName, commonData = {}) {
        const results = [];
        const batchSize = 10;
        
        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            
            const batchPromises = batch.map(recipient => {
                const personalizedData = {
                    ...commonData,
                    ...recipient.data
                };
                
                return this.sendEmail(
                    recipient.email,
                    subject,
                    templateName,
                    personalizedData
                ).then(result => ({
                    email: recipient.email,
                    ...result
                }));
            });
            
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults);
            
            // Rate limiting - wait 1 second between batches
            if (i + batchSize < recipients.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return results;
    }
}

// Export singleton instance
module.exports = new EmailService();
