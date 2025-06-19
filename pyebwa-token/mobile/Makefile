# PYEBWA Token Mobile App - Build Automation

.PHONY: help install clean build-dev build-preview build-prod local-build deploy

# Default target
help:
	@echo "PYEBWA Token Mobile App Build Commands"
	@echo "======================================"
	@echo ""
	@echo "Setup Commands:"
	@echo "  install          Install dependencies and setup project"
	@echo "  clean            Clean node modules and Metro cache"
	@echo ""
	@echo "Development Commands:"
	@echo "  start            Start Expo development server"
	@echo "  start-web        Start web development server"
	@echo "  prebuild         Generate native code locally"
	@echo ""
	@echo "Build Commands:"
	@echo "  build-dev        Build development APK (EAS)"
	@echo "  build-preview    Build preview APK (EAS)"
	@echo "  build-prod       Build production bundle (EAS)"
	@echo "  local-build      Build APK locally (requires Android Studio)"
	@echo ""
	@echo "Deployment Commands:"
	@echo "  deploy-web       Deploy web version to server"
	@echo "  check-build      Check latest EAS build status"
	@echo ""
	@echo "Utility Commands:"
	@echo "  lint             Run linting checks"
	@echo "  type-check       Run TypeScript type checking"

# Setup and installation
install:
	@echo "📦 Installing dependencies..."
	npm install
	@echo "✅ Dependencies installed successfully"

clean:
	@echo "🧹 Cleaning project..."
	rm -rf node_modules
	npm install
	npx expo start --clear
	@echo "✅ Project cleaned successfully"

# Development commands
start:
	@echo "🚀 Starting Expo development server..."
	npx expo start

start-web:
	@echo "🌐 Starting web development server..."
	npx expo start --web

prebuild:
	@echo "⚙️  Generating native Android code..."
	npx expo prebuild --platform android --clean

# EAS Build commands
build-dev:
	@echo "🔨 Building development APK with EAS..."
	@echo "⚠️  This requires interactive keystore setup if first time"
	npx eas build --platform android --profile development

build-preview:
	@echo "🔨 Building preview APK with EAS..."
	@echo "⚠️  This requires interactive keystore setup if first time"
	npx eas build --platform android --profile preview

build-prod:
	@echo "🔨 Building production bundle with EAS..."
	@echo "⚠️  This requires interactive keystore setup if first time"
	npx eas build --platform android --profile production

# Local build (requires Android Studio)
local-build:
	@echo "🔨 Building APK locally..."
	@if [ ! -d "android" ]; then \
		echo "📱 Native code not found, running prebuild..."; \
		npx expo prebuild --platform android; \
	fi
	@echo "🏗️  Building with Gradle..."
	cd android && ./gradlew assembleDebug
	@echo "✅ APK built successfully!"
	@echo "📍 Location: android/app/build/outputs/apk/debug/app-debug.apk"

# Web deployment
deploy-web:
	@echo "🌐 Building web version..."
	npx expo export --platform web
	@echo "📤 Deploying to server..."
	@if [ -d "../../../pyebwa-app" ]; then \
		rm -rf ../../../pyebwa-app/*; \
		cp -r dist/* ../../../pyebwa-app/; \
		echo "✅ Web version deployed to https://rasin.pyebwa.com/pyebwa-app/"; \
	else \
		echo "❌ Deployment directory not found"; \
	fi

# Build status and monitoring
check-build:
	@echo "📊 Checking latest EAS builds..."
	npx eas build:list --limit=5

list-builds:
	@echo "📋 Listing all EAS builds..."
	npx eas build:list

# Code quality
lint:
	@echo "🔍 Running linting checks..."
	@if command -v eslint >/dev/null 2>&1; then \
		npx eslint src --ext .ts,.tsx; \
	else \
		echo "⚠️  ESLint not configured, skipping..."; \
	fi

type-check:
	@echo "🔍 Running TypeScript checks..."
	@if [ -f "tsconfig.json" ]; then \
		npx tsc --noEmit; \
	else \
		echo "⚠️  TypeScript not configured, skipping..."; \
	fi

# Device installation
install-apk:
	@echo "📱 Installing APK on connected device..."
	@if [ -f "android/app/build/outputs/apk/debug/app-debug.apk" ]; then \
		adb install android/app/build/outputs/apk/debug/app-debug.apk; \
		echo "✅ APK installed successfully"; \
	else \
		echo "❌ APK not found. Run 'make local-build' first"; \
	fi

# Credentials management
setup-credentials:
	@echo "🔐 Setting up EAS credentials..."
	@echo "⚠️  This requires interactive input"
	npx eas credentials --platform android

# Project information
info:
	@echo "📋 Project Information"
	@echo "====================="
	@echo "Project: PYEBWA Token Mobile App"
	@echo "Platform: React Native / Expo"
	@echo "Build System: EAS Build"
	@echo ""
	@npx expo --version | sed 's/^/Expo CLI: /'
	@npx eas-cli --version | sed 's/^/EAS CLI: /'
	@echo ""
	@if command -v npx eas whoami >/dev/null 2>&1; then \
		echo "EAS User: $$(npx eas whoami 2>/dev/null || echo 'Not logged in')"; \
	fi

# Complete build and test workflow
build-and-test: clean install type-check build-preview
	@echo "🎉 Build and test workflow completed!"
	@echo "📱 APK is ready for testing"

# Development workflow
dev: install start

# Production workflow  
prod: clean install type-check build-prod
	@echo "🚀 Production build completed!"