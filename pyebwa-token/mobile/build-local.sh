#!/bin/bash

# PYEBWA Token Local Build Script
# This script automates the local Android APK build process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}PYEBWA Token - Local Android Build${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check ANDROID_HOME
if [ -z "$ANDROID_HOME" ]; then
    echo -e "${RED}❌ ANDROID_HOME not set!${NC}"
    echo "Please set ANDROID_HOME to your Android SDK location"
    echo "Example: export ANDROID_HOME=\$HOME/Android/Sdk"
    exit 1
else
    echo -e "${GREEN}✓ ANDROID_HOME: $ANDROID_HOME${NC}"
fi

# Check JAVA_HOME
if [ -z "$JAVA_HOME" ]; then
    echo -e "${RED}❌ JAVA_HOME not set!${NC}"
    echo "Please set JAVA_HOME to your JDK installation"
    exit 1
else
    echo -e "${GREEN}✓ JAVA_HOME: $JAVA_HOME${NC}"
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt "17" ]; then
    echo -e "${RED}❌ Java 17 or higher required (found Java $JAVA_VERSION)${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Java version: $JAVA_VERSION${NC}"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ node_modules not found. Installing dependencies...${NC}"
    npm install
fi

# Check if android directory exists
if [ ! -d "android" ]; then
    echo -e "${YELLOW}⚠ Native Android code not found. Running prebuild...${NC}"
    npx expo prebuild --platform android
fi

# Update local.properties
echo -e "${BLUE}Updating local.properties...${NC}"
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
echo -e "${GREEN}✓ local.properties updated${NC}"

# Clean previous builds
echo -e "${BLUE}Cleaning previous builds...${NC}"
cd android
./gradlew clean
cd ..
echo -e "${GREEN}✓ Build cleaned${NC}"

# Build APK
echo -e "${BLUE}Building debug APK...${NC}"
echo "This may take several minutes..."
cd android

if ./gradlew assembleDebug; then
    cd ..
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo -e "${GREEN}📱 APK location: android/app/build/outputs/apk/debug/app-debug.apk${NC}"
    
    # Check APK size
    APK_SIZE=$(ls -lh android/app/build/outputs/apk/debug/app-debug.apk | awk '{print $5}')
    echo -e "${BLUE}📦 APK size: $APK_SIZE${NC}"
    
    # Optional: Install on connected device
    echo ""
    read -p "Install on connected device? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Checking connected devices...${NC}"
        DEVICES=$(adb devices | grep -E "device$" | wc -l)
        
        if [ "$DEVICES" -eq 0 ]; then
            echo -e "${YELLOW}⚠ No devices connected${NC}"
            echo "Please connect a device with USB debugging enabled"
        else
            echo -e "${BLUE}Installing APK...${NC}"
            if adb install -r android/app/build/outputs/apk/debug/app-debug.apk; then
                echo -e "${GREEN}✅ APK installed successfully!${NC}"
                echo -e "${GREEN}🚀 You can now launch PYEBWA Token on your device${NC}"
            else
                echo -e "${RED}❌ Installation failed${NC}"
            fi
        fi
    fi
else
    cd ..
    echo -e "${RED}❌ Build failed!${NC}"
    echo "Check the error messages above for details"
    exit 1
fi

echo ""
echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}Build complete!${NC}"
echo -e "${BLUE}===============================================${NC}"