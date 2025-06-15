#!/usr/bin/env python3
"""
Deploy enhanced debugging for photo limit issue
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
    print("Enhanced Photo Debugging Deployment")
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
        
        # Upload test file
        upload_file(ftp, 'app/test-file-input.html', 'test-file-input.html')
        
        # Upload photo-gallery.js
        ftp.cwd('js')
        upload_file(ftp, 'app/js/photo-gallery.js', 'photo-gallery.js')
        
        print("\n✅ Enhanced debugging deployed!")
        print("\nTo debug the 5-photo limit:")
        print("1. Test file selection: https://rasin.pyebwa.com/app/test-file-input.html")
        print("2. Open browser console (F12)")
        print("3. Try uploading more than 5 photos")
        print("4. Watch console logs for:")
        print("   - Files selected count")
        print("   - Valid files count")
        print("   - Preview items count")
        print("   - Upload promises count")
        print("   - Current/new/updated photos counts")
        
        # Close FTP connection
        ftp.quit()
        
    except Exception as e:
        print(f"\n✗ Deployment failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())