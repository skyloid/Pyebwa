# React Native App Crash Troubleshooting Guide

## Common Crash Causes and Solutions

### 1. React Version Mismatch ✅ FIXED
**Issue**: React 19.0.0 is incompatible with React Native 0.79.4
**Solution**: Already downgraded to React 18.3.1

### 2. Missing Babel Configuration ✅ FIXED
**Issue**: babel.config.js is required for React Native
**Solution**: Already created with proper Expo preset

### 3. Native Module Issues
**Issue**: Some packages require native code that's incompatible with Expo managed workflow

**Check for these problematic packages:**
- `@react-native-firebase/*` - Use JavaScript Firebase SDK instead
- `react-native-crypto` - May need polyfills or alternatives
- Any package requiring manual linking

### 4. Metro Bundler Cache Issues
**Solution**: Run the fix script:
```bash
./fix-crash.sh
```

### 5. AsyncStorage Version Issues
**Current version**: 2.1.2 (compatible with Expo SDK 53)

## Debugging Steps

### 1. Get Device Logs
```bash
# For Android
npx react-native log-android

# Or use adb directly
adb logcat *:E
```

### 2. Check for JavaScript Errors
```bash
# Start Metro with verbose logging
npx expo start --dev --verbose
```

### 3. Common Error Messages and Fixes

#### "Unable to resolve module"
- Run: `npx expo start --clear`
- Delete node_modules and reinstall

#### "Invariant Violation"
- Usually a React version issue
- Check all React-related packages are compatible

#### "Native module cannot be null"
- A native dependency is missing
- Check if using Expo-incompatible packages

### 4. Build-Specific Issues

For APK builds, ensure:
1. All assets are bundled correctly
2. No development-only dependencies in production
3. Proper ProGuard rules (if using)

## Quick Fixes to Try

1. **Clean Everything**
   ```bash
   ./clean-install.sh
   ```

2. **Reset Metro**
   ```bash
   npx expo start --clear
   ```

3. **Check Dependencies**
   ```bash
   npx expo-doctor
   ```

4. **Verify Versions**
   ```bash
   npm ls react react-native expo
   ```

## If Still Crashing

1. **Create a minimal test**:
   - Comment out all imports except React
   - Return a simple Text component
   - Gradually add imports back

2. **Check native logs**:
   - Android: `adb logcat | grep -i crash`
   - Look for Java stack traces

3. **Common APK-specific issues**:
   - Missing permissions in AndroidManifest
   - ProGuard stripping required classes
   - Asset loading failures

## Prevention

1. Always run `expo-doctor` before building
2. Test on device before creating APK
3. Use `--clear` flag when starting after dependency changes
4. Keep Expo SDK and all related packages in sync