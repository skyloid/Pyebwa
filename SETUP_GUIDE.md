# 🌳 Pyebwa Environment Setup Guide

This guide will walk you through configuring all the required environment variables and services for the Pyebwa platform.

## 📋 Prerequisites

Before starting, make sure you have:
- Node.js 16+ installed
- Access to Firebase Console for the `pyebwa-f5960` project
- A domain/email for SendGrid verification

## 🚀 Quick Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run Interactive Setup
```bash
node setup-environment.js
```

This interactive script will guide you through the entire setup process.

## 🔧 Manual Setup (Alternative)

If you prefer manual configuration, follow these steps:

### 1. Create Environment File

Copy the example file and customize it:
```bash
cp .env.example .env
```

### 2. Firebase Service Account Setup

**Get your Firebase service account key:**

1. Go to [Firebase Console](https://console.firebase.google.com/project/pyebwa-f5960/settings/serviceaccounts/adminsdk)
2. Click "Generate new private key"
3. Save as `serviceAccountKey.json` in the root directory
4. ⚠️ **Never commit this file to git** (already in .gitignore)

### 3. SendGrid Email Service Setup

**Create SendGrid account and get API key:**

1. Visit [SendGrid](https://sendgrid.com) and create account (free tier available)
2. Verify your sender email address
3. Go to Settings → API Keys
4. Create API key with "Full Access" permissions
5. Update `.env` file:
   ```bash
   SENDGRID_API_KEY=SG.your_actual_api_key_here
   SENDER_EMAIL=your_verified_email@yourdomain.com
   ```

### 4. Firebase Cloud Messaging (Push Notifications)

**Get FCM credentials:**

1. Go to [Firebase Console](https://console.firebase.google.com/project/pyebwa-f5960/settings/cloudmessaging)
2. Enable "Cloud Messaging API (Legacy)" if not enabled
3. Copy the "Server key" 
4. Generate a new "Web Push certificate" and copy the public key
5. Update `.env` file:
   ```bash
   FCM_SERVER_KEY=your_server_key_here
   VAPID_KEY=your_vapid_public_key_here
   ```

## 🧪 Testing Your Configuration

### Test with the built-in tester:
```bash
node test-config.js
```

### Test individual services:

**Test Firebase connection:**
```bash
node -e "
require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});
console.log('Firebase connected successfully!');
"
```

**Test SendGrid:**
```bash
node -e "
require('dotenv').config();
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
console.log('SendGrid configured:', process.env.SENDGRID_API_KEY ? 'Yes' : 'No');
"
```

## 🔍 Troubleshooting

### Common Issues:

#### Firebase Errors
- **"serviceAccountKey.json not found"**: Download from Firebase Console
- **"Invalid credentials"**: Regenerate service account key
- **"Project not found"**: Verify FIREBASE_PROJECT_ID in .env

#### SendGrid Errors  
- **"API key invalid"**: Check if key starts with "SG."
- **"Sender email not verified"**: Verify email in SendGrid dashboard
- **"Permission denied"**: Ensure API key has "Full Access"

#### FCM Errors
- **"Invalid server key"**: Regenerate in Firebase Console
- **"VAPID key invalid"**: Generate new Web Push certificate

### Debug Mode

Enable debug logging by adding to `.env`:
```bash
NODE_ENV=development
DEBUG=*
```

## 📊 Configuration Checklist

- [ ] `.env` file created with all required variables
- [ ] `serviceAccountKey.json` downloaded and placed in root
- [ ] SendGrid account created and sender email verified
- [ ] SendGrid API key generated and added to `.env`
- [ ] Firebase Cloud Messaging enabled
- [ ] FCM Server Key added to `.env`
- [ ] VAPID key generated and added to `.env`
- [ ] Dependencies installed (`npm install`)
- [ ] Configuration tested (`node test-config.js`)

## 🔐 Security Best Practices

### Development
- Keep `.env` and `serviceAccountKey.json` out of git
- Use development/staging Firebase projects for testing
- Rotate API keys regularly

### Production
- Use environment-specific configuration
- Store secrets in secure environment variable storage
- Enable API key restrictions where possible
- Monitor usage and set up alerts

## 🌐 Environment Variables Reference

### Required Variables
```bash
NODE_ENV=production                    # Environment mode
PORT=9111                             # Server port
FIREBASE_PROJECT_ID=pyebwa-f5960      # Firebase project
FIREBASE_DATABASE_URL=https://...     # Firestore URL
APP_URL=https://rasin.pyebwa.com      # Your app URL
```

### Email Service (SendGrid)
```bash
SENDGRID_API_KEY=SG.xxx               # SendGrid API key
SENDER_EMAIL=noreply@yourdomain.com   # Verified sender
SENDER_NAME=Pyebwa Family Tree        # Sender display name
SUPPORT_EMAIL=support@yourdomain.com  # Support contact
```

### Push Notifications (FCM)
```bash
FCM_SERVER_KEY=your_server_key        # Firebase server key
VAPID_KEY=your_vapid_key              # Web push certificate
```

### Optional Services
```bash
# Twilio SMS (optional)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Analytics (optional)
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
MIXPANEL_TOKEN=your_token
```

## 🚀 Next Steps

After configuration is complete:

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Access admin dashboard:**
   - Go to `https://rasin.pyebwa.com/admin`
   - Use your admin account to test features

3. **Test notifications:**
   - Send test email via admin dashboard
   - Test push notifications in browser

4. **Monitor logs:**
   - Check server logs for any errors
   - Monitor SendGrid dashboard for email delivery
   - Check Firebase Console for usage

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Test individual services separately
4. Check server logs for specific error messages

## 🔄 Updating Configuration

To update configuration later:
1. Modify `.env` file
2. Restart the server
3. Test the changes with `node test-config.js`

---

**Happy coding! 🎉**