import { create, IPFSHTTPClient } from 'ipfs-http-client';
import axios from 'axios';
import FormData from 'form-data';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import { Pool } from 'pg';
import PQueue from 'p-queue';
import retry from 'p-retry';
import { Web3Storage } from 'web3.storage';
import { performance } from 'perf_hooks';

interface IPFSProvider {
  name: string;
  priority: number;
  healthy: boolean;
  lastCheck: Date;
  uploadCount: number;
  errorCount: number;
}

interface ChunkedUpload {
  id: string;
  totalChunks: number;
  uploadedChunks: number;
  chunks: ChunkInfo[];
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  startTime: Date;
  metadata: any;
}

interface ChunkInfo {
  index: number;
  hash?: string;
  size: number;
  uploaded: boolean;
}

interface IPFSUploadResult {
  hash: string;
  size: number;
  url: string;
  provider: string;
  backups: string[];
  uploadTime: number;
}

interface ContentIndex {
  hash: string;
  filename: string;
  size: number;
  type: string;
  encrypted: boolean;
  providers: string[];
  createdAt: Date;
  accessCount: number;
  lastAccessed?: Date;
  metadata?: any;
}

export class EnhancedIPFSService {
  private ipfsClient: IPFSHTTPClient;
  private web3Storage: Web3Storage;
  private pool: Pool;
  private uploadQueue: PQueue;
  private providers: Map<string, IPFSProvider> = new Map();
  private chunkedUploads: Map<string, ChunkedUpload> = new Map();
  
  // Configuration
  private readonly CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  private readonly MAX_RETRIES = 3;
  private readonly GATEWAY_TIMEOUT = 5000; // 5 seconds
  
  // Gateways with fallbacks
  private readonly gateways = [
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://gateway.ipfs.io/ipfs/',
    'https://dweb.link/ipfs/',
  ];

