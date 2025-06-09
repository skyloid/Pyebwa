#!/usr/bin/env python3
import ftplib

# FTP credentials for www.pyebwa.com
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

try:
    # Connect to FTP
    print(f"Connecting to FTP server {FTP_HOST}...")
    ftp = ftplib.FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    print("Connected successfully!")
    
    # First upload the app directory structure if needed
    try:
        ftp.cwd(FTP_DIR)
        # Check if app directory exists, create if not
        try:
            ftp.cwd("app")
        except:
            ftp.mkd("app")
            ftp.cwd("app")
        
        # Check if js directory exists, create if not
        try:
            ftp.cwd("js")
        except:
            ftp.mkd("js")
            ftp.cwd("js")
    except Exception as e:
        print(f"Directory setup error: {e}")
        # Try alternative path
        ftp.cwd(FTP_DIR)
    
    # Upload app.js to the app/js directory
    remote_path = f"{FTP_DIR}/app/js"
    ftp.cwd(FTP_DIR)
    
    # Upload the file
    with open('app/js/app.js', 'rb') as f:
        ftp.storbinary('STOR app/js/app.js', f)
    print("✓ app.js uploaded successfully!")
    
    # Close connection
    ftp.quit()
    
    print("\n✅ Login loop fix deployed to production!")
    print("\nKey changes:")
    print("- Fixed redirect URL from 'www.pyebwa.com' to 'secure.pyebwa.com'")
    print("- Unauthenticated users now go directly to login page")
    print("- Added proper redirect parameter to return to app after login")
    print("- Increased auth sync timing for better reliability")
    print("\nTo test:")
    print("1. Clear browser cache/cookies")
    print("2. Visit rasin.pyebwa.com/app")
    print("3. Should redirect to secure.pyebwa.com for login")
    print("4. After login, should return to app without looping")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")