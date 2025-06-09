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
    
    print("\n✅ Caribbean forest slideshow deployed!")
    print("\nUpdated slideshow features:")
    print("- Tropical palm trees typical of Caribbean beaches")
    print("- Caribbean mangrove forests")
    print("- Tropical rainforest with native palm species")
    print("- Caribbean coastal forest vegetation")
    print("- Tropical mountain forest (like Haiti's mountainous regions)")
    print("\nAll images now show vegetation native to the Caribbean region!")
    print("These represent the types of trees and forests that would naturally grow in Haiti.")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")