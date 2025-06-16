# Social Media Integration Setup Guide for Pyebwa

## Overview
This guide provides instructions for completing the social media integration setup for the Pyebwa family tree application. The integration includes social login (Google & Facebook), photo import, profile linking, and sharing features.

## Files Created

### JavaScript Files
1. **`/app/js/social-auth.js`** - Handles social authentication (Google & Facebook login)
2. **`/app/js/social-import.js`** - Manages importing photos and profile data from social platforms
3. **`/app/js/social-connect.js`** - Links social media profiles to family members

### CSS Files
1. **`/app/css/social-media.css`** - Styles for all social media UI components

### Modified Files
1. **`/login.html`** - Added social login buttons
2. **`/app/js/member-profile.js`** - Added social media profile section
3. **`/app/index.html`** - Added social media CSS link

## Firebase Console Setup Required

### 1. Enable Authentication Providers

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **pyebwa-f5960**
3. Navigate to **Authentication** → **Sign-in method**

#### Enable Google Sign-In:
1. Click on **Google** provider
2. Toggle **Enable**
3. Add your public-facing name: "Pyebwa Family Tree"
4. Select support email
5. Add authorized domains:
   - `pyebwa.com`
   - `rasin.pyebwa.com`
   - `sekirite.pyebwa.com`
6. Click **Save**

