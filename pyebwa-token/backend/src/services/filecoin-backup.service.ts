import { Web3Storage, File as Web3File } from 'web3.storage';
import { logger } from '../utils/logger';
import { Pool } from 'pg';
import axios from 'axios';

interface FilecoinDeal {
  cid: string;
  dealId?: string;
  miner?: string;
  status: 'pending' | 'active' | 'expired' | 'failed';
  createdAt: Date;
  expiresAt?: Date;
  size: number;
  cost?: number;
}

interface BackupJob {
  id: string;
  ipfsHash: string;
  filecoinCid?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class FilecoinBackupService {
  private web3Storage: Web3Storage;
  private pool: Pool;
  private backupQueue: BackupJob[] = [];
  private isProcessing = false;
  private readonly MAX_RETRIES = 3;
  private readonly BACKUP_THRESHOLD = 10 * 1024 * 1024; // 10MB

  constructor() {
    this.web3Storage = new Web3Storage({
      token: process.env.WEB3_STORAGE_TOKEN!,
    });

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Start backup processor
    this.startBackupProcessor();
  }

  /**
   * Queue content for Filecoin backup
   */
  async queueBackup(
    ipfsHash: string,
    content: Buffer,
    metadata: {
      filename: string;
      type: string;
      userId: string;
      priority?: number;
    }
  ): Promise<string> {
    const jobId = `backup_${Date.now()}`;
    
    // Check if already backed up
    const existing = await this.getBackupStatus(ipfsHash);
    if (existing && existing.status === 'completed') {
      logger.info(`Content ${ipfsHash} already backed up to Filecoin`);
      return existing.filecoinCid!;
    }

    // Check size threshold
    if (content.length < this.BACKUP_THRESHOLD) {
      logger.debug(`Content ${ipfsHash} below backup threshold`);
      return '';
    }

    // Create backup job
    const job: BackupJob = {
      id: jobId,
      ipfsHash,
      status: 'queued',
      priority: metadata.priority || this.calculatePriority(metadata.type),
      attempts: 0,
      createdAt: new Date(),
    };

    // Save to database
    await this.saveBackupJob(job);

    // Add to queue
    this.backupQueue.push(job);
    this.backupQueue.sort((a, b) => b.priority - a.priority);

    logger.info(`Queued backup job ${jobId} for ${ipfsHash}`);

    return jobId;
  }

  /**
   * Backup content to Filecoin via Web3.Storage
   */
  private async backupToFilecoin(
    job: BackupJob,
    content: Buffer,
    filename: string
  ): Promise<string> {
    try {
      // Create Web3Storage file
      const file = new Web3File([content], filename, {
        type: 'application/octet-stream',
      });

      // Upload to Web3.Storage (which handles Filecoin deals)
      const cid = await this.web3Storage.put([file], {
        wrapWithDirectory: false,
        onRootCidReady: (cid) => {
          logger.info(`Filecoin CID ready: ${cid}`);
        },
        onStoredChunk: (size) => {
          logger.debug(`Stored chunk: ${size} bytes`);
        },
      });

      // Get deal information
      const status = await this.web3Storage.status(cid);
      
      // Save deal information
      const deal: FilecoinDeal = {
        cid,
        dealId: status?.deals?.[0]?.dealId,
        miner: status?.deals?.[0]?.miner,
        status: 'pending',
        createdAt: new Date(),
        size: content.length,
      };

      await this.saveFilecoinDeal(deal);

      logger.info(`Content backed up to Filecoin: ${cid}`);

      return cid;
    } catch (error) {
      logger.error('Filecoin backup error:', error);
      throw error;
    }
  }

  /**
   * Start backup processor
   */
  private startBackupProcessor() {
    setInterval(async () => {
      if (this.isProcessing || this.backupQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      try {
        const job = this.backupQueue.shift();
        if (!job) return;

        await this.processBackupJob(job);
      } catch (error) {
        logger.error('Backup processor error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 30000); // Process every 30 seconds
  }

  /**
   * Process backup job
   */
  private async processBackupJob(job: BackupJob) {
    try {
      // Update job status
      job.status = 'processing';
      job.attempts++;
      await this.updateBackupJob(job);

      // Get content from IPFS
      const content = await this.getContentFromIPFS(job.ipfsHash);
      
      // Get metadata
      const metadata = await this.getContentMetadata(job.ipfsHash);

      // Backup to Filecoin
      const cid = await this.backupToFilecoin(
        job,
        content,
        metadata.filename || `backup_${job.ipfsHash}`
      );

      // Update job
      job.status = 'completed';
      job.filecoinCid = cid;
      job.completedAt = new Date();
      await this.updateBackupJob(job);

      // Update content index
      await this.updateContentBackupStatus(job.ipfsHash, cid);

      logger.info(`Backup job ${job.id} completed`);
    } catch (error: any) {
      logger.error(`Backup job ${job.id} failed:`, error);

      job.error = error.message;

      if (job.attempts < this.MAX_RETRIES) {
        // Retry later
        job.status = 'queued';
        this.backupQueue.push(job);
      } else {
        // Mark as failed
        job.status = 'failed';
      }

      await this.updateBackupJob(job);
    }
  }

  /**
   * Get backup status
   */
  async getBackupStatus(ipfsHash: string): Promise<BackupJob | null> {
    const query = `
      SELECT * FROM filecoin_backups 
      WHERE ipfs_hash = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const result = await this.pool.query(query, [ipfsHash]);
    return result.rows[0] || null;
  }

  /**
   * Get Filecoin deal status
   */
  async getDealStatus(cid: string): Promise<FilecoinDeal | null> {
    try {
      // Get from database
      const query = `SELECT * FROM filecoin_deals WHERE cid = $1`;
      const result = await this.pool.query(query, [cid]);
      const deal = result.rows[0];

      if (!deal) return null;

      // Update status from Web3.Storage
      const status = await this.web3Storage.status(cid);
      
      if (status && status.deals && status.deals.length > 0) {
        const activeDeal = status.deals.find(d => d.status === 'Active');
        if (activeDeal) {
          deal.status = 'active';
          deal.dealId = activeDeal.dealId;
          deal.miner = activeDeal.miner;
          
          await this.updateFilecoinDeal(deal);
        }
      }

      return deal;
    } catch (error) {
      logger.error('Deal status error:', error);
      return null;
    }
  }

  /**
   * Restore from Filecoin
   */
  async restoreFromFilecoin(cid: string): Promise<Buffer> {
    try {
      // Try to get from Web3.Storage gateway
      const response = await axios.get(`https://${cid}.ipfs.w3s.link/`, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Filecoin restore error:', error);
      
      // Try alternative gateways
      const gateways = [
        `https://dweb.link/ipfs/${cid}`,
        `https://gateway.ipfs.io/ipfs/${cid}`,
      ];

      for (const gateway of gateways) {
        try {
          const response = await axios.get(gateway, {
            responseType: 'arraybuffer',
            timeout: 30000,
          });
          return Buffer.from(response.data);
        } catch (err) {
          continue;
        }
      }

      throw new Error('Failed to restore from Filecoin');
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    pendingBackups: number;
    completedBackups: number;
    failedBackups: number;
    totalSize: number;
    activeDeals: number;
    estimatedCost: number;
  }> {
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' OR status = 'queued' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM filecoin_backups
    `;

    const dealsQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_deals,
        SUM(size) as total_size,
        SUM(cost) as total_cost
      FROM filecoin_deals
    `;

    const [statsResult, dealsResult] = await Promise.all([
      this.pool.query(statsQuery),
      this.pool.query(dealsQuery),
    ]);

    return {
      totalBackups: parseInt(statsResult.rows[0].total),
      pendingBackups: parseInt(statsResult.rows[0].pending),
      completedBackups: parseInt(statsResult.rows[0].completed),
      failedBackups: parseInt(statsResult.rows[0].failed),
      totalSize: parseInt(dealsResult.rows[0].total_size || 0),
      activeDeals: parseInt(dealsResult.rows[0].active_deals || 0),
      estimatedCost: parseFloat(dealsResult.rows[0].total_cost || 0),
    };
  }

  /**
   * Database operations
   */

  private async saveBackupJob(job: BackupJob): Promise<void> {
    const query = `
      INSERT INTO filecoin_backups (
        id, ipfs_hash, filecoin_cid, status, 
        priority, attempts, error, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await this.pool.query(query, [
      job.id,
      job.ipfsHash,
      job.filecoinCid,
      job.status,
      job.priority,
      job.attempts,
      job.error,
      job.createdAt,
    ]);
  }

  private async updateBackupJob(job: BackupJob): Promise<void> {
    const query = `
      UPDATE filecoin_backups 
      SET status = $1, attempts = $2, error = $3, 
          filecoin_cid = $4, completed_at = $5
      WHERE id = $6
    `;

    await this.pool.query(query, [
      job.status,
      job.attempts,
      job.error,
      job.filecoinCid,
      job.completedAt,
      job.id,
    ]);
  }

  private async saveFilecoinDeal(deal: FilecoinDeal): Promise<void> {
    const query = `
      INSERT INTO filecoin_deals (
        cid, deal_id, miner, status, 
        created_at, expires_at, size, cost
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (cid) DO UPDATE
      SET deal_id = $2, miner = $3, status = $4
    `;

    await this.pool.query(query, [
      deal.cid,
      deal.dealId,
      deal.miner,
      deal.status,
      deal.createdAt,
      deal.expiresAt,
      deal.size,
      deal.cost,
    ]);
  }

  private async updateFilecoinDeal(deal: FilecoinDeal): Promise<void> {
    const query = `
      UPDATE filecoin_deals 
      SET deal_id = $1, miner = $2, status = $3
      WHERE cid = $4
    `;

    await this.pool.query(query, [
      deal.dealId,
      deal.miner,
      deal.status,
      deal.cid,
    ]);
  }

  private async updateContentBackupStatus(
    ipfsHash: string,
    filecoinCid: string
  ): Promise<void> {
    const query = `
      UPDATE ipfs_content 
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'), 
        '{filecoin_backup}', 
        $1::jsonb
      )
      WHERE hash = $2
    `;

    const backupInfo = JSON.stringify({
      cid: filecoinCid,
      backedUpAt: new Date().toISOString(),
    });

    await this.pool.query(query, [backupInfo, ipfsHash]);
  }

  /**
   * Helper methods
   */

  private calculatePriority(type: string): number {
    const priorities: Record<string, number> = {
      video: 10,
      image: 8,
      document: 6,
      audio: 5,
      data: 3,
      other: 1,
    };
    return priorities[type] || 1;
  }

  private async getContentFromIPFS(hash: string): Promise<Buffer> {
    // Would use IPFS service to get content
    throw new Error('Not implemented');
  }

  private async getContentMetadata(hash: string): Promise<any> {
    const query = `SELECT metadata FROM ipfs_content WHERE hash = $1`;
    const result = await this.pool.query(query, [hash]);
    return result.rows[0]?.metadata || {};
  }

  /**
   * Check and renew expiring deals
   */
  async checkExpiringDeals(): Promise<void> {
    const query = `
      SELECT * FROM filecoin_deals 
      WHERE status = 'active' 
      AND expires_at < NOW() + INTERVAL '30 days'
    `;

    const result = await this.pool.query(query);
    
    for (const deal of result.rows) {
      logger.warn(`Filecoin deal ${deal.deal_id} expiring soon`);
      // Could implement auto-renewal logic here
    }
  }
}

// Export singleton instance
export const filecoinBackupService = new FilecoinBackupService();