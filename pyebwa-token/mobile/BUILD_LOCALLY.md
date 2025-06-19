# Build PYEBWA Token Android App Locally

Since the server can't handle interactive prompts, you'll need to build the app from your local machine. Here's how:

## Option 1: Quick Web Test (Already Working)
Visit: https://rasin.pyebwa.com/pyebwa-app/

## Option 2: Build APK on Your Computer

### Prerequisites
1. Install Node.js (if not already installed)
2. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```

### Steps to Build

1. **Clone the repository to your local machine:**
   ```bash
   git clone [your-repo-url]
   cd pyebwa-token/mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Login to Expo:**
   ```bash
   eas login
   ```
   (Use your existing account or create a free one)

4. **Build the APK:**
   ```bash
   eas build --platform android --profile preview
   ```

5. **When prompted:**
   - Choose "Generate a new Android Keystore" ✅
   - Wait 10-15 minutes for build to complete

6. **Download and Install:**
   - Click the build URL in terminal
   - Download the APK
   - Install on your Android device

## Option 3: Use Pre-built APK

I can create a CI/CD pipeline that automatically builds APKs when you push code. Would you like me to set this up?

## What You Get with Native Build:
- ✅ Real camera functionality
- ✅ GPS validation for Haiti
- ✅ Photo gallery access
- ✅ Offline storage
- ✅ Better performance
- ✅ Install on any Android device

## Quick Commands Reference:
```bash
# Development build (with Expo tools)
eas build --platform android --profile development

# Testing build (release APK)
eas build --platform android --profile preview

# Production build (for Play Store)
eas build --platform android --profile production
```

## Need Help?
- EAS Build docs: https://docs.expo.dev/build/introduction/
- Your project dashboard: https://expo.dev/accounts/humanlevel/projects/pyebwa-planter