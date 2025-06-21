#!/bin/bash

echo "🔧 Starting EAS Build with Kotlin fix..."
echo ""

# Check if we need to clear cache
read -p "Clear EAS build cache? (recommended if previous builds failed) [y/N]: " clear_cache
if [[ $clear_cache =~ ^[Yy]$ ]]; then
    echo "📦 Building with cache clear..."
    eas build --platform android --clear-cache
else
    echo "📦 Building without cache clear..."
    eas build --platform android
fi

echo ""
echo "✅ Build command executed. Check EAS dashboard for build status."
echo ""
echo "If the build still fails with Kotlin errors, try:"
echo "1. Set 'newArchEnabled': false in app.json"
echo "2. Run: npx expo prebuild --clean"
echo "3. Run this script again with cache clear"