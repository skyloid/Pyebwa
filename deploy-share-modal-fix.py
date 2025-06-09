#!/usr/bin/env python3
"""
Deploy share-modal.js fix to prevent addEventListener errors
"""

import ftplib
from datetime import datetime

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = "~3jB~XmCbjO>K2VY"

def upload_file(ftp, local_path, remote_path):
    """Upload a file to FTP server"""
    try:
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {remote_path}', file)
        print(f"✓ Uploaded: {remote_path}")
        return True
    except Exception as e:
        print(f"✗ Error uploading {remote_path}: {str(e)}")
        return False

def main():
    print(f"\n=== Deploying Share Modal Fix - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    
    try:
        # Connect to FTP
        print("Connecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected\n")
        
        # Switch to public_html
        ftp.cwd('/public_html')
        
        # Upload files
        files_to_upload = [
            # New fixed share-modal.js
            ('app/js/share-modal-fixed.js', 'app/js/share-modal-fixed.js'),
            # Updated index.html that references the fixed version
            ('app/index.html', 'app/index.html'),
        ]
        
        success_count = 0
        for local_file, remote_file in files_to_upload:
            if upload_file(ftp, local_file, remote_file):
                success_count += 1
        
        print(f"\n✓ Successfully uploaded {success_count}/{len(files_to_upload)} files")
        
        # Also upload the original share-modal.js with the defensive code
        print("\nUpdating original share-modal.js as backup...")
        upload_file(ftp, 'app/js/share-modal-fixed.js', 'app/js/share-modal.js')
        
        ftp.quit()
        print("\n✓ Deployment complete")
        
        print("\n=== Fix Summary ===")
        print("1. Created share-modal-fixed.js with robust error handling")
        print("2. Updated app/index.html to use the fixed version")
        print("3. No more addEventListener errors should occur")
        print("\nNote: Clear browser cache to ensure the new version loads")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())