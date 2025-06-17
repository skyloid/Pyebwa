import { Pool } from 'pg';
import Stripe from 'stripe';
import axios from 'axios';
import { logger } from '../utils/logger';
import { emailService } from './email.service';
import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

interface Transaction {
  id: string;
  userId: string;
  tokenAmount: number;
  amountUSD: number;
  paymentIntentId: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  provider: 'stripe' | 'moonpay' | 'sol';
  createdAt: Date;
}

interface UserLimits {
  dailyLimit: number;
  monthlyLimit: number;
  remainingDaily: number;
  remainingMonthly: number;
  kycTier: number;
}

interface RefundResult {
  success: boolean;
  message: string;
  refundId?: string;
}

export class PaymentService {
  private pool: Pool;
  private stripe: Stripe;
  private exchangeRates: Map<string, number> = new Map();
  private rateUpdateInterval: NodeJS.Timer;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });

    // Start exchange rate updates
    this.updateExchangeRates();
    this.rateUpdateInterval = setInterval(() => {
      this.updateExchangeRates();
    }, 5 * 60 * 1000); // Update every 5 minutes
  }

  /**
   * Create pending transaction record
   */
  async createPendingTransaction(data: {
    userId: string;
    tokenAmount: number;
    amountUSD: number;
    paymentIntentId: string;
    status: string;
    provider?: string;
  }): Promise<Transaction> {
    const query = `
      INSERT INTO token_transactions (
        id, user_id, token_amount, amount_usd, 
        payment_intent_id, status, provider, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;

    const id = `tx_${Date.now()}`;
    const values = [
      id,
      data.userId,
      data.tokenAmount,
      data.amountUSD,
      data.paymentIntentId,
      data.status,
      data.provider || 'stripe',
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    paymentIntentId: string,
    status: string
  ): Promise<void> {
    const query = `
      UPDATE token_transactions 
      SET status = $1, updated_at = NOW()
      WHERE payment_intent_id = $2
    `;

    await this.pool.query(query, [status, paymentIntentId]);
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(transactionHash: string): Promise<Transaction | null> {
    const query = `
      SELECT * FROM token_transactions 
      WHERE id = $1 OR payment_intent_id = $1
    `;

    const result = await this.pool.query(query, [transactionHash]);
    return result.rows[0] || null;
  }

  /**
   * Create invoice
   */
  async createInvoice(data: {
    userId: string;
    tokenAmount: number;
    costInUSD: number;
    paymentMethod: string;
    treesFunded: number;
  }): Promise<{ id: string; url?: string }> {
    const invoiceId = `inv_${Date.now()}`;

    // Store invoice data
    const query = `
      INSERT INTO invoices (
        id, user_id, token_amount, cost_usd, 
        payment_method, trees_funded, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `;

    await this.pool.query(query, [
      invoiceId,
      data.userId,
      data.tokenAmount,
      data.costInUSD,
      data.paymentMethod,
      data.treesFunded,
    ]);

    // Generate PDF (would use a PDF generation service)
    // For now, return a placeholder URL
    return {
      id: invoiceId,
      url: `/invoices/${invoiceId}.pdf`,
    };
  }

  /**
   * Get user purchase limits based on KYC tier
   */
  async getUserLimits(userId: string): Promise<UserLimits> {
    // Get user's KYC tier
    const userQuery = `
      SELECT kyc_tier FROM users WHERE id = $1
    `;
    const userResult = await this.pool.query(userQuery, [userId]);
    const kycTier = userResult.rows[0]?.kyc_tier || 1;

    // Define limits by tier
    const tierLimits = {
      1: { daily: 100, monthly: 1000 },    // $100/$1000 - Basic
      2: { daily: 1000, monthly: 10000 },  // $1000/$10000 - Verified
      3: { daily: 10000, monthly: 100000 }, // $10000/$100000 - Premium
    };

    const limits = tierLimits[kycTier as keyof typeof tierLimits] || tierLimits[1];

    // Calculate used amounts
    const now = new Date();
    const dayStart = new Date(now.setHours(0, 0, 0, 0));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageQuery = `
      SELECT 
        SUM(CASE WHEN created_at >= $2 THEN amount_usd ELSE 0 END) as daily_used,
        SUM(CASE WHEN created_at >= $3 THEN amount_usd ELSE 0 END) as monthly_used
      FROM token_transactions
      WHERE user_id = $1 AND status = 'completed'
    `;

    const usageResult = await this.pool.query(usageQuery, [userId, dayStart, monthStart]);
    const { daily_used, monthly_used } = usageResult.rows[0];

    return {
      dailyLimit: limits.daily,
      monthlyLimit: limits.monthly,
      remainingDaily: Math.max(0, limits.daily - (daily_used || 0)),
      remainingMonthly: Math.max(0, limits.monthly - (monthly_used || 0)),
      kycTier,
    };
  }

  /**
   * Get purchase history
   */
  async getPurchaseHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<any[]> {
    const query = `
      SELECT 
        t.*,
        i.trees_funded,
        i.id as invoice_id
      FROM token_transactions t
      LEFT JOIN invoices i ON i.user_id = t.user_id 
        AND i.token_amount = t.token_amount
        AND DATE(i.created_at) = DATE(t.created_at)
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [userId, limit, offset]);
    
    return result.rows.map(row => ({
      id: row.id,
      date: row.created_at,
      tokenAmount: row.token_amount,
      amountUSD: row.amount_usd,
      status: row.status,
      provider: row.provider,
      treesFunded: row.trees_funded || Math.floor(row.token_amount * 0.5 / 200),
      invoiceId: row.invoice_id,
    }));
  }

  /**
   * Process refund
   */
  async processRefund(
    transaction: Transaction,
    reason: string
  ): Promise<RefundResult> {
    try {
      // Process refund based on provider
      if (transaction.provider === 'stripe') {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(
          transaction.paymentIntentId
        );

        const refund = await this.stripe.refunds.create({
          payment_intent: paymentIntent.id,
          reason: 'requested_by_customer',
          metadata: { reason },
        });

        // Update transaction status
        await this.updateTransactionStatus(transaction.paymentIntentId, 'refunded');

        // Burn tokens on blockchain
        await this.burnUserTokens(transaction.userId, transaction.tokenAmount);

        return {
          success: true,
          message: 'Refund processed successfully',
          refundId: refund.id,
        };
      } else if (transaction.provider === 'moonpay') {
        // MoonPay refund API call would go here
        // For now, manual process
        await this.createRefundRequest(transaction, reason);
        
        return {
          success: true,
          message: 'Refund request submitted for manual processing',
        };
      } else if (transaction.provider === 'sol') {
        // SOL refunds would return tokens to original wallet
        await this.processSolanaRefund(transaction);
        
        return {
          success: true,
          message: 'SOL refund processed',
        };
      }

      return {
        success: false,
        message: 'Unknown payment provider',
      };
    } catch (error: any) {
      logger.error('Refund processing error:', error);
      return {
        success: false,
        message: error.message || 'Refund failed',
      };
    }
  }

  /**
   * Handle payment dispute
   */
  async handleDispute(paymentIntentId: string): Promise<void> {
    // Freeze tokens associated with disputed payment
    const transaction = await this.getTransaction(paymentIntentId);
    if (transaction) {
      await this.freezeUserTokens(transaction.userId, transaction.tokenAmount);
      
      // Create dispute record
      const query = `
        INSERT INTO disputes (
          transaction_id, user_id, token_amount, 
          status, created_at
        )
        VALUES ($1, $2, $3, 'open', NOW())
      `;
      
      await this.pool.query(query, [
        transaction.id,
        transaction.userId,
        transaction.tokenAmount,
      ]);
    }
  }

  /**
   * Send purchase confirmation email
   */
  async sendPurchaseConfirmation(
    userId: string,
    tokenAmount: number
  ): Promise<void> {
    // Get user email
    const query = `SELECT email FROM users WHERE id = $1`;
    const result = await this.pool.query(query, [userId]);
    const email = result.rows[0]?.email;

    if (email) {
      await emailService.sendEmail({
        to: email,
        subject: 'PYEBWA Token Purchase Confirmation',
        template: 'purchase-confirmation',
        data: {
          tokenAmount,
          treesFunded: Math.floor(tokenAmount * 0.5 / 200),
          date: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Update exchange rates
   */
  private async updateExchangeRates(): Promise<void> {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: 'solana,bitcoin,ethereum',
            vs_currencies: 'usd,eur,cad',
          },
        }
      );

      // Update rates
      this.exchangeRates.set('SOL_USD', response.data.solana.usd);
      this.exchangeRates.set('SOL_EUR', response.data.solana.eur);
      this.exchangeRates.set('SOL_CAD', response.data.solana.cad);

      logger.info('Exchange rates updated');
    } catch (error) {
      logger.error('Failed to update exchange rates:', error);
    }
  }

  /**
   * Get current exchange rates
   */
  async getExchangeRates(): Promise<Record<string, number>> {
    const rates: Record<string, number> = {};
    
    this.exchangeRates.forEach((value, key) => {
      rates[key] = value;
    });

    // Add PYEBWA rates
    const pyebwaUSD = 0.0001; // Base price
    rates['PYEBWA_USD'] = pyebwaUSD;
    rates['PYEBWA_EUR'] = pyebwaUSD * 0.92; // Approximate
    rates['PYEBWA_CAD'] = pyebwaUSD * 1.35; // Approximate

    return rates;
  }

  /**
   * Helper methods for blockchain operations
   */
  private async burnUserTokens(userId: string, amount: number): Promise<void> {
    // Would interact with blockchain to burn tokens
    logger.info(`Burning ${amount} tokens for user ${userId}`);
  }

  private async freezeUserTokens(userId: string, amount: number): Promise<void> {
    // Would interact with blockchain to freeze tokens
    logger.info(`Freezing ${amount} tokens for user ${userId}`);
  }

  private async processSolanaRefund(transaction: Transaction): Promise<void> {
    // Would process Solana refund transaction
    logger.info(`Processing SOL refund for transaction ${transaction.id}`);
  }

  private async createRefundRequest(
    transaction: Transaction,
    reason: string
  ): Promise<void> {
    const query = `
      INSERT INTO refund_requests (
        transaction_id, user_id, amount, reason, 
        status, created_at
      )
      VALUES ($1, $2, $3, $4, 'pending', NOW())
    `;

    await this.pool.query(query, [
      transaction.id,
      transaction.userId,
      transaction.amountUSD,
      reason,
    ]);
  }

  /**
   * Cleanup on service shutdown
   */
  destroy(): void {
    if (this.rateUpdateInterval) {
      clearInterval(this.rateUpdateInterval);
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();