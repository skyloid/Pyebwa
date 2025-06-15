#!/usr/bin/env python3
"""
Deploy comprehensive fix for unlimited photos
"""

import ftplib
from datetime import datetime

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = "~3jB~XmCbjO>K2VY"

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
    print("Unlimited Photos Fix Deployment")
    print("-" * 40)
    print(f"Timestamp: {datetime.now()}")
    
    try:
        # Connect to FTP
        print("\nConnecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected to FTP server")
        
        # Navigate to app directory
        ftp.cwd('/domains/rasin.pyebwa.com/public_html/app')
        
        # Upload test files
        upload_file(ftp, 'app/test-unlimited-photos.html', 'test-unlimited-photos.html')
        
        # Upload photo-gallery.js
        ftp.cwd('js')
        upload_file(ftp, 'app/js/photo-gallery.js', 'photo-gallery.js')
        
        print("\n✅ Unlimited photos fix deployed!")
        print("\nChanges made:")
        print("1. Changed from forEach to for loop for file processing")
        print("2. Clear preview grid before adding new previews")
        print("3. Enhanced debugging throughout the process")
        print("4. Batch upload to prevent race conditions")
        
        print("\nTest the fix:")
        print("1. Visit: https://rasin.pyebwa.com/app/")
        print("2. Open a member profile, go to Gallery tab")
        print("3. Try uploading more than 5 photos")
        
        print("\nAdditional test tools:")
        print("- https://rasin.pyebwa.com/app/test-unlimited-photos.html")
        print("  Generate and test with 10, 20, 50, or 100 files")
        print("- https://rasin.pyebwa.com/app/test-photo-array.html")
        print("  Test Firestore array operations")
        
        # Close FTP connection
        ftp.quit()
        
    except Exception as e:
        print(f"\n✗ Deployment failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())