#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

files_to_upload = [
    # Updated mission page with slideshow
    ('pyebwa.com/mission.html', 'mission.html'),
    # Updated index page with back-to-top
    ('pyebwa.com/index.html', 'index.html')
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
    
    print("\n✅ Mission page slideshow deployed!")
    print("\nKey changes:")
    print("1. Replaced static image with beautiful forest slideshow")
    print("2. Added 5 high-quality forest images that rotate every 5 seconds")
    print("3. Smooth fade transitions between images")
    print("4. Blue overlay for better text readability")
    print("5. Added back-to-top button to index page")
    print("\nThe mission page now features:")
    print("- Rotating forest images in the hero section")
    print("- Professional photography showcasing lush forests")
    print("- Inspiring visuals for the reforestation mission")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")