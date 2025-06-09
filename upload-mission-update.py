#!/usr/bin/env python3
import ftplib

# FTP credentials for www.pyebwa.com
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
    
    # Upload mission.html
    ftp.cwd(FTP_DIR)
    with open('pyebwa.com/mission.html', 'rb') as f:
        ftp.storbinary('STOR mission.html', f)
    print("✓ mission.html uploaded successfully!")
    
    # Close connection
    ftp.quit()
    
    print("\n✅ Mission page updated successfully!")
    print("\nChanges made:")
    print("- Removed connection between family trees and tree planting")
    print("- Added 'Our Environmental Commitment' section")
    print("- Clarified this is a standalone initiative")
    print("- Updated call-to-action buttons")
    print("- Changed 'How It Works' to focus on partnerships and monitoring")
    print("\nThe One Billion Trees mission is now presented as a separate")
    print("environmental initiative, not tied to the family tree platform.")
    
except Exception as e:
    print(f"❌ Error: {e}")