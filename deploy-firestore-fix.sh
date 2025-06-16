#!/bin/bash

echo "Deploying Firestore rules fix..."

# Deploy Firestore rules
firebase deploy --only firestore:rules

if [ $? -eq 0 ]; then
    echo "✅ Firestore rules deployed successfully!"
else
    echo "❌ Failed to deploy Firestore rules"
    exit 1
fi

echo ""
echo "Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Ask the user to go to: https://rasin.pyebwa.com/debug-members.html"
echo "2. Run the debug functions to see what's happening"
echo "3. Check the console output in app.js for detailed logs"