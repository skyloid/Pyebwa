#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = r"3!xuk?tkj]L$$Q>A"

def update_html():
    try:
        # Connect to FTP server
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print(f"✓ Connected to {FTP_HOST}")
        
        # Upload updated index.html
        with open('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/index.html', 'rb') as f:
            ftp.storbinary('STOR index.html', f)
        print("✓ Updated index.html with cache-busting version tags")
        
        ftp.quit()
        print("\n✅ HTML updated successfully!")
        
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    update_html()