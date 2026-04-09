# Mobile Crash Fix Notes

## Changes Applied

1. Locked the app to the supported React and Expo versions in this package.
2. Removed the retired legacy mobile backend dependencies.
3. Kept the app on Expo-compatible JavaScript-only services.

## Recovery Steps

1. Remove local install artifacts:
   - `rm -rf node_modules package-lock.json`
2. Install again:
   - `npm install`
3. Start clean:
   - `npx expo start --clear`

## Validation

After reinstalling:

1. The app should launch to the login screen.
2. Demo login should work.
3. Field and planting flows should keep working with the local storage services.
