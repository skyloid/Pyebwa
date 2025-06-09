#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = r"3!xuk?tkj]L$$Q>A"

def update_redirects():
    try:
        # Connect to FTP server
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print(f"✓ Connected to {FTP_HOST}")
        
        # Navigate to js directory
        ftp.cwd("js")
        print("✓ Changed to js directory")
        
        # Upload updated app.js
        with open('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/app.js', 'rb') as f:
            ftp.storbinary('STOR app.js', f)
        print("✓ Updated app.js with new redirect to rasin.pyebwa.com/app/")
        
        ftp.quit()
        print("\n✅ Redirect updated successfully!")
        print("Users will now be sent to the Pyebwa app after login/signup")
        
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    update_redirects()