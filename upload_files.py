#!/usr/bin/env python3
import ftplib
import os
from pathlib import Path

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

# Files to upload
FILES_TO_UPLOAD = [
    ('pyebwa.com/index.html', 'index.html'),
    ('pyebwa.com/css/styles.css', 'css/styles.css'),
    ('pyebwa.com/css/mobile.css', 'css/mobile.css'),
    ('pyebwa.com/js/app.js', 'js/app.js'),
    ('pyebwa.com/js/auth.js', 'js/auth.js'),
    ('pyebwa.com/js/auth-bridge.js', 'js/auth-bridge.js'),
]

def upload_files():
    try:
        # Connect to FTP
        print(f"Connecting to FTP server {FTP_HOST}...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("Connected successfully!")
        
        # Change to the target directory
        ftp.cwd(FTP_DIR)
        print(f"Changed to directory: {FTP_DIR}")
        
        # Upload each file
        for local_path, remote_path in FILES_TO_UPLOAD:
            local_file = Path(local_path)
            if not local_file.exists():
                print(f"Warning: {local_path} does not exist, skipping...")
                continue
                
            # Create directory if needed
            remote_dir = os.path.dirname(remote_path)
            if remote_dir:
                try:
                    ftp.cwd(remote_dir)
                    ftp.cwd('..')  # Go back to base directory
                except:
                    print(f"Creating directory: {remote_dir}")
                    ftp.mkd(remote_dir)
            
            # Upload file
            print(f"Uploading {local_path} to {remote_path}...")
            with open(local_path, 'rb') as f:
                ftp.storbinary(f'STOR {remote_path}', f)
            print(f"✓ Uploaded successfully!")
        
        # Close connection
        ftp.quit()
        print("\nAll files uploaded successfully!")
        print("The logo is now displayed at https://www.pyebwa.com")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    upload_files()