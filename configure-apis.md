# 🔑 API Configuration Instructions

Follow these steps to get your actual API keys and complete the environment setup:

## 🔥 Step 1: Firebase Service Account Key

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com/project/pyebwa-f5960/settings/serviceaccounts/adminsdk

2. **Generate Service Account Key:**
   - Click the "Generate new private key" button
   - Download the JSON file
   - Rename it to `serviceAccountKey.json`
   - Place it in the root directory: `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/`

3. **Verify the file:**
   ```bash
   ls -la serviceAccountKey.json
   ```

## 📧 Step 2: SendGrid Email Service

1. **Create SendGrid Account:**
   - Go to: https://sendgrid.com
   - Sign up for free account (100 emails/day free)

2. **Verify Sender Email:**
   - Go to Settings → Sender Authentication
   - Verify `noreply@pyebwa.com` (or your preferred email)
   - Complete the verification process

3. **Generate API Key:**
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Choose "Full Access" permissions
   - Copy the key (starts with "SG.")

4. **Update .env file:**
   ```bash
   # Replace this line in .env:
   SENDGRID_API_KEY=your_sendgrid_api_key_here
   
   # With your actual key:
   SENDGRID_API_KEY=SG.your_actual_key_here
   ```

## 🔔 Step 3: Firebase Cloud Messaging (Push Notifications)

**Note: Pyebwa uses Service Account authentication for enhanced security instead of legacy server keys.**

1. **Go to Firebase Cloud Messaging:**
   - Visit: https://console.firebase.google.com/project/pyebwa-f5960/settings/cloudmessaging

2. **Generate VAPID Key (Web Push Certificate):**
   - Scroll down to "Web Push certificates"
   - Click "Generate key pair" if none exists
   - Copy the public key (long string starting with 'B')
   - Update .env: `VAPID_KEY=your_actual_vapid_public_key`

**Security Advantage:** 
- ✅ Uses OAuth 2.0 with Service Account credentials
- ✅ More granular access control
- ✅ No need for separate legacy server key
- ✅ Same authentication as other Firebase Admin operations

## 🧪 Step 4: Test Configuration

After updating all keys, test your setup:

```bash
# Test the configuration
node test-config.js

# If successful, start the server
npm start
```

## 📝 Quick Configuration Commands

Run these commands to verify each step:

```bash
# Check if service account exists
ls -la serviceAccountKey.json

# Check environment variables
node -e "
require('dotenv').config();
console.log('SendGrid configured:', !process.env.SENDGRID_API_KEY.includes('your_'));
console.log('FCM configured:', !process.env.FCM_SERVER_KEY.includes('your_'));
console.log('VAPID configured:', !process.env.VAPID_KEY.includes('your_'));
"

# Test Firebase connection
node -e "
try {
  const serviceAccount = require('./serviceAccountKey.json');
  console.log('✅ Service account file found and valid');
  console.log('Project ID:', serviceAccount.project_id);
} catch(e) {
  console.log('❌ Service account issue:', e.message);
}
"
```

## 🎯 Expected Results

When properly configured, you should see:

1. **Service Account:** ✅ File exists and contains valid JSON
2. **SendGrid:** ✅ API key starts with "SG." and is not the template value
3. **FCM Server Key:** ✅ Long string of characters, not template value
4. **VAPID Key:** ✅ Base64-encoded string, not template value

## 🚨 Common Issues

- **Firebase 403 errors:** Service account lacks permissions
- **SendGrid 401:** API key invalid or not verified
- **FCM errors:** Cloud Messaging API not enabled
- **VAPID errors:** Invalid key format or not generated

## 📞 Need Help?

If you run into issues:
1. Double-check each URL above
2. Ensure you're logged into the correct accounts
3. Verify file permissions and locations
4. Check the Firebase project ID matches: `pyebwa-f5960`

---

**Once all keys are configured, your Pyebwa platform will have full email and push notification capabilities! 🚀**