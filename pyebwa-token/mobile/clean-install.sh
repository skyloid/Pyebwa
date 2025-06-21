#!/bin/bash

echo "🧹 Cleaning React Native project..."

# Kill any running Metro processes
echo "Stopping Metro bundler..."
pkill -f "react-native.*metro" || true
pkill -f "metro" || true

# Remove node_modules and lock files
echo "Removing node_modules and lock files..."
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

# Clear Metro cache
echo "Clearing Metro cache..."
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*
rm -rf $TMPDIR/react-*

# Clear Expo cache
echo "Clearing Expo cache..."
npx expo start --clear || true

# Clear watchman cache (if installed)
if command -v watchman &> /dev/null; then
    echo "Clearing Watchman cache..."
    watchman watch-del-all
fi

# Remove iOS and Android build folders (if they exist)
echo "Removing native build folders..."
rm -rf ios
rm -rf android

# Remove .expo folder
echo "Removing .expo folder..."
rm -rf .expo

# Install dependencies
echo "Installing dependencies..."
npm install

# Success message
echo "✅ Clean installation complete!"
echo ""
echo "To start the app, run:"
echo "  npx expo start --clear"
echo ""
echo "For Android:"
echo "  npx expo start --android"
echo ""
echo "For iOS:"
echo "  npx expo start --ios"