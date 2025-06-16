#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = "~3jB~XmCbjO>K2VY"

try:
    print("Connecting to FTP...")
    ftp = ftplib.FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    print("✓ Connected")
    
    # Check root
    print("\nRoot directory contents:")
    ftp.retrlines('LIST')
    
    # Try different paths
    paths_to_try = [
        '/public_html',
        '/domains',
        '/public_html/rasin.pyebwa.com',
        '/public_html/rasin',
        '/rasin.pyebwa.com',
        '/rasin'
    ]
    
    for path in paths_to_try:
        try:
            print(f"\nTrying path: {path}")
            ftp.cwd(path)
            print(f"✓ Success! Contents of {path}:")
            ftp.retrlines('LIST')
            break
        except Exception as e:
            print(f"✗ Failed: {e}")
    
    ftp.quit()
    
except Exception as e:
    print(f"Error: {e}")