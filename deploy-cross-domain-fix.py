#!/usr/bin/env python3
"""
Deploy cross-domain authentication fix
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
    print(f"\n=== Deploying Cross-Domain Fix - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    
    try:
        # Connect to FTP
        print(f"Connecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected\n")
        
        # Switch to public_html
        ftp.cwd('/public_html')
        
        # Upload updated files
        files_to_upload = [
            # Updated app.js that redirects to pyebwa.com/login/
            ('app/js/app.js', 'app/js/app.js'),
            # Updated login page that redirects back to rasin.pyebwa.com/app/
            ('login/index.html', 'login/index.html'),
        ]
        
        for local_file, remote_file in files_to_upload:
            upload_file(ftp, local_file, remote_file)
        
        print("\n=== Testing Cross-Domain Setup ===")
        print("\nAuthentication flow:")
        print("1. rasin.pyebwa.com/app/ → redirects to → pyebwa.com/login/")
        print("2. User logs in at pyebwa.com/login/")
        print("3. After login → redirects back to → rasin.pyebwa.com/app/")
        
        print("\nURLs to test:")
        print("- App: https://rasin.pyebwa.com/app/")
        print("- Login: https://pyebwa.com/login/")
        print("- Alt Login: https://pyebwa.com/simple-login.html")
        
        ftp.quit()
        print("\n✓ Deployment complete")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())