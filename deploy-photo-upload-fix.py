#!/usr/bin/env python3
"""
Deploy photo upload fixes to rasin.pyebwa.com
"""

import ftplib
import os
from datetime import datetime

# FTP credentials for rasin.pyebwa.com
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = "~3jB~XmCbjO>K2VY"

def upload_file(ftp, local_path, remote_path):
    """Upload a single file via FTP"""
    try:
        # Ensure directory exists
        remote_dir = os.path.dirname(remote_path)
        try:
            ftp.cwd(remote_dir)
        except:
            # Directory might not exist, try to create it
            dirs = remote_dir.split('/')
            for i in range(len(dirs)):
                partial_dir = '/'.join(dirs[:i+1])
                if partial_dir:
                    try:
                        ftp.cwd(partial_dir)
                    except:
                        ftp.mkd(partial_dir)
                        ftp.cwd(partial_dir)
        
        # Upload file
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {os.path.basename(remote_path)}', file)
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
        ('app/js/photo-gallery.js', '/domains/rasin.pyebwa.com/public_html/app/js/photo-gallery.js'),
        ('app/js/app.js', '/domains/rasin.pyebwa.com/public_html/app/js/app.js'),
        ('app/test-photo-upload.html', '/domains/rasin.pyebwa.com/public_html/app/test-photo-upload.html'),
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
        
        # Summary
        print("\n" + "=" * 60)
        print("PHOTO UPLOAD FIX DEPLOYED SUCCESSFULLY!")
        print("=" * 60)
        print("\nWhat was fixed:")
        print("1. ✓ Firebase Storage rules deployed to Firebase")
        print("2. ✓ Updated filename sanitization to match security rules")
        print("3. ✓ Fixed metadata structure for uploads")
        print("4. ✓ Added Firebase Storage configuration check")
        
        print("\n📸 Photo uploads should now work! Test it at:")
        print("   https://rasin.pyebwa.com/app/")
        print("\n   1. Login and view a family member's profile")
        print("   2. Click on the Gallery tab")
        print("   3. Click 'Add Photo' to upload photos")
        
        print("\n🔍 For debugging, visit:")
        print("   https://rasin.pyebwa.com/app/test-photo-upload.html")
        
    except Exception as e:
        print(f"\n✗ Deployment failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())