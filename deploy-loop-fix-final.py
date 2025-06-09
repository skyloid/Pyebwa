#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

files_to_upload = [
    ('app/js/app.js', 'app/js/app.js'),
    ('app/js/app-loop-fix.js', 'app/js/app-loop-fix.js'),
    ('app/index.html', 'app/index.html'),
    ('test-auth-loop-fix.html', 'test-auth-loop-fix.html')
]

def upload_file(ftp, local_path, remote_path):
    """Upload a single file"""
    try:
        # Create directory structure if needed
        if '/' in remote_path:
            parts = remote_path.split('/')
            for i in range(1, len(parts)):
                partial_path = '/'.join(parts[:i])
                if partial_path:
                    try:
                        ftp.mkd(partial_path)
                    except:
                        pass  # Directory might already exist
        
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
    
    print("\n✅ Authentication loop fix deployed!")
    print("\nKey fixes:")
    print("1. Increased auth sync timeout from 5 to 10 seconds")
    print("2. Added app-loop-fix.js for emergency loop prevention")
    print("3. Better redirect count management (stops at 3 attempts)")
    print("4. Emergency stop button appears if loops detected")
    print("\nTest the fix at:")
    print("- https://rasin.pyebwa.com/test-auth-loop-fix.html")
    print("\nIf you still experience loops:")
    print("1. Clear all browser data (cookies, localStorage, sessionStorage)")
    print("2. Try again from https://pyebwa.com")
    print("3. Use the emergency stop button if it appears")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")