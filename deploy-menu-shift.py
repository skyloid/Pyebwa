#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

try:
    # Connect to FTP
    print(f"Connecting to FTP server {FTP_HOST}...")
    ftp = ftplib.FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    print("Connected successfully!")
    
    # Upload styles.css
    ftp.cwd(FTP_DIR)
    with open('pyebwa.com/css/styles.css', 'rb') as f:
        ftp.storbinary('STOR css/styles.css', f)
    print("✓ styles.css uploaded successfully!")
    
    # Close connection
    ftp.quit()
    
    print("\n✅ Menu shift deployed!")
    print("\nKey changes:")
    print("- Added 100px left margin to nav-menu on desktop")
    print("- Reset margin to 0 on mobile devices")
    print("- Menu now appears 100px to the right on desktop only")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")