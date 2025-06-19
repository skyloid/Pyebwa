# EAS Cloud Build Instructions

Since EAS requires interactive input for the first build to generate credentials, please follow these steps to create your first cloud build:

## Prerequisites
- You must be logged in to EAS (already done as 'humanlevel')
- You need terminal access with interactive capabilities

## Steps to Build

### 1. Start Interactive Build

Run this command in an interactive terminal:

```bash
npx eas build --platform android --profile preview
```

### 2. Follow the Prompts

When prompted, you'll see these questions:

```
? Generate a new Android Keystore? (Y/n)
```
**Answer: Y** (Yes, generate a new keystore)

The system will then:
- Generate a new Android keystore
- Upload it securely to EAS servers
- Associate it with your project

### 3. Monitor Build Progress

After credentials are set up, you'll see:
- A build URL (e.g., https://expo.dev/accounts/humanlevel/projects/pyebwa-token/builds/[build-id])
- Build progress in the terminal
- Estimated completion time (usually 10-20 minutes)

### 4. Download the APK

Once complete:
1. Visit the build URL
2. Click "Download" to get the APK
3. Share the APK with testers

## Subsequent Builds

After the first build, you can use non-interactive mode:

```bash
# Non-interactive build (after first build)
npx eas build --platform android --profile preview --non-interactive
```

## Build Profiles Available

- **debug**: Debug APK with debug signing (fastest)
- **preview**: Release APK with EAS signing (recommended for testing)
- **production**: AAB bundle for Play Store

## Quick Commands

```bash
# Check build status
npx eas build:list --limit=5

# View specific build
npx eas build:view [BUILD_ID]

# Download APK directly (after build completes)
npx eas build:download --platform android --profile preview
```

## Alternative: Use EAS Build Script

We've created an interactive script that handles this process:

```bash
./eas-build.sh
```

Select option 2 (Preview Build) and follow the prompts.

## Troubleshooting

If you encounter issues:
1. Ensure you're in the correct directory: `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa-token/mobile`
2. Check your EAS login: `npx eas whoami`
3. Clear EAS cache: `npx eas build:configure --clear-cache`

The first build requires interactive credential generation for security reasons. Once set up, future builds can be automated.