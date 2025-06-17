import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Stripe from 'stripe';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { paymentService } from '../services/payment.service';
import { blockchainService } from '../services/blockchain.service';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// MoonPay webhook secret
const MOONPAY_WEBHOOK_SECRET = process.env.MOONPAY_WEBHOOK_SECRET!;

/**
 * Create payment intent for card payments
 */
router.post('/create-intent', [
  body('amount').isFloat({ min: 1 }),
  body('tokenAmount').isInt({ min: 1000 }),
  body('currency').isIn(['USD', 'EUR', 'CAD']),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, tokenAmount, currency } = req.body;
    const userId = req.headers.authorization?.split(' ')[1]; // Simplified auth

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        userId,
        tokenAmount,
        type: 'token_purchase',
      },
    });

    // Create pending transaction record
    await paymentService.createPendingTransaction({
      userId,
      tokenAmount,
      amountUSD: amount,
      paymentIntentId: paymentIntent.id,
      status: 'pending',
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    logger.error('Payment intent creation error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

/**
 * Stripe webhook handler
 */
router.post('/webhook/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    logger.error('Stripe webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleStripePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handleStripePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'charge.dispute.created':
        await handleStripeDispute(event.data.object as Stripe.Dispute);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * MoonPay webhook handler
 */
router.post('/webhook/moonpay', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    const signature = req.headers['moonpay-signature'] as string;
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', MOONPAY_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { type, data } = req.body;

    switch (type) {
      case 'transaction_created':
        await handleMoonPayTransactionCreated(data);
        break;
      
      case 'transaction_updated':
        await handleMoonPayTransactionUpdated(data);
        break;
      
      case 'transaction_failed':
        await handleMoonPayTransactionFailed(data);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('MoonPay webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Create invoice for purchase
 */
router.post('/invoice', [
  body('tokenAmount').isInt({ min: 1 }),
  body('costInUSD').isFloat({ min: 0.01 }),
  body('paymentMethod').isIn(['sol', 'card', 'moonpay']),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tokenAmount, costInUSD, paymentMethod } = req.body;
    const userId = req.headers.authorization?.split(' ')[1];

    const invoice = await paymentService.createInvoice({
      userId,
      tokenAmount,
      costInUSD,
      paymentMethod,
      treesFunded: Math.floor(tokenAmount * 0.5 / 200), // 50% funds trees, 200 tokens per tree
    });

    res.json({
      invoiceId: invoice.id,
      invoiceUrl: `/api/payment/invoice/${invoice.id}/pdf`,
    });
  } catch (error) {
    logger.error('Invoice creation error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

/**
 * Get purchase limits for user
 */
router.get('/limits/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limits = await paymentService.getUserLimits(userId);

    res.json(limits);
  } catch (error) {
    logger.error('Limits fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch limits' });
  }
});

/**
 * Get purchase history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await paymentService.getPurchaseHistory(userId, limit, offset);

    res.json(history);
  } catch (error) {
    logger.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * Process refund request
 */
router.post('/refund', [
  body('transactionHash').notEmpty(),
  body('reason').notEmpty().isLength({ max: 500 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionHash, reason } = req.body;
    const userId = req.headers.authorization?.split(' ')[1];

    // Check if refund is allowed (within time limit)
    const transaction = await paymentService.getTransaction(transactionHash);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const refundDeadline = new Date(transaction.createdAt);
    refundDeadline.setHours(refundDeadline.getHours() + 24); // 24 hour refund window

    if (new Date() > refundDeadline) {
      return res.status(400).json({ error: 'Refund window has expired' });
    }

    // Process refund
    const result = await paymentService.processRefund(transaction, reason);

    res.json({
      success: result.success,
      message: result.message,
      refundId: result.refundId,
    });
  } catch (error) {
    logger.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

/**
 * Get exchange rates
 */
router.get('/rates', async (req: Request, res: Response) => {
  try {
    const rates = await paymentService.getExchangeRates();
    
    res.json({
      rates,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Exchange rate fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

/**
 * Webhook handlers
 */
async function handleStripePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { userId, tokenAmount } = paymentIntent.metadata;
  
  // Update transaction status
  await paymentService.updateTransactionStatus(paymentIntent.id, 'completed');
  
  // Mint tokens on blockchain
  await blockchainService.mintTokensForUser(userId, parseInt(tokenAmount));
  
  // Send confirmation email
  await paymentService.sendPurchaseConfirmation(userId, parseInt(tokenAmount));
  
  logger.info(`Stripe payment successful: ${paymentIntent.id}`);
}

async function handleStripePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  await paymentService.updateTransactionStatus(paymentIntent.id, 'failed');
  logger.error(`Stripe payment failed: ${paymentIntent.id}`);
}

async function handleStripeDispute(dispute: Stripe.Dispute) {
  // Handle dispute by freezing tokens if necessary
  await paymentService.handleDispute(dispute.payment_intent as string);
  logger.warn(`Stripe dispute created: ${dispute.id}`);
}

async function handleMoonPayTransactionCreated(data: any) {
  await paymentService.createPendingTransaction({
    userId: data.walletAddress,
    tokenAmount: data.quoteCurrencyAmount,
    amountUSD: data.baseCurrencyAmount,
    paymentIntentId: data.id,
    status: 'pending',
    provider: 'moonpay',
  });
}

async function handleMoonPayTransactionUpdated(data: any) {
  if (data.status === 'completed') {
    await paymentService.updateTransactionStatus(data.id, 'completed');
    await blockchainService.mintTokensForUser(
      data.walletAddress,
      data.quoteCurrencyAmount
    );
  }
}

async function handleMoonPayTransactionFailed(data: any) {
  await paymentService.updateTransactionStatus(data.id, 'failed');
  logger.error(`MoonPay transaction failed: ${data.id}`);
}

export const paymentRouter = router;