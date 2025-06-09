#!/usr/bin/env python3
import ftplib
import os
from pathlib import Path

# FTP Connection details
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

# Files to upload
files_to_upload = [
    ('pyebwa.com/index.html', 'index.html'),
    ('pyebwa.com/about.html', 'about.html'),
    ('pyebwa.com/contact.html', 'contact.html'),
    ('pyebwa.com/mission.html', 'mission.html'),
    ('pyebwa.com/css/styles.css', 'css/styles.css'),
    ('pyebwa.com/css/mobile.css', 'css/mobile.css'),
    ('pyebwa.com/js/app.js', 'js/app.js')
]

def upload_file(ftp, local_path, remote_path):
    """Upload a single file"""
    try:
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {remote_path}', file)
        print(f'✓ Uploaded: {remote_path}')
        return True
    except Exception as e:
        print(f'✗ Failed to upload {remote_path}: {str(e)}')
        return False

def main():
    print('Connecting to FTP server...')
    
    try:
        # Connect to FTP
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print(f'✓ Connected to {FTP_HOST}')
        
        # Change to public_html directory
        ftp.cwd(FTP_DIR)
        print('✓ Changed to public_html directory')
        
        # Upload each file
        success_count = 0
        for local_file, remote_file in files_to_upload:
            if upload_file(ftp, local_file, remote_file):
                success_count += 1
        
        print(f'\n✓ Successfully uploaded {success_count}/{len(files_to_upload)} files')
        
        # Close connection
        ftp.quit()
        print('✓ Disconnected from FTP server')
        
    except Exception as e:
        print(f'✗ Error: {str(e)}')
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())