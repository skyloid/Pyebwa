#!/usr/bin/env python3
"""
Deploy fixes for app paths to use absolute URLs
"""

import ftplib
import os
from datetime import datetime

# FTP credentials
FTP_HOST = "pyebwa.com"
FTP_USER = "pyebwa"
FTP_PASS = "Haiti2019$"

def upload_file(ftp, local_path, remote_path):
    """Upload a single file to FTP server"""
    try:
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {remote_path}', file)
        print(f"✓ Uploaded: {remote_path}")
        return True
    except Exception as e:
        print(f"✗ Error uploading {remote_path}: {str(e)}")
        return False

def main():
    print(f"\n=== Deploying App Path Fixes - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    
    try:
        # Connect to FTP
        print("Connecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected to FTP server\n")
        
        # Change to htdocs directory
        ftp.cwd('/htdocs')
        
        # Files to upload
        files_to_upload = [
            # Fixed app index with absolute paths
            ('app/index.html', 'app/index.html'),
            # Login page with homepage button
            ('login/index.html', 'login/index.html'),
            # Test page
            ('test-single-domain-auth.html', 'test-single-domain-auth.html'),
        ]
        
        # Upload each file
        success_count = 0
        for local_file, remote_file in files_to_upload:
            if upload_file(ftp, local_file, remote_file):
                success_count += 1
        
        print(f"\n✓ Successfully uploaded {success_count}/{len(files_to_upload)} files")
        
        # Close FTP connection
        ftp.quit()
        print("\n✓ FTP connection closed")
        
        print("\n=== Deployment Complete ===")
        print("\nThe app should now load with proper styling at:")
        print("- https://rasin.pyebwa.com/app/")
        print("\nLogin page available at:")
        print("- https://rasin.pyebwa.com/login/")
        print("\nTest page available at:")
        print("- https://rasin.pyebwa.com/test-single-domain-auth.html")
        
    except Exception as e:
        print(f"\n✗ Deployment failed: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())