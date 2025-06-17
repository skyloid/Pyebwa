import { Pool } from 'pg';
import Stripe from 'stripe';
import { logger } from '../utils/logger';
import { emailService } from './email.service';
import { blockchainService } from './blockchain.service';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  tokenAmount: number;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  discountPercent: number;
}

interface BulkDiscount {
  minTokens: number;
  maxTokens: number;
  discountPercent: number;
}

interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'paused' | 'cancelled' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
}

export class SubscriptionService {
  private pool: Pool;
  private stripe: Stripe;
  
  // Subscription plans
  private readonly plans: SubscriptionPlan[] = [
    {
      id: 'starter_monthly',
      name: 'Starter',
      description: 'Perfect for individuals making a difference',
      tokenAmount: 10000,
      price: 10,
      interval: 'month',
      features: [
        'Fund 5 trees monthly',
        'Monthly impact report',
        'Basic dashboard access',
        'Email support'
      ],
      discountPercent: 0,
    },
    {
      id: 'growth_monthly',
      name: 'Growth',
      description: 'For committed environmental supporters',
      tokenAmount: 50000,
      price: 45,
      interval: 'month',
      features: [
        'Fund 25 trees monthly',
        'Weekly impact reports',
        'Advanced analytics dashboard',
        'Priority support',
        'Custom impact certificate'
      ],
      discountPercent: 10,
    },
    {
      id: 'impact_monthly',
      name: 'Impact',
      description: 'Maximum environmental impact',
      tokenAmount: 100000,
      price: 80,
      interval: 'month',
      features: [
        'Fund 50 trees monthly',
        'Real-time impact tracking',
        'Dedicated account manager',
        'Custom branding options',
        'Quarterly impact video',
        'Tree naming rights'
      ],
      discountPercent: 20,
    },
    {
      id: 'enterprise_yearly',
      name: 'Enterprise',
      description: 'For organizations and businesses',
      tokenAmount: 1200000,
      price: 800,
      interval: 'year',
      features: [
        'Fund 600 trees yearly',
        'White-label options',
        'API access',
        'Custom reporting',
        'Employee engagement tools',
        'Carbon offset certification',
        'Dedicated forest section'
      ],
      discountPercent: 33,
    },
  ];

