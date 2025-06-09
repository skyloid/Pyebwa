#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = r"3!xuk?tkj]L$$Q>A"

def upload_test():
    try:
        # Connect to FTP server
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print(f"✓ Connected to {FTP_HOST}")
        
        # Upload test file to root
        with open('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/test.html', 'rb') as f:
            ftp.storbinary('STOR test.html', f)
        print("✓ Uploaded test.html to root")
        
        # Also check what's already there
        print("\nCurrent files:")
        ftp.retrlines('LIST *.html')
        
        ftp.quit()
        
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    upload_test()