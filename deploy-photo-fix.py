#!/usr/bin/env python3
"""
Deploy photo upload fixes
"""

import ftplib
import os
from datetime import datetime

# FTP credentials
FTP_HOST = "ftp.pyebwa.com"
FTP_USER = "pyebwafc"
FTP_PASS = "33Hj5hJc5VgT3#"

def upload_file(ftp, local_path, remote_path):
    """Upload a single file via FTP"""
    try:
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {remote_path}', file)
        print(f"✓ Uploaded: {remote_path}")
        return True
    except Exception as e:
        print(f"✗ Failed to upload {remote_path}: {e}")
        return False

def main():
    print("Photo Upload Fix Deployment")
    print("-" * 40)
    print(f"Timestamp: {datetime.now()}")
    
    files_to_upload = [
        ('app/js/photo-gallery.js', 'public_html/rasin.pyebwa.com/app/js/photo-gallery.js'),
        ('app/js/app.js', 'public_html/rasin.pyebwa.com/app/js/app.js'),
        ('app/test-photo-upload.html', 'public_html/rasin.pyebwa.com/app/test-photo-upload.html'),
    ]
    
    try:
        # Connect to FTP
        print("\nConnecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected to FTP server")
        
        # Upload files
        print("\nUploading files...")
        success_count = 0
        for local_file, remote_file in files_to_upload:
            if upload_file(ftp, local_file, remote_file):
                success_count += 1
        
        # Close FTP connection
        ftp.quit()
        
        print(f"\n✓ Deployment complete! {success_count}/{len(files_to_upload)} files uploaded")
        
        # Instructions
        print("\n" + "=" * 40)
        print("IMPORTANT: Photo Upload Fix Deployed")
        print("=" * 40)
        print("\nChanges made:")
        print("1. Enhanced error logging in photo upload")
        print("2. Added authentication check")
        print("3. Fixed Firebase Storage paths to match security rules")
        print("4. Added storage configuration check on app init")
        print("5. Created test page at /app/test-photo-upload.html")
        
        print("\nNext steps:")
        print("1. Deploy storage rules: python3 deploy-storage-rules.py")
        print("2. Test photo upload at: https://rasin.pyebwa.com/app/test-photo-upload.html")
        print("3. Check browser console for detailed error messages")
        
        print("\nIf uploads still fail:")
        print("- Check Firebase Console > Storage Rules")
        print("- Ensure storage bucket is correct in Firebase config")
        print("- Verify user authentication state")
        
    except Exception as e:
        print(f"\n✗ Deployment failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())