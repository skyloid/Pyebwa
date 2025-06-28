// Email Service using SendGrid
const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
    constructor() {
        // Initialize SendGrid with API key from environment
        this.apiKey = process.env.SENDGRID_API_KEY;
        if (this.apiKey) {
            sgMail.setApiKey(this.apiKey);
            this.initialized = true;
        } else {
            console.warn('SendGrid API key not found. Email service disabled.');
            this.initialized = false;
        }
        
        // Default sender
        this.defaultSender = {
            email: process.env.SENDER_EMAIL || 'noreply@pyebwa.com',
            name: process.env.SENDER_NAME || 'Pyebwa Family Tree'
        };
        
        // Email templates cache
        this.templates = new Map();
        
        // Load templates
        this.loadTemplates();
    }
    
    // Load email templates
    async loadTemplates() {
        try {
            const templatesDir = path.join(__dirname, 'email-templates');
            const templateFiles = await fs.readdir(templatesDir);
            
            for (const file of templateFiles) {
                if (file.endsWith('.hbs')) {
                    const templateName = file.replace('.hbs', '');
                    const templateContent = await fs.readFile(
                        path.join(templatesDir, file), 
                        'utf-8'
                    );
                    
                    // Compile template
                    const compiled = handlebars.compile(templateContent);
                    this.templates.set(templateName, compiled);
                    
                    console.log(`Loaded email template: ${templateName}`);
                }
            }
        } catch (error) {
            console.error('Error loading email templates:', error);
        }
    }
    
    // Send announcement email
    async sendAnnouncementEmail(announcement, recipients) {
        if (!this.initialized) {
            console.log('Email service not initialized');
            return { success: false, error: 'Email service not configured' };
        }
        
        try {
            // Prepare email data
            const emailData = {
                title: announcement.title,
                content: announcement.content,
                type: announcement.type,
                year: new Date().getFullYear(),
                appUrl: process.env.APP_URL || 'https://rasin.pyebwa.com/app',
                unsubscribeUrl: process.env.APP_URL + '/settings/notifications'
            };
            
            // Get template
            const template = this.templates.get('announcement') || this.getDefaultAnnouncementTemplate();
            const html = template(emailData);
            
            // Prepare personalizations for batch sending
            const personalizations = recipients.map(recipient => ({
                to: [{
                    email: recipient.email,
                    name: recipient.displayName || recipient.email.split('@')[0]
                }],
                substitutions: {
                    recipientName: recipient.displayName || 'User'
                }
            }));
            
            // SendGrid message configuration
            const msg = {
                personalizations: personalizations,
                from: this.defaultSender,
                subject: `${announcement.title} - Pyebwa Announcement`,
                html: html,
                text: this.stripHtml(announcement.content),
                categories: ['announcement', announcement.type],
                trackingSettings: {
                    clickTracking: { enable: true },
                    openTracking: { enable: true }
                },
                mailSettings: {
                    sandboxMode: {
                        enable: process.env.NODE_ENV === 'development'
                    }
                }
            };
            
            // Send emails in batches (SendGrid limit is 1000 per request)
            const batchSize = 1000;
            const results = [];
            
            for (let i = 0; i < personalizations.length; i += batchSize) {
                const batch = personalizations.slice(i, i + batchSize);
                msg.personalizations = batch;
                
                try {
                    const response = await sgMail.send(msg);
                    results.push({
                        batch: Math.floor(i / batchSize) + 1,
                        success: true,
                        count: batch.length,
                        messageId: response[0].headers['x-message-id']
                    });
                } catch (error) {
                    console.error(`Error sending batch ${Math.floor(i / batchSize) + 1}:`, error);
                    results.push({
                        batch: Math.floor(i / batchSize) + 1,
                        success: false,
                        count: batch.length,
                        error: error.message
                    });
                }
            }
            
            // Log email send
            await this.logEmailSend(announcement, recipients.length, results);
            
            return {
                success: true,
                totalRecipients: recipients.length,
                results: results
            };
            
        } catch (error) {
            console.error('Error sending announcement emails:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Send welcome email
    async sendWelcomeEmail(user) {
        if (!this.initialized) return;
        
        try {
            const emailData = {
                userName: user.displayName || user.email.split('@')[0],
                appUrl: process.env.APP_URL || 'https://rasin.pyebwa.com/app',
                supportEmail: process.env.SUPPORT_EMAIL || 'support@pyebwa.com',
                year: new Date().getFullYear()
            };
            
            const template = this.templates.get('welcome') || this.getDefaultWelcomeTemplate();
            const html = template(emailData);
            
            const msg = {
                to: {
                    email: user.email,
                    name: user.displayName
                },
                from: this.defaultSender,
                subject: 'Welcome to Pyebwa Family Tree!',
                html: html,
                text: `Welcome to Pyebwa, ${emailData.userName}! Start building your family tree today.`,
                categories: ['welcome', 'transactional']
            };
            
            await sgMail.send(msg);
            console.log(`Welcome email sent to ${user.email}`);
            
        } catch (error) {
            console.error('Error sending welcome email:', error);
        }
    }
    
    // Send password reset email
    async sendPasswordResetEmail(email, resetLink) {
        if (!this.initialized) return;
        
        try {
            const emailData = {
                resetLink: resetLink,
                expiryTime: '1 hour',
                supportEmail: process.env.SUPPORT_EMAIL || 'support@pyebwa.com',
                year: new Date().getFullYear()
            };
            
            const template = this.templates.get('password-reset') || this.getDefaultPasswordResetTemplate();
            const html = template(emailData);
            
            const msg = {
                to: email,
                from: this.defaultSender,
                subject: 'Reset Your Pyebwa Password',
                html: html,
                text: `Reset your password by visiting: ${resetLink}`,
                categories: ['password-reset', 'transactional']
            };
            
            await sgMail.send(msg);
            console.log(`Password reset email sent to ${email}`);
            
        } catch (error) {
            console.error('Error sending password reset email:', error);
        }
    }
    
    // Send invitation email
    async sendInvitationEmail(invitation, inviterName) {
        if (!this.initialized) return;
        
        try {
            const emailData = {
                inviterName: inviterName,
                treeName: invitation.treeName,
                role: invitation.role,
                inviteLink: `${process.env.APP_URL}/invite/${invitation.id}`,
                appUrl: process.env.APP_URL || 'https://rasin.pyebwa.com/app',
                year: new Date().getFullYear()
            };
            
            const template = this.templates.get('invitation') || this.getDefaultInvitationTemplate();
            const html = template(emailData);
            
            const msg = {
                to: invitation.email,
                from: this.defaultSender,
                subject: `${inviterName} invited you to join their family tree on Pyebwa`,
                html: html,
                text: `${inviterName} has invited you to join their family tree "${treeName}" on Pyebwa. Accept the invitation: ${emailData.inviteLink}`,
                categories: ['invitation', 'transactional']
            };
            
            await sgMail.send(msg);
            console.log(`Invitation email sent to ${invitation.email}`);
            
        } catch (error) {
            console.error('Error sending invitation email:', error);
        }
    }
    
    // Get default announcement template
    getDefaultAnnouncementTemplate() {
        return handlebars.compile(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>{{title}}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #00217D; color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; background: #f9f9f9; }
                    .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
                    .button { display: inline-block; padding: 12px 30px; background: #D41125; color: white; text-decoration: none; border-radius: 5px; }
                    .type-badge { display: inline-block; padding: 5px 15px; background: #e0e0e0; border-radius: 15px; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Pyebwa Family Tree</h1>
                        <p>Important Announcement</p>
                    </div>
                    <div class="content">
                        <span class="type-badge">{{type}}</span>
                        <h2>{{title}}</h2>
                        {{{content}}}
                        <p style="margin-top: 30px;">
                            <a href="{{appUrl}}" class="button">View in App</a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>© {{year}} Pyebwa. All rights reserved.</p>
                        <p><a href="{{unsubscribeUrl}}">Manage notification preferences</a></p>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
    
    // Get default welcome template
    getDefaultWelcomeTemplate() {
        return handlebars.compile(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Pyebwa!</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #00217D; color: white; padding: 40px; text-align: center; }
                    .content { padding: 40px; }
                    .feature { margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; }
                    .button { display: inline-block; padding: 15px 40px; background: #D41125; color: white; text-decoration: none; border-radius: 5px; font-size: 18px; }
                    .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to Pyebwa, {{userName}}!</h1>
                        <p>Your journey to preserving family history starts here</p>
                    </div>
                    <div class="content">
                        <p>Thank you for joining Pyebwa Family Tree. We're excited to help you discover, preserve, and share your family's unique story.</p>
                        
                        <h2>What you can do with Pyebwa:</h2>
                        
                        <div class="feature">
                            <h3>🌳 Build Your Family Tree</h3>
                            <p>Add family members, connect relationships, and watch your tree grow.</p>
                        </div>
                        
                        <div class="feature">
                            <h3>📸 Preserve Memories</h3>
                            <p>Upload photos, documents, and stories to keep memories alive.</p>
                        </div>
                        
                        <div class="feature">
                            <h3>🎙️ Record Audio Stories</h3>
                            <p>Capture voices and stories in audio format for future generations.</p>
                        </div>
                        
                        <div class="feature">
                            <h3>👥 Collaborate with Family</h3>
                            <p>Invite family members to contribute and build together.</p>
                        </div>
                        
                        <p style="text-align: center; margin-top: 40px;">
                            <a href="{{appUrl}}" class="button">Start Building Your Tree</a>
                        </p>
                        
                        <p style="margin-top: 30px;">If you have any questions, feel free to reach out to us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.</p>
                    </div>
                    <div class="footer">
                        <p>© {{year}} Pyebwa. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
    
    // Get default password reset template
    getDefaultPasswordResetTemplate() {
        return handlebars.compile(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Your Password</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #00217D; color: white; padding: 30px; text-align: center; }
                    .content { padding: 40px; background: #f9f9f9; }
                    .button { display: inline-block; padding: 15px 40px; background: #D41125; color: white; text-decoration: none; border-radius: 5px; }
                    .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
                    .warning { background: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; color: #856404; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <p>We received a request to reset your password for your Pyebwa account.</p>
                        
                        <p>Click the button below to reset your password:</p>
                        
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="{{resetLink}}" class="button">Reset Password</a>
                        </p>
                        
                        <div class="warning">
                            <p><strong>Important:</strong> This link will expire in {{expiryTime}}. If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                        </div>
                        
                        <p style="margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #0066cc;">{{resetLink}}</p>
                    </div>
                    <div class="footer">
                        <p>© {{year}} Pyebwa. All rights reserved.</p>
                        <p>Need help? Contact us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
    
    // Get default invitation template
    getDefaultInvitationTemplate() {
        return handlebars.compile(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>You're Invited to Join a Family Tree</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #00217D; color: white; padding: 40px; text-align: center; }
                    .content { padding: 40px; }
                    .invite-box { background: #f0f8ff; border: 2px solid #00217D; padding: 30px; border-radius: 10px; text-align: center; margin: 30px 0; }
                    .button { display: inline-block; padding: 15px 40px; background: #D41125; color: white; text-decoration: none; border-radius: 5px; font-size: 18px; }
                    .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>You're Invited!</h1>
                    </div>
                    <div class="content">
                        <p>Hi there,</p>
                        
                        <p><strong>{{inviterName}}</strong> has invited you to join their family tree on Pyebwa.</p>
                        
                        <div class="invite-box">
                            <h2>{{treeName}}</h2>
                            <p>You've been invited as a <strong>{{role}}</strong></p>
                            <p style="margin-top: 20px;">
                                <a href="{{inviteLink}}" class="button">Accept Invitation</a>
                            </p>
                        </div>
                        
                        <h3>What is Pyebwa?</h3>
                        <p>Pyebwa is a modern family tree platform that helps families preserve their history, share memories, and stay connected across generations.</p>
                        
                        <p>By accepting this invitation, you'll be able to:</p>
                        <ul>
                            <li>View and explore the family tree</li>
                            <li>Add your own family members and stories</li>
                            <li>Upload photos and documents</li>
                            <li>Connect with other family members</li>
                        </ul>
                        
                        <p style="margin-top: 30px;">If you have any questions about Pyebwa or this invitation, visit <a href="{{appUrl}}">our website</a> to learn more.</p>
                    </div>
                    <div class="footer">
                        <p>© {{year}} Pyebwa. All rights reserved.</p>
                        <p>This invitation was sent to you by {{inviterName}}. If you believe this was sent in error, you can safely ignore this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
    
    // Strip HTML from content
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, ' ')
                   .replace(/\s+/g, ' ')
                   .trim();
    }
    
    // Log email send
    async logEmailSend(announcement, recipientCount, results) {
        try {
            const successCount = results.filter(r => r.success).reduce((sum, r) => sum + r.count, 0);
            const failureCount = recipientCount - successCount;
            
            await admin.firestore().collection('email_logs').add({
                type: 'announcement',
                announcementId: announcement.id,
                announcementTitle: announcement.title,
                recipientCount: recipientCount,
                successCount: successCount,
                failureCount: failureCount,
                results: results,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            
        } catch (error) {
            console.error('Error logging email send:', error);
        }
    }
    
    // Get email statistics
    async getEmailStats(announcementId) {
        try {
            const logs = await admin.firestore()
                .collection('email_logs')
                .where('announcementId', '==', announcementId)
                .get();
            
            let totalSent = 0;
            let totalSuccess = 0;
            let totalFailure = 0;
            
            logs.forEach(doc => {
                const data = doc.data();
                totalSent += data.recipientCount || 0;
                totalSuccess += data.successCount || 0;
                totalFailure += data.failureCount || 0;
            });
            
            return {
                totalSent,
                totalSuccess,
                totalFailure,
                successRate: totalSent > 0 ? (totalSuccess / totalSent * 100).toFixed(2) : 0
            };
            
        } catch (error) {
            console.error('Error getting email stats:', error);
            return null;
        }
    }
}

// Export singleton instance
module.exports = new EmailService();