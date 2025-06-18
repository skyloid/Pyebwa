#!/bin/bash

# PYEBWA Token Development Setup Script

echo "🌳 Starting PYEBWA Token Development Environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}npm is not installed. Please install npm first.${NC}"
    exit 1
fi

# Function to start backend
start_backend() {
    echo -e "${BLUE}Starting backend server...${NC}"
    cd backend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing backend dependencies...${NC}"
        npm install
    fi
    
    # Start backend in background
    npm run dev &
    BACKEND_PID=$!
    echo -e "${GREEN}Backend started with PID: $BACKEND_PID${NC}"
    echo -e "${GREEN}Backend API: http://localhost:5000/api/health${NC}"
    cd ..
}

# Function to start mobile app
start_mobile() {
    echo -e "${BLUE}Starting mobile app with Expo...${NC}"
    cd mobile
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing mobile dependencies...${NC}"
        npm install
    fi
    
    # Clear Expo cache
    echo -e "${YELLOW}Clearing Expo cache...${NC}"
    npx expo start -c &
    MOBILE_PID=$!
    echo -e "${GREEN}Mobile app started with PID: $MOBILE_PID${NC}"
    cd ..
}

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo -e "${GREEN}Backend stopped${NC}"
    fi
    if [ ! -z "$MOBILE_PID" ]; then
        kill $MOBILE_PID 2>/dev/null
        echo -e "${GREEN}Mobile app stopped${NC}"
    fi
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup INT

# Main execution
echo -e "${YELLOW}============================================${NC}"
echo -e "${GREEN}🌳 PYEBWA Token Development Environment 🌳${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""

# Start services
start_backend
sleep 5  # Wait for backend to initialize

start_mobile
sleep 3

echo ""
echo -e "${YELLOW}============================================${NC}"
echo -e "${GREEN}Services are starting up...${NC}"
echo ""
echo -e "${BLUE}Backend API:${NC} http://localhost:5000"
echo -e "${BLUE}Mobile App:${NC} Expo will display QR code"
echo ""
echo -e "${YELLOW}To test on Android:${NC}"
echo "1. Install Expo Go from Play Store"
echo "2. Scan the QR code shown by Expo"
echo "3. Make sure your phone and computer are on the same WiFi"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e "${YELLOW}============================================${NC}"

# Keep script running
while true; do
    sleep 1
done