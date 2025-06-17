import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';
import handlebars from 'handlebars';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: any;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
  }>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();
  private readonly FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@pyebwa.com';
  private readonly FROM_NAME = 'PYEBWA Token';

  constructor() {
    // Configure transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Load email templates
    this.loadTemplates();
  }

  /**
   * Load and compile email templates
   */
  private async loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../../templates/emails');
      const templateFiles = await fs.readdir(templatesDir);

      for (const file of templateFiles) {
        if (file.endsWith('.hbs')) {
          const templateName = file.replace('.hbs', '');
          const templateContent = await fs.readFile(
            path.join(templatesDir, file),
            'utf-8'
          );
          
          const compiled = handlebars.compile(templateContent);
          this.templates.set(templateName, compiled);
        }
      }

      // Register helpers
      this.registerHelpers();

      logger.info(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      logger.error('Failed to load email templates:', error);
    }
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers() {
    // Format currency
    handlebars.registerHelper('currency', (amount: number, currency: string = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
    });

    // Format date
    handlebars.registerHelper('date', (date: string | Date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Format number
    handlebars.registerHelper('number', (num: number) => {
      return new Intl.NumberFormat('en-US').format(num);
    });

    // Pluralize
    handlebars.registerHelper('pluralize', (count: number, singular: string, plural: string) => {
      return count === 1 ? singular : plural;
    });
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      // Get template
      const template = this.templates.get(options.template);
      if (!template) {
        throw new Error(`Email template '${options.template}' not found`);
      }

      // Compile HTML with data
      const html = template({
        ...options.data,
        year: new Date().getFullYear(),
        appName: 'PYEBWA Token',
        appUrl: process.env.APP_URL || 'https://pyebwa.com',
        supportEmail: 'support@pyebwa.com',
      });

      // Send email
      const info = await this.transporter.sendMail({
        from: `"${this.FROM_NAME}" <${this.FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html,
        attachments: options.attachments,
      });

      logger.info(`Email sent: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      logger.error('Email sending error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send purchase confirmation
   */
  async sendPurchaseConfirmation(
    email: string,
    data: {
      tokenAmount: number;
      treesFunded: number;
      costUSD: number;
      paymentMethod: string;
      transactionId: string;
      invoiceUrl?: string;
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: email,
      subject: 'PYEBWA Token Purchase Confirmation',
      template: 'purchase-confirmation',
      data: {
        ...data,
        purchaseDate: new Date(),
      },
    });
  }

  /**
   * Send verification success
   */
  async sendVerificationSuccess(
    email: string,
    data: {
      treesVerified: number;
      tokensEarned: number;
      location: string;
      verificationDate: Date;
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: email,
      subject: 'Trees Verified Successfully!',
      template: 'verification-success',
      data,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    email: string,
    data: {
      firstName: string;
      userType: 'buyer' | 'planter';
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: email,
      subject: 'Welcome to PYEBWA Token',
      template: 'welcome',
      data,
    });
  }

  /**
   * Send refund confirmation
   */
  async sendRefundConfirmation(
    email: string,
    data: {
      refundAmount: number;
      tokenAmount: number;
      reason: string;
      refundId: string;
      originalTransactionId: string;
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: email,
      subject: 'Refund Processed - PYEBWA Token',
      template: 'refund-confirmation',
      data: {
        ...data,
        refundDate: new Date(),
      },
    });
  }

  /**
   * Send planter payment notification
   */
  async sendPlanterPayment(
    email: string,
    data: {
      paymentAmount: number;
      treesPlanted: number;
      paymentMethod: string;
      paymentReference: string;
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: email,
      subject: 'Payment Received for Tree Planting',
      template: 'planter-payment',
      data: {
        ...data,
        paymentDate: new Date(),
      },
    });
  }

  /**
   * Send monthly summary
   */
  async sendMonthlySummary(
    email: string,
    data: {
      month: string;
      year: number;
      tokensPurchased: number;
      treesFunded: number;
      totalSpent: number;
      impactSummary: {
        co2Offset: number;
        jobsCreated: number;
        hectaresReforested: number;
      };
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: email,
      subject: `Your PYEBWA Impact Summary - ${data.month} ${data.year}`,
      template: 'monthly-summary',
      data,
    });
  }

  /**
   * Send verification reminder
   */
  async sendVerificationReminder(
    email: string,
    data: {
      pendingSubmissions: number;
      oldestSubmissionDate: Date;
      planterId: string;
      planterName: string;
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: email,
      subject: 'Action Required: Pending Tree Verifications',
      template: 'verification-reminder',
      data,
    });
  }

  /**
   * Send bulk email (for announcements)
   */
  async sendBulkEmail(
    recipients: string[],
    subject: string,
    template: string,
    data: any
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send in batches to avoid rate limits
    const batchSize = 50;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (email) => {
          const result = await this.sendEmail({
            to: email,
            subject,
            template,
            data,
          });

          if (result.success) {
            sent++;
          } else {
            failed++;
            errors.push(`${email}: ${result.error}`);
          }
        })
      );

      // Rate limiting delay
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { sent, failed, errors };
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();