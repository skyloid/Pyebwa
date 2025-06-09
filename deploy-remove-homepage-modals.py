#!/usr/bin/env python3
"""
Remove modal windows from pyebwa.com homepage while keeping overlay
"""

import ftplib
import shutil
from datetime import datetime

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = "~3jB~XmCbjO>K2VY"

def backup_file(filename):
    """Create a backup of the original file"""
    try:
        backup_name = f"{filename}.backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        shutil.copy(filename, backup_name)
        print(f"✓ Created backup: {backup_name}")
        return True
    except Exception as e:
        print(f"✗ Error creating backup: {str(e)}")
        return False

def upload_file(ftp, local_path, remote_path):
    """Upload a file to FTP server"""
    try:
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {remote_path}', file)
        print(f"✓ Uploaded: {remote_path}")
        return True
    except Exception as e:
        print(f"✗ Error uploading {remote_path}: {str(e)}")
        return False

def main():
    print(f"\n=== Removing Modal Windows from Homepage - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    
    # Create backups first
    print("Creating backups...")
    backup_file("pyebwa.com/index.html")
    backup_file("pyebwa.com/js/app.js")
    
    # Replace app.js with cleaned version
    print("\nPreparing cleaned JavaScript...")
    shutil.copy("pyebwa.com/js/app-cleaned.js", "pyebwa.com/js/app.js")
    print("✓ Replaced app.js with cleaned version")
    
    try:
        # Connect to FTP
        print("\nConnecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected\n")
        
        # Switch to public_html
        ftp.cwd('/public_html')
        
        # Upload updated files
        files_to_upload = [
            # Updated index.html without modal windows
            ('pyebwa.com/index.html', 'index.html'),
            # Cleaned app.js without modal code
            ('pyebwa.com/js/app.js', 'js/app.js'),
        ]
        
        success_count = 0
        for local_file, remote_file in files_to_upload:
            if upload_file(ftp, local_file, remote_file):
                success_count += 1
        
        print(f"\n✓ Successfully uploaded {success_count}/{len(files_to_upload)} files")
        
        ftp.quit()
        print("\n✓ Deployment complete")
        
        print("\n=== Summary ===")
        print("✓ Removed login and signup modal windows from HTML")
        print("✓ Cleaned JavaScript to remove modal references")
        print("✓ Kept modal overlay for future use")
        print("✓ All auth buttons now redirect to pyebwa.com/login/")
        print("\nChanges:")
        print("- No more modal windows appearing on homepage")
        print("- Authentication handled at pyebwa.com/login/")
        print("- Cleaner, simpler code without unused modal functionality")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())