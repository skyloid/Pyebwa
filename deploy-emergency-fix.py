#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

files_to_upload = [
    ('app/js/auth-emergency-fix.js', 'app/js/auth-emergency-fix.js'),
    ('app/index.html', 'app/index.html'),
    ('fix-auth-loop.html', 'fix-auth-loop.html')
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
    
    print("\n🚨 EMERGENCY FIX DEPLOYED! 🚨")
    print("\nThis fix includes:")
    print("1. Aggressive loop detection (stops after 2 seconds)")
    print("2. Redirect interception and blocking")
    print("3. Emergency UI that takes over when loop detected")
    print("4. Manual fix page for users")
    print("\n📍 Direct users to this page if they're stuck:")
    print("   https://rasin.pyebwa.com/fix-auth-loop.html")
    print("\nThe emergency fix will:")
    print("- Detect loops within 2 seconds")
    print("- Show emergency UI with fix options")
    print("- Block all redirects when loop detected")
    print("- Show green shield indicator when protection is active")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")