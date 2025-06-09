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
    
    # Change to public_html directory
    ftp.cwd(FTP_DIR)
    
    # Upload mission.html
    with open('pyebwa.com/mission.html', 'rb') as f:
        ftp.storbinary('STOR mission.html', f)
    print("✓ mission.html uploaded successfully!")
    
    # Close connection
    ftp.quit()
    
    print("\n✅ Icons removed from mission page!")
    print("\nChanges:")
    print("- Removed the Haitian flag emoji (🇭🇹)")
    print("- Removed the tree emoji (🌳)")
    print("- Clean hero section with just title and subtitle")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")