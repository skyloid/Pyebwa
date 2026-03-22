# 🚀 Pyebwa Mobile App - Cloud Build & Deployment Guide

Complete guide for building and deploying the Pyebwa mobile app using Expo Go and EAS Build.

## 📋 Prerequisites

### Required Tools
```bash
# Install Node.js 18+
node --version  # Should be 18+

# Install Expo CLI
npm install -g @expo/cli

# Install EAS CLI
npm install -g eas-cli

# Install dependencies
npm install
```

### Accounts & Setup
1. **Expo Account**: [expo.dev](https://expo.dev)
2. **Firebase Project**: [console.firebase.google.com](https://console.firebase.google.com)
3. **Apple Developer Account** (for iOS builds)
4. **Google Play Console** (for Android builds)

## 🔧 Initial Setup

### 1. Firebase Configuration

Update `src/services/FirebaseService.ts` with your Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};
```

### 2. Expo Project Setup

```bash
# Login to Expo
eas login

# Configure EAS Build
eas build:configure

# Update project ID in app.json
# Replace "your-project-id" with your actual Expo project ID
```

### 3. Environment Variables

Create `.env` file:
```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

## 🧪 Testing with Expo Go

### Quick Start
```bash
# Start development server
npm start

# Or start with specific platform
npm run ios     # iOS Simulator
npm run android # Android Emulator
npm run web     # Web browser
```

### Testing on Physical Device

1. **Install Expo Go** on your device:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Connect to same network** as your development machine

3. **Scan QR code** displayed in terminal after running `npm start`

4. **Test all features**:
   - [ ] Login/Signup flow
   - [ ] Family tree navigation
   - [ ] Add/edit family members
   - [ ] Camera functionality
   - [ ] Photo gallery access
   - [ ] Offline functionality

## 🏗️ Cloud Builds with EAS

### Build Profiles

The app has three build profiles configured in `eas.json`:

1. **Development**: For testing with Expo Dev Client
2. **Preview**: Internal testing builds (APK/IPA)
3. **Production**: App Store/Play Store builds

### Development Builds

For faster development and testing native features:

```bash
# Build development client
eas build --platform all --profile development

# Once installed, start development server
npm start --dev-client
```

### Preview Builds

For internal testing and sharing:

```bash
# Build preview (default)
npm run build:android
npm run build:ios

# Or manually
eas build --platform all --profile preview
```

### Production Builds

For app store submission:

```bash
# Build for production
eas build --platform all --profile production

# Or use custom script
./scripts/build.sh --production
```

## 📱 Platform-Specific Setup

### iOS Configuration

1. **Apple Developer Account**: Required for builds
2. **Bundle Identifier**: Update in `app.json`
   ```json
   {
     "ios": {
       "bundleIdentifier": "com.yourcompany.pyebwa"
     }
   }
   ```
3. **Provisioning**: EAS handles automatically
4. **Capabilities**: Camera, photo library access

### Android Configuration

1. **Package Name**: Update in `app.json`
   ```json
   {
     "android": {
       "package": "com.yourcompany.pyebwa"
     }
   }
   ```
2. **Keystore**: EAS generates automatically
3. **Permissions**: Camera, storage, network

## 🚀 Deployment Process

### Step 1: Build
```bash
# Use the custom build script
./scripts/build.sh --production

# Or build manually
eas build --platform all --profile production
```

### Step 2: Test
```bash
# Download and test builds
eas build:download [build-id]

# Install on devices and test thoroughly
```

### Step 3: Submit

#### Android (Google Play Store)
```bash
# Submit to Play Store
eas submit --platform android

# Or upload manually to Play Console
```

#### iOS (App Store)
```bash
# Submit to App Store
eas submit --platform ios

# Or upload manually to App Store Connect
```

## 📊 Monitoring & Analytics

### Build Status
```bash
# Check all builds
eas build:list

# Check specific build
eas build:view [build-id]

# Download build
eas build:download [build-id]
```

### App Analytics
- **Expo Analytics**: Built-in usage analytics
- **Firebase Analytics**: User behavior tracking
- **Crashlytics**: Crash reporting and monitoring

## 🔄 Updates & Versioning

### Over-the-Air Updates
```bash
# Publish update
eas update --auto

# Publish to specific branch
eas update --branch production --message "Bug fixes"
```

### Version Management
1. Update version in `app.json`
2. Update build number for stores
3. Create git tag for releases
4. Build and submit new version

## 🐛 Troubleshooting

### Common Build Issues

1. **"Bundle identifier already exists"**
   - Change bundle ID in `app.json`
   - Use unique identifier

2. **Firebase connection failed**
   - Verify Firebase configuration
   - Check API keys and permissions

3. **Build timeout or failure**
   - Check build logs in Expo dashboard
   - Reduce bundle size if needed

4. **Camera/gallery not working**
   - Verify permissions in `app.json`
   - Test on physical device, not simulator

### Debug Commands
```bash
# Clear Metro cache
npx expo start --clear

# Reset build cache
eas build --clear-cache

# Check build configuration
eas build:configure

# View detailed logs
eas build:view [build-id] --logs
```

## 📋 Pre-Release Checklist

### Before Building
- [ ] Update app version in `app.json`
- [ ] Test on multiple devices
- [ ] Verify Firebase configuration
- [ ] Check all permissions
- [ ] Test offline functionality
- [ ] Review app store metadata

### Before Submitting
- [ ] Test production build thoroughly
- [ ] Verify app store assets (icons, screenshots)
- [ ] Review privacy policy and terms
- [ ] Check app store guidelines compliance
- [ ] Prepare app store description and keywords

### Post-Release
- [ ] Monitor crash reports
- [ ] Track user feedback
- [ ] Plan OTA updates if needed
- [ ] Monitor app store reviews

## 🔗 Useful Resources

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [React Native Paper](https://reactnativepaper.com/)
- [Firebase for React Native](https://rnfirebase.io/)
- [App Store Guidelines](https://developer.apple.com/app-store/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)

## 🆘 Support

- **Expo Community**: [Discord](https://discord.gg/4gtbPAdpaE)
- **Documentation**: [docs.expo.dev](https://docs.expo.dev)
- **GitHub Issues**: Create issues for bugs and feature requests
- **Email Support**: support@pyebwa.com

---

🎉 **Congratulations!** You now have a complete mobile app deployment pipeline for Pyebwa.

Happy coding! 🚀