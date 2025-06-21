#!/bin/bash

echo "🛠️  EAS Build Fix Script"
echo "======================="
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI is not installed!"
    echo "Install it with: npm install -g eas-cli"
    exit 1
fi

echo "Current Expo SDK: $(npx expo --version 2>/dev/null || echo 'Not found')"
echo "Current EAS CLI: $(eas --version 2>/dev/null || echo 'Not found')"
echo ""

# Options
echo "Select build profile:"
echo "1) preview (APK)"
echo "2) production (AAB)"
echo "3) development (Debug APK)"
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        PROFILE="preview"
        echo "Building APK for internal distribution..."
        ;;
    2)
        PROFILE="production"
        echo "Building AAB for Play Store..."
        ;;
    3)
        PROFILE="development"
        echo "Building debug APK..."
        ;;
    *)
        echo "Invalid choice. Using preview profile."
        PROFILE="preview"
        ;;
esac

echo ""
read -p "Clear build cache? (y/n) [recommended: y]: " clear_cache

# Build command
BUILD_CMD="eas build --platform android --profile $PROFILE"

if [[ "$clear_cache" =~ ^[Yy]$ ]]; then
    BUILD_CMD="$BUILD_CMD --clear-cache"
fi

echo ""
echo "Running: $BUILD_CMD"
echo ""

# Execute the build
$BUILD_CMD