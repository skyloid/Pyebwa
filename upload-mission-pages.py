#!/usr/bin/env python3
import ftplib
from pathlib import Path

# FTP credentials for www.pyebwa.com
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

def upload_files():
    try:
        # Connect to FTP
        print(f"Connecting to FTP server {FTP_HOST}...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("Connected successfully!")
        
        # Files to upload
        files_to_upload = [
            ('pyebwa.com/mission.html', 'mission.html'),
            ('pyebwa.com/index.html', 'index.html'),
            ('pyebwa.com/about.html', 'about.html'),
            ('pyebwa.com/contact.html', 'contact.html')
        ]
        
        for local_file, remote_file in files_to_upload:
            print(f"\nUploading {local_file}...")
            
            # Navigate to the correct directory
            ftp.cwd(FTP_DIR)
            
            # Upload the file
            with open(local_file, 'rb') as f:
                ftp.storbinary(f'STOR {remote_file}', f)
            print(f"✓ {remote_file} uploaded successfully!")
        
        # Close connection
        ftp.quit()
        
        print("\n✅ All files uploaded successfully!")
        print("\nNew mission page available at:")
        print("- https://pyebwa.com/mission.html")
        print("\nNavigation updated on all pages to include 'Our Mission' link.")
        print("\nThe mission page features:")
        print("- One Billion Trees goal")
        print("- Live counter showing 100,000 trees planted")
        print("- Environmental impact statistics")
        print("- How it works section")
        print("- Partnership information")
        print("- Interactive tree planting visualization")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    upload_files()