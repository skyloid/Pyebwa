# Pyebwa Mobile App

A React Native mobile application for managing family genealogy, built with Expo and Firebase.

## 🚀 Features

- **Authentication**: Secure login/signup with Firebase Auth
- **Family Tree Visualization**: Interactive tree and list views
- **Member Management**: Add, edit, and manage family members
- **Photo Support**: Camera integration and photo gallery
- **Stories & Memories**: Record and share family stories
- **Cross-Platform**: iOS and Android support
- **Offline-Ready**: Works with or without internet connection

## 📱 Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation v6
- **UI Components**: React Native Paper (Material Design 3)
- **State Management**: React Context + Hooks
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Build System**: EAS Build
- **Testing**: Expo Go app

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- EAS CLI (`npm install -g eas-cli`)

### Installation

1. **Clone the repository**:
   ```bash
   cd mobile-app
   npm install
   ```

2. **Configure Firebase**:
   - Update `src/services/FirebaseService.ts` with your Firebase config
   - Ensure Firestore security rules are configured

3. **Start development server**:
   ```bash
   npm start
   ```

4. **Run on device/simulator**:
   - Install Expo Go app on your phone
   - Scan QR code from terminal
   - Or use iOS Simulator: `npm run ios`
   - Or use Android Emulator: `npm run android`

## 🏗️ Building for Production

### Setup EAS Build

1. **Login to Expo**:
   ```bash
   eas login
   ```

2. **Initialize project**:
   ```bash
   eas build:configure
   ```

3. **Update project ID** in `app.json`:
   ```json
   {
     "expo": {
       "extra": {
         "eas": {
           "projectId": "your-project-id"
         }
       }
     }
   }
   ```

### Build Commands

- **Development build**: `npm run build:android` or `npm run build:ios`
- **Production build**: `eas build --platform all --profile production`
- **Preview build**: `eas build --platform all --profile preview`

### Build Profiles (eas.json)

- **development**: For testing with Expo Dev Client
- **preview**: Internal testing builds (APK for Android)
- **production**: App Store/Play Store builds

## 📦 Deployment

### Android (Google Play Store)

1. **Build production APK/AAB**:
   ```bash
   eas build --platform android --profile production
   ```

2. **Submit to Play Store**:
   ```bash
   eas submit --platform android
   ```

### iOS (App Store)

1. **Build production IPA**:
   ```bash
   eas build --platform ios --profile production
   ```

2. **Submit to App Store**:
   ```bash
   eas submit --platform ios
   ```

## 🧪 Testing

### Expo Go Testing

1. Install Expo Go on your device
2. Run `npm start`
3. Scan QR code with Expo Go app
4. Test all features and report issues

### Device Testing Checklist

- [ ] Login/Signup flow
- [ ] Family tree navigation (pan, zoom, scroll)
- [ ] Add/edit family members
- [ ] Camera functionality
- [ ] Photo gallery access
- [ ] Offline functionality
- [ ] Push notifications
- [ ] Deep linking
- [ ] Performance on low-end devices

## 🔧 Configuration

### Environment Variables

Create `.env` file in the root directory:

```env
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# App Configuration
APP_VERSION=1.0.0
APP_BUILD_NUMBER=1
```

### App Store Configuration

Update `app.json` for store submission:

```json
{
  "expo": {
    "name": "Pyebwa Fanmi",
    "slug": "pyebwa-mobile",
    "privacy": "public",
    "platforms": ["ios", "android"],
    "version": "1.0.0",
    "orientation": "portrait",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#00217D"
    },
    "updates": {
      "fallbackToCacheTimeout": 0
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.pyebwa.mobile"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#00217D"
      },
      "package": "com.pyebwa.mobile"
    }
  }
}
```

## 📱 App Store Metadata

### App Description

**Short Description**: 
Preserve your family history and connect with your Haitian heritage through interactive family trees.

**Full Description**:
Pyebwa Fanmi is the ultimate family genealogy app for the Haitian diaspora. Build your family tree, preserve memories, and connect with your heritage.

**Key Features**:
- Interactive family tree visualization
- Add photos and stories for each family member
- Secure cloud storage with Firebase
- Multiple language support (English, French, Haitian Creole)
- Beautiful Material Design interface
- Works offline

### Keywords
family tree, genealogy, haiti, haitian, heritage, ancestry, family history, diaspora

### Categories
- Primary: Lifestyle
- Secondary: Social Networking

## 🔐 Security & Privacy

- All data is encrypted in transit and at rest
- Firebase security rules prevent unauthorized access
- Users can only access their own family tree data
- No personal data is shared with third parties
- GDPR and CCPA compliant

## 🆘 Troubleshooting

### Common Issues

1. **Metro bundler issues**:
   ```bash
   npx expo start --clear
   ```

2. **iOS build fails**:
   - Check provisioning profiles
   - Verify bundle identifier is unique

3. **Android build fails**:
   - Check keystore configuration
   - Verify package name is unique

4. **Firebase connection issues**:
   - Verify Firebase config
   - Check network connectivity
   - Ensure Firestore rules are correct

### Getting Help

- Check [Expo Documentation](https://docs.expo.dev/)
- Review [React Native Paper docs](https://reactnativepaper.com/)
- Submit issues to the GitHub repository
- Contact support at support@pyebwa.com

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

Built with ❤️ for the Haitian community