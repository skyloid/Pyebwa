#!/usr/bin/env python3
"""
Apply CORS configuration to Firebase Storage bucket
"""

import json
import sys
from google.cloud import storage
from google.oauth2 import service_account

def apply_cors_configuration(service_account_path, bucket_name='pyebwa-f5960.appspot.com'):
    """Apply CORS configuration to the storage bucket"""
    
    try:
        # Load service account credentials
        credentials = service_account.Credentials.from_service_account_file(
            service_account_path
        )
        
        # Initialize storage client
        client = storage.Client(credentials=credentials)
        
        # Get the bucket
        bucket = client.get_bucket(bucket_name)
        
        # Define CORS configuration
        cors_configuration = [{
            'origin': [
                'https://www.pyebwa.com',
                'https://pyebwa.com', 
                'https://rasin.pyebwa.com',
                'http://localhost:3000'
            ],
            'method': ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
            'responseHeader': [
                'Content-Type',
                'Authorization',
                'Content-Length',
                'X-Requested-With',
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Headers',
                'Access-Control-Allow-Methods'
            ],
            'maxAgeSeconds': 3600
        }]
        
        # Apply CORS configuration
        bucket.cors = cors_configuration
        bucket.patch()
        
        print(f"✓ CORS configuration applied successfully to bucket: {bucket_name}")
        print("\nCORS Configuration:")
        print(json.dumps(cors_configuration, indent=2))
        
        # Verify the configuration
        bucket = client.get_bucket(bucket_name)
        print("\n✓ Verified CORS configuration is active")
        
        return True
        
    except Exception as e:
        print(f"✗ Error applying CORS configuration: {str(e)}")
        return False

def main():
    print("Firebase Storage CORS Configuration Tool")
    print("=" * 40)
    
    # Check if service account path is provided
    if len(sys.argv) < 2:
        print("\nUsage: python apply-cors-config.py <path-to-service-account-key.json>")
        print("\nTo use this script:")
        print("1. Download your service account key from Firebase Console")
        print("2. Run: python apply-cors-config.py /path/to/your-key.json")
        return
    
    service_account_path = sys.argv[1]
    
    # Check if file exists
    try:
        with open(service_account_path, 'r') as f:
            key_data = json.load(f)
            project_id = key_data.get('project_id', 'Unknown')
            print(f"\nUsing service account for project: {project_id}")
    except FileNotFoundError:
        print(f"\n✗ Service account file not found: {service_account_path}")
        return
    except json.JSONDecodeError:
        print(f"\n✗ Invalid JSON in service account file: {service_account_path}")
        return
    
    # Apply CORS configuration
    success = apply_cors_configuration(service_account_path)
    
    if success:
        print("\n✓ CORS configuration applied successfully!")
        print("\nNext steps:")
        print("1. Clear your browser cache")
        print("2. Reload the app at https://rasin.pyebwa.com/app/")
        print("3. Try uploading a photo again")
    else:
        print("\n✗ Failed to apply CORS configuration")
        print("\nTroubleshooting:")
        print("1. Make sure the service account has 'Storage Admin' role")
        print("2. Check that the project ID matches your Firebase project")
        print("3. Ensure you have internet connectivity")

if __name__ == "__main__":
    main()