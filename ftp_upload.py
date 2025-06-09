#!/usr/bin/env python3
import ftplib
import os
import sys

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = r"3!xuk?tkj]L$$Q>A"  # Raw string to handle special characters
FTP_PATH = "/home/u316621955/domains/pyebwa.com"

# Local source directory
SOURCE_DIR = "/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com"

def upload_file(ftp, local_path, remote_path):
    """Upload a single file"""
    try:
        with open(local_path, 'rb') as f:
            ftp.storbinary(f'STOR {remote_path}', f)
        print(f"✓ Uploaded: {remote_path}")
        return True
    except Exception as e:
        print(f"✗ Failed to upload {remote_path}: {e}")
        return False

def create_directory(ftp, dirname):
    """Create directory if it doesn't exist"""
    try:
        ftp.mkd(dirname)
        print(f"✓ Created directory: {dirname}")
    except ftplib.error_perm as e:
        if "550" in str(e):  # Directory already exists
            print(f"  Directory already exists: {dirname}")
        else:
            print(f"✗ Failed to create directory {dirname}: {e}")

def main():
    print("Connecting to FTP server...")
    
    try:
        # Connect to FTP server
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print(f"✓ Connected to {FTP_HOST}")
        
        # We're already in public_html, no need to change directory
        current_dir = ftp.pwd()
        print(f"✓ Current directory: {current_dir}")
        
        # Upload index.html
        upload_file(ftp, f"{SOURCE_DIR}/index.html", "index.html")
        
        # Upload .htaccess
        if os.path.exists(f"{SOURCE_DIR}/.htaccess"):
            upload_file(ftp, f"{SOURCE_DIR}/.htaccess", ".htaccess")
        
        # Create and upload CSS files
        create_directory(ftp, "css")
        ftp.cwd("css")
        upload_file(ftp, f"{SOURCE_DIR}/css/styles.css", "styles.css")
        ftp.cwd("..")
        
        # Create and upload JS files
        create_directory(ftp, "js")
        ftp.cwd("js")
        upload_file(ftp, f"{SOURCE_DIR}/js/firebase-config.js", "firebase-config.js")
        upload_file(ftp, f"{SOURCE_DIR}/js/auth.js", "auth.js")
        upload_file(ftp, f"{SOURCE_DIR}/js/app.js", "app.js")
        ftp.cwd("..")
        
        # Create empty directories
        create_directory(ftp, "images")
        create_directory(ftp, "locales")
        
        # Close connection
        ftp.quit()
        print("\n✓ FTP upload completed successfully!")
        
    except Exception as e:
        print(f"\n✗ FTP Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()