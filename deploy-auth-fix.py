#!/usr/bin/env python3
import ftplib
from pathlib import Path

# FTP credentials for www.pyebwa.com
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

def upload_file():
    try:
        # Connect to FTP
        print(f"Connecting to FTP server {FTP_HOST}...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("Connected successfully!")
        
        # Navigate to js directory
        ftp.cwd(f"{FTP_DIR}/js")
        
        # Upload app.js
        local_file = 'pyebwa.com/js/app.js'
        print(f"Uploading {local_file}...")
        with open(local_file, 'rb') as f:
            ftp.storbinary('STOR app.js', f)
        print("✓ app.js uploaded successfully!")
        
        # Close connection
        ftp.quit()
        
        print("\n✅ Authentication fix deployed!")
        print("\nChanges:")
        print("- Added auth success handler on pyebwa.com")
        print("- Auth flow now goes: secure.pyebwa.com → pyebwa.com → rasin.pyebwa.com")
        print("- This ensures Firebase auth state is properly maintained")
        print("\nThe new flow:")
        print("1. User logs in on secure.pyebwa.com")
        print("2. Redirects to pyebwa.com with auth=success")
        print("3. pyebwa.com waits for Firebase auth state")
        print("4. Then redirects to rasin.pyebwa.com/app/")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    upload_file()