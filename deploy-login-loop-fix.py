#!/usr/bin/env python3
import ftplib

# FTP credentials for rasin.pyebwa.com
FTP_HOST = '145.223.119.193'
FTP_USER = 'rasin'
FTP_PASS = '46Bkg#L*qUHH'
FTP_DIR = '/htdocs/rasin.pyebwa.com/app'

try:
    # Connect to FTP
    print(f"Connecting to FTP server {FTP_HOST}...")
    ftp = ftplib.FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    print("Connected successfully!")
    
    # Upload app.js
    ftp.cwd(FTP_DIR)
    with open('app/js/app.js', 'rb') as f:
        ftp.storbinary('STOR js/app.js', f)
    print("✓ app.js uploaded successfully!")
    
    # Close connection
    ftp.quit()
    
    print("\n✅ Login loop fix deployed!")
    print("\nKey changes:")
    print("- Fixed redirect URL from 'www.pyebwa.com' to 'secure.pyebwa.com'")
    print("- Unauthenticated users now go directly to login page")
    print("- Added proper redirect parameter to return to app after login")
    print("- Increased auth sync timing for better reliability")
    print("\nThe login loop should now be resolved!")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")