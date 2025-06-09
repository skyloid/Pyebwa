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
        
        # Upload files
        files_to_upload = [
            ('pyebwa.com/js/app.js', 'js/app.js'),
            ('pyebwa.com/.htaccess', '.htaccess')
        ]
        
        for local_file, remote_file in files_to_upload:
            print(f"\nUploading {local_file}...")
            
            # Navigate to the correct directory
            if '/' in remote_file:
                remote_dir = '/'.join(remote_file.split('/')[:-1])
                ftp.cwd(f"{FTP_DIR}/{remote_dir}")
                remote_filename = remote_file.split('/')[-1]
            else:
                ftp.cwd(FTP_DIR)
                remote_filename = remote_file
            
            # Upload the file
            with open(local_file, 'rb') as f:
                ftp.storbinary(f'STOR {remote_filename}', f)
            print(f"✓ {remote_file} uploaded successfully!")
        
        # Close connection
        ftp.quit()
        
        print("\n✅ All files uploaded successfully!")
        print("\nChanges deployed:")
        print("1. Authentication now redirects to https://secure.pyebwa.com (without port)")
        print("2. www.pyebwa.com now redirects to pyebwa.com")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    upload_files()