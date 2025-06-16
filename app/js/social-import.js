// Social Media Import Handler for Pyebwa
(function() {
    'use strict';
    
    console.log('[SocialImport] Initializing social import module');
    
    // Configuration
    const IMPORT_CONFIG = {
        batchSize: 50,
        maxPhotosPerImport: 500,
        supportedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        apis: {
            google: {
                photosBaseUrl: 'https://photoslibrary.googleapis.com/v1',
                peopleBaseUrl: 'https://people.googleapis.com/v1'
            },
            facebook: {
                graphBaseUrl: 'https://graph.facebook.com/v18.0'
            }
        }
    };
    
    // Social Import Manager
    class SocialImportManager {
        constructor() {
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.storage = firebase.storage();
            this.currentImport = null;
            this.importQueue = [];
            this.isImporting = false;
        }
        
        // Initialize import manager
        initialize() {
            console.log('[SocialImport] Import manager initialized');
            
            // Listen for import events
            window.addEventListener('startSocialImport', (e) => {
                this.startImport(e.detail);
            });
        }
        
        // Start import process
        async startImport(options) {
            if (this.isImporting) {
                console.warn('[SocialImport] Import already in progress');
                return;
            }
            
            const { provider, type, memberId } = options;
            
            if (!provider || !type) {
                console.error('[SocialImport] Missing required import parameters');
                return;
            }
            
            this.isImporting = true;
            this.currentImport = {
                provider,
                type,
                memberId,
                startTime: Date.now(),
                progress: 0,
                total: 0,
                imported: 0,
                errors: []
            };
            
            try {
                console.log(`[SocialImport] Starting ${type} import from ${provider}`);
                
                // Get access token
                const accessToken = window.socialAuth?.getAccessToken(provider);
                if (!accessToken) {
                    throw new Error('No access token available. Please sign in again.');
                }
                
                // Emit import started event
                this.emitProgress('started');
                
                // Execute import based on type
                switch (type) {
                    case 'photos':
                        await this.importPhotos(provider, accessToken, memberId);
                        break;
                    case 'profile':
                        await this.importProfile(provider, accessToken, memberId);
                        break;
                    case 'contacts':
                        await this.importContacts(provider, accessToken);
                        break;
                    default:
                        throw new Error(`Unknown import type: ${type}`);
                }
                
                // Emit completion event
                this.emitProgress('completed');
                
            } catch (error) {
                console.error('[SocialImport] Import error:', error);
                this.currentImport.errors.push(error.message);
                this.emitProgress('error', error);
            } finally {
                this.isImporting = false;
                this.currentImport = null;
            }
        }
        
        // Import photos from social media
        async importPhotos(provider, accessToken, memberId) {
            switch (provider) {
                case 'google':
                    await this.importGooglePhotos(accessToken, memberId);
                    break;
                case 'facebook':
                    await this.importFacebookPhotos(accessToken, memberId);
                    break;
                default:
                    throw new Error(`Photo import not supported for ${provider}`);
            }
        }
        
        // Import photos from Google Photos
        async importGooglePhotos(accessToken, memberId) {
            try {
                // First, get list of albums
                const albumsResponse = await fetch(
                    `${IMPORT_CONFIG.apis.google.photosBaseUrl}/albums`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                if (!albumsResponse.ok) {
                    throw new Error('Failed to fetch Google Photos albums');
                }
                
                const albumsData = await albumsResponse.json();
                const albums = albumsData.albums || [];
                
                console.log(`[SocialImport] Found ${albums.length} Google Photos albums`);
                
                // Let user select albums (emit event for UI)
                const selectedAlbums = await this.selectAlbums(albums, 'google');
                
                if (!selectedAlbums || selectedAlbums.length === 0) {
                    console.log('[SocialImport] No albums selected');
                    return;
                }
                
                // Import photos from selected albums
                for (const album of selectedAlbums) {
                    await this.importGoogleAlbumPhotos(accessToken, album, memberId);
                }
                
            } catch (error) {
                console.error('[SocialImport] Google Photos import error:', error);
                throw error;
            }
        }
        
        // Import photos from a specific Google Photos album
        async importGoogleAlbumPhotos(accessToken, album, memberId) {
            let nextPageToken = null;
            let totalImported = 0;
            
            do {
                try {
                    // Build request body
                    const requestBody = {
                        albumId: album.id,
                        pageSize: IMPORT_CONFIG.batchSize
                    };
                    
                    if (nextPageToken) {
                        requestBody.pageToken = nextPageToken;
                    }
                    
                    // Fetch photos from album
                    const response = await fetch(
                        `${IMPORT_CONFIG.apis.google.photosBaseUrl}/mediaItems:search`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(requestBody)
                        }
                    );
                    
                    if (!response.ok) {
                        throw new Error('Failed to fetch photos from album');
                    }
                    
                    const data = await response.json();
                    const mediaItems = data.mediaItems || [];
                    
                    // Process each photo
                    for (const item of mediaItems) {
                        if (totalImported >= IMPORT_CONFIG.maxPhotosPerImport) {
                            console.log('[SocialImport] Reached import limit');
                            return;
                        }
                        
                        if (item.mimeType && IMPORT_CONFIG.supportedImageTypes.includes(item.mimeType)) {
                            await this.processImportedPhoto({
                                url: `${item.baseUrl}=w2048-h2048`,
                                filename: item.filename,
                                description: item.description,
                                createdTime: item.mediaMetadata?.creationTime,
                                width: item.mediaMetadata?.width,
                                height: item.mediaMetadata?.height,
                                provider: 'google',
                                albumName: album.title,
                                memberId
                            });
                            
                            totalImported++;
                            this.currentImport.imported++;
                            this.emitProgress('progress');
                        }
                    }
                    
                    nextPageToken = data.nextPageToken;
                    
                } catch (error) {
                    console.error('[SocialImport] Error importing album photos:', error);
                    this.currentImport.errors.push(`Album ${album.title}: ${error.message}`);
                }
                
            } while (nextPageToken && totalImported < IMPORT_CONFIG.maxPhotosPerImport);
        }
        
        // Import photos from Facebook
        async importFacebookPhotos(accessToken, memberId) {
            try {
                // Get user's photos
                const photosResponse = await fetch(
                    `${IMPORT_CONFIG.apis.facebook.graphBaseUrl}/me/photos/uploaded?fields=id,name,created_time,images,album&limit=${IMPORT_CONFIG.batchSize}&access_token=${accessToken}`
                );
                
                if (!photosResponse.ok) {
                    throw new Error('Failed to fetch Facebook photos');
                }
                
                const photosData = await photosResponse.json();
                let photos = photosData.data || [];
                let nextUrl = photosData.paging?.next;
                
                console.log(`[SocialImport] Found Facebook photos to import`);
                
                // Process photos
                while (photos.length > 0 && this.currentImport.imported < IMPORT_CONFIG.maxPhotosPerImport) {
                    for (const photo of photos) {
                        if (this.currentImport.imported >= IMPORT_CONFIG.maxPhotosPerImport) {
                            break;
                        }
                        
                        // Get highest resolution image
                        const image = photo.images?.reduce((prev, current) => 
                            (prev.height > current.height) ? prev : current
                        );
                        
                        if (image) {
                            await this.processImportedPhoto({
                                url: image.source,
                                filename: `facebook_${photo.id}.jpg`,
                                description: photo.name,
                                createdTime: photo.created_time,
                                width: image.width,
                                height: image.height,
                                provider: 'facebook',
                                albumName: photo.album?.name,
                                memberId
                            });
                            
                            this.currentImport.imported++;
                            this.emitProgress('progress');
                        }
                    }
                    
                    // Fetch next page if available
                    if (nextUrl && this.currentImport.imported < IMPORT_CONFIG.maxPhotosPerImport) {
                        const nextResponse = await fetch(nextUrl);
                        if (nextResponse.ok) {
                            const nextData = await nextResponse.json();
                            photos = nextData.data || [];
                            nextUrl = nextData.paging?.next;
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                }
                
            } catch (error) {
                console.error('[SocialImport] Facebook photos import error:', error);
                throw error;
            }
        }
        
        // Process and save imported photo
        async processImportedPhoto(photoData) {
            try {
                const user = this.auth.currentUser;
                if (!user) throw new Error('No authenticated user');
                
                // Generate unique filename
                const timestamp = Date.now();
                const filename = `social_import_${photoData.provider}_${timestamp}_${photoData.filename}`;
                const storagePath = `users/${user.uid}/photos/${filename}`;
                
                // Download image
                const response = await fetch(photoData.url);
                if (!response.ok) throw new Error('Failed to download image');
                
                const blob = await response.blob();
                
                // Check file size
                if (blob.size > IMPORT_CONFIG.maxFileSize) {
                    console.warn('[SocialImport] Image too large, skipping:', photoData.filename);
                    return;
                }
                
                // Upload to Firebase Storage
                const storageRef = this.storage.ref(storagePath);
                const uploadTask = await storageRef.put(blob, {
                    contentType: blob.type,
                    customMetadata: {
                        originalProvider: photoData.provider,
                        originalFilename: photoData.filename,
                        albumName: photoData.albumName || '',
                        importedAt: new Date().toISOString()
                    }
                });
                
                // Get download URL
                const downloadURL = await uploadTask.ref.getDownloadURL();
                
                // Save photo metadata to Firestore
                const photoDoc = {
                    url: downloadURL,
                    storagePath,
                    filename: photoData.filename,
                    description: photoData.description || '',
                    createdAt: photoData.createdTime ? new Date(photoData.createdTime) : new Date(),
                    importedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    dimensions: {
                        width: photoData.width || null,
                        height: photoData.height || null
                    },
                    source: {
                        provider: photoData.provider,
                        albumName: photoData.albumName || null,
                        imported: true
                    },
                    memberId: photoData.memberId || null,
                    userId: user.uid
                };
                
                // Add to member's photo collection if memberId provided
                if (photoData.memberId) {
                    await this.db.collection('members')
                        .doc(photoData.memberId)
                        .collection('photos')
                        .add(photoDoc);
                } else {
                    // Add to user's general photo collection
                    await this.db.collection('users')
                        .doc(user.uid)
                        .collection('imported_photos')
                        .add(photoDoc);
                }
                
                console.log('[SocialImport] Photo imported successfully:', filename);
                
            } catch (error) {
                console.error('[SocialImport] Error processing photo:', error);
                this.currentImport.errors.push(`Photo ${photoData.filename}: ${error.message}`);
            }
        }
        
        // Import profile information
        async importProfile(provider, accessToken, memberId) {
            switch (provider) {
                case 'google':
                    await this.importGoogleProfile(accessToken, memberId);
                    break;
                case 'facebook':
                    await this.importFacebookProfile(accessToken, memberId);
                    break;
                default:
                    throw new Error(`Profile import not supported for ${provider}`);
            }
        }
        
        // Import Google profile information
        async importGoogleProfile(accessToken, memberId) {
            try {
                // Fetch profile data from Google People API
                const response = await fetch(
                    `${IMPORT_CONFIG.apis.google.peopleBaseUrl}/people/me?personFields=names,birthdays,genders,emailAddresses,phoneNumbers,addresses,biographies,photos`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    }
                );
                
                if (!response.ok) {
                    throw new Error('Failed to fetch Google profile');
                }
                
                const profileData = await response.json();
                
                // Map Google profile to member data
                const memberUpdate = {
                    importedFrom: 'google',
                    importedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Extract name
                if (profileData.names?.length > 0) {
                    const name = profileData.names[0];
                    memberUpdate.firstName = name.givenName || '';
                    memberUpdate.lastName = name.familyName || '';
                }
                
                // Extract birthday
                if (profileData.birthdays?.length > 0) {
                    const birthday = profileData.birthdays[0].date;
                    if (birthday) {
                        memberUpdate.birthDate = new Date(
                            birthday.year || 2000,
                            (birthday.month || 1) - 1,
                            birthday.day || 1
                        ).toISOString();
                    }
                }
                
                // Extract gender
                if (profileData.genders?.length > 0) {
                    memberUpdate.gender = profileData.genders[0].value;
                }
                
                // Extract biography
                if (profileData.biographies?.length > 0) {
                    memberUpdate.biography = profileData.biographies[0].value;
                }
                
                // Extract email
                if (profileData.emailAddresses?.length > 0) {
                    memberUpdate.email = profileData.emailAddresses[0].value;
                }
                
                // Extract profile photo
                if (profileData.photos?.length > 0) {
                    memberUpdate.photoURL = profileData.photos[0].url;
                }
                
                // Update member profile
                await this.updateMemberProfile(memberId, memberUpdate);
                
                console.log('[SocialImport] Google profile imported successfully');
                
            } catch (error) {
                console.error('[SocialImport] Google profile import error:', error);
                throw error;
            }
        }
        
        // Import Facebook profile information
        async importFacebookProfile(accessToken, memberId) {
            try {
                // Fetch profile data from Facebook Graph API
                const response = await fetch(
                    `${IMPORT_CONFIG.apis.facebook.graphBaseUrl}/me?fields=id,name,first_name,last_name,email,birthday,gender,bio,picture.type(large)&access_token=${accessToken}`
                );
                
                if (!response.ok) {
                    throw new Error('Failed to fetch Facebook profile');
                }
                
                const profileData = await response.json();
                
                // Map Facebook profile to member data
                const memberUpdate = {
                    importedFrom: 'facebook',
                    importedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                if (profileData.first_name) memberUpdate.firstName = profileData.first_name;
                if (profileData.last_name) memberUpdate.lastName = profileData.last_name;
                if (profileData.email) memberUpdate.email = profileData.email;
                if (profileData.gender) memberUpdate.gender = profileData.gender;
                if (profileData.bio) memberUpdate.biography = profileData.bio;
                
                // Parse birthday (format: MM/DD/YYYY)
                if (profileData.birthday) {
                    const parts = profileData.birthday.split('/');
                    if (parts.length === 3) {
                        memberUpdate.birthDate = new Date(
                            parseInt(parts[2]),
                            parseInt(parts[0]) - 1,
                            parseInt(parts[1])
                        ).toISOString();
                    }
                }
                
                // Extract profile photo
                if (profileData.picture?.data?.url) {
                    memberUpdate.photoURL = profileData.picture.data.url;
                }
                
                // Update member profile
                await this.updateMemberProfile(memberId, memberUpdate);
                
                console.log('[SocialImport] Facebook profile imported successfully');
                
            } catch (error) {
                console.error('[SocialImport] Facebook profile import error:', error);
                throw error;
            }
        }
        
        // Update member profile with imported data
        async updateMemberProfile(memberId, updateData) {
            try {
                const user = this.auth.currentUser;
                if (!user) throw new Error('No authenticated user');
                
                // Get user's family tree ID
                const userDoc = await this.db.collection('users').doc(user.uid).get();
                const familyTreeId = userDoc.data()?.familyTreeId;
                
                if (!familyTreeId) {
                    throw new Error('No family tree found');
                }
                
                // Update member document
                await this.db.collection('familyTrees')
                    .doc(familyTreeId)
                    .collection('members')
                    .doc(memberId)
                    .update(updateData);
                
                console.log('[SocialImport] Member profile updated');
                
                // Emit update event
                window.dispatchEvent(new CustomEvent('memberProfileImported', {
                    detail: {
                        memberId,
                        updates: updateData,
                        provider: updateData.importedFrom
                    }
                }));
                
            } catch (error) {
                console.error('[SocialImport] Error updating member profile:', error);
                throw error;
            }
        }
        
        // Let user select albums to import
        async selectAlbums(albums, provider) {
            return new Promise((resolve) => {
                // Emit event for UI to handle album selection
                window.dispatchEvent(new CustomEvent('selectSocialAlbums', {
                    detail: {
                        albums,
                        provider,
                        callback: (selectedAlbums) => {
                            resolve(selectedAlbums);
                        }
                    }
                }));
            });
        }
        
        // Emit progress events
        emitProgress(status, error = null) {
            const event = new CustomEvent('socialImportProgress', {
                detail: {
                    status,
                    provider: this.currentImport?.provider,
                    type: this.currentImport?.type,
                    progress: this.currentImport?.imported || 0,
                    total: this.currentImport?.total || 0,
                    errors: this.currentImport?.errors || [],
                    error: error?.message
                }
            });
            
            window.dispatchEvent(event);
        }
    }
    
    // Create and export singleton instance
    window.socialImport = new SocialImportManager();
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.socialImport.initialize();
        });
    } else {
        window.socialImport.initialize();
    }
    
})();