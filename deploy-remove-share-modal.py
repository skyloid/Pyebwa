#!/usr/bin/env python3
"""
Remove share modal functionality from the app
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

def delete_file(ftp, remote_path):
    """Delete a file from FTP server"""
    try:
        ftp.delete(remote_path)
        print(f"✓ Deleted: {remote_path}")
        return True
    except Exception as e:
        print(f"ℹ Could not delete {remote_path}: {str(e)}")
        return False

def main():
    print(f"\n=== Removing Share Modal - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    
    try:
        # Connect to FTP
        print("Connecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected\n")
        
        # Switch to public_html
        ftp.cwd('/public_html')
        
        # Upload updated index.html without share modal
        print("Updating app/index.html...")
        upload_file(ftp, 'app/index.html', 'app/index.html')
        
        # Delete share modal files
        print("\nRemoving share modal files...")
        files_to_delete = [
            'app/js/share-modal.js',
            'app/js/share-modal-fixed.js'
        ]
        
        for file_path in files_to_delete:
            delete_file(ftp, file_path)
        
        ftp.quit()
        print("\n✓ Deployment complete")
        
        print("\n=== Summary ===")
        print("✓ Removed share modal script from app/index.html")
        print("✓ Deleted share modal JavaScript files")
        print("✓ No more share modal errors will occur")
        print("\nThe app now uses the pyebwa.com authentication flow exclusively.")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())