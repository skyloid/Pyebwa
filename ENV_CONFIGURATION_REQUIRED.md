# Environment Configuration Required

The following environment variables and configuration files need to be set up for the push notification and email services to work properly:

## 1. Environment Variables (.env file)

Create a `.env` file in the root directory with the following variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=9111

# Firebase Configuration
FIREBASE_PROJECT_ID=pyebwa-f5960
FIREBASE_DATABASE_URL=https://pyebwa-f5960.firebaseio.com

# SendGrid Configuration (Required for Email)
SENDGRID_API_KEY=your_sendgrid_api_key_here  # Get from SendGrid dashboard
SENDER_EMAIL=noreply@pyebwa.com              # Verified sender email
SENDER_NAME=Pyebwa Family Tree

# App Configuration
APP_URL=https://rasin.pyebwa.com
SUPPORT_EMAIL=support@pyebwa.com

# Push Notification Configuration (FCM)
FCM_SERVER_KEY=your_fcm_server_key_here      # Get from Firebase Console > Project Settings > Cloud Messaging
VAPID_KEY=your_vapid_public_key_here         # Generate in Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
```

## 2. Firebase Service Account Key

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the downloaded file as `serviceAccountKey.json` in the root directory
4. Add `serviceAccountKey.json` to `.gitignore` (already added)

## 3. SendGrid Setup

1. Create a SendGrid account at https://sendgrid.com
2. Verify your sender email address
3. Generate an API key with full access
4. Add the API key to your `.env` file

## 4. Firebase Cloud Messaging Setup

1. In Firebase Console > Project Settings > Cloud Messaging:
   - Enable Cloud Messaging API (Legacy) if not already enabled
   - Copy the Server Key for FCM_SERVER_KEY
   - Generate a new Web Push certificate and copy the public key for VAPID_KEY

## 5. Install Dependencies

```bash
npm install
```

Note: The following new dependencies have been added for backup and system management:
- `archiver` - For creating ZIP archives of backup data

## 6. Email Templates

Email templates are already created in `server/email-templates/`:
- `announcement.hbs` - For announcement emails
- Additional templates can be added as needed

## 7. Testing Configuration

To test the setup:

1. **Test Email Service:**
   ```bash
   # Create a test script or use the API endpoint
   curl -X POST http://localhost:9111/api/notifications/test-email
   ```

2. **Test Push Notifications:**
   - Open the app in a browser
   - Grant notification permissions when prompted
   - Send a test notification through the admin dashboard

## 8. Production Deployment Notes

- Ensure all environment variables are set in your production environment
- Keep `serviceAccountKey.json` secure and never commit it to version control
- Consider using environment-specific email templates
- Monitor SendGrid usage to stay within limits
- Set up proper CORS configuration for production domains

## 9. Optional Services

If you want to add SMS notifications (Twilio):
```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Security Notes

- Never commit `.env` or `serviceAccountKey.json` to version control
- Rotate API keys regularly
- Use environment-specific configurations
- Implement rate limiting on notification endpoints
- Monitor for unusual notification patterns