  // Bulk purchase discounts
  private readonly bulkDiscounts: BulkDiscount[] = [
    { minTokens: 100000, maxTokens: 499999, discountPercent: 5 },
    { minTokens: 500000, maxTokens: 999999, discountPercent: 10 },
    { minTokens: 1000000, maxTokens: 4999999, discountPercent: 15 },
    { minTokens: 5000000, maxTokens: 9999999, discountPercent: 20 },
    { minTokens: 10000000, maxTokens: Infinity, discountPercent: 25 },
  ];

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });

    this.initializeStripePlans();
  }

  /**
   * Initialize Stripe subscription plans
   */
  private async initializeStripePlans() {
    try {
      for (const plan of this.plans) {
        // Check if product exists
        const products = await this.stripe.products.list({
          limit: 100,
        });

        let product = products.data.find(p => p.metadata.plan_id === plan.id);

        if (!product) {
          // Create product
          product = await this.stripe.products.create({
            name: `PYEBWA ${plan.name} Plan`,
            description: plan.description,
            metadata: {
              plan_id: plan.id,
              token_amount: plan.tokenAmount.toString(),
            },
          });
        }

        // Check if price exists
        const prices = await this.stripe.prices.list({
          product: product.id,
          limit: 100,
        });

        if (prices.data.length === 0) {
          // Create price
          await this.stripe.prices.create({
            product: product.id,
            unit_amount: plan.price * 100, // Convert to cents
            currency: 'usd',
            recurring: {
              interval: plan.interval,
            },
            metadata: {
              plan_id: plan.id,
            },
          });
        }
      }

      logger.info('Stripe subscription plans initialized');
    } catch (error) {
      logger.error('Failed to initialize Stripe plans:', error);
    }
  }

  /**
   * Get all subscription plans
   */
  getPlans(): SubscriptionPlan[] {
    return this.plans;
  }

  /**
   * Get plan by ID
   */
  getPlan(planId: string): SubscriptionPlan | undefined {
    return this.plans.find(p => p.id === planId);
  }

  /**
   * Calculate bulk discount
   */
  calculateBulkDiscount(tokenAmount: number): {
    discountPercent: number;
    discountAmount: number;
    finalPrice: number;
  } {
    const basePrice = tokenAmount * 0.0001; // $0.0001 per token
    
    const discount = this.bulkDiscounts.find(
      d => tokenAmount >= d.minTokens && tokenAmount <= d.maxTokens
    );

    const discountPercent = discount?.discountPercent || 0;
    const discountAmount = basePrice * (discountPercent / 100);
    const finalPrice = basePrice - discountAmount;

    return {
      discountPercent,
      discountAmount,
      finalPrice,
    };
  }

  /**
   * Create subscription
   */
  async createSubscription(
    userId: string,
    planId: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    try {
      const plan = this.getPlan(planId);
      if (!plan) {
        throw new Error('Invalid plan');
      }

      // Get user
      const userQuery = `SELECT * FROM users WHERE id = $1`;
      const userResult = await this.pool.query(userQuery, [userId]);
      const user = userResult.rows[0];

      if (!user) {
        throw new Error('User not found');
      }

      // Get or create Stripe customer
      let customerId = user.stripe_customer_id;
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;

        // Update user with customer ID
        await this.pool.query(
          `UPDATE users SET stripe_customer_id = $1 WHERE id = $2`,
          [customerId, userId]
        );
      }

      // Attach payment method
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default payment method
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Get Stripe price
      const prices = await this.stripe.prices.list({
        limit: 100,
      });
      const price = prices.data.find(p => p.metadata.plan_id === planId);

      if (!price) {
        throw new Error('Price not found');
      }

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: price.id }],
        metadata: {
          userId,
          planId,
          tokenAmount: plan.tokenAmount.toString(),
        },
      });

      // Save subscription to database
      const insertQuery = `
        INSERT INTO subscriptions (
          id, user_id, plan_id, status,
          current_period_start, current_period_end,
          stripe_subscription_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id
      `;

      const subscriptionId = `sub_${Date.now()}`;
      await this.pool.query(insertQuery, [
        subscriptionId,
        userId,
        planId,
        subscription.status,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
        subscription.id,
      ]);

      // Send welcome email
      await emailService.sendEmail({
        to: user.email,
        subject: `Welcome to PYEBWA ${plan.name} Plan`,
        template: 'subscription-welcome',
        data: {
          planName: plan.name,
          tokenAmount: plan.tokenAmount,
          treesFunded: Math.floor(plan.tokenAmount * 0.5 / 200),
          features: plan.features,
        },
      });

      logger.info(`Subscription created for user ${userId}`);

      return {
        success: true,
        subscriptionId,
      };
    } catch (error: any) {
      logger.error('Subscription creation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    userId: string,
    subscriptionId: string,
    immediately: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get subscription
      const query = `
        SELECT * FROM subscriptions 
        WHERE id = $1 AND user_id = $2
      `;
      const result = await this.pool.query(query, [subscriptionId, userId]);
      const subscription = result.rows[0];

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Cancel in Stripe
      const stripeSubscription = await this.stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          cancel_at_period_end: !immediately,
        }
      );

      if (immediately) {
        await this.stripe.subscriptions.cancel(
          subscription.stripe_subscription_id
        );
      }

      // Update database
      const updateQuery = `
        UPDATE subscriptions 
        SET status = $1, 
            cancel_at_period_end = $2,
            updated_at = NOW()
        WHERE id = $3
      `;

      await this.pool.query(updateQuery, [
        immediately ? 'cancelled' : subscription.status,
        !immediately,
        subscriptionId,
      ]);

      logger.info(`Subscription ${subscriptionId} cancelled`);

      return { success: true };
    } catch (error: any) {
      logger.error('Subscription cancellation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Pause subscription
   */
  async pauseSubscription(
    userId: string,
    subscriptionId: string,
    resumeDate?: Date
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get subscription
      const query = `
        SELECT * FROM subscriptions 
        WHERE id = $1 AND user_id = $2
      `;
      const result = await this.pool.query(query, [subscriptionId, userId]);
      const subscription = result.rows[0];

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Pause in Stripe
      await this.stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          pause_collection: {
            behavior: 'mark_uncollectible',
            resumes_at: resumeDate ? Math.floor(resumeDate.getTime() / 1000) : undefined,
          },
        }
      );

      // Update database
      const updateQuery = `
        UPDATE subscriptions 
        SET status = 'paused',
            updated_at = NOW()
        WHERE id = $1
      `;

      await this.pool.query(updateQuery, [subscriptionId]);

      logger.info(`Subscription ${subscriptionId} paused`);

      return { success: true };
    } catch (error: any) {
      logger.error('Subscription pause error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Resume subscription
   */
  async resumeSubscription(
    userId: string,
    subscriptionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get subscription
      const query = `
        SELECT * FROM subscriptions 
        WHERE id = $1 AND user_id = $2
      `;
      const result = await this.pool.query(query, [subscriptionId, userId]);
      const subscription = result.rows[0];

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Resume in Stripe
      await this.stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          pause_collection: null,
        }
      );

      // Update database
      const updateQuery = `
        UPDATE subscriptions 
        SET status = 'active',
            updated_at = NOW()
        WHERE id = $1
      `;

      await this.pool.query(updateQuery, [subscriptionId]);

      logger.info(`Subscription ${subscriptionId} resumed`);

      return { success: true };
    } catch (error: any) {
      logger.error('Subscription resume error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    const query = `
      SELECT * FROM subscriptions 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Process subscription renewal
   */
  async processSubscriptionRenewal(
    stripeSubscriptionId: string
  ): Promise<void> {
    try {
      // Get subscription from database
      const query = `
        SELECT * FROM subscriptions 
        WHERE stripe_subscription_id = $1
      `;
      const result = await this.pool.query(query, [stripeSubscriptionId]);
      const subscription = result.rows[0];

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Get plan
      const plan = this.getPlan(subscription.plan_id);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Mint tokens for user
      await blockchainService.mintTokensForUser(
        subscription.user_id,
        plan.tokenAmount
      );

      // Update subscription period
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        stripeSubscriptionId
      );

      const updateQuery = `
        UPDATE subscriptions 
        SET current_period_start = $1,
            current_period_end = $2,
            updated_at = NOW()
        WHERE id = $3
      `;

      await this.pool.query(updateQuery, [
        new Date(stripeSubscription.current_period_start * 1000),
        new Date(stripeSubscription.current_period_end * 1000),
        subscription.id,
      ]);

      // Send renewal email
      const userQuery = `SELECT email FROM users WHERE id = $1`;
      const userResult = await this.pool.query(userQuery, [subscription.user_id]);
      const email = userResult.rows[0]?.email;

      if (email) {
        await emailService.sendEmail({
          to: email,
          subject: 'Subscription Renewed - PYEBWA Token',
          template: 'subscription-renewal',
          data: {
            planName: plan.name,
            tokenAmount: plan.tokenAmount,
            treesFunded: Math.floor(plan.tokenAmount * 0.5 / 200),
            nextRenewal: new Date(stripeSubscription.current_period_end * 1000),
          },
        });
      }

      logger.info(`Subscription ${subscription.id} renewed`);
    } catch (error) {
      logger.error('Subscription renewal error:', error);
      throw error;
    }
  }

  /**
   * Get subscription analytics
   */
  async getSubscriptionAnalytics(): Promise<{
    totalActiveSubscriptions: number;
    monthlyRecurringRevenue: number;
    averageSubscriptionValue: number;
    churnRate: number;
    subscriptionsByPlan: Record<string, number>;
  }> {
    // Active subscriptions
    const activeQuery = `
      SELECT COUNT(*) as count, plan_id 
      FROM subscriptions 
      WHERE status = 'active' 
      GROUP BY plan_id
    `;
    const activeResult = await this.pool.query(activeQuery);

    const subscriptionsByPlan: Record<string, number> = {};
    let totalActive = 0;
    let monthlyRevenue = 0;

    for (const row of activeResult.rows) {
      subscriptionsByPlan[row.plan_id] = parseInt(row.count);
      totalActive += parseInt(row.count);

      const plan = this.getPlan(row.plan_id);
      if (plan) {
        const monthlyValue = plan.interval === 'year' 
          ? plan.price / 12 
          : plan.price;
        monthlyRevenue += monthlyValue * parseInt(row.count);
      }
    }

    // Churn rate (last 30 days)
    const churnQuery = `
      SELECT COUNT(*) as cancelled 
      FROM subscriptions 
      WHERE status = 'cancelled' 
      AND updated_at >= NOW() - INTERVAL '30 days'
    `;
    const churnResult = await this.pool.query(churnQuery);
    const cancelledCount = parseInt(churnResult.rows[0]?.cancelled || 0);
    const churnRate = totalActive > 0 ? (cancelledCount / totalActive) * 100 : 0;

    return {
      totalActiveSubscriptions: totalActive,
      monthlyRecurringRevenue: monthlyRevenue,
      averageSubscriptionValue: totalActive > 0 ? monthlyRevenue / totalActive : 0,
      churnRate,
      subscriptionsByPlan,
    };
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();