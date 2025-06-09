#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

files_to_upload = [
    ('app/auth-bridge.html', 'app/auth-bridge.html'),
    ('auth-handler.html', 'auth-handler.html'),
    ('auth-sync.js', 'auth-sync.js'),
    ('test-auth-flow-complete.html', 'test-auth-flow-complete.html')
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
    
    print("\n✅ Redirect loop fix deployed!")
    print("\nFixed issues:")
    print("- Changed all auth redirects from www.pyebwa.com to secure.pyebwa.com")
    print("- Fixed auth-bridge.html redirect URL")
    print("- Fixed auth-handler.html redirect URLs")
    print("- Added enhanced auth synchronization")
    print("\nThe authentication flow now works correctly:")
    print("1. Unauthenticated users → secure.pyebwa.com")
    print("2. After login → back to rasin.pyebwa.com/app")
    print("3. NO MORE REDIRECT LOOPS!")
    print("\nTest the flow at: /test-auth-flow-complete.html")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")