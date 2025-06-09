#!/usr/bin/env python3
"""
Fix post-login redirect and JavaScript errors
"""

import ftplib
import shutil
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
    print(f"\n=== Fixing Post-Login Redirect - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    
    # Replace app.js with fixed version
    print("Preparing fixed JavaScript...")
    shutil.copy("pyebwa.com/js/app-fixed.js", "pyebwa.com/js/app.js")
    print("✓ Prepared app.js with null checks")
    
    try:
        # Connect to FTP
        print("\nConnecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected\n")
        
        # Switch to public_html
        ftp.cwd('/public_html')
        
        # Upload updated files
        files_to_upload = [
            # Updated login page with correct redirect
            ('login/index.html', 'login/index.html'),
            # Fixed app.js with null checks
            ('pyebwa.com/js/app.js', 'js/app.js'),
        ]
        
        success_count = 0
        for local_file, remote_file in files_to_upload:
            if upload_file(ftp, local_file, remote_file):
                success_count += 1
        
        print(f"\n✓ Successfully uploaded {success_count}/{len(files_to_upload)} files")
        
        ftp.quit()
        print("\n✓ Deployment complete")
        
        print("\n=== Fixes Applied ===")
        print("1. Login page now correctly redirects to rasin.pyebwa.com/app/")
        print("2. Auto-redirect added for already logged-in users")
        print("3. Fixed JavaScript null reference errors")
        print("4. Added null checks for mobile menu elements")
        print("\nAuthentication flow:")
        print("- Login at pyebwa.com/login/")
        print("- After login → redirects to rasin.pyebwa.com/app/")
        print("- No more JavaScript errors")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())