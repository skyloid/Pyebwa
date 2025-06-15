#!/usr/bin/env python3
"""
Deploy slideshow speed adjustment
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
    print("Slideshow Speed Adjustment")
    print("-" * 40)
    print(f"Timestamp: {datetime.now()}")
    
    try:
        # Connect to FTP
        print("\nConnecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected to FTP server")
        
        # Navigate to js directory
        ftp.cwd('/domains/rasin.pyebwa.com/public_html/app/js')
        
        # Upload updated file
        print("\nUploading updated slideshow...")
        upload_file(ftp, 'app/js/photo-gallery.js', 'photo-gallery.js')
        
        print("\n✅ Slideshow speed updated!")
        print("\nChanges:")
        print("- Slideshow now runs at 6 seconds per photo (previously 3 seconds)")
        print("- Photos will display for twice as long")
        print("- Progress bar animation adjusted accordingly")
        
        # Close FTP connection
        ftp.quit()
        
    except Exception as e:
        print(f"\n✗ Deployment failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())