#!/bin/bash

echo "🚀 Building PYEBWA Token Android App"
echo "===================================="

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Login to EAS (if not already logged in)
echo "📱 Checking EAS login status..."
eas whoami || eas login

# Select build profile
echo ""
echo "Select build profile:"
echo "1) Development (Debug APK with dev client)"
echo "2) Preview (Release APK for testing)"
echo "3) Production (AAB for Play Store)"
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        PROFILE="development"
        echo "Building Development APK..."
        ;;
    2)
        PROFILE="preview"
        echo "Building Preview APK..."
        ;;
    3)
        PROFILE="production"
        echo "Building Production AAB..."
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Build the app
echo ""
echo "🔨 Starting build process..."
eas build --platform android --profile $PROFILE

# Wait for build to complete
echo ""
echo "⏳ Build submitted to EAS servers."
echo "You can monitor the build progress at: https://expo.dev/accounts/humanlevel/projects/pyebwa-token/builds"
echo ""
echo "Once the build is complete:"
echo "- Download the APK/AAB from the EAS dashboard"
echo "- Install on your device for testing"
echo "- For production builds, upload to Google Play Console"