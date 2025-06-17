import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { loadMoonPaySdk } from '@moonpay/moonpay-js';

interface PurchaseOptions {
  amount: number;
  paymentMethod: 'sol' | 'card';
  email?: string;
}

interface PurchaseResult {
  success: boolean;
  transactionHash?: string;
  tokenAmount?: number;
  error?: string;
}

export class PaymentService {
  private moonpayApiKey: string;
  private solanaPrice: number = 30; // Default SOL price in USD

  constructor() {
    this.moonpayApiKey = process.env.REACT_APP_MOONPAY_API_KEY || '';
    this.fetchSolanaPrice();
  }

  /**
   * Fetch current SOL price from CoinGecko
   */
  private async fetchSolanaPrice() {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
      );
      const data = await response.json();
      this.solanaPrice = data.solana.usd;
    } catch (error) {
      console.error('Failed to fetch SOL price:', error);
    }
  }

  /**
   * Calculate token cost with bonding curve
   */
  calculateTokenCost(
    amount: number,
    currentSupply: number,
    basePrice: number
  ): { costInLamports: number; costInUSD: number } {
    // Apply bonding curve: 0.01% increase per million tokens
    const priceMultiplier = Math.pow(1.0001, currentSupply / 1_000_000);
    const adjustedPrice = basePrice * priceMultiplier;
    
    const costInLamports = Math.floor(amount * adjustedPrice);
    const costInSOL = costInLamports / LAMPORTS_PER_SOL;
    const costInUSD = costInSOL * this.solanaPrice;

    return { costInLamports, costInUSD };
  }

  /**
   * Purchase tokens with SOL
   */
  async purchaseWithSOL(
    program: anchor.Program,
    wallet: any,
    amount: number
  ): Promise<PurchaseResult> {
    try {
      const [tokenPoolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_pool")],
        program.programId
      );

      const [familyAccountPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("family"), wallet.publicKey.toBuffer()],
        program.programId
      );

      // Create purchase transaction
      const tx = await program.methods
        .purchaseTokens(new anchor.BN(amount))
        .accounts({
          buyer: wallet.publicKey,
          familyAccount: familyAccountPDA,
          tokenPool: tokenPoolPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return {
        success: true,
        transactionHash: tx,
        tokenAmount: amount,
      };
    } catch (error: any) {
      console.error('SOL purchase error:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed',
      };
    }
  }

  /**
   * Purchase tokens with credit card via MoonPay
   */
  async purchaseWithCard(
    walletAddress: string,
    amount: number,
    costInUSD: number,
    email?: string
  ): Promise<PurchaseResult> {
    try {
      const moonpay = await loadMoonPaySdk({
        apiKey: this.moonpayApiKey,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      });

      // Create MoonPay widget
      const widget = moonpay.createWidget({
        flow: 'buy',
        defaultCurrencyCode: 'sol',
        baseCurrencyAmount: costInUSD,
        walletAddress: walletAddress,
        email: email,
        redirectURL: window.location.origin + '/purchase-success',
        onTransactionCompleted: async (transaction: any) => {
          // Transaction completed, tokens will be minted via webhook
          console.log('MoonPay transaction completed:', transaction);
        },
      });

      // Open widget
      widget.open();

      return {
        success: true,
        tokenAmount: amount,
      };
    } catch (error: any) {
      console.error('Card purchase error:', error);
      return {
        success: false,
        error: error.message || 'Card payment failed',
      };
    }
  }

  /**
   * Create purchase invoice
   */
  async createInvoice(
    userId: string,
    amount: number,
    costInUSD: number,
    paymentMethod: string
  ): Promise<string> {
    try {
      const response = await fetch('/api/payment/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          userId,
          tokenAmount: amount,
          costInUSD,
          paymentMethod,
        }),
      });

      const data = await response.json();
      return data.invoiceId;
    } catch (error) {
      console.error('Invoice creation error:', error);
      throw error;
    }
  }

  /**
   * Check purchase limits based on KYC tier
   */
  async checkPurchaseLimits(userId: string): Promise<{
    dailyLimit: number;
    monthlyLimit: number;
    remainingDaily: number;
    remainingMonthly: number;
    kycTier: number;
  }> {
    try {
      const response = await fetch(`/api/payment/limits/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to check limits:', error);
      // Return default limits
      return {
        dailyLimit: 1000,
        monthlyLimit: 10000,
        remainingDaily: 1000,
        remainingMonthly: 10000,
        kycTier: 1,
      };
    }
  }

  /**
   * Process refund (time-locked)
   */
  async requestRefund(
    transactionHash: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/payment/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          transactionHash,
          reason,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Refund request failed');
      }

      return {
        success: true,
        message: data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Refund request failed',
      };
    }
  }

  /**
   * Get purchase history
   */
  async getPurchaseHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const response = await fetch(
        `/api/payment/history?userId=${userId}&limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch purchase history:', error);
      return [];
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();