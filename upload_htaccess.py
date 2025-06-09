#!/usr/bin/env python3
import ftplib
from pathlib import Path

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
    
    # Change to the target directory
    ftp.cwd(FTP_DIR)
    
    # Upload .htaccess
    local_file = 'pyebwa.com/.htaccess'
    print(f"Uploading {local_file}...")
    with open(local_file, 'rb') as f:
        ftp.storbinary('STOR .htaccess', f)
    print("✓ .htaccess uploaded successfully!")
    
    # Close connection
    ftp.quit()
    print("\nRedirect loop issue should be fixed now!")
    print("Clear your browser cache and try again.")
    
except Exception as e:
    print(f"Error: {e}")