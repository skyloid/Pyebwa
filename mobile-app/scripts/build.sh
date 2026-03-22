#!/bin/bash

# Pyebwa Mobile App Build Script
# Builds the app for both iOS and Android using EAS Build

set -e

echo "🚀 Starting Pyebwa Mobile App Build Process"
echo "==========================================="

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if user is logged in to Expo
echo "🔐 Checking Expo authentication..."
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to Expo. Please run 'eas login' first."
    exit 1
fi

echo "✅ Expo authentication confirmed"

# Function to build for a specific platform
build_platform() {
    local platform=$1
    local profile=${2:-preview}
    
    echo "📱 Building for $platform (profile: $profile)..."
    
    if eas build --platform $platform --profile $profile --non-interactive; then
        echo "✅ $platform build completed successfully!"
    else
        echo "❌ $platform build failed!"
        return 1
    fi
}

# Parse command line arguments
PLATFORM="all"
PROFILE="preview"
PRODUCTION=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--platform)
            PLATFORM="$2"
            shift 2
            ;;
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        --production)
            PRODUCTION=true
            PROFILE="production"
            shift
            ;;
        --development)
            PROFILE="development"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -p, --platform PLATFORM    Platform to build (android, ios, all) [default: all]"
            echo "  --profile PROFILE           Build profile (development, preview, production) [default: preview]"
            echo "  --production               Build for production (sets profile to production)"
            echo "  --development              Build for development (sets profile to development)"
            echo "  -h, --help                 Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

echo "🔧 Build Configuration:"
echo "   Platform: $PLATFORM"
echo "   Profile: $PROFILE"
echo "   Production: $PRODUCTION"
echo ""

# Validate platform
if [[ "$PLATFORM" != "android" && "$PLATFORM" != "ios" && "$PLATFORM" != "all" ]]; then
    echo "❌ Invalid platform: $PLATFORM. Must be 'android', 'ios', or 'all'"
    exit 1
fi

# Check if project is configured for EAS
if [ ! -f "eas.json" ]; then
    echo "❌ eas.json not found. Run 'eas build:configure' first."
    exit 1
fi

# Update version info if production build
if [ "$PRODUCTION" = true ]; then
    echo "📋 Production build - updating version info..."
    
    # Get current version from app.json
    CURRENT_VERSION=$(node -p "require('./app.json').expo.version")
    echo "   Current version: $CURRENT_VERSION"
    
    # You can add version bumping logic here if needed
fi

# Start builds
echo "🏗️  Starting build process..."

if [ "$PLATFORM" = "all" ]; then
    echo "📱 Building for both Android and iOS..."
    
    # Build Android first
    if build_platform "android" "$PROFILE"; then
        echo "✅ Android build queued successfully"
    else
        echo "❌ Android build failed"
        exit 1
    fi
    
    # Build iOS
    if build_platform "ios" "$PROFILE"; then
        echo "✅ iOS build queued successfully"
    else
        echo "❌ iOS build failed"
        exit 1
    fi
    
else
    # Build single platform
    if build_platform "$PLATFORM" "$PROFILE"; then
        echo "✅ $PLATFORM build queued successfully"
    else
        echo "❌ $PLATFORM build failed"
        exit 1
    fi
fi

echo ""
echo "🎉 Build process completed!"
echo "==========================================="
echo "📊 Check build status at: https://expo.dev/accounts/[your-account]/projects/pyebwa-mobile/builds"
echo ""
echo "📱 Once builds are complete, you can:"
if [ "$PROFILE" = "development" ]; then
    echo "   • Install the development build on your device"
    echo "   • Use Expo Dev Client for faster development"
elif [ "$PROFILE" = "preview" ]; then
    echo "   • Download and test the preview build"
    echo "   • Share with team members for testing"
elif [ "$PROFILE" = "production" ]; then
    echo "   • Submit to app stores with 'eas submit'"
    echo "   • Deploy to production"
fi
echo ""
echo "🔗 Useful commands:"
echo "   • Check build status: eas build:list"
echo "   • Download build: eas build:download [build-id]"
echo "   • Submit to stores: eas submit --platform [android|ios]"
echo ""

# Show QR code for development builds
if [ "$PROFILE" = "development" ]; then
    echo "📱 For development builds, you can also run:"
    echo "   npm start"
    echo "   Then scan the QR code with Expo Go or your development build"
fi