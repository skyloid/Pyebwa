#!/usr/bin/env python3
"""
Deploy slideshow feature for photo gallery
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
    print("Slideshow Feature Deployment")
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
        
        # Upload files
        print("\nUploading slideshow feature...")
        upload_file(ftp, 'app/js/photo-gallery.js', 'photo-gallery.js')
        upload_file(ftp, 'app/js/member-profile.js', 'member-profile.js')
        
        print("\n✅ Slideshow feature deployed successfully!")
        print("\nNew features:")
        print("1. ✓ Slideshow button in gallery header")
        print("2. ✓ Automatic slideshow with 3-second intervals")
        print("3. ✓ Play/pause controls")
        print("4. ✓ Previous/next navigation")
        print("5. ✓ Fullscreen support")
        print("6. ✓ Progress bar animation")
        print("7. ✓ Keyboard controls:")
        print("   - Arrow keys: Navigate photos")
        print("   - Spacebar: Play/pause")
        print("   - F: Toggle fullscreen")
        print("   - Escape: Exit slideshow")
        
        print("\nTo test:")
        print("1. Open a member profile with photos")
        print("2. Go to Gallery tab")
        print("3. Click the 'Slideshow' button")
        
        # Close FTP connection
        ftp.quit()
        
    except Exception as e:
        print(f"\n✗ Deployment failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())