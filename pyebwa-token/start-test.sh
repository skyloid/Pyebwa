#!/bin/bash

# Simple start script for testing

echo "🌳 Starting PYEBWA Token Test Environment..."

# Kill any existing processes on ports
lsof -ti:5000 | xargs kill -9 2>/dev/null
lsof -ti:19000 | xargs kill -9 2>/dev/null
lsof -ti:19001 | xargs kill -9 2>/dev/null

# Start backend
echo "Starting backend..."
cd backend
npm run dev:simple &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "Waiting for backend..."
sleep 5

# Test backend
echo "Testing backend..."
curl -s http://localhost:5000/api/health | jq . || echo "Backend not responding"

# Start mobile
echo "Starting mobile app..."
cd mobile
npx expo start &
MOBILE_PID=$!
cd ..

echo ""
echo "============================================"
echo "✅ Services Started!"
echo ""
echo "Backend: http://localhost:5000/api/health"
echo "Mobile: Check terminal for QR code"
echo ""
echo "Press Ctrl+C to stop"
echo "============================================"

# Cleanup function
cleanup() {
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $MOBILE_PID 2>/dev/null
    exit 0
}

trap cleanup INT

# Keep running
wait