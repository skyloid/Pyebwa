#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = r"3!xuk?tkj]L$$Q>A"

def upload_files():
    try:
        # Connect to FTP server
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print(f"✓ Connected to {FTP_HOST}")
        
        # Upload dashboard.html
        with open('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/dashboard.html', 'rb') as f:
            ftp.storbinary('STOR dashboard.html', f)
        print("✓ Uploaded dashboard.html")
        
        # Navigate to js directory and update app.js
        ftp.cwd("js")
        with open('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/app.js', 'rb') as f:
            ftp.storbinary('STOR app.js', f)
        print("✓ Updated app.js with new redirect URLs")
        
        ftp.quit()
        print("\n✅ All files uploaded successfully!")
        print("\nUsers will now be redirected to /dashboard.html after login/signup")
        
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    upload_files()