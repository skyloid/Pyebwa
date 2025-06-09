// Enhanced upload functionality with validation and progress tracking

// Configuration
const UPLOAD_CONFIG = {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    imageQuality: 0.85 // For compression
};

// Validate file before upload
function validateFile(file) {
    const errors = [];
    
    // Check file size
    if (file.size > UPLOAD_CONFIG.maxFileSize) {
        errors.push(`File too large. Maximum size is ${UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB`);
    }
    
    // Check file type
    if (!UPLOAD_CONFIG.allowedTypes.includes(file.type)) {
        errors.push(`Invalid file type. Allowed types: ${UPLOAD_CONFIG.allowedTypes.join(', ')}`);
    }
    
    // Check file extension
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!UPLOAD_CONFIG.allowedExtensions.includes(extension)) {
        errors.push(`Invalid file extension. Allowed: ${UPLOAD_CONFIG.allowedExtensions.join(', ')}`);
    }
    
    return errors;
}

// Compress image before upload
async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions (max 1200px wide/tall)
                let width = img.width;
                let height = img.height;
                const maxDimension = 1200;
                
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = (height / width) * maxDimension;
                        width = maxDimension;
                    } else {
                        width = (width / height) * maxDimension;
                        height = maxDimension;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, {
                        type: file.type,
                        lastModified: Date.now()
                    }));
                }, file.type, UPLOAD_CONFIG.imageQuality);
            };
            
            img.onerror = reject;
        };
        
        reader.onerror = reject;
    });
}

// Enhanced upload function with progress tracking
async function uploadPhotoEnhanced(file, options = {}) {
    const {
        onProgress = () => {},
        compress = true,
        validate = true
    } = options;
    
    try {
        // Validation
        if (validate) {
            const errors = validateFile(file);
            if (errors.length > 0) {
                throw new Error(errors.join('. '));
            }
        }
        
        // Compression (if file is large)
        let fileToUpload = file;
        if (compress && file.size > 500 * 1024) { // Compress if > 500KB
            onProgress({ status: 'compressing', percent: 0 });
            fileToUpload = await compressImage(file);
            onProgress({ status: 'compressed', percent: 10 });
        }
        
        // Check auth
        if (!auth.currentUser) {
            throw new Error('User not authenticated');
        }
        
        // Check family tree ID
        if (!userFamilyTreeId) {
            throw new Error('No family tree ID found');
        }
        
        // Create storage reference
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `familyTrees/${userFamilyTreeId}/photos/${timestamp}_${safeName}`;
        
        const storageRef = storage.ref();
        const photoRef = storageRef.child(path);
        
        // Upload with progress tracking
        const uploadTask = photoRef.put(fileToUpload);
        
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                // Progress
                (snapshot) => {
                    const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    onProgress({
                        status: 'uploading',
                        percent: 10 + (percent * 0.8), // 10-90%
                        bytesTransferred: snapshot.bytesTransferred,
                        totalBytes: snapshot.totalBytes
                    });
                },
                // Error
                (error) => {
                    console.error('Upload error:', error);
                    reject(error);
                },
                // Complete
                async () => {
                    onProgress({ status: 'processing', percent: 90 });
                    
                    try {
                        const downloadUrl = await uploadTask.snapshot.ref.getDownloadURL();
                        
                        // Store metadata
                        const metadata = {
                            url: downloadUrl,
                            path: path,
                            originalName: file.name,
                            size: fileToUpload.size,
                            type: fileToUpload.type,
                            uploadedAt: timestamp,
                            uploadedBy: auth.currentUser.uid
                        };
                        
                        onProgress({ status: 'complete', percent: 100 });
                        resolve(metadata);
                        
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

// Delete photo from storage
async function deletePhoto(photoPath) {
    try {
        const storageRef = storage.ref();
        const photoRef = storageRef.child(photoPath);
        await photoRef.delete();
        return true;
    } catch (error) {
        console.error('Delete error:', error);
        return false;
    }
}

// Get all photos for a family tree
async function getFamilyTreePhotos() {
    try {
        if (!userFamilyTreeId) {
            throw new Error('No family tree ID');
        }
        
        const storageRef = storage.ref();
        const photosRef = storageRef.child(`familyTrees/${userFamilyTreeId}/photos`);
        
        const result = await photosRef.listAll();
        const photos = [];
        
        for (const itemRef of result.items) {
            try {
                const url = await itemRef.getDownloadURL();
                const metadata = await itemRef.getMetadata();
                
                photos.push({
                    name: itemRef.name,
                    path: itemRef.fullPath,
                    url: url,
                    size: metadata.size,
                    contentType: metadata.contentType,
                    updated: metadata.updated
                });
            } catch (error) {
                console.error('Error getting photo metadata:', error);
            }
        }
        
        return photos;
    } catch (error) {
        console.error('Error listing photos:', error);
        return [];
    }
}

// Export functions
window.uploadEnhanced = {
    validateFile,
    compressImage,
    uploadPhotoEnhanced,
    deletePhoto,
    getFamilyTreePhotos,
    config: UPLOAD_CONFIG
};