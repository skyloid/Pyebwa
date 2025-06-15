#!/usr/bin/env python3
"""
Deploy photo debugging updates
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
    print("Photo Debugging Deployment")
    print("-" * 40)
    print(f"Timestamp: {datetime.now()}")
    
    try:
        # Connect to FTP
        print("\nConnecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected to FTP server")
        
        # Navigate to the correct directory
        ftp.cwd('/domains/rasin.pyebwa.com/public_html/app')
        
        # Upload files
        print("\nUploading files...")
        
        # Upload photo-gallery.js
        ftp.cwd('js')
        upload_file(ftp, 'app/js/photo-gallery.js', 'photo-gallery.js')
        
        # Upload test page
        ftp.cwd('..')
        upload_file(ftp, 'app/test-photo-array.html', 'test-photo-array.html')
        
        print("\n✅ Debugging updates deployed!")
        print("\nTo debug the photo limit issue:")
        print("1. Open browser console (F12)")
        print("2. Try uploading photos and watch the console logs")
        print("3. Visit the test page: https://rasin.pyebwa.com/app/test-photo-array.html")
        print("   - Enter a member ID and test adding multiple photos")
        
        # Close FTP connection
        ftp.quit()
        
    except Exception as e:
        print(f"\n✗ Deployment failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())