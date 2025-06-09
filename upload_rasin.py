#!/usr/bin/env python3
import ftplib
import os

# FTP credentials for rasin.pyebwa.com
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.rasin'
FTP_PASS = 'R@sin2024!'
FTP_DIR = '/public_html/app'

try:
    # Connect to FTP
    print(f"Connecting to FTP server {FTP_HOST}...")
    ftp = ftplib.FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    print("Connected successfully!")
    
    # Change to the target directory
    ftp.cwd(FTP_DIR)
    print(f"Changed to directory: {FTP_DIR}")
    
    # Upload auth-bridge.html
    local_file = 'app/auth-bridge.html'
    if os.path.exists(local_file):
        print(f"Uploading {local_file}...")
        with open(local_file, 'rb') as f:
            ftp.storbinary('STOR auth-bridge.html', f)
        print("✓ auth-bridge.html uploaded successfully!")
    else:
        print(f"Error: {local_file} not found")
    
    # Upload updated app.js
    local_file = 'app/js/app.js'
    if os.path.exists(local_file):
        print(f"Uploading {local_file}...")
        with open(local_file, 'rb') as f:
            ftp.storbinary('STOR js/app.js', f)
        print("✓ app.js uploaded successfully!")
    
    # Upload firebase-config.js
    local_file = 'app/js/firebase-config.js'
    if os.path.exists(local_file):
        print(f"Uploading {local_file}...")
        with open(local_file, 'rb') as f:
            ftp.storbinary('STOR js/firebase-config.js', f)
        print("✓ firebase-config.js uploaded successfully!")
    
    # Close connection
    ftp.quit()
    print("\nAll files uploaded successfully!")
    
except Exception as e:
    print(f"Error: {e}")