# Kotlin Version Fix for EAS Build

## Issue
The EAS build was failing with error:
```
Failed to apply plugin 'expo-root-project'.
> Key 1.9.24 is missing in the map.
```

This occurs because Expo SDK 53 has a mismatch between the expected Kotlin version and what some dependencies require.

## Solution Applied

### 1. Added expo-build-properties Plugin
```bash
npm install expo-build-properties --legacy-peer-deps
```

### 2. Configured Kotlin Version in app.json
```json
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
```

### 3. Regenerated Native Directories
```bash
npx expo prebuild --clean
```

This creates the android/ directory with the correct Kotlin version in `gradle.properties`:
```
android.kotlinVersion=1.9.25
```

## Building the App

### Option 1: Use the Helper Script
```bash
./eas-build-fix.sh
```

### Option 2: Direct Command
```bash
# For APK
eas build --platform android --profile preview --clear-cache

# For AAB (Play Store)
eas build --platform android --profile production --clear-cache
```

## Important Notes

1. **Always use --clear-cache** after changing Kotlin version
2. The android/ and ios/ directories are gitignored (CNG/Prebuild workflow)
3. Run `npx expo prebuild --clean` after any plugin configuration changes

## Alternative Kotlin Versions

If 1.9.25 doesn't work, try these versions:
- 1.9.23 (older, more stable)
- 1.9.24 (the version it was looking for)
- 2.0.0 (newer, might have compatibility issues)

To change the version, update app.json and run prebuild again.

## Troubleshooting

If the build still fails:

1. **Check the build logs** on the EAS build page for specific errors
2. **Try disabling New Architecture**:
   ```json
   "newArchEnabled": false
   ```
3. **Update Expo SDK** to the latest version
4. **Check for conflicting dependencies** that might require specific Kotlin versions