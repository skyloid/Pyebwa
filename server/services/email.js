const sgMail = require('@sendgrid/mail');
const path = require('path');
const fs = require('fs').promises;
const handlebars = require('handlebars');

// Register custom Handlebars helpers
handlebars.registerHelper('equals', function(a, b) {
    return a === b;
});

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey && !apiKey.includes('your_sendgrid_api_key_here')) {
    sgMail.setApiKey(apiKey);
    console.log('✅ SendGrid email service initialized');
} else {
    console.warn('⚠️  SendGrid API key not configured - email sending disabled');
}

// Email service class
class EmailService {
    constructor() {
        this.templates = new Map();
        this.sender = {
            email: process.env.SENDER_EMAIL || 'noreply@pyebwa.com',
            name: process.env.SENDER_NAME || 'Pyebwa Family Tree'
        };
        this.isConfigured = apiKey && !apiKey.includes('your_sendgrid_api_key_here');
    }

    // Load and compile email templates
    async loadTemplate(templateName) {
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
        if (!this.isConfigured) {
            console.warn('SendGrid not configured - skipping email to:', to);
            return { success: false, reason: 'Email service not configured' };
        }

        try {
            // Load template
            const template = await this.loadTemplate(templateName);
            const html = template(data);

            // Prepare email
            const msg = {
                to,
                from: this.sender,
                subject,
                html,
                // Add plain text version
                text: this.htmlToText(html)
            };

            // Send email
            const result = await sgMail.send(msg);
            console.log(`✅ Email sent successfully to ${to}`);
            return { success: true, messageId: result[0].headers['x-message-id'] };

        } catch (error) {
            console.error('Error sending email:', error);
            if (error.response) {
                console.error('SendGrid error details:', error.response.body);
            }
            return { success: false, error: error.message };
        }
    }

    // Send invite email
    async sendInviteEmail(to, inviteData) {
        const subject = inviteData.inviterName 
            ? `${inviteData.inviterName} invited you to join the ${inviteData.familyName} family tree`
            : `You're invited to join the ${inviteData.familyName} family tree`;

        return this.sendEmail(to, subject, 'invite', {
            ...inviteData,
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
        const batchSize = 10; // SendGrid recommends batching
        
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