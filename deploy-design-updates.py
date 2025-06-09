#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

files_to_upload = [
    # JavaScript files with translation updates
    ('pyebwa.com/js/app.js', 'js/app.js'),
    ('pyebwa.com/js/language.js', 'js/language.js'),
    ('pyebwa.com/js/translations-pages.js', 'js/translations-pages.js'),
    # HTML pages with design updates
    ('pyebwa.com/about.html', 'about.html'),
    ('pyebwa.com/mission.html', 'mission.html'),
    ('pyebwa.com/contact.html', 'contact.html'),
    # Test page
    ('pyebwa.com/test-translations.html', 'test-translations.html')
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
    
    print("\n✅ Design and translation updates deployed!")
    print("\nKey changes:")
    print("1. All languages now show 'Technologies Humanitaires' in footer")
    print("2. Consistent Haitian flag colors across all pages:")
    print("   - Red: #D41125")
    print("   - Blue: #00217D") 
    print("   - Yellow: #FFC72C")
    print("3. Updated hero sections with gradients")
    print("4. Consistent navigation and footer styling")
    print("5. Test page available at /test-translations.html")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")