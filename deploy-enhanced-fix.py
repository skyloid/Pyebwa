#!/usr/bin/env python3
import ftplib
import os

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
    
    # Navigate to public_html
    ftp.cwd(FTP_DIR)
    
    # Upload updated files
    files_to_upload = [
        ('app/index.html', 'app/index.html'),
        ('app/js/app.js', 'app/js/app.js'),
        ('app/debug-auth.html', 'app/debug-auth.html'),
        ('app/test-auth.html', 'app/test-auth.html')
    ]
    
    for local_file, remote_file in files_to_upload:
        if os.path.exists(local_file):
            with open(local_file, 'rb') as f:
                ftp.storbinary(f'STOR {remote_file}', f)
            print(f"✓ Uploaded: {remote_file}")
        else:
            print(f"✗ File not found: {local_file}")
    
    # Close connection
    ftp.quit()
    
    print("\n✅ Enhanced login fix deployed!")
    print("\nKey improvements:")
    print("- Added redirect loop prevention (max 2 attempts)")
    print("- Updated cache busting to force reload")
    print("- Added debug tools for troubleshooting")
    print("\nTo test:")
    print("1. Clear browser cache completely")
    print("2. Visit rasin.pyebwa.com/app/test-auth.html")
    print("3. If issues persist, visit rasin.pyebwa.com/app/debug-auth.html")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")