# Kotlin Version Fix for EAS Build

## Problem
EAS build failing with error: "Key 1.9.24 is missing in the map" related to Kotlin version incompatibility.

## Root Cause
- Expo SDK 53 defaults to Kotlin 2.0.21
- React Native 0.76.3 has compatibility issues with certain Kotlin versions
- The error occurs when there's a mismatch between expected and actual Kotlin versions

## Solution Applied

### 1. Installed expo-build-properties
```bash
npx expo install expo-build-properties
```

### 2. Configured Kotlin Version in app.json
```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "1.9.25"
          }
        }
      ],
      // ... other plugins
    ]
  }
}
```

### 3. Regenerated Native Directories
```bash
npx expo prebuild --clean
```

## Build Commands

### Standard Build
```bash
eas build --platform android
```

### Build with Cache Clear (if previous builds failed)
```bash
eas build --platform android --clear-cache
```

### Using the Helper Script
```bash
./eas-build-fix.sh
```

## If Build Still Fails

### Option 1: Disable New Architecture
1. In app.json, set:
   ```json
   {
     "expo": {
       "newArchEnabled": false
     }
   }
   ```

2. Regenerate native code:
   ```bash
   npx expo prebuild --clean
   ```

3. Rebuild:
   ```bash
   eas build --platform android --clear-cache
   ```

### Option 2: Update React Native Version
Consider updating to React Native 0.77.0 or later which has better Kotlin compatibility:
```bash
npm install react-native@0.77.0
npx expo install --fix
```

### Option 3: Try Different Kotlin Version
If 1.9.25 doesn't work, try 1.9.23 or 2.0.0:
```json
{
  "android": {
    "kotlinVersion": "1.9.23"  // or "2.0.0"
  }
}
```

## Verification

After successful build:
1. Check build logs on EAS dashboard
2. Verify Kotlin version in logs matches configured version
3. Test the built APK/AAB on a device

## Related Issues
- Expo SDK 53 New Architecture enabled by default
- React Native 0.76.3 Kotlin compatibility issues
- expo-modules-core version conflicts