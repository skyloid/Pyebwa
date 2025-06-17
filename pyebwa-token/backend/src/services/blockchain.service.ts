import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PyebwaToken } from '../types/pyebwa_token';
import { logger } from '../utils/logger';
import { Pool } from 'pg';
import bs58 from 'bs58';

interface MintResult {
  success: boolean;
  signature?: string;
  error?: string;
}

interface VerifyResult {
  success: boolean;
  signature?: string;
  tokensEarned?: number;
  error?: string;
}

interface BlockchainTransaction {
  signature: string;
  type: 'mint' | 'burn' | 'verify' | 'transfer';
  amount: number;
  from?: string;
  to?: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
}

export class BlockchainService {
  private connection: Connection;
  private program: Program<PyebwaToken> | null = null;
  private wallet: Wallet;
  private pool: Pool;
  private readonly PROGRAM_ID = process.env.SOLANA_PROGRAM_ID!;
  private readonly RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

  constructor() {
    this.connection = new Connection(this.RPC_URL, 'confirmed');
    
    // Initialize wallet from private key
    const privateKey = process.env.SOLANA_PRIVATE_KEY!;
    const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
    this.wallet = new Wallet(keypair);

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.initializeProgram();
  }

  /**
   * Initialize Anchor program
   */
  private async initializeProgram() {
    try {
      const provider = new AnchorProvider(
        this.connection,
        this.wallet,
        { commitment: 'confirmed' }
      );

      // Load IDL (would be imported from generated types)
      const idl = await Program.fetchIdl(
        new PublicKey(this.PROGRAM_ID),
        provider
      );

      if (!idl) {
        throw new Error('Failed to fetch program IDL');
      }

      this.program = new Program(
        idl,
        new PublicKey(this.PROGRAM_ID),
        provider
      ) as Program<PyebwaToken>;

      logger.info('Blockchain service initialized');
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
    }
  }

