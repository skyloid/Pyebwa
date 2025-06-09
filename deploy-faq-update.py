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
    
    # Upload contact.html
    ftp.cwd(FTP_DIR)
    with open('pyebwa.com/contact.html', 'rb') as f:
        ftp.storbinary('STOR contact.html', f)
    print("✓ contact.html uploaded successfully!")
    
    # Close connection
    ftp.quit()
    
    print("\n✅ FAQ update deployed!")
    print("\nKey changes:")
    print("- Added emphasis that family trees are completely private")
    print("- Clarified that only invited family members can access")
    print("- Highlighted bank-level encryption")
    print("- Emphasized user control over access")
    print("- Stated clearly: never public, never shared with third parties")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")