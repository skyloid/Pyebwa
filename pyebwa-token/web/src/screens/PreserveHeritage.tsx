import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '../hooks/useProgram';
import { ipfsService } from '../services/ipfs.service';
import { heritageService } from '../services/heritage.service';
import { useTranslation } from 'react-i18next';
import { HeritageGallery } from '../components/HeritageGallery';
import { UploadProgress } from '../components/UploadProgress';

interface FileWithPreview extends File {
  preview?: string;
}

const HERITAGE_COSTS = {
  photo: 50,
  document: 100,
  audio: 500,
  video: 2000,
};

export const PreserveHeritage: React.FC = () => {
  const { t } = useTranslation();
  const { publicKey } = useWallet();
  const program = useProgram();
  
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    language: 'en',
    tags: [] as string[],
  });
  const [currentTag, setCurrentTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const getFileType = (file: File): keyof typeof HERITAGE_COSTS => {
    if (file.type.startsWith('image/')) return 'photo';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const filesWithPreview = acceptedFiles.map((file) => {
      const fileWithPreview = file as FileWithPreview;
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }
      return fileWithPreview;
    });
    setFiles(filesWithPreview);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'],
      'video/*': ['.mp4', '.mov', '.avi', '.mkv'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc', '.docx'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const calculateTotalCost = (): number => {
    return files.reduce((total, file) => {
      const type = getFileType(file);
      return total + HERITAGE_COSTS[type];
    }, 0);
  };

  const calculateTreesFunded = (): number => {
    const totalCost = calculateTotalCost();
    return totalCost * 0.5 / 200; // 50% of tokens fund trees, 200 tokens per tree
  };

  const handleUpload = async () => {
    if (!publicKey || !program || files.length === 0) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const totalCost = calculateTotalCost();
      
      // Check token balance
      const hasBalance = await heritageService.checkBalance(
        program,
        publicKey,
        totalCost
      );
      
      if (!hasBalance) {
        throw new Error('Insufficient PYEBWA token balance');
      }

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress((i / files.length) * 100);

        // Upload to IPFS
        const ipfsResult = await ipfsService.uploadFile(
          file,
          {
            ...metadata,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
          },
          true // encrypt
        );

        // Create blockchain record
        const type = getFileType(file);
        const cost = HERITAGE_COSTS[type];
        
        await heritageService.preserveHeritage(
          program,
          publicKey,
          ipfsResult.hash,
          type,
          cost,
          metadata
        );
      }

      setUploadProgress(100);
      setSuccess(true);
      
      // Reset form after success
      setTimeout(() => {
        setFiles([]);
        setMetadata({
          title: '',
          description: '',
          language: 'en',
          tags: [],
        });
        setSuccess(false);
        setUploadProgress(0);
      }, 3000);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to preserve heritage');
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !metadata.tags.includes(currentTag.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()],
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tag: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{t('preserve.title')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Heritage Items</h2>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400'
              }`}
            >
              <input {...getInputProps()} />
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-600">
                {isDragActive
                  ? 'Drop files here...'
                  : t('preserve.dragDrop')}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Supports images, audio, video, and documents up to 100MB
              </p>
            </div>

            {files.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium mb-3">Selected Files</h3>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-3">
                        {file.preview && (
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • {getFileType(file)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setFiles(files.filter((_, i) => i !== index))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata Form */}
            {files.length > 0 && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={metadata.title}
                    onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Give your heritage item a title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={metadata.description}
                    onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    rows={3}
                    placeholder="Tell the story behind this item..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    value={metadata.language}
                    onChange={(e) => setMetadata(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="ht">Kreyòl</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Add tags..."
                    />
                    <button
                      onClick={addTag}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Add
                    </button>
                  </div>
                  {metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {metadata.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-2 text-purple-600 hover:text-purple-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cost Summary */}
            {files.length > 0 && (
              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium mb-2">Cost Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Tokens Required:</span>
                    <span className="font-medium">{calculateTotalCost()} PYEBWA</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Trees to be Funded:</span>
                    <span className="font-medium">~{calculateTreesFunded().toFixed(1)} 🌳</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                ✅ Heritage items preserved successfully!
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading || !metadata.title}
              className="mt-6 w-full py-3 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Preserving...' : `Preserve Heritage (${calculateTotalCost()} PYEBWA)`}
            </button>

            {uploading && <UploadProgress progress={uploadProgress} />}
          </div>

          {/* Gallery Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Your Heritage Gallery</h2>
            <HeritageGallery />
          </div>
        </div>
      </div>
    </div>
  );
};