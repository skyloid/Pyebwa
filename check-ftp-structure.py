#!/usr/bin/env python3
"""
Check FTP directory structure to understand where files should be placed
"""

import ftplib

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = "~3jB~XmCbjO>K2VY"

def check_directory(ftp, path):
    """Check contents of a directory"""
    try:
        ftp.cwd(path)
        print(f"\nContents of {path}:")
        print("-" * 50)
        files = []
        ftp.retrlines('LIST', files.append)
        for f in files:
            print(f)
        return True
    except Exception as e:
        print(f"\nError accessing {path}: {e}")
        return False

def main():
    print("=== Checking FTP Directory Structure ===\n")
    
    try:
        # Connect to FTP
        ftp = ftplib.FTP(FTP_HOST, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected to FTP\n")
        
        # Get current directory
        pwd = ftp.pwd()
        print(f"Current directory: {pwd}")
        
        # Check root
        check_directory(ftp, '/')
        
        # Check if we need to look in public_html or htdocs
        for possible_root in ['/public_html', '/htdocs', '/www', '/rasin.pyebwa.com']:
            if check_directory(ftp, possible_root):
                # Check login directory
                check_directory(ftp, f'{possible_root}/login')
                # Check app directory  
                check_directory(ftp, f'{possible_root}/app')
                break
        
        ftp.quit()
        print("\n✓ Done")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")

if __name__ == "__main__":
    main()