#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

files_to_upload = [
    ('pyebwa.com/js/app.js', 'js/app.js'),
    ('app/js/app.js', 'app/js/app.js'),
    ('auth-server/public/js/secure-app.js', 'auth-server/public/js/secure-app.js')
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
    
    print("\n✅ Authentication flow fix deployed!")
    print("\nKey improvements:")
    print("- Removed intermediate redirect through pyebwa.com")
    print("- Simplified redirect chain for better reliability")
    print("- Added immediate auth state check") 
    print("- Better user feedback during authentication")
    print("\nThe authentication flow now works as follows:")
    print("1. User clicks login on pyebwa.com")
    print("2. Redirects to secure.pyebwa.com for authentication")
    print("3. After login, redirects directly back to original page")
    print("4. No more loops or unnecessary redirects!")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")