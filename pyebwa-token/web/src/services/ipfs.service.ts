import { create } from 'ipfs-http-client';
import CryptoJS from 'crypto-js';

interface IPFSUploadResult {
  hash: string;
  url: string;
  encryptionKey?: string;
}

interface FileMetadata {
  title?: string;
  description?: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  language?: string;
  tags?: string[];
}

class IPFSService {
  private client;
  private gateway: string;
  private encryptionEnabled: boolean = true;

  constructor() {
    this.client = create({
      url: process.env.REACT_APP_IPFS_API_URL || 'https://ipfs.infura.io:5001/api/v0',
      headers: {
        authorization: `Basic ${Buffer.from(
          `${process.env.REACT_APP_INFURA_PROJECT_ID}:${process.env.REACT_APP_INFURA_PROJECT_SECRET}`
        ).toString('base64')}`,
      },
    });
    
    this.gateway = process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
  }

  /**
   * Generate encryption key for a file
   */
  private generateEncryptionKey(): string {
    return CryptoJS.lib.WordArray.random(256 / 8).toString();
  }

  /**
   * Encrypt file data
   */
  private async encryptFile(file: File, key: string): Promise<ArrayBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
    const encrypted = CryptoJS.AES.encrypt(wordArray, key);
    return this.base64ToArrayBuffer(encrypted.toString());
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Upload file to IPFS with optional encryption
   */
  async uploadFile(
    file: File,
    metadata: FileMetadata,
    encrypt: boolean = true
  ): Promise<IPFSUploadResult> {
    try {
      let fileData: ArrayBuffer;
      let encryptionKey: string | undefined;

      // Encrypt file if requested
      if (encrypt && this.encryptionEnabled) {
        encryptionKey = this.generateEncryptionKey();
        fileData = await this.encryptFile(file, encryptionKey);
      } else {
        fileData = await file.arrayBuffer();
      }

      // Upload file to IPFS
      const fileResult = await this.client.add(fileData, {
        progress: (prog) => console.log(`IPFS upload progress: ${prog}`),
      });

      // Create and upload metadata
      const metadataObj: FileMetadata = {
        ...metadata,
        uploadedAt: new Date().toISOString(),
      };

      const metadataResult = await this.client.add(JSON.stringify(metadataObj));

      // Create a directory structure
      const files = [
        { path: 'data', cid: fileResult.cid },
        { path: 'metadata.json', cid: metadataResult.cid },
      ];

      const directoryResult = await this.client.addAll(files, { wrapWithDirectory: true });
      let rootCid = '';
      
      for await (const result of directoryResult) {
        if (result.path === '') {
          rootCid = result.cid.toString();
        }
      }

      console.log('File uploaded to IPFS:', rootCid);

      return {
        hash: rootCid,
        url: `${this.gateway}${rootCid}`,
        encryptionKey,
      };
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  /**
   * Upload JSON data to IPFS
   */
  async uploadJSON(data: any): Promise<IPFSUploadResult> {
    try {
      const result = await this.client.add(JSON.stringify(data));
      
      return {
        hash: result.cid.toString(),
        url: `${this.gateway}${result.cid}`,
      };
    } catch (error) {
      console.error('IPFS JSON upload error:', error);
      throw new Error('Failed to upload JSON to IPFS');
    }
  }

  /**
   * Retrieve and decrypt file from IPFS
   */
  async retrieveFile(hash: string, encryptionKey?: string): Promise<Blob> {
    try {
      const chunks = [];
      
      // Retrieve file data
      for await (const chunk of this.client.cat(`${hash}/data`)) {
        chunks.push(chunk);
      }
      
      const data = new Uint8Array(
        chunks.reduce((acc, chunk) => [...acc, ...chunk], [])
      );

      // Decrypt if key provided
      if (encryptionKey) {
        const wordArray = CryptoJS.lib.WordArray.create(data);
        const decrypted = CryptoJS.AES.decrypt(
          CryptoJS.lib.Base64.stringify(wordArray),
          encryptionKey
        );
        const decryptedData = this.wordArrayToUint8Array(decrypted);
        return new Blob([decryptedData]);
      }

      return new Blob([data]);
    } catch (error) {
      console.error('IPFS retrieval error:', error);
      throw new Error('Failed to retrieve file from IPFS');
    }
  }

  /**
   * Convert WordArray to Uint8Array
   */
  private wordArrayToUint8Array(wordArray: any): Uint8Array {
    const words = wordArray.words;
    const sigBytes = wordArray.sigBytes;
    const u8 = new Uint8Array(sigBytes);
    
    for (let i = 0; i < sigBytes; i++) {
      const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      u8[i] = byte;
    }
    
    return u8;
  }

  /**
   * Get metadata for a file
   */
  async getMetadata(hash: string): Promise<FileMetadata> {
    try {
      const chunks = [];
      
      for await (const chunk of this.client.cat(`${hash}/metadata.json`)) {
        chunks.push(chunk);
      }
      
      const data = new TextDecoder().decode(
        new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []))
      );
      
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to retrieve metadata:', error);
      throw new Error('Failed to retrieve metadata from IPFS');
    }
  }

  /**
   * Pin content to ensure persistence
   */
  async pin(hash: string): Promise<void> {
    try {
      await this.client.pin.add(hash);
      console.log('Content pinned:', hash);
    } catch (error) {
      console.error('Failed to pin content:', error);
    }
  }

  /**
   * Calculate file hash without uploading (for deduplication)
   */
  async calculateHash(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await this.client.add(arrayBuffer, { onlyHash: true });
      return result.cid.toString();
    } catch (error) {
      console.error('Hash calculation error:', error);
      throw new Error('Failed to calculate file hash');
    }
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();