# Crash Troubleshooting

## Checklist

1. Remove local install artifacts:
   - `rm -rf node_modules package-lock.json`
2. Reinstall dependencies:
   - `npm install`
3. Clear Expo cache:
   - `npx expo start --clear`

## Notes

- This Expo package now uses only JavaScript-friendly services.
- If the app still fails during startup, verify the Expo SDK, React Native, and React versions match the package manifest.
