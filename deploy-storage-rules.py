#!/usr/bin/env python3
"""
Deploy Firebase Storage rules for Pyebwa Family Tree application
"""

import subprocess
import os
import sys

def deploy_storage_rules():
    """Deploy storage.rules to Firebase"""
    print("Deploying Firebase Storage rules...")
    
    # Check if storage.rules exists
    if not os.path.exists('storage.rules'):
        print("Error: storage.rules file not found!")
        return False
    
    # Check if firebase CLI is installed
    try:
        subprocess.run(['firebase', '--version'], check=True, capture_output=True)
    except FileNotFoundError:
        print("Error: Firebase CLI not installed. Install it with: npm install -g firebase-tools")
        return False
    except subprocess.CalledProcessError:
        print("Error: Firebase CLI error")
        return False
    
    # Deploy storage rules
    try:
        print("Deploying storage rules to Firebase...")
        result = subprocess.run(
            ['firebase', 'deploy', '--only', 'storage:rules'],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✓ Storage rules deployed successfully!")
            print(result.stdout)
            return True
        else:
            print("✗ Failed to deploy storage rules:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"Error deploying storage rules: {e}")
        return False

def check_firebase_config():
    """Check if Firebase is properly configured"""
    if not os.path.exists('.firebaserc'):
        print("Warning: .firebaserc file not found. Run 'firebase init' first.")
        return False
    
    if not os.path.exists('firebase.json'):
        print("Warning: firebase.json file not found. Run 'firebase init' first.")
        return False
    
    return True

if __name__ == "__main__":
    print("Firebase Storage Rules Deployment")
    print("-" * 40)
    
    # Check Firebase configuration
    if not check_firebase_config():
        print("\nPlease configure Firebase first by running:")
        print("  firebase init")
        print("\nMake sure to select 'Storage' when prompted.")
        sys.exit(1)
    
    # Deploy storage rules
    if deploy_storage_rules():
        print("\n✓ Storage rules deployment complete!")
        print("\nYour storage rules are now active. Users can upload photos to:")
        print("  - familyTrees/{treeId}/photos/{photoId}")
        print("  - test-uploads/{userId}/**")
        print("  - users/{userId}/profile/{filename}")
    else:
        print("\n✗ Storage rules deployment failed!")
        sys.exit(1)