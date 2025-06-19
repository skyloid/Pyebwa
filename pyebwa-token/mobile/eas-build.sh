#!/bin/bash

# PYEBWA Token Mobile App - EAS Build Script
# This script helps automate the EAS build process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}===================================${NC}"
    echo -e "${BLUE}PYEBWA Token Mobile App Build${NC}"
    echo -e "${BLUE}===================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_dependencies() {
    echo -e "${BLUE}Checking dependencies...${NC}"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        print_success "Node.js installed: $(node --version)"
    else
        print_error "Node.js not found"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        print_success "npm installed: $(npm --version)"
    else
        print_error "npm not found"
        exit 1
    fi
    
    # Check Expo CLI
    if npx expo --version &> /dev/null; then
        print_success "Expo CLI installed: $(npx expo --version)"
    else
        print_warning "Expo CLI not found, installing..."
        npm install -g @expo/cli
    fi
    
    # Check EAS CLI
    if npx eas-cli --version &> /dev/null; then
        print_success "EAS CLI installed: $(npx eas-cli --version)"
    else
        print_warning "EAS CLI not found, installing..."
        npm install -g eas-cli
    fi
    
    echo ""
}

check_auth() {
    echo -e "${BLUE}Checking EAS authentication...${NC}"
    
    if npx eas whoami &> /dev/null; then
        USER=$(npx eas whoami)
        print_success "Authenticated as: $USER"
    else
        print_warning "Not authenticated. Please login:"
        npx eas login
    fi
    
    echo ""
}

show_menu() {
    echo -e "${BLUE}Select build type:${NC}"
    echo "1) Development Build (Debug APK)"
    echo "2) Preview Build (Signed APK for testing)"
    echo "3) Production Build (AAB for Play Store)"
    echo "4) Setup Credentials"
    echo "5) Check Build Status"
    echo "6) Exit"
    echo ""
    read -p "Enter your choice (1-6): " choice
}

build_development() {
    echo -e "${BLUE}Building Development APK...${NC}"
    print_warning "This will create a debug APK for development testing"
    
    npx eas build --platform android --profile development
    
    print_success "Development build initiated!"
}

build_preview() {
    echo -e "${BLUE}Building Preview APK...${NC}"
    print_warning "This will create a signed APK for internal testing"
    
    # Check if credentials exist
    echo "Checking for existing credentials..."
    
    npx eas build --platform android --profile preview
    
    print_success "Preview build initiated!"
}

build_production() {
    echo -e "${BLUE}Building Production Bundle...${NC}"
    print_warning "This will create an AAB file for Google Play Store"
    
    read -p "Are you sure you want to create a production build? (y/n): " confirm
    if [[ $confirm == "y" ]]; then
        npx eas build --platform android --profile production
        print_success "Production build initiated!"
    else
        print_warning "Production build cancelled"
    fi
}

setup_credentials() {
    echo -e "${BLUE}Setting up Android credentials...${NC}"
    print_warning "This will guide you through keystore generation"
    
    npx eas credentials --platform android
    
    print_success "Credentials setup complete!"
}

check_status() {
    echo -e "${BLUE}Recent builds:${NC}"
    npx eas build:list --limit=5
}

# Main script
print_header
check_dependencies
check_auth

while true; do
    show_menu
    
    case $choice in
        1)
            build_development
            ;;
        2)
            build_preview
            ;;
        3)
            build_production
            ;;
        4)
            setup_credentials
            ;;
        5)
            check_status
            ;;
        6)
            print_success "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice. Please try again."
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    echo ""
done