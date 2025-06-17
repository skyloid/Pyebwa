import { create } from 'ipfs-http-client';
import axios from 'axios';
import FormData from 'form-data';
import { logger } from '../utils/logger';
import crypto from 'crypto';

interface IPFSUploadResult {
  hash: string;
  size: number;
  url: string;
}

export class IPFSService {
  private client;
  private pinataApiKey: string;
  private pinataSecret: string;

  constructor() {
    // Initialize IPFS client
    this.client = create({
      url: process.env.IPFS_API_URL || 'https://ipfs.infura.io:5001',
    });

    this.pinataApiKey = process.env.PINATA_API_KEY!;
    this.pinataSecret = process.env.PINATA_SECRET!;
  }

  /**
   * Encrypt data before uploading to IPFS
   */
  private encrypt(data: Buffer, key: string): Buffer {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
    
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  /**
   * Upload file to IPFS with encryption
   */
  async uploadFile(
    file: Buffer,
    filename: string,
    encrypt: boolean = true
  ): Promise<IPFSUploadResult> {
    try {
      let fileData = file;
      
      // Encrypt if requested
      if (encrypt) {
        const encryptionKey = process.env.ENCRYPTION_KEY!;
        fileData = this.encrypt(file, encryptionKey);
      }

      // Upload to IPFS
      const result = await this.client.add(fileData, {
        progress: (prog) => logger.info(`IPFS upload progress: ${prog}`),
      });

      // Pin to Pinata for persistence
      await this.pinToPinata(result.path, filename);

      const ipfsUrl = `${process.env.IPFS_GATEWAY}${result.path}`;

      logger.info(`File uploaded to IPFS: ${result.path}`);

      return {
        hash: result.path,
        size: result.size,
        url: ipfsUrl,
      };
    } catch (error) {
      logger.error('IPFS upload error:', error);
      throw new Error('Failed to upload to IPFS');
    }
  }

  /**
   * Upload JSON metadata to IPFS
   */
  async uploadJSON(data: any): Promise<IPFSUploadResult> {
    try {
      const jsonString = JSON.stringify(data);
      const buffer = Buffer.from(jsonString);
      
      return await this.uploadFile(buffer, 'metadata.json', false);
    } catch (error) {
      logger.error('IPFS JSON upload error:', error);
      throw new Error('Failed to upload JSON to IPFS');
    }
  }

  /**
   * Pin hash to Pinata for persistence
   */
  private async pinToPinata(hash: string, name: string): Promise<void> {
    try {
      const url = 'https://api.pinata.cloud/pinning/pinByHash';
      
      const data = {
        hashToPin: hash,
        pinataMetadata: {
          name: name,
          keyvalues: {
            project: 'pyebwa-token',
            timestamp: new Date().toISOString(),
          },
        },
      };

      await axios.post(url, data, {
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecret,
          'Content-Type': 'application/json',
        },
      });

      logger.info(`Pinned to Pinata: ${hash}`);
    } catch (error: any) {
      // If already pinned, that's OK
      if (error.response?.status !== 409) {
        logger.error('Pinata pinning error:', error);
      }
    }
  }

  /**
   * Retrieve file from IPFS
   */
  async getFile(hash: string): Promise<Buffer> {
    try {
      const chunks = [];
      
      for await (const chunk of this.client.cat(hash)) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('IPFS retrieval error:', error);
      throw new Error('Failed to retrieve from IPFS');
    }
  }

  /**
   * Check if hash exists on IPFS
   */
  async exists(hash: string): Promise<boolean> {
    try {
      const stats = await this.client.object.stat(hash);
      return stats !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate IPFS hash without uploading (for deduplication)
   */
  async calculateHash(data: Buffer): Promise<string> {
    try {
      const result = await this.client.add(data, {
        onlyHash: true,
      });
      return result.path;
    } catch (error) {
      logger.error('Hash calculation error:', error);
      throw new Error('Failed to calculate hash');
    }
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();