#!/usr/bin/env python3
import ftplib
import sys

try:
    ftp = ftplib.FTP('pyebwa.com')
    ftp.login('pyebwa', 'Haiti2019$')
    ftp.cwd('/htdocs')
    
    # Upload app/index.html
    with open('app/index.html', 'rb') as f:
        ftp.storbinary('STOR app/index.html', f)
    print("✓ Uploaded app/index.html")
    
    # Upload login/index.html
    with open('login/index.html', 'rb') as f:
        ftp.storbinary('STOR login/index.html', f)
    print("✓ Uploaded login/index.html")
    
    ftp.quit()
    print("\n✓ Done! The app should now load with proper styling.")
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)