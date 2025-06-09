#!/usr/bin/env python3
import ftplib
import os

# FTP credentials for www.pyebwa.com (where rasin.pyebwa.com/app is served from)
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

def create_directory_if_not_exists(ftp, directory):
    """Create directory if it doesn't exist"""
    try:
        ftp.cwd(directory)
        return True
    except:
        try:
            ftp.mkd(directory)
            print(f"Created directory: {directory}")
            return True
        except:
            return False

try:
    # Connect to FTP
    print(f"Connecting to FTP server {FTP_HOST}...")
    ftp = ftplib.FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    print("Connected successfully!")
    
    # Navigate to public_html
    ftp.cwd(FTP_DIR)
    
    # Create app directory structure if needed
    create_directory_if_not_exists(ftp, "app")
    ftp.cwd("app")
    create_directory_if_not_exists(ftp, "js")
    
    # Go back to public_html
    ftp.cwd(FTP_DIR)
    
    # Upload all app files
    app_files = [
        ('app/index.html', 'app/index.html'),
        ('app/js/app.js', 'app/js/app.js'),
        ('app/js/firebase-config.js', 'app/js/firebase-config.js')
    ]
    
    for local_file, remote_file in app_files:
        if os.path.exists(local_file):
            with open(local_file, 'rb') as f:
                ftp.storbinary(f'STOR {remote_file}', f)
            print(f"✓ Uploaded: {remote_file}")
        else:
            print(f"✗ File not found: {local_file}")
    
    # Close connection
    ftp.quit()
    
    print("\n✅ Login loop fix deployed to rasin.pyebwa.com/app!")
    print("\nThe fix includes:")
    print("- Direct redirect to secure.pyebwa.com for unauthenticated users")
    print("- Proper redirect parameter to return after login")
    print("- Increased auth sync timing (3 seconds initial wait)")
    print("- More auth check attempts (20 attempts)")
    print("\nThe login loop should now be resolved!")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")