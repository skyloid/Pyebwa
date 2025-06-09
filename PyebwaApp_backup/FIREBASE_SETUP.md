# Firebase Setup Instructions

## Important: Replace Placeholder Configuration

The Firebase configuration files created are placeholders. You need to:

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project named "Pyebwa App"
   - Enable Authentication, Firestore, and Storage

2. **Add Android App**:
   - Package name: `com.pyebwaapp`
   - Download `google-services.json`
   - Replace `/android/app/google-services.json` with your downloaded file

3. **Add iOS App**:
   - Bundle ID: `com.pyebwaapp`
   - Download `GoogleService-Info.plist`
   - Replace `/ios/GoogleService-Info.plist` with your downloaded file
   - Add the file to your Xcode project (drag into Xcode)

4. **Update Firestore Rules**:
   - In Firebase Console, go to Firestore Database
   - Click on Rules tab
   - Copy contents from `/firestore.rules`

5. **Enable Authentication Methods**:
   - In Firebase Console, go to Authentication
   - Enable Email/Password authentication

## Security Note

After adding real Firebase configuration:
- Uncomment the last two lines in `.gitignore` to prevent committing sensitive data
- Never commit real Firebase configuration files to public repositories