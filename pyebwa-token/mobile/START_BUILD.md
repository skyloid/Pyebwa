# Start EAS Cloud Build

## Quick Start

To start your cloud build, run this command in your terminal:

```bash
cd /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa-token/mobile
npx eas build --platform android --profile preview
```

## What Will Happen

1. **First prompt**: "Generate a new Android Keystore?"
   - Type: **Y** and press Enter

2. **Build starts**: You'll see a URL like:
   ```
   Build details: https://expo.dev/accounts/humanlevel/projects/pyebwa-planter/builds/[build-id]
   ```

3. **Wait**: The build takes 10-20 minutes

4. **Download**: When complete, download the APK from the URL

## Build Profiles

- **preview** - For testing (recommended)
  ```bash
  npx eas build --platform android --profile preview
  ```

- **debug** - For development
  ```bash
  npx eas build --platform android --profile debug
  ```

- **production** - For Play Store
  ```bash
  npx eas build --platform android --profile production
  ```

## After First Build

Once credentials are generated, you can use:
```bash
npx eas build --platform android --profile preview --non-interactive
```

## Check Build Status
```bash
npx eas build:list --limit=5
```

## Current Status
- ✅ Logged in as: humanlevel
- ✅ Project configured
- ✅ Ready to build
- ⏳ Awaiting interactive keystore generation

**Next Step**: Open a terminal and run the build command above!