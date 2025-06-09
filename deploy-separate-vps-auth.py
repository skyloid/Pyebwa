#!/usr/bin/env python3
"""
Deploy authentication to separate VPS servers
"""

import ftplib
from datetime import datetime

# FTP credentials for pyebwa.com
PYEBWA_FTP_HOST = "145.223.107.9"
PYEBWA_FTP_USER = "u316621955.pyebwa.com"
PYEBWA_FTP_PASS = "~3jB~XmCbjO>K2VY"

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

def deploy_to_pyebwa():
    """Deploy updates to pyebwa.com"""
    print("\n=== Deploying to pyebwa.com ===\n")
    
    try:
        # Connect to FTP
        print("Connecting to pyebwa.com FTP...")
        ftp = ftplib.FTP(PYEBWA_FTP_HOST, timeout=30)
        ftp.login(PYEBWA_FTP_USER, PYEBWA_FTP_PASS)
        print("✓ Connected\n")
        
        # Switch to public_html
        ftp.cwd('/public_html')
        
        # Upload updated app.js
        files_to_upload = [
            ('pyebwa.com/js/app.js', 'js/app.js'),
        ]
        
        for local_file, remote_file in files_to_upload:
            upload_file(ftp, local_file, remote_file)
        
        ftp.quit()
        print("\n✓ pyebwa.com deployment complete")
        
    except Exception as e:
        print(f"\n✗ Error deploying to pyebwa.com: {e}")
        return False
    
    return True

def main():
    print(f"\n=== Deploying Separate VPS Authentication - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    
    print("This deployment requires two steps:")
    print("1. Deploy to pyebwa.com (automated)")
    print("2. Deploy to rasin.pyebwa.com VPS (manual)")
    
    # Deploy to pyebwa.com
    if deploy_to_pyebwa():
        print("\n" + "="*60)
        print("\n✅ Step 1 Complete: pyebwa.com updated")
        print("\nLogin/signup buttons now redirect to: https://rasin.pyebwa.com/login.html")
        
        print("\n" + "="*60)
        print("\n📋 Step 2: Manual deployment to rasin.pyebwa.com VPS")
        print("\nFiles to upload to rasin.pyebwa.com:")
        print("1. /login.html - New login page")
        print("2. /app/js/app.js - Updated to use local login")
        
        print("\nSSH/FTP to your rasin.pyebwa.com VPS and upload:")
        print("- login.html to document root (/var/www/html/ or similar)")
        print("- app/js/app.js to existing app directory")
        
        print("\n" + "="*60)
        print("\n🎯 Final Authentication Flow:")
        print("1. User clicks login on pyebwa.com")
        print("2. Redirected to https://rasin.pyebwa.com/login.html")
        print("3. Logs in with Firebase (all on rasin VPS)")
        print("4. Redirected to /app/ on same domain")
        print("5. No cross-domain issues!")
        
        print("\n✨ Benefits of this setup:")
        print("- Complete isolation between main site and app")
        print("- All authentication on rasin.pyebwa.com")
        print("- No token passing between domains")
        print("- Cleaner, more secure architecture")
        
    else:
        print("\n✗ Deployment to pyebwa.com failed")
        print("Please check FTP credentials and try again")

if __name__ == "__main__":
    main()