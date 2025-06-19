# PYEBWA Token - Local Android Build Guide

This guide helps you build the PYEBWA Token Android APK on your local development machine.

## Prerequisites

Before starting, ensure you have the following installed on your local machine:

### 1. System Requirements
- **OS**: Windows 10/11, macOS 10.14+, or Ubuntu 18.04+
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: At least 10GB free space

### 2. Required Software

#### Node.js and npm
```bash
# Check if installed
node --version  # Should be v18 or higher
npm --version   # Should be v8 or higher

# Install from https://nodejs.org/
```

#### Java Development Kit (JDK 17)
```bash
# Check if installed
java -version  # Should show version 17

# Install on Ubuntu/Debian
sudo apt update
sudo apt install openjdk-17-jdk

# Install on macOS
brew install openjdk@17

# Install on Windows
# Download from https://adoptium.net/
```

#### Android SDK
The easiest way is to install Android Studio, which includes the SDK:
1. Download from https://developer.android.com/studio
2. During installation, ensure "Android SDK" is checked
3. Install Android SDK Build-Tools and Platform-Tools

Alternatively, install command-line tools only:
```bash
# Download from https://developer.android.com/studio#command-tools
# Extract and set up environment variables
```

### 3. Environment Setup

#### Set Environment Variables

**Linux/macOS** (add to ~/.bashrc or ~/.zshrc):
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64  # Adjust path as needed
```

**Windows** (System Environment Variables):
```
ANDROID_HOME = C:\Users\%USERNAME%\AppData\Local\Android\Sdk
JAVA_HOME = C:\Program Files\Eclipse Adoptium\jdk-17.0.5.8-hotspot
Add to PATH:
- %ANDROID_HOME%\platform-tools
- %ANDROID_HOME%\tools
- %ANDROID_HOME%\tools\bin
```

## Building the APK

### Step 1: Clone the Repository
```bash
# Clone the repository
git clone [repository-url]
cd pyebwa-token/mobile

# Install dependencies
npm install
```

### Step 2: Configure Local Properties
```bash
# Create local.properties file
echo "sdk.dir=$ANDROID_HOME" > android/local.properties

# Verify the file
cat android/local.properties
```

### Step 3: Generate Native Android Code
```bash
# If android directory doesn't exist, generate it
npx expo prebuild --platform android

# For a clean build (removes existing android folder)
npx expo prebuild --platform android --clean
```

### Step 4: Build Debug APK
```bash
# Navigate to android directory
cd android

# Build debug APK
./gradlew assembleDebug

# On Windows use:
# gradlew.bat assembleDebug
```

The APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Step 5: Build Release APK (Optional)
For a signed release APK:

```bash
# Generate a keystore (one-time only)
cd android/app
keytool -genkey -v -keystore pyebwa-release.keystore \
  -alias pyebwa -keyalg RSA -keysize 2048 -validity 10000

# Add to android/gradle.properties
MYAPP_RELEASE_STORE_FILE=pyebwa-release.keystore
MYAPP_RELEASE_KEY_ALIAS=pyebwa
MYAPP_RELEASE_STORE_PASSWORD=your_password
MYAPP_RELEASE_KEY_PASSWORD=your_password

# Build release APK
cd ../
./gradlew assembleRelease
```

## Installing and Testing

### Install on Device/Emulator
```bash
# List connected devices
adb devices

# Install debug APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Install with replacement (if already installed)
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Enable USB Debugging on Physical Device
1. Go to Settings > About Phone
2. Tap "Build Number" 7 times to enable Developer Options
3. Go to Settings > Developer Options
4. Enable "USB Debugging"
5. Connect device via USB and accept the prompt

### Test the App
1. Launch the PYEBWA Token app
2. Grant permissions when prompted:
   - Location (for GPS field mapping)
   - Camera (for tree photos)
   - Storage (for saving photos)
3. Test all features:
   - Language switching
   - Validator field mapping
   - Planter photo capture
   - Analytics dashboard

## Troubleshooting

### Common Issues

#### 1. ANDROID_HOME not set
```bash
# Verify environment variable
echo $ANDROID_HOME

# Should output something like:
# /home/username/Android/Sdk
```

#### 2. SDK licenses not accepted
```bash
# Accept all licenses
yes | $ANDROID_HOME/tools/bin/sdkmanager --licenses
```

#### 3. Build Tools not found
```bash
# Install required build tools
$ANDROID_HOME/tools/bin/sdkmanager "build-tools;33.0.0" "platforms;android-33"
```

#### 4. Metro bundler connection issues
```bash
# For physical devices, enable port forwarding
adb reverse tcp:8081 tcp:8081

# Clear Metro cache
npx react-native start --reset-cache
```

#### 5. Java version mismatch
```bash
# Ensure Java 17 is being used
java -version
javac -version

# Set correct JAVA_HOME
export JAVA_HOME=$(/usr/libexec/java_home -v 17)  # macOS
```

## Quick Build Script

Create a `build-local.sh` script for convenience:

```bash
#!/bin/bash

echo "🔨 Building PYEBWA Token APK..."

# Check prerequisites
if [ -z "$ANDROID_HOME" ]; then
    echo "❌ ANDROID_HOME not set!"
    exit 1
fi

if [ -z "$JAVA_HOME" ]; then
    echo "❌ JAVA_HOME not set!"
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd android && ./gradlew clean && cd ..

# Build APK
echo "🏗️  Building debug APK..."
cd android && ./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📱 APK location: android/app/build/outputs/apk/debug/app-debug.apk"
    
    # Optional: Install on connected device
    read -p "Install on connected device? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        adb install -r app/build/outputs/apk/debug/app-debug.apk
    fi
else
    echo "❌ Build failed!"
    exit 1
fi
```

Make it executable:
```bash
chmod +x build-local.sh
./build-local.sh
```

## Next Steps

1. **Testing**: Install the APK on multiple devices to ensure compatibility
2. **Performance**: Use Android Studio Profiler to check for performance issues
3. **Release**: Follow the release build process for Play Store submission
4. **CI/CD**: Consider setting up GitHub Actions for automated builds

## Support

For issues specific to:
- **Build errors**: Check the Gradle output and logs
- **React Native**: https://reactnative.dev/docs/environment-setup
- **Expo**: https://docs.expo.dev/
- **Android**: https://developer.android.com/studio/build/

Remember to never commit keystores or local.properties to version control!