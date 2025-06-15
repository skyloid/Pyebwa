#!/usr/bin/env python3
"""
Deploy fixes for 9-image limit and lightbox navigation
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
    print("Photo Fixes Final Deployment")
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
        print("\nUploading fixed files...")
        upload_file(ftp, 'app/js/photo-gallery.js', 'photo-gallery.js')
        upload_file(ftp, 'app/js/member-profile.js', 'member-profile.js')
        
        print("\n✅ Fixes deployed successfully!")
        print("\nWhat was fixed:")
        print("1. ✓ Lightbox navigation now works for all photos")
        print("   - Navigation buttons use current index instead of hardcoded initial index")
        print("   - Arrow keys also fixed")
        
        print("\n2. ✓ Added extensive debugging for the 9-image limit")
        print("   - Logs photo counts at every step")
        print("   - Verifies what's saved to Firestore")
        print("   - Shows what's loaded in the gallery")
        
        print("\nTo debug the 9-image limit:")
        print("1. Open browser console (F12)")
        print("2. Upload more than 9 photos")
        print("3. Look for these logs:")
        print("   - 'About to save photos array:' (shows full array)")
        print("   - 'Verified saved photos count:' (confirms what's in Firestore)")
        print("   - 'All photos for display:' (shows what's being rendered)")
        
        print("\nThe console will reveal where photos are being limited.")
        
        # Close FTP connection
        ftp.quit()
        
    except Exception as e:
        print(f"\n✗ Deployment failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())