#!/usr/bin/env python3
"""
Deploy member display fix to rasin.pyebwa.com
"""

import ftplib
import os
from pathlib import Path

# FTP configuration
FTP_HOST = "pyebwa.com"
FTP_USER = "pyebwa"
FTP_PASS = "!kxy38H%gH#qr2B"

def upload_file(ftp, local_path, remote_path):
    """Upload a single file to FTP server"""
    try:
        # Ensure directory exists
        remote_dir = os.path.dirname(remote_path)
        if remote_dir:
            try:
                ftp.cwd(remote_dir)
            except:
                # Create directory if it doesn't exist
                dirs = remote_dir.split('/')
                for i in range(len(dirs)):
                    dir_path = '/'.join(dirs[:i+1])
                    if dir_path:
                        try:
                            ftp.mkd(dir_path)
                        except:
                            pass
                ftp.cwd(remote_dir)
        
        # Upload file
        with open(local_path, 'rb') as f:
            ftp.storbinary(f'STOR {os.path.basename(remote_path)}', f)
        
        print(f"✅ Uploaded: {remote_path}")
        
        # Go back to root
        ftp.cwd('/')
        
    except Exception as e:
        print(f"❌ Failed to upload {remote_path}: {str(e)}")

def main():
    print("Deploying member display fix to rasin.pyebwa.com...")
    
    # Files to upload
    files_to_upload = [
        ('app/js/app.js', 'public_html/rasin.pyebwa.com/app/js/app.js'),
        ('debug-members.html', 'public_html/rasin.pyebwa.com/debug-members.html'),
    ]
    
    try:
        # Connect to FTP
        print(f"Connecting to {FTP_HOST}...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("✅ Connected to FTP server")
        
        # Upload files
        for local_file, remote_file in files_to_upload:
            if os.path.exists(local_file):
                upload_file(ftp, local_file, remote_file)
            else:
                print(f"❌ Local file not found: {local_file}")
        
        # Close FTP connection
        ftp.quit()
        print("\n✅ Deployment complete!")
        
        print("\n📝 Next steps:")
        print("1. Deploy Firestore rules using: ./deploy-firestore-fix.sh")
        print("2. Visit: https://rasin.pyebwa.com/debug-members.html")
        print("3. Check the browser console when loading the app")
        print("4. Run window.debugFirestore() in the console for detailed debugging")
        
    except Exception as e:
        print(f"❌ Deployment failed: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())