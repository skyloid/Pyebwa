# Android Testing Guide - API Connection Issues

## Current Setup
- Backend is running on port 5000
- App is configured to use IP: 82.197.94.47

## If API Connection Fails

### Option 1: Use Ngrok (Recommended)
This creates a public URL that works from anywhere:

```bash
# Install ngrok if not already installed
npm install -g ngrok

# In a new terminal, expose your backend
ngrok http 5000

# You'll get a URL like: https://abc123.ngrok.io
# Update App.tsx to use this URL
```

### Option 2: Check Firewall
```bash
# On Linux, temporarily allow port 5000
sudo ufw allow 5000

# Or using iptables
sudo iptables -A INPUT -p tcp --dport 5000 -j ACCEPT
```

### Option 3: Use Android Emulator
If using Android emulator instead of physical device:
```bash
# Update App.tsx to use:
http://10.0.2.2:5000/api/health
```

### Option 4: Same WiFi Network
Ensure your phone and computer are on the same WiFi network:
1. Check computer IP: `hostname -I`
2. Check phone is on same network
3. Try pinging from phone (using network tools app)

### Option 5: USB Debugging with ADB Reverse
If connected via USB:
```bash
# Forward port from device to computer
adb reverse tcp:5000 tcp:5000

# Then use localhost in the app
http://localhost:5000/api/health
```

## Current Configuration
The app shows the API URL it's trying to connect to at the bottom of the screen. This helps debug connection issues.

## Testing Steps
1. Check the "API URL" shown in the app
2. Try accessing that URL in your phone's browser
3. If it fails in browser, it's a network issue
4. If it works in browser but not app, check CORS settings