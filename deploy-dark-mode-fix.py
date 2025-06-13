#!/usr/bin/env python3
import ftplib
import os
from pathlib import Path

# FTP credentials from environment or defaults
FTP_HOST = os.getenv('FTP_HOST', 'ftp.pyebwa.com')
FTP_USER = os.getenv('FTP_USER', 'pyebwa') 
FTP_PASS = os.getenv('FTP_PASS', 'Boston2013')

def upload_file(ftp, local_path, remote_path):
    """Upload a single file to FTP server"""
    try:
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {os.path.basename(remote_path)}', file)
        print(f"✓ Uploaded: {remote_path}")
    except Exception as e:
        print(f"✗ Failed to upload {remote_path}: {e}")

def main():
    print("Deploying Dark Mode Header Fix...")
    print("-" * 50)
    
    try:
        # Connect to FTP
        print(f"Connecting to {FTP_HOST}...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ FTP connection established")
        
        # Files to upload
        files_to_upload = [
            ('app/css/app-modern.css', '/htdocs/rasin.pyebwa.com/app/css/app-modern.css'),
            ('app/index.html', '/htdocs/rasin.pyebwa.com/app/index.html'),
            ('test-dark-mode-header.html', '/htdocs/rasin.pyebwa.com/test-dark-mode-header.html')
        ]
        
        for local, remote in files_to_upload:
            if os.path.exists(local):
                # Navigate to directory
                remote_dir = os.path.dirname(remote)
                try:
                    ftp.cwd(remote_dir)
                except:
                    print(f"Creating directory: {remote_dir}")
                    ftp.mkd(remote_dir)
                    ftp.cwd(remote_dir)
                
                # Upload file
                upload_file(ftp, local, remote)
            else:
                print(f"✗ File not found: {local}")
        
        # Close connection
        ftp.quit()
        print("\n✓ Deployment complete!")
        print("\nTest the dark mode header at:")
        print("https://rasin.pyebwa.com/test-dark-mode-header.html")
        
    except Exception as e:
        print(f"\n✗ Deployment failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())