  constructor() {
    // Initialize IPFS client
    this.ipfsClient = create({
      url: process.env.IPFS_API_URL || 'https://ipfs.infura.io:5001',
    });

    // Initialize Web3.Storage
    this.web3Storage = new Web3Storage({
      token: process.env.WEB3_STORAGE_TOKEN!,
    });

    // Initialize database pool
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Initialize upload queue with concurrency limit
    this.uploadQueue = new PQueue({ concurrency: 5 });

    // Initialize providers
    this.initializeProviders();

    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Initialize storage providers
   */
  private initializeProviders() {
    this.providers.set('pinata', {
      name: 'Pinata',
      priority: 1,
      healthy: true,
      lastCheck: new Date(),
      uploadCount: 0,
      errorCount: 0,
    });

    this.providers.set('web3storage', {
      name: 'Web3.Storage',
      priority: 2,
      healthy: true,
      lastCheck: new Date(),
      uploadCount: 0,
      errorCount: 0,
    });

    this.providers.set('infura', {
      name: 'Infura',
      priority: 3,
      healthy: true,
      lastCheck: new Date(),
      uploadCount: 0,
      errorCount: 0,
    });
  }

  /**
   * Upload file with chunking support
   */
  async uploadFile(
    file: Buffer,
    filename: string,
    options: {
      encrypt?: boolean;
      metadata?: any;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<IPFSUploadResult> {
    const startTime = performance.now();
    const { encrypt = true, metadata, onProgress } = options;

    try {
      let fileData = file;
      
      // Encrypt if requested
      if (encrypt) {
        fileData = await this.encryptData(file);
      }

      // Check if file needs chunking
      if (fileData.length > this.CHUNK_SIZE) {
        return await this.uploadChunked(fileData, filename, { metadata, onProgress });
      }

      // Upload to primary provider
      const primaryResult = await this.uploadToProvider(fileData, filename, 'pinata');
      
      // Upload to backup providers in background
      const backupPromises = ['web3storage', 'infura'].map(provider =>
        this.uploadToProvider(fileData, filename, provider).catch(err => {
          logger.error(`Backup upload to ${provider} failed:`, err);
          return null;
        })
      );

      // Wait for at least one backup to complete
      const backups = await Promise.race([
        Promise.all(backupPromises),
        new Promise<any[]>(resolve => setTimeout(() => resolve([]), 10000)) // 10s timeout
      ]);

      const validBackups = backups.filter(Boolean).map(b => b!.hash);

      // Index the content
      await this.indexContent({
        hash: primaryResult.hash,
        filename,
        size: fileData.length,
        type: this.detectContentType(filename),
        encrypted: encrypt,
        providers: ['pinata', ...validBackups.map(() => 'web3storage')],
        createdAt: new Date(),
        accessCount: 0,
        metadata,
      });

      const uploadTime = performance.now() - startTime;
      
      logger.info(`File uploaded successfully: ${primaryResult.hash} (${uploadTime.toFixed(2)}ms)`);

      return {
        ...primaryResult,
        provider: 'pinata',
        backups: validBackups,
        uploadTime,
      };
    } catch (error) {
      logger.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Upload large file in chunks
   */
  private async uploadChunked(
    file: Buffer,
    filename: string,
    options: {
      metadata?: any;
      onProgress?: (progress: number) => void;
    }
  ): Promise<IPFSUploadResult> {
    const uploadId = `upload_${Date.now()}`;
    const chunks: ChunkInfo[] = [];
    const totalChunks = Math.ceil(file.length / this.CHUNK_SIZE);

    // Create chunk info
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.CHUNK_SIZE;
      const end = Math.min(start + this.CHUNK_SIZE, file.length);
      chunks.push({
        index: i,
        size: end - start,
        uploaded: false,
      });
    }

    // Track chunked upload
    const chunkedUpload: ChunkedUpload = {
      id: uploadId,
      totalChunks,
      uploadedChunks: 0,
      chunks,
      status: 'uploading',
      startTime: new Date(),
      metadata: options.metadata,
    };

    this.chunkedUploads.set(uploadId, chunkedUpload);

    try {
      // Upload chunks in parallel
      const uploadPromises = chunks.map((chunk, index) =>
        this.uploadQueue.add(async () => {
          const start = index * this.CHUNK_SIZE;
          const end = Math.min(start + this.CHUNK_SIZE, file.length);
          const chunkData = file.slice(start, end);

          const result = await retry(
            () => this.uploadToProvider(chunkData, `${filename}.chunk${index}`, 'pinata'),
            { retries: this.MAX_RETRIES }
          );

          chunk.hash = result.hash;
          chunk.uploaded = true;
          chunkedUpload.uploadedChunks++;

          if (options.onProgress) {
            const progress = (chunkedUpload.uploadedChunks / totalChunks) * 100;
            options.onProgress(progress);
          }

          return result;
        })
      );

      const chunkResults = await Promise.all(uploadPromises);

      // Create manifest
      const manifest = {
        filename,
        chunks: chunks.map(c => ({
          index: c.index,
          hash: c.hash,
          size: c.size,
        })),
        totalSize: file.length,
        chunkSize: this.CHUNK_SIZE,
        metadata: options.metadata,
      };

      // Upload manifest
      const manifestResult = await this.uploadJSON(manifest, `${filename}.manifest`);

      chunkedUpload.status = 'completed';
      this.chunkedUploads.delete(uploadId);

      return {
        hash: manifestResult.hash,
        size: file.length,
        url: await this.getGatewayUrl(manifestResult.hash),
        provider: 'pinata',
        backups: [],
        uploadTime: Date.now() - chunkedUpload.startTime.getTime(),
      };
    } catch (error) {
      chunkedUpload.status = 'failed';
      logger.error('Chunked upload error:', error);
      throw error;
    }
  }

  /**
   * Upload to specific provider
   */
  private async uploadToProvider(
    data: Buffer,
    filename: string,
    providerName: string
  ): Promise<{ hash: string; size: number; url: string }> {
    const provider = this.providers.get(providerName);
    if (!provider || !provider.healthy) {
      throw new Error(`Provider ${providerName} is not available`);
    }

    try {
      let result: { hash: string; size: number; url: string };

      switch (providerName) {
        case 'pinata':
          result = await this.uploadToPinata(data, filename);
          break;
        case 'web3storage':
          result = await this.uploadToWeb3Storage(data, filename);
          break;
        case 'infura':
          result = await this.uploadToInfura(data, filename);
          break;
        default:
          throw new Error(`Unknown provider: ${providerName}`);
      }

      provider.uploadCount++;
      return result;
    } catch (error) {
      provider.errorCount++;
      provider.healthy = false;
      throw error;
    }
  }

  /**
   * Upload to Pinata
   */
  private async uploadToPinata(
    data: Buffer,
    filename: string
  ): Promise<{ hash: string; size: number; url: string }> {
    const formData = new FormData();
    formData.append('file', data, filename);
    formData.append('pinataOptions', JSON.stringify({
      cidVersion: 1,
    }));
    formData.append('pinataMetadata', JSON.stringify({
      name: filename,
      keyvalues: {
        project: 'pyebwa-token',
        timestamp: new Date().toISOString(),
      },
    }));

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'pinata_api_key': process.env.PINATA_API_KEY!,
          'pinata_secret_api_key': process.env.PINATA_SECRET!,
        },
        maxBodyLength: Infinity,
      }
    );

    return {
      hash: response.data.IpfsHash,
      size: response.data.PinSize,
      url: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
    };
  }

  /**
   * Upload to Web3.Storage
   */
  private async uploadToWeb3Storage(
    data: Buffer,
    filename: string
  ): Promise<{ hash: string; size: number; url: string }> {
    const file = new File([data], filename);
    const cid = await this.web3Storage.put([file]);

    return {
      hash: cid,
      size: data.length,
      url: `https://${cid}.ipfs.dweb.link/`,
    };
  }

  /**
   * Upload to Infura
   */
  private async uploadToInfura(
    data: Buffer,
    filename: string
  ): Promise<{ hash: string; size: number; url: string }> {
    const result = await this.ipfsClient.add(data, {
      progress: (prog) => logger.debug(`Infura upload progress: ${prog}`),
    });

    return {
      hash: result.path,
      size: result.size,
      url: `https://ipfs.infura.io/ipfs/${result.path}`,
    };
  }

  /**
   * Upload JSON data
   */
  async uploadJSON(data: any, filename?: string): Promise<IPFSUploadResult> {
    const jsonString = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(jsonString);
    return this.uploadFile(buffer, filename || 'data.json', { encrypt: false });
  }

  /**
   * Retrieve file with gateway fallbacks
   */
  async getFile(hash: string, decrypt: boolean = false): Promise<Buffer> {
    // Try cache first
    const cached = await this.getCachedContent(hash);
    if (cached) {
      await this.updateAccessStats(hash);
      return decrypt ? await this.decryptData(cached) : cached;
    }

    // Try gateways in order
    for (const gateway of this.gateways) {
      try {
        const url = `${gateway}${hash}`;
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: this.GATEWAY_TIMEOUT,
        });

        const buffer = Buffer.from(response.data);
        
        // Cache the content
        await this.cacheContent(hash, buffer);
        await this.updateAccessStats(hash);

        return decrypt ? await this.decryptData(buffer) : buffer;
      } catch (error) {
        logger.debug(`Gateway ${gateway} failed for ${hash}`);
        continue;
      }
    }

