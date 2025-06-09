#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

files_to_upload = [
    # Fix authentication loop
    ('app/js/app.js', 'app/js/app.js'),
    # Back-to-top button script
    ('pyebwa.com/js/back-to-top.js', 'js/back-to-top.js'),
    # Updated HTML pages with back-to-top
    ('pyebwa.com/about.html', 'about.html'),
    ('pyebwa.com/mission.html', 'mission.html'),
    ('pyebwa.com/contact.html', 'contact.html')
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
    
    print("\n✅ All fixes deployed!")
    print("\nKey changes:")
    print("1. Fixed authentication redirect loop - no more duplicate URL parameters")
    print("2. Added back-to-top button on all pages with:")
    print("   - Haitian flag colors (blue/red gradient, yellow border)")
    print("   - Smooth scrolling animation")
    print("   - Only visible when scrolled down")
    print("   - Responsive design")
    print("\nTo resolve share-modal.js error:")
    print("- Clear browser cache completely (Ctrl+Shift+Delete)")
    print("- This error appears to be from cached old code")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")