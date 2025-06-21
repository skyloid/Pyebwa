#!/bin/bash

echo "🔧 Fixing React Native app crash issues..."
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Kill any running processes
echo "1️⃣ Stopping any running processes..."
pkill -f "react-native.*metro" || true
pkill -f "metro" || true
pkill -f "expo" || true

# Clear all caches
echo ""
echo "2️⃣ Clearing all caches..."
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock
rm -rf .expo
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*
rm -rf $TMPDIR/react-*
npm cache clean --force 2>/dev/null || true

if command_exists watchman; then
    watchman watch-del-all 2>/dev/null || true
fi

# Remove native directories
echo ""
echo "3️⃣ Removing native build directories..."
rm -rf ios
rm -rf android

# Install dependencies
echo ""
echo "4️⃣ Installing dependencies..."
npm install

# Run expo doctor to check for issues
echo ""
echo "5️⃣ Running expo doctor..."
npx expo-doctor@latest || true

# Create a test script to verify setup
cat > test-setup.js << 'EOF'
console.log('Testing React Native setup...');

try {
  require('react-native');
  console.log('✅ React Native loaded successfully');
} catch (e) {
  console.error('❌ React Native failed to load:', e.message);
}

try {
  require('@babel/runtime/helpers/interopRequireDefault');
  console.log('✅ Babel runtime loaded successfully');
} catch (e) {
  console.error('❌ Babel runtime failed to load:', e.message);
}

try {
  require('expo');
  console.log('✅ Expo loaded successfully');
} catch (e) {
  console.error('❌ Expo failed to load:', e.message);
}

console.log('\nPackage versions:');
const pkg = require('./package.json');
console.log('React:', pkg.dependencies.react);
console.log('React Native:', pkg.dependencies['react-native']);
console.log('Expo:', pkg.dependencies.expo);
EOF

echo ""
echo "6️⃣ Verifying setup..."
node test-setup.js
rm test-setup.js

echo ""
echo "✅ Fix complete!"
echo ""
echo "📱 To start the app, run one of these commands:"
echo ""
echo "  npx expo start --clear        # Start Expo with cleared cache"
echo "  npx expo start --android      # Start on Android"
echo "  npx expo start --ios          # Start on iOS"
echo ""
echo "If the app still crashes, try:"
echo "  1. Check device logs: npx react-native log-android"
echo "  2. Run in debug mode: npx expo start --dev-client"
echo "  3. Check for missing native dependencies"