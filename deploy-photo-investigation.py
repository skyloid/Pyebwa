#!/usr/bin/env python3
"""
Deploy photo limit investigation tools
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
    print("Photo Investigation Tools Deployment")
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
        print("\nUploading investigation tools...")
        upload_file(ftp, 'app/test-photo-limit.html', 'test-photo-limit.html')
        
        print("\n✅ Investigation tools deployed!")
        print("\nAvailable tools:")
        print("\n1. Photo Limit Investigation:")
        print("   https://rasin.pyebwa.com/app/test-photo-limit.html")
        print("   - Test array size limits")
        print("   - Test batch operations")
        print("   - Test direct Firestore writes")
        
        print("\n2. Unlimited Photos Test (existing):")
        print("   https://rasin.pyebwa.com/app/test-unlimited-photos.html")
        print("   - Generate test files")
        print("   - Test file input handling")
        
        print("\n3. Main Application:")
        print("   https://rasin.pyebwa.com/app/")
        print("   - Test with real photo uploads")
        print("   - Check browser console for debug logs")
        
        print("\nDebugging steps:")
        print("1. Open browser console (F12)")
        print("2. Upload photos and watch for these key logs:")
        print("   - 'Files selected:' - initial file count")
        print("   - 'Valid files after filtering:' - after size check")
        print("   - 'Processing files for preview...' - preview generation")
        print("   - 'About to save photos array:' - full array before save")
        print("   - 'Verified saved photos count:' - what's in Firestore")
        
        # Close FTP connection
        ftp.quit()
        
    except Exception as e:
        print(f"\n✗ Deployment failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())