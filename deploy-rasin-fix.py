#!/usr/bin/env python3
"""
Deploy member display fix to rasin.pyebwa.com
"""

import ftplib
import os

# FTP configuration - Updated credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"  
FTP_PASS = "~3jB~XmCbjO>K2VY"

def upload_file(ftp, local_path, remote_path):
    """Upload a single file"""
    try:
        with open(local_path, 'rb') as f:
            ftp.storbinary(f'STOR {remote_path}', f)
        print(f"✅ Uploaded: {remote_path}")
        return True
    except Exception as e:
        print(f"❌ Failed to upload {remote_path}: {str(e)}")
        return False

def main():
    print("Deploying member display fix to rasin.pyebwa.com...")
    
    try:
        # Connect to FTP
        print(f"Connecting to {FTP_HOST}...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("✅ Connected to FTP server")
        
        # Navigate to public_html (rasin subdomain is in the same directory)
        ftp.cwd('/public_html')
        
        # Upload app.js
        print("\nUploading app.js...")
        ftp.cwd('app/js')
        if upload_file(ftp, 'app/js/app.js', 'app.js'):
            print("✅ app.js updated with enhanced debugging")
        
        # Go back to public_html root
        ftp.cwd('/public_html')
        
        # Upload debug page
        print("\nUploading debug-members.html...")
        if upload_file(ftp, 'debug-members.html', 'debug-members.html'):
            print("✅ Debug page uploaded")
        
        # Close connection
        ftp.quit()
        print("\n✅ Deployment complete!")
        
        print("\n📋 Summary of changes:")
        print("1. Enhanced debug logging in loadFamilyMembers()")
        print("2. Added fallback for members query without orderBy")
        print("3. Created debug page at /debug-members.html")
        print("4. Added window.debugFirestore() function")
        
        print("\n🚀 Next steps:")
        print("1. Deploy Firestore rules: firebase deploy --only firestore:rules")
        print("2. Visit: https://rasin.pyebwa.com/debug-members.html")
        print("3. Check browser console in the main app")
        print("4. Run window.debugFirestore() in console")
        
    except Exception as e:
        print(f"❌ Deployment failed: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())