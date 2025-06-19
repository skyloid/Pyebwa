# Android Build Guide for PYEBWA Token App

## Prerequisites
- EAS CLI installed (`npm install -g eas-cli`)
- Expo account (free at expo.dev)
- Android device or emulator for testing

## Build Options

### 1. Preview Build (Recommended for Testing)
This creates a release APK that you can install directly on any Android device.

```bash
eas build --platform android --profile preview
```

### 2. Development Build
This creates a debug APK with the Expo development client.

```bash
eas build --platform android --profile development
```

### 3. Production Build
This creates an AAB (Android App Bundle) for Google Play Store submission.

```bash
eas build --platform android --profile production
```

## Step-by-Step Instructions

### For Quick Testing (Preview Build):

1. **Run the build command:**
   ```bash
   eas build --platform android --profile preview
   ```

2. **When prompted:**
   - Select "Generate new keystore" (first time only)
   - Wait for the build to complete (10-15 minutes)

3. **Download and Install:**
   - Go to the build URL shown in terminal
   - Download the APK file
   - Transfer to your Android device
   - Enable "Install from unknown sources" in Android settings
   - Install the APK

### Features in Native Build:
- ✅ Full camera functionality with GPS validation
- ✅ Photo storage and gallery access
- ✅ Offline support with local storage
- ✅ Push notifications (if configured)
- ✅ Better performance than Expo Go

### Testing the APK:
1. Open the installed app
2. Test all features:
   - Demo login (Family/Planter)
   - Language switching
   - Heritage upload with real camera
   - Token purchase flow
   - GPS location for tree planting

### Next Steps:
- For production release, create a Google Play Developer account
- Use the production build profile to create an AAB
- Upload to Google Play Console for distribution

## Troubleshooting

### Build Fails:
- Ensure all dependencies are installed: `npm install`
- Clear cache: `npx expo start -c`
- Check EAS status: https://status.expo.dev/

### Camera Not Working:
- Ensure camera permissions are granted in Android settings
- Test on a real device (not emulator)

### GPS Issues:
- Enable location services on device
- Grant location permission to the app
- Test outdoors for better GPS signal