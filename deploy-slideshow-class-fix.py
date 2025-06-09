#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

files_to_upload = [
    ('pyebwa.com/mission.html', 'mission.html'),
    ('pyebwa.com/slideshow-debug.html', 'slideshow-debug.html'),
    ('pyebwa.com/mission-slideshow-fix.html', 'mission-slideshow-fix.html')
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
    print("\nThe issue was:")
    print("- CSS was looking for class 'slideshow-container'")
    print("- HTML was using class 'forest-slideshow'")
    print("- Fixed by changing HTML to use 'slideshow-container'")
    print("\nThe slideshow should now be visible with Caribbean forest images!")
    print("\nDebug tools:")
    print("- /slideshow-debug.html - Shows detailed diagnostics")
    print("- /mission-slideshow-fix.html - Working version for comparison")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")