#!/usr/bin/env node

require('dotenv').config();

const path = require('path');
const { query } = require('../server/db/pool');
const { saveFile } = require('../server/services/file-storage');

const FIREBASE_URL_PATTERNS = [
    'firebasestorage.googleapis.com',
    'googleapis.com/v0/b'
];

function isLegacyFirebaseUrl(url) {
    return typeof url === 'string' && FIREBASE_URL_PATTERNS.some(pattern => url.includes(pattern));
}

function getExtensionFromUrl(url, contentType) {
    const pathname = new URL(url).pathname;
    const parsedExt = path.extname(pathname).toLowerCase();
    if (parsedExt) {
        return parsedExt;
    }

    const typeMap = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp'
    };

    return typeMap[(contentType || '').toLowerCase()] || '.jpg';
}

async function downloadPhoto(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
        buffer: Buffer.from(arrayBuffer),
        contentType: response.headers.get('content-type') || 'image/jpeg'
    };
}

async function migrateMemberPhotos(member) {
    const currentPhotos = Array.isArray(member.photos) ? member.photos : [];
    let didChange = false;

    const migratedPhotos = await Promise.all(currentPhotos.map(async (photo, index) => {
        if (!photo || !isLegacyFirebaseUrl(photo.url)) {
            return photo;
        }

        const { buffer, contentType } = await downloadPhoto(photo.url);
        const extension = getExtensionFromUrl(photo.url, contentType);
        const originalName = `legacy-photo-${index + 1}${extension}`;
        const newUrl = await saveFile(
            `trees/${member.family_tree_id}`,
            `photos/${member.id}`,
            buffer,
            originalName
        );

        didChange = true;
        return {
            ...photo,
            url: newUrl,
            migratedFrom: photo.url,
            migratedAt: new Date().toISOString()
        };
    }));

    if (!didChange) {
        return false;
    }

    await query(
        'UPDATE persons SET photos = $1::jsonb, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(migratedPhotos), member.id]
    );

    return true;
}

async function run() {
    const result = await query(
        `SELECT id, family_tree_id, first_name, last_name, photos
         FROM persons
         WHERE photos::text ILIKE '%firebasestorage.googleapis.com%'
            OR photos::text ILIKE '%googleapis.com/v0/b%'`
    );

    if (result.rows.length === 0) {
        console.log('No legacy Firebase photo URLs found.');
        return;
    }

    let migratedCount = 0;

    for (const member of result.rows) {
        const displayName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.id;
        const changed = await migrateMemberPhotos(member);
        if (changed) {
            migratedCount += 1;
            console.log(`Migrated legacy photos for ${displayName}`);
        } else {
            console.log(`No migration needed for ${displayName}`);
        }
    }

    console.log(`Completed. Migrated ${migratedCount} member record(s).`);
}

run().catch(error => {
    console.error('Legacy photo migration failed:', error);
    process.exit(1);
});
