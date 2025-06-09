#!/usr/bin/env python3
"""
Deploy temporary fix while waiting for VPS upload
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
    print(f"\n=== Deploying Temporary Fix - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    
    try:
        # Connect to FTP
        print("Connecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected\n")
        
        # Switch to public_html
        ftp.cwd('/public_html')
        
        # Upload the temporarily fixed app.js
        upload_file(ftp, 'app/js/app.js', 'app/js/app.js')
        
        ftp.quit()
        print("\n✓ Deployment complete")
        
        print("\n=== Temporary Fix Applied ===")
        print("\nCurrent flow (temporary):")
        print("1. rasin.pyebwa.com/app/ → checks auth")
        print("2. If not logged in → redirects to pyebwa.com/simple-login.html")
        print("3. After login → redirects back to rasin.pyebwa.com/app/")
        
        print("\n⚠️  This is temporary! To complete the setup:")
        print("\n1. Upload these files to your rasin.pyebwa.com VPS:")
        print("   - login.html → document root")
        print("   - app/js/app.js → app/js/ directory")
        print("\n2. After uploading, update app.js line 228:")
        print("   Change: window.location.href = 'https://pyebwa.com/simple-login.html';")
        print("   To:     window.location.href = '/login.html';")
        
        print("\nThe files are ready in: rasin-vps-files.tar")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())