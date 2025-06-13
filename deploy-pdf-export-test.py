#!/usr/bin/env python3
"""Deploy PDF export test files to FTP server."""

import ftplib
import os
from pathlib import Path

# FTP credentials
FTP_HOST = "rasin.pyebwa.com"
FTP_USER = "u634138197.rasin"
FTP_PASS = "@Rasin2024$!"

def upload_file(ftp, local_path, remote_path):
    """Upload a single file to FTP server."""
    print(f"Uploading {local_path} to {remote_path}")
    try:
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {remote_path}', file)
        print(f"✓ Successfully uploaded {remote_path}")
    except Exception as e:
        print(f"✗ Error uploading {remote_path}: {e}")
        raise

def ensure_directory(ftp, directory):
    """Ensure directory exists on FTP server."""
    try:
        ftp.cwd(directory)
    except:
        # Directory doesn't exist, try to go to parent first
        parent = str(Path(directory).parent)
        if parent != '.' and parent != '/':
            ensure_directory(ftp, parent)
        
        # Now create the directory
        try:
            ftp.mkd(directory)
            print(f"Created directory: {directory}")
        except ftplib.error_perm:
            # Directory might already exist
            pass
        ftp.cwd(directory)

def main():
    print("Connecting to FTP server...")
    
    # Create FTP connection
    ftp = ftplib.FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    print("✓ Connected to FTP server")
    
    # Change to public_html directory
    ftp.cwd('/home/u634138197/domains/rasin.pyebwa.com/public_html')
    
    # Files to upload
    files_to_upload = [
        # Test page
        ('test-pdf-export.html', 'test-pdf-export.html'),
        
        # JavaScript files that were updated
        ('app/js/pdf-export.js', 'app/js/pdf-export.js'),
        ('app/js/share-modal.js', 'app/js/share-modal.js'),
        
        # SVG logo
        ('app/images/pyebwa-logo.svg', 'app/images/pyebwa-logo.svg'),
    ]
    
    # Upload files
    for local_file, remote_file in files_to_upload:
        local_path = f"/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/{local_file}"
        
        # Ensure directory exists
        remote_dir = str(Path(remote_file).parent)
        if remote_dir != '.':
            ensure_directory(ftp, f'/home/u634138197/domains/rasin.pyebwa.com/public_html/{remote_dir}')
            ftp.cwd('/home/u634138197/domains/rasin.pyebwa.com/public_html')
        
        # Upload file
        upload_file(ftp, local_path, remote_file)
    
    # Close connection
    ftp.quit()
    print("\n✓ All files uploaded successfully!")
    print("\nTest the PDF export at: https://rasin.pyebwa.com/test-pdf-export.html")

if __name__ == "__main__":
    main()