# PYEBWA Token - Testing Guide

## Quick Start for Android Testing

### Prerequisites
- Node.js 18+ installed
- Android device with Expo Go app installed (from Play Store)
- Phone and computer on same WiFi network

### Method 1: Using the Start Script (Recommended)

```bash
cd /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa-token
./start-dev.sh
```

This will:
1. Start the backend API on port 5000
2. Start the Expo development server
3. Display a QR code for mobile testing

### Method 2: Manual Start

#### 1. Start Backend
```bash
cd backend
npm install  # First time only
npm run dev
```

Backend will run at: http://localhost:5000
Test it: http://localhost:5000/api/health

#### 2. Start Mobile App
```bash
cd mobile
npm install  # First time only
npx expo start
```

### Testing on Android

1. **Install Expo Go** from Google Play Store
2. **Scan QR Code** displayed in terminal
3. **If QR code doesn't work**, try:
   - Press `s` in terminal to switch to Expo Go
   - Press `a` to open Android emulator
   - Press `d` to open developer menu

### Important Configuration

If testing on a physical device, you need to update the API URL:

1. Find your computer's IP address:
   ```bash
   # Linux/Mac
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

2. Update `mobile/src/config/api.ts`:
   ```typescript
   // Change this line to your IP
   return 'http://192.168.1.100:5000/api'; // Your IP here
   ```

### Test Features

#### For Planters:
1. Sign up as a planter
2. Access GPS location permission
3. Take a photo of "planted trees"
4. Submit planting session
5. View earnings

#### For Family Users:
1. Sign up as family user
2. Browse token purchase options
3. Upload a test photo/story
4. View impact dashboard

### Troubleshooting

#### Backend Issues:
- Check if port 5000 is free: `lsof -i :5000`
- Check logs in terminal
- Verify `.env` file exists in backend/

#### Mobile Issues:
- Clear Expo cache: `npx expo start -c`
- Restart Expo Go app
- Check WiFi connection
- Update API URL with correct IP

#### Connection Issues:
- Disable firewall temporarily
- Ensure phone and computer on same network
- Try using tunnel mode: `npx expo start --tunnel`

### Development Tools

- **Redux DevTools**: Install browser extension to debug state
- **React Native Debugger**: Press `d` in app for debug menu
- **Network Inspector**: Use Flipper or React Native Debugger

### API Testing

Test backend endpoints directly:

```bash
# Health check
curl http://localhost:5000/api/health

# With httpie (install: pip install httpie)
http GET localhost:5000/api/health
```

### Next Steps

1. Create test accounts for both user types
2. Test offline functionality (airplane mode)
3. Test image upload and compression
4. Verify GPS accuracy
5. Test multi-language support

### Support

If you encounter issues:
1. Check the console logs
2. Review error messages
3. Verify all services are running
4. Check network connectivity