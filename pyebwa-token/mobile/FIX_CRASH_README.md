# React Native App Crash Fix

## Issues Fixed

1. **Incompatible React Version**: Downgraded React from 19.0.0 to 18.3.1 (stable version compatible with React Native 0.79.4)
2. **Removed Conflicting Firebase SDKs**: Removed @react-native-firebase packages that are incompatible with Expo managed workflow
3. **Added Missing Babel Configuration**: Created babel.config.js with Expo preset
4. **Fixed Module Resolution**: Updated metro.config.js to support additional file extensions
5. **Fixed TypeScript Imports**: Updated i18n import path to be more explicit

## Steps to Apply the Fix

1. **Clean and Reinstall Dependencies**:
   ```bash
   # Run the clean install script
   ./clean-install.sh
   ```

   Or manually:
   ```bash
   # Remove node_modules and lock file
   rm -rf node_modules package-lock.json
   
   # Clear caches
   rm -rf $TMPDIR/react-*
   rm -rf $TMPDIR/metro-*
   
   # Fresh install
   npm install
   ```

2. **Start the App**:
   ```bash
   # For Expo Go
   npx expo start
   
   # For development build
   npx expo start --dev-client
   
   # Clear cache if needed
   npx expo start --clear
   ```

## Important Notes

- The app now uses only the JavaScript Firebase SDK (no native modules)
- This configuration works with Expo's managed workflow
- If you need native Firebase features, you'll need to eject to a bare workflow or use EAS Build

## Testing

After running the clean install:
1. The app should launch without crashing
2. You should see the login screen
3. Firebase authentication should work with the JS SDK
4. All screens should be accessible

## Troubleshooting

If the app still crashes:
1. Clear all caches: `npx expo start --clear`
2. Reset Metro bundler: `npx react-native start --reset-cache`
3. Delete `.expo` folder and restart
4. Ensure you're using Node.js 18 or later