#### Enable Facebook Sign-In:
1. Click on **Facebook** provider
2. Toggle **Enable**
3. You'll need to create a Facebook App:
   - Go to [Facebook Developers](https://developers.facebook.com)
   - Create a new app
   - Add Facebook Login product
   - Get App ID and App Secret
4. Enter App ID and App Secret in Firebase
5. Copy the OAuth redirect URI from Firebase
6. In Facebook App settings, add the redirect URI to Valid OAuth Redirect URIs
7. Click **Save**

### 2. Update Authorized Domains
1. In Firebase Console → Authentication → Settings
2. Add all your domains to Authorized domains:
   - `pyebwa.com`
   - `rasin.pyebwa.com`
   - `sekirite.pyebwa.com`

### 3. Update Firestore Security Rules

Add these rules to handle social media data:

```javascript
// Add to your existing rules
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if request.auth != null && request.auth.uid == userId;
  
  match /imported_photos/{photoId} {
    allow read: if request.auth != null && request.auth.uid == userId;
    allow write: if request.auth != null && request.auth.uid == userId;
  }
}

// Update member rules to include social profiles
match /familyTrees/{treeId}/members/{memberId} {
  allow read: if request.auth != null && 
    request.auth.uid in resource.data.sharedWith ||
    request.auth.uid == resource.data.createdBy;
  allow update: if request.auth != null && 
    request.auth.uid == resource.data.createdBy &&
    (!request.resource.data.diff(resource.data).affectedKeys()
      .hasAny(['createdBy', 'familyTreeId']) ||
     request.resource.data.socialProfiles != null);
}
```

## Google APIs Setup

### 1. Enable Google People API
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to **APIs & Services** → **Library**
4. Search for "People API"
5. Click **Enable**

### 2. Enable Google Photos Library API
1. Search for "Photos Library API"
2. Click **Enable**
3. Note: Users will need to grant permissions when they first use the import feature

### 3. Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Configure your app information
3. Add scopes:
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/photoslibrary.readonly`
4. Add test users if in development

## Facebook App Setup

### 1. Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Click **My Apps** → **Create App**
3. Choose **Consumer** type
4. Enter app details

### 2. Configure Facebook Login
1. Add **Facebook Login** product
2. Settings:
   - Client OAuth Login: **Yes**
   - Web OAuth Login: **Yes**
   - Valid OAuth Redirect URIs: Add Firebase redirect URI
   - Deauthorize Callback URL: `https://rasin.pyebwa.com/app/deauth`

### 3. Add Permissions
1. Go to **App Review** → **Permissions and Features**
2. Request these permissions:
   - `email`
   - `public_profile`
   - `user_photos`
   - `user_birthday`

## Translation Updates Required

Add these translations to your language files:

### English (`en.json`)
```json
{
  "socialMedia": "Social Media",
  "connectSocialProfile": "Connect Social Profile",
  "importFromSocial": "Import from Social Media",
  "signInWithGoogle": "Sign in with Google",
  "signInWithFacebook": "Sign in with Facebook",
  "socialProfiles": "Social Media Profiles",
  "connectProfile": "Connect Profile",
  "disconnect": "Disconnect",
  "importPhotos": "Import Photos",
  "importProfile": "Import Profile Info",
  "selectAlbums": "Select Albums to Import",
  "importing": "Importing...",
  "importComplete": "Import Complete",
  "photosImported": "{count} photos imported",
  "visibility": "Visibility",
  "publicVisibility": "Public",
  "familyVisibility": "Family Only",
  "privateVisibility": "Private"
}
```

### French (`fr.json`)
```json
{
  "socialMedia": "Médias sociaux",
  "connectSocialProfile": "Connecter un profil social",
  "importFromSocial": "Importer depuis les médias sociaux",
  "signInWithGoogle": "Se connecter avec Google",
  "signInWithFacebook": "Se connecter avec Facebook",
  "socialProfiles": "Profils de médias sociaux",
  "connectProfile": "Connecter le profil",
  "disconnect": "Déconnecter",
  "importPhotos": "Importer des photos",
  "importProfile": "Importer les infos du profil",
  "selectAlbums": "Sélectionner les albums à importer",
  "importing": "Importation...",
  "importComplete": "Importation terminée",
  "photosImported": "{count} photos importées",
  "visibility": "Visibilité",
  "publicVisibility": "Public",
  "familyVisibility": "Famille uniquement",
  "privateVisibility": "Privé"
}
```

### Haitian Creole (`ht.json`)
```json
{
  "socialMedia": "Medya Sosyal",
  "connectSocialProfile": "Konekte pwofil sosyal",
  "importFromSocial": "Enpòte nan medya sosyal",
  "signInWithGoogle": "Konekte ak Google",
  "signInWithFacebook": "Konekte ak Facebook",
  "socialProfiles": "Pwofil Medya Sosyal",
  "connectProfile": "Konekte Pwofil",
  "disconnect": "Dekonekte",
  "importPhotos": "Enpòte foto",
  "importProfile": "Enpòte enfòmasyon pwofil",
  "selectAlbums": "Chwazi albòm pou enpòte",
  "importing": "Ap enpòte...",
  "importComplete": "Enpòtasyon fini",
  "photosImported": "{count} foto enpòte",
  "visibility": "Vizibilite",
  "publicVisibility": "Piblik",
  "familyVisibility": "Fanmi sèlman",
  "privateVisibility": "Prive"
}
```

## Testing Guide

### 1. Test Social Login
1. Visit `/login.html`
2. Click "Sign in with Google" - should open Google login
3. Click "Sign in with Facebook" - should open Facebook login
4. After successful login, should redirect to `/app/`
5. New users should see onboarding flow

### 2. Test Profile Connection
1. Open any member profile in the app
2. Scroll to "Social Media Profiles" section
3. Click "Connect" on any platform
4. Enter username/URL
5. Verify profile link appears and is clickable

### 3. Test Photo Import
1. In member profile, click import photos
2. Select Google or Facebook as source
3. Choose albums to import
4. Verify progress indicator works
5. Check imported photos appear in gallery

### 4. Test Privacy Controls
1. Click visibility icon on connected profiles
2. Verify it cycles through: Public → Family → Private
3. Test that privacy settings persist

## Security Considerations

1. **API Keys**: Never expose API keys in client-side code
2. **Access Tokens**: Store temporarily in sessionStorage, not localStorage
3. **Permissions**: Only request necessary permissions
4. **Data Privacy**: Always get user consent before importing data
5. **GDPR Compliance**: Provide options to delete imported data

## Troubleshooting

### Common Issues

1. **"Popup blocked" error**
   - Solution: Ensure popups are allowed for your domain
   - Alternative: Use redirect flow for mobile devices

2. **"Invalid OAuth redirect URI"**
   - Solution: Add all domain variations to Firebase authorized domains
   - Check Facebook app settings match Firebase redirect URI

3. **"Permission denied" when importing**
   - Solution: User needs to grant specific permissions in their social account
   - Check OAuth consent screen configuration

4. **Photos not importing**
   - Check API quotas in Google Cloud Console
   - Verify Photos Library API is enabled
   - Check user has granted photo access permissions

## Next Steps

1. Complete Firebase Console configuration
2. Set up Google Cloud APIs
3. Create Facebook Developer App
4. Update translation files
5. Deploy and test all features
6. Monitor usage and API quotas

## Support

For issues or questions:
- Check Firebase Console logs
- Review browser console for errors
- Verify all domains are properly configured
- Ensure SSL certificates are valid on all domains