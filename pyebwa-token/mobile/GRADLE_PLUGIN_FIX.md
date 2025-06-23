# Gradle Plugin Fix for EAS Build

## Issues
1. "Plugin [id: 'expo-module-gradle-plugin'] was not found"
2. "Could not get unknown property 'release' for SoftwareComponent container"

## Solution Applied

### 1. Removed expo-dev-client
The dev client was causing gradle plugin conflicts with SDK 52.

### 2. Added Package Overrides
Added to package.json to force compatible versions:
```json
"overrides": {
  "expo-constants": "~15.4.6",
  "expo-linking": "~6.2.2",
  "expo-font": "~13.0.4",
  "@expo/config-plugins": "~9.0.0",
  "expo-modules-core": "~2.0.0"
}
```

### 3. Used Exact Versions
Removed all caret (^) symbols from dependencies to ensure consistent versions.

### 4. Clean Installation
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npx expo prebuild --clean
```

## Building
```bash
eas build --platform android --profile preview --clear-cache
```

## Notes
- Gradle 8.10.2 is being used
- Kotlin 1.9.25 is set (auto-configured by prebuild)
- expo-dev-client removed to avoid conflicts
- All dependencies locked to exact versions