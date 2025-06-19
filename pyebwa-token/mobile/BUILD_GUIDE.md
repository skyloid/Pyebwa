# PYEBWA Token Mobile App - Android Build Guide

This guide provides instructions for building the PYEBWA Token mobile app for Android devices.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Expo CLI** and **EAS CLI**
4. **Java Development Kit (JDK 11+)**
5. **Android Studio** (for local builds)

## Installation

```bash
# Install dependencies
npm install

# Install Expo CLI globally (if not already installed)
npm install -g @expo/cli

# Install EAS CLI globally (if not already installed)
npm install -g eas-cli
```

## EAS Cloud Build (Recommended)

### 1. Setup EAS Account
```bash
# Login to your Expo account
npx eas login

# Configure EAS project
npx eas build:configure
```

### 2. Generate Keystore (Interactive)
```bash
# Generate Android credentials interactively
npx eas credentials --platform android

# Select your build profile and follow prompts to generate keystore
```

### 3. Build APK
```bash
# Build development APK (debug, no signing required)
npx eas build --platform android --profile development

# Build preview APK (signed with generated keystore)
npx eas build --platform android --profile preview

# Build production bundle (for Play Store)
npx eas build --platform android --profile production
```

## Local Build (Alternative)

### 1. Prebuild Native Code
```bash
# Generate native Android code
npx expo prebuild --platform android

# Clean previous builds if needed
npx expo prebuild --platform android --clean
```

### 2. Local Development Build
```bash
# Start Metro bundler
npx expo start

# In another terminal, build locally
cd android
./gradlew assembleDebug

# APK will be generated at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### 3. Local Release Build
```bash
# Generate a release keystore (one-time setup)
keytool -genkey -v -keystore release.keystore -alias release \
  -keyalg RSA -keysize 2048 -validity 10000

# Build release APK
cd android
./gradlew assembleRelease

# APK will be generated at:
# android/app/build/outputs/apk/release/app-release.apk
```

## Build Profiles

### Development
- **Purpose**: Testing with Expo Dev Client
- **Signing**: Debug keystore (automatic)
- **Features**: Hot reload, development tools

### Preview  
- **Purpose**: Internal testing and sharing
- **Signing**: Release keystore (generated)
- **Features**: Production-like build without Play Store

### Production
- **Purpose**: Play Store submission
- **Signing**: Production keystore (secure)
- **Features**: Optimized, signed for distribution

## App Configuration

### Version Management
- Version numbers are managed remotely via EAS
- Local `app.json` version is ignored in EAS builds
- Use `npx eas build:version:set` to update versions

### Environment Variables
- `EXPO_PUBLIC_API_URL`: API endpoint URL
- Set in `eas.json` under each build profile's `env` section

### Permissions Required
- `CAMERA`: Photo capture for tree documentation
- `ACCESS_FINE_LOCATION`: GPS verification for planting locations
- `ACCESS_COARSE_LOCATION`: Backup location services
- `WRITE_EXTERNAL_STORAGE`: Photo storage
- `READ_EXTERNAL_STORAGE`: Gallery access

## Testing the APK

### Installation
```bash
# Install APK on connected device
adb install app-debug.apk

# Install APK via USB debugging
# 1. Enable Developer Options on device
# 2. Enable USB Debugging
# 3. Connect device via USB
# 4. Run adb install command
```

### Testing Checklist
- [ ] App launches successfully
- [ ] GPS location permission granted
- [ ] Camera permission granted
- [ ] Language switching works
- [ ] Field mapping functionality (validators)
- [ ] Photo capture works (planters)
- [ ] Analytics dashboard loads
- [ ] Offline functionality

## Troubleshooting

### Common Issues

1. **Keystore Generation Fails**
   - Ensure you're running EAS commands interactively (not in scripts)
   - Use `npx eas credentials` to manage keystores manually

2. **Build Timeout**
   - EAS builds can take 10-20 minutes
   - Check build status at `https://expo.dev/`

3. **Permission Errors**
   - Verify all required permissions are in `app.json`
   - Test permission flow on first app launch

4. **Metro Bundler Issues**
   - Clear Metro cache: `npx expo start --clear`
   - Reset node modules: `rm -rf node_modules && npm install`

### Debug Commands
```bash
# Check EAS build status
npx eas build:list

# View build logs
npx eas build:view [BUILD_ID]

# Check current user
npx eas whoami

# View project configuration
npx expo config --type public
```

## Deployment

### Internal Testing
1. Build preview APK with EAS
2. Download APK from EAS dashboard
3. Install on test devices via ADB or file transfer
4. Collect feedback and iterate

### Play Store Submission
1. Build production app bundle with EAS
2. Download AAB file from EAS dashboard
3. Upload to Google Play Console
4. Complete store listing and compliance
5. Submit for review

## Security Notes

- **Never commit keystores** to version control
- Store production keystores securely
- Use different keystores for development and production
- Rotate keystores periodically for security

## Support

For build issues or questions:
- Check Expo documentation: https://docs.expo.dev/
- EAS Build documentation: https://docs.expo.dev/build/introduction/
- Community support: https://forums.expo.dev/