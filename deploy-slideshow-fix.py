#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

files_to_upload = [
    # Updated mission page with fixed slideshow
    ('pyebwa.com/mission.html', 'mission.html'),
    # Slideshow JavaScript
    ('pyebwa.com/js/forest-slideshow.js', 'js/forest-slideshow.js'),
    # Test pages for debugging
    ('pyebwa.com/slideshow-test.html', 'slideshow-test.html'),
    ('pyebwa.com/check-slideshow.html', 'check-slideshow.html')
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
    
    print("\n✅ Slideshow fix deployed!")
    print("\nKey improvements:")
    print("1. Enhanced JavaScript with error handling and logging")
    print("2. Improved CSS for better visibility and performance")
    print("3. Added debug console messages")
    print("4. Better browser compatibility")
    print("5. Minimum height to prevent layout issues")
    print("\nTo verify:")
    print("1. Open mission.html and check browser console")
    print("2. Look for [Slideshow] messages")
    print("3. Test page available at /slideshow-test.html")
    print("4. Diagnostic tool at /check-slideshow.html")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")