  /**
   * Mint tokens for user after purchase
   */
  async mintTokensForUser(
    userId: string,
    amount: number
  ): Promise<MintResult> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized');
      }

      // Get user's wallet address
      const userWallet = await this.getUserWallet(userId);
      if (!userWallet) {
        throw new Error('User wallet not found');
      }

      // Get token pool PDA
      const [tokenPoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('token_pool')],
        this.program.programId
      );

      // Get user token account PDA
      const [userTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_tokens'), new PublicKey(userWallet).toBuffer()],
        this.program.programId
      );

      // Create mint transaction
      const tx = await this.program.methods
        .mintTokens(new anchor.BN(amount))
        .accounts({
          tokenPool: tokenPoolPda,
          userTokenAccount: userTokenAccount,
          user: new PublicKey(userWallet),
          authority: this.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction();

      // Send transaction
      const signature = await this.connection.sendTransaction(
        tx,
        [this.wallet.payer],
        { skipPreflight: false }
      );

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(
        signature,
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      // Log transaction
      await this.logTransaction({
        signature,
        type: 'mint',
        amount,
        to: userWallet,
        timestamp: new Date(),
        status: 'confirmed',
      });

      // Update user balance in database
      await this.updateUserBalance(userId, amount, 'add');

      logger.info(`Minted ${amount} tokens for user ${userId}`);

      return {
        success: true,
        signature,
      };
    } catch (error: any) {
      logger.error('Token minting error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify planting and mint rewards
   */
  async verifyPlantingAndReward(
    planterId: string,
    evidenceId: string,
    treesVerified: number
  ): Promise<VerifyResult> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized');
      }

      // Calculate tokens to mint (200 tokens per tree)
      const tokensToMint = treesVerified * 200;

      // Get planter's wallet
      const planterWallet = await this.getUserWallet(planterId);
      if (!planterWallet) {
        throw new Error('Planter wallet not found');
      }

      // Get PDAs
      const [plantingRecord] = PublicKey.findProgramAddressSync(
        [Buffer.from('planting'), Buffer.from(evidenceId)],
        this.program.programId
      );

      const [planterAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('planter'), new PublicKey(planterWallet).toBuffer()],
        this.program.programId
      );

      const [planterTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_tokens'), new PublicKey(planterWallet).toBuffer()],
        this.program.programId
      );

      // Create verification transaction
      const tx = await this.program.methods
        .verifyPlanting(Buffer.from(evidenceId))
        .accounts({
          plantingRecord,
          planter: new PublicKey(planterWallet),
          planterAccount,
          planterTokenAccount,
          verifier: this.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction();

      // Send transaction
      const signature = await this.connection.sendTransaction(
        tx,
        [this.wallet.payer],
        { skipPreflight: false }
      );

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(
        signature,
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      // Log transaction
      await this.logTransaction({
        signature,
        type: 'verify',
        amount: tokensToMint,
        to: planterWallet,
        timestamp: new Date(),
        status: 'confirmed',
      });

      // Update planter earnings in database
      await this.updatePlanterEarnings(planterId, tokensToMint, treesVerified);

      logger.info(`Verified planting ${evidenceId}, minted ${tokensToMint} tokens`);

      return {
        success: true,
        signature,
        tokensEarned: tokensToMint,
      };
    } catch (error: any) {
      logger.error('Planting verification error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Burn tokens (for refunds)
   */
  async burnUserTokens(userId: string, amount: number): Promise<MintResult> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized');
      }

      const userWallet = await this.getUserWallet(userId);
      if (!userWallet) {
        throw new Error('User wallet not found');
      }

      // Get user token account PDA
      const [userTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_tokens'), new PublicKey(userWallet).toBuffer()],
        this.program.programId
      );

      // Create burn transaction
      const tx = await this.program.methods
        .burnTokens(new anchor.BN(amount))
        .accounts({
          userTokenAccount,
          user: new PublicKey(userWallet),
          authority: this.wallet.publicKey,
        })
        .transaction();

      // Send transaction
      const signature = await this.connection.sendTransaction(
        tx,
        [this.wallet.payer],
        { skipPreflight: false }
      );

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');

      // Log transaction
      await this.logTransaction({
        signature,
        type: 'burn',
        amount,
        from: userWallet,
        timestamp: new Date(),
        status: 'confirmed',
      });

      // Update user balance
      await this.updateUserBalance(userId, amount, 'subtract');

      logger.info(`Burned ${amount} tokens for user ${userId}`);

      return {
        success: true,
        signature,
      };
    } catch (error: any) {
      logger.error('Token burning error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user token balance
   */
  async getUserBalance(userId: string): Promise<number> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized');
      }

      const userWallet = await this.getUserWallet(userId);
      if (!userWallet) {
        return 0;
      }

      const [userTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_tokens'), new PublicKey(userWallet).toBuffer()],
        this.program.programId
      );

      const account = await this.program.account.userTokenAccount.fetchNullable(
        userTokenAccount
      );

      return account ? account.balance.toNumber() : 0;
    } catch (error) {
      logger.error('Balance fetch error:', error);
      return 0;
    }
  }

  /**
   * Get token pool statistics
   */
  async getTokenPoolStats(): Promise<{
    totalSupply: number;
    totalMinted: number;
    totalBurned: number;
    currentPrice: number;
    totalTrees: number;
    totalPlanters: number;
  }> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized');
      }

      const [tokenPoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('token_pool')],
        this.program.programId
      );

      const tokenPool = await this.program.account.tokenPool.fetch(tokenPoolPda);

      // Get additional stats from database
      const planterCount = await this.getTotalPlanters();

      return {
        totalSupply: tokenPool.totalSupply.toNumber(),
        totalMinted: tokenPool.totalMinted.toNumber(),
        totalBurned: tokenPool.totalBurned.toNumber(),
        currentPrice: tokenPool.tokenPrice.toNumber() / 1e9, // Convert from lamports
        totalTrees: tokenPool.totalTrees.toNumber(),
        totalPlanters: planterCount,
      };
    } catch (error) {
      logger.error('Token pool stats error:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<BlockchainTransaction[]> {
    const query = `
      SELECT * FROM blockchain_transactions
      WHERE from_address = $1 OR to_address = $1
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
    `;

    const userWallet = await this.getUserWallet(userId);
    const result = await this.pool.query(query, [userWallet, limit, offset]);

    return result.rows;
  }

  /**
   * Helper: Get user wallet address
   */
  private async getUserWallet(userId: string): Promise<string | null> {
    const query = `SELECT wallet_address FROM users WHERE id = $1`;
    const result = await this.pool.query(query, [userId]);
    return result.rows[0]?.wallet_address || null;
  }

  /**
   * Helper: Log transaction to database
   */
  private async logTransaction(tx: BlockchainTransaction): Promise<void> {
    const query = `
      INSERT INTO blockchain_transactions (
        signature, type, amount, from_address, 
        to_address, timestamp, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.pool.query(query, [
      tx.signature,
      tx.type,
      tx.amount,
      tx.from || null,
      tx.to || null,
      tx.timestamp,
      tx.status,
    ]);
  }

  /**
   * Helper: Update user balance in database
   */
  private async updateUserBalance(
    userId: string,
    amount: number,
    operation: 'add' | 'subtract'
  ): Promise<void> {
    const query = `
      UPDATE users 
      SET token_balance = token_balance ${operation === 'add' ? '+' : '-'} $1,
          updated_at = NOW()
      WHERE id = $2
    `;

    await this.pool.query(query, [amount, userId]);
  }

  /**
   * Helper: Update planter earnings
   */
  private async updatePlanterEarnings(
    planterId: string,
    tokensEarned: number,
    treesVerified: number
  ): Promise<void> {
    const query = `
      UPDATE planters 
      SET total_earnings = total_earnings + $1,
          trees_verified = trees_verified + $2,
          updated_at = NOW()
      WHERE user_id = $3
    `;

    await this.pool.query(query, [tokensEarned, treesVerified, planterId]);
  }

  /**
   * Helper: Get total planters count
   */
  private async getTotalPlanters(): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM planters WHERE verified = true`;
    const result = await this.pool.query(query);
    return parseInt(result.rows[0].count);
  }

  /**
   * Initialize token pool (one-time setup)
   */
  async initializeTokenPool(): Promise<MintResult> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized');
      }

      const [tokenPoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('token_pool')],
        this.program.programId
      );

      const tx = await this.program.methods
        .initialize()
        .accounts({
          tokenPool: tokenPoolPda,
          authority: this.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction();

      const signature = await this.connection.sendTransaction(
        tx,
        [this.wallet.payer]
      );

      await this.connection.confirmTransaction(signature, 'confirmed');

      logger.info('Token pool initialized');

      return {
        success: true,
        signature,
      };
    } catch (error: any) {
      logger.error('Token pool initialization error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();