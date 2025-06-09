#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

files_to_upload = [
    ('pyebwa.com/index.html', 'index.html'),
    ('pyebwa.com/js/app.js', 'js/app.js'),
    ('pyebwa.com/css/styles.css', 'css/styles.css')
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

try:
    # Connect to FTP
    print(f"Connecting to FTP server {FTP_HOST}...")
    ftp = ftplib.FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    print("Connected successfully!")
    
    # Change to public_html directory
    ftp.cwd(FTP_DIR)
    
    # Upload each file
    success_count = 0
    for local_file, remote_file in files_to_upload:
        if upload_file(ftp, local_file, remote_file):
            success_count += 1
    
    print(f'\n✓ Successfully uploaded {success_count}/{len(files_to_upload)} files')
    
    # Close connection
    ftp.quit()
    
    print("\n✅ Duplicate buttons fix deployed!")
    print("\nKey changes:")
    print("- Removed duplicate login/signup buttons from index.html")
    print("- Consolidated to single set of buttons in nav-menu")
    print("- Removed mobile-specific button event listeners")
    print("- Added proper desktop styling for nav-buttons")
    print("- Consistent navigation structure across all pages")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")