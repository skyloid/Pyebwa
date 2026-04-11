const crypto = require('crypto');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { supabaseAdmin } = require('./supabase');

const DEFAULT_BUCKET = 'photos';
const LOCAL_UPLOADS_ROOT = path.join(__dirname, '../../uploads');

// Save a file buffer to Supabase Storage
async function saveFile(category, id, fileBuffer, originalName, mimeType = null) {
    const ext = path.extname(originalName).toLowerCase();
    const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const storagePath = `${category}/${id}/${filename}`;

    const { data, error } = await supabaseAdmin.storage
        .from(DEFAULT_BUCKET)
        .upload(storagePath, fileBuffer, {
            contentType: mimeType || getMimeType(ext),
            upsert: false
        });

    if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Return public URL — rewrite internal Docker URL to public-facing path
    const { data: urlData } = supabaseAdmin.storage
        .from(DEFAULT_BUCKET)
        .getPublicUrl(storagePath);

    // The Supabase client returns internal URL (http://127.0.0.1:8100/storage/...)
    // Rewrite to go through our public proxy (/supabase/storage/...)
    const publicOrigin = process.env.PUBLIC_URL || 'https://rasin.pyebwa.com';
    const publicUrl = urlData.publicUrl.replace(
        /^https?:\/\/[^/]+/,
        publicOrigin + '/supabase'
    );
    return publicUrl;
}

async function saveLocalFile(category, id, fileBuffer, originalName) {
    const ext = path.extname(originalName).toLowerCase();
    const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const relativePath = path.posix.join(category, id, filename);
    const diskPath = path.join(LOCAL_UPLOADS_ROOT, relativePath);

    await fs.mkdir(path.dirname(diskPath), { recursive: true });
    await fs.writeFile(diskPath, fileBuffer);

    const publicOrigin = process.env.PUBLIC_URL || 'https://rasin.pyebwa.com';
    return `${publicOrigin}/uploads/${relativePath}`;
}

// Delete a file from Supabase Storage
async function deleteFile(fileUrl) {
    const localUploadPath = extractLocalUploadPath(fileUrl);
    if (localUploadPath) {
        const diskPath = path.join(LOCAL_UPLOADS_ROOT, localUploadPath);
        if (fsSync.existsSync(diskPath)) {
            await fs.unlink(diskPath);
        }
        return true;
    }

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

function extractLocalUploadPath(url) {
    if (!url) return null;

    const localMatch = url.match(/\/uploads\/(.+)$/);
    if (localMatch) return localMatch[1];

    return null;
}

// Helper: get MIME type from extension
function getMimeType(ext) {
    const types = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.gif': 'image/gif',
        '.webp': 'image/webp', '.pdf': 'application/pdf',
        '.txt': 'text/plain', '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.webm': 'video/webm', '.mp4': 'video/mp4', '.mov': 'video/quicktime',
        '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav',
        '.ogg': 'audio/ogg'
    };
    return types[ext] || 'application/octet-stream';
}

module.exports = { saveFile, saveLocalFile, deleteFile, getFileInfo };
