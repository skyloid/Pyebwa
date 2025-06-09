#!/usr/bin/env python3
"""
Final fix for authentication loop - remove conflicting auth scripts
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
    print(f"\n=== Final Authentication Loop Fix - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    
    try:
        # Connect to FTP
        print("Connecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected\n")
        
        # Switch to public_html
        ftp.cwd('/public_html')
        
        # Upload updated files
        files_to_upload = [
            # Updated homepage without auth scripts
            ('pyebwa.com/index.html', 'index.html'),
            # URL cleaner script
            ('pyebwa.com/js/clean-url.js', 'js/clean-url.js'),
        ]
        
        success_count = 0
        for local_file, remote_file in files_to_upload:
            if upload_file(ftp, local_file, remote_file):
                success_count += 1
        
        print(f"\n✓ Successfully uploaded {success_count}/{len(files_to_upload)} files")
        
        ftp.quit()
        print("\n✓ Deployment complete")
        
        print("\n=== Fixes Applied ===")
        print("1. Removed firebase-config.js, auth.js, and auth-bridge.js from homepage")
        print("2. Added clean-url.js to remove auth parameters from URL")
        print("3. Homepage no longer handles authentication")
        print("\nAuthentication flow:")
        print("- All authentication handled at pyebwa.com/login/")
        print("- No auth scripts on homepage to interfere")
        print("- URL parameters automatically cleaned")
        print("\nThis should completely eliminate the redirect loop!")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())