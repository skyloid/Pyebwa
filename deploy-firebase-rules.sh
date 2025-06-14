#!/bin/bash

# Deploy Firebase Security Rules
# This script deploys the enhanced security rules to Firebase

echo "🔒 Deploying Firebase Security Rules"
echo "===================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "firestore-secure.rules" ] || [ ! -f "storage-secure.rules" ]; then
    echo "❌ Security rules files not found in current directory"
    echo "Please run this script from the project root"
    exit 1
fi

# Login to Firebase (if not already logged in)
echo "📝 Checking Firebase authentication..."
firebase login:list &> /dev/null
if [ $? -ne 0 ]; then
    echo "Please login to Firebase:"
    firebase login
fi

# Get the project ID
echo "🔍 Getting Firebase project ID..."
PROJECT_ID=$(grep '"projectId"' app/js/firebase-config.js | sed 's/.*"projectId": "\(.*\)".*/\1/')

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Could not find project ID. Please enter it manually:"
    read -p "Firebase Project ID: " PROJECT_ID
fi

echo "📋 Using project: $PROJECT_ID"

# Create firebase.json if it doesn't exist
if [ ! -f "firebase.json" ]; then
    echo "📝 Creating firebase.json..."
    cat > firebase.json << EOF
{
  "firestore": {
    "rules": "firestore-secure.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage-secure.rules"
  }
}
EOF
fi

# Create empty indexes file if it doesn't exist
if [ ! -f "firestore.indexes.json" ]; then
    echo "📝 Creating firestore.indexes.json..."
    cat > firestore.indexes.json << EOF
{
  "indexes": [],
  "fieldOverrides": []
}
EOF
fi

# Deploy Firestore rules
echo ""
echo "🚀 Deploying Firestore security rules..."
firebase deploy --only firestore:rules --project $PROJECT_ID

if [ $? -eq 0 ]; then
    echo "✅ Firestore rules deployed successfully!"
else
    echo "❌ Failed to deploy Firestore rules"
    exit 1
fi

# Deploy Storage rules
echo ""
echo "🚀 Deploying Storage security rules..."
firebase deploy --only storage:rules --project $PROJECT_ID

if [ $? -eq 0 ]; then
    echo "✅ Storage rules deployed successfully!"
else
    echo "❌ Failed to deploy Storage rules"
    exit 1
fi

echo ""
echo "🎉 All security rules deployed successfully!"
echo ""
echo "📊 Next steps:"
echo "1. Test the rules in Firebase Console"
echo "2. Monitor for any rule violations"
echo "3. Adjust rules if needed based on usage patterns"
echo ""
echo "⚠️  Important: The new rules are more restrictive."
echo "   Test your app thoroughly to ensure everything works correctly."