    // If all gateways fail, try direct IPFS
    try {
      const chunks = [];
      for await (const chunk of this.ipfsClient.cat(hash)) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      await this.cacheContent(hash, buffer);
      await this.updateAccessStats(hash);

      return decrypt ? await this.decryptData(buffer) : buffer;
    } catch (error) {
      logger.error('All retrieval methods failed:', error);
      throw new Error('Failed to retrieve content from IPFS');
    }
  }

  /**
   * Get optimal gateway URL
   */
  async getGatewayUrl(hash: string): Promise<string> {
    // Test gateways and return fastest
    const gatewayTests = this.gateways.map(async (gateway) => {
      const start = Date.now();
      try {
        await axios.head(`${gateway}${hash}`, { timeout: 3000 });
        return {
          gateway,
          responseTime: Date.now() - start,
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(gatewayTests);
    const validGateways = results.filter(Boolean) as { gateway: string; responseTime: number }[];
    
    if (validGateways.length === 0) {
      return `${this.gateways[0]}${hash}`; // Default to first gateway
    }

    // Sort by response time
    validGateways.sort((a, b) => a.responseTime - b.responseTime);
    return `${validGateways[0].gateway}${hash}`;
  }

  /**
   * Index content in database
   */
  private async indexContent(content: ContentIndex): Promise<void> {
    const query = `
      INSERT INTO ipfs_content (
        hash, filename, size, type, encrypted,
        providers, created_at, access_count, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (hash) DO UPDATE
      SET providers = array_cat(ipfs_content.providers, $6),
          access_count = ipfs_content.access_count + 1
    `;

    await this.pool.query(query, [
      content.hash,
      content.filename,
      content.size,
      content.type,
      content.encrypted,
      content.providers,
      content.createdAt,
      content.accessCount,
      JSON.stringify(content.metadata || {}),
    ]);
  }

  /**
   * Search indexed content
   */
  async searchContent(params: {
    filename?: string;
    type?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<ContentIndex[]> {
    let query = 'SELECT * FROM ipfs_content WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (params.filename) {
      query += ` AND filename ILIKE $${paramIndex}`;
      values.push(`%${params.filename}%`);
      paramIndex++;
    }

    if (params.type) {
      query += ` AND type = $${paramIndex}`;
      values.push(params.type);
      paramIndex++;
    }

    if (params.dateFrom) {
      query += ` AND created_at >= $${paramIndex}`;
      values.push(params.dateFrom);
      paramIndex++;
    }

    if (params.dateTo) {
      query += ` AND created_at <= $${paramIndex}`;
      values.push(params.dateTo);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    if (params.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(params.limit);
      paramIndex++;
    }

    if (params.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(params.offset);
    }

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  /**
   * Start health monitoring for providers
   */
  private startHealthMonitoring() {
    setInterval(async () => {
      for (const [name, provider] of this.providers) {
        try {
          await this.checkProviderHealth(name);
          provider.healthy = true;
          provider.lastCheck = new Date();
        } catch (error) {
          provider.healthy = false;
          logger.warn(`Provider ${name} health check failed`);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Check provider health
   */
  private async checkProviderHealth(providerName: string): Promise<void> {
    switch (providerName) {
      case 'pinata':
        await axios.get('https://api.pinata.cloud/data/testAuthentication', {
          headers: {
            'pinata_api_key': process.env.PINATA_API_KEY!,
            'pinata_secret_api_key': process.env.PINATA_SECRET!,
          },
        });
        break;
      case 'web3storage':
        // Web3.Storage doesn't have a specific health endpoint
        break;
      case 'infura':
        await this.ipfsClient.version();
        break;
    }
  }

  /**
   * Get storage analytics
   */
  async getStorageAnalytics(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    providerStats: Record<string, any>;
    dailyUploads: number;
    monthlyBandwidth: number;
  }> {
    // Get file statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_files,
        SUM(size) as total_size,
        type,
        COUNT(*) as count_by_type
      FROM ipfs_content
      GROUP BY type
    `;

    const statsResult = await this.pool.query(statsQuery);
    
    const filesByType: Record<string, number> = {};
    let totalFiles = 0;
    let totalSize = 0;

    for (const row of statsResult.rows) {
      if (row.type) {
        filesByType[row.type] = parseInt(row.count_by_type);
      }
      totalFiles = parseInt(row.total_files);
      totalSize = parseInt(row.total_size);
    }

    // Get daily uploads
    const dailyQuery = `
      SELECT COUNT(*) as daily_uploads
      FROM ipfs_content
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;
    const dailyResult = await this.pool.query(dailyQuery);
    const dailyUploads = parseInt(dailyResult.rows[0]?.daily_uploads || 0);

    // Get monthly bandwidth (approximation)
    const bandwidthQuery = `
      SELECT SUM(size * access_count) as monthly_bandwidth
      FROM ipfs_content
      WHERE last_accessed >= NOW() - INTERVAL '30 days'
    `;
    const bandwidthResult = await this.pool.query(bandwidthQuery);
    const monthlyBandwidth = parseInt(bandwidthResult.rows[0]?.monthly_bandwidth || 0);

    // Get provider stats
    const providerStats: Record<string, any> = {};
    for (const [name, provider] of this.providers) {
      providerStats[name] = {
        healthy: provider.healthy,
        uploadCount: provider.uploadCount,
        errorCount: provider.errorCount,
        errorRate: provider.uploadCount > 0 
          ? (provider.errorCount / provider.uploadCount * 100).toFixed(2) + '%'
          : '0%',
        lastCheck: provider.lastCheck,
      };
    }

    return {
      totalFiles,
      totalSize,
      filesByType,
      providerStats,
      dailyUploads,
      monthlyBandwidth,
    };
  }

  /**
   * Garbage collection for expired content
   */
  async runGarbageCollection(retentionDays: number = 365): Promise<{
    unpinnedCount: number;
    freedSpace: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Find expired content
    const query = `
      SELECT hash, size, providers
      FROM ipfs_content
      WHERE created_at < $1
      AND (last_accessed < $1 OR last_accessed IS NULL)
      AND NOT metadata->>'permanent' = 'true'
    `;

    const result = await this.pool.query(query, [cutoffDate]);
    
    let unpinnedCount = 0;
    let freedSpace = 0;

    for (const row of result.rows) {
      try {
        // Unpin from all providers
        await this.unpinContent(row.hash, row.providers);
        
        // Remove from index
        await this.pool.query('DELETE FROM ipfs_content WHERE hash = $1', [row.hash]);
        
        unpinnedCount++;
        freedSpace += parseInt(row.size);
      } catch (error) {
        logger.error(`Failed to unpin ${row.hash}:`, error);
      }
    }

    logger.info(`Garbage collection completed: ${unpinnedCount} files unpinned, ${freedSpace} bytes freed`);

    return { unpinnedCount, freedSpace };
  }

  /**
   * Helper methods
   */

  private async encryptData(data: Buffer): Promise<Buffer> {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([iv, authTag, encrypted]);
  }

  private async decryptData(data: Buffer): Promise<Buffer> {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    
    const iv = data.slice(0, 16);
    const authTag = data.slice(16, 32);
    const encrypted = data.slice(32);
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
  }

  private detectContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      mp4: 'video',
      mov: 'video',
      avi: 'video',
      mp3: 'audio',
      wav: 'audio',
      pdf: 'document',
      doc: 'document',
      docx: 'document',
      json: 'data',
    };
    return typeMap[ext || ''] || 'other';
  }

  private async getCachedContent(hash: string): Promise<Buffer | null> {
    // Implement Redis caching
    return null;
  }

  private async cacheContent(hash: string, data: Buffer): Promise<void> {
    // Implement Redis caching
  }

  private async updateAccessStats(hash: string): Promise<void> {
    await this.pool.query(`
      UPDATE ipfs_content 
      SET access_count = access_count + 1,
          last_accessed = NOW()
      WHERE hash = $1
    `, [hash]);
  }

  private async unpinContent(hash: string, providers: string[]): Promise<void> {
    for (const provider of providers) {
      try {
        switch (provider) {
          case 'pinata':
            await axios.delete(
              `https://api.pinata.cloud/pinning/unpin/${hash}`,
              {
                headers: {
                  'pinata_api_key': process.env.PINATA_API_KEY!,
                  'pinata_secret_api_key': process.env.PINATA_SECRET!,
                },
              }
            );
            break;
          // Add other provider unpin methods
        }
      } catch (error) {
        logger.error(`Failed to unpin from ${provider}:`, error);
      }
    }
  }
}

// Export singleton instance
export const enhancedIPFSService = new EnhancedIPFSService();