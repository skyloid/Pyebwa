const crypto = require('crypto');
const path = require('path');
const { supabaseAdmin } = require('./supabase');

const DEFAULT_BUCKET = 'photos';

// Save a file buffer to Supabase Storage
async function saveFile(category, id, fileBuffer, originalName) {
    const ext = path.extname(originalName).toLowerCase();
    const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const storagePath = `${category}/${id}/${filename}`;

    const { data, error } = await supabaseAdmin.storage
        .from(DEFAULT_BUCKET)
        .upload(storagePath, fileBuffer, {
            contentType: getMimeType(ext),
            upsert: false
        });

    if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Return public URL
    const { data: urlData } = supabaseAdmin.storage
        .from(DEFAULT_BUCKET)
        .getPublicUrl(storagePath);

    return urlData.publicUrl;
}

// Delete a file from Supabase Storage
async function deleteFile(fileUrl) {
    // Extract storage path from URL
    const storagePath = extractStoragePath(fileUrl);
    if (!storagePath) {
        throw new Error('Invalid file URL');
    }

    const { error } = await supabaseAdmin.storage
        .from(DEFAULT_BUCKET)
        .remove([storagePath]);

    if (error) {
        throw new Error(`Storage delete failed: ${error.message}`);
    }
    return true;
}

// Get file info (basic implementation for Supabase)
async function getFileInfo(fileUrl) {
    const storagePath = extractStoragePath(fileUrl);
    if (!storagePath) return null;

    const { data, error } = await supabaseAdmin.storage
        .from(DEFAULT_BUCKET)
        .list(path.dirname(storagePath), {
            search: path.basename(storagePath)
        });

    if (error || !data || data.length === 0) return null;

    const file = data[0];
    return {
        path: storagePath,
        size: file.metadata?.size || 0,
        modified: file.updated_at
    };
}

// Helper: extract storage path from a Supabase public URL
function extractStoragePath(url) {
    if (!url) return null;

    // Handle full Supabase URLs: .../storage/v1/object/public/photos/path/to/file.jpg
    const publicMatch = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    if (publicMatch) return publicMatch[1];

    // Handle relative paths (legacy): /uploads/category/id/file.jpg
    const legacyMatch = url.match(/\/uploads\/(.+)$/);
    if (legacyMatch) return legacyMatch[1];

    // Already a storage path
    return url;
}

// Helper: get MIME type from extension
function getMimeType(ext) {
    const types = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.gif': 'image/gif',
        '.webp': 'image/webp', '.pdf': 'application/pdf'
    };
    return types[ext] || 'application/octet-stream';
}

module.exports = { saveFile, deleteFile, getFileInfo };
