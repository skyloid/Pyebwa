#!/usr/bin/env python3
import ftplib
import os

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = "3!xuk?tkj]L$Q>A"
FTP_DIR = "domains/pyebwa.com/public_html"

def upload_files():
    try:
        # Connect to FTP
        ftp = ftplib.FTP(FTP_HOST)
        print(f"Connected to {FTP_HOST}")
        
        # Login
        ftp.login(FTP_USER, FTP_PASS)
        print("Login successful")
        
        # Change to target directory
        ftp.cwd(FTP_DIR)
        print(f"Changed to directory: {FTP_DIR}")
        
        # Upload index.html
        os.chdir("/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com")
        with open("index.html", "rb") as file:
            ftp.storbinary("STOR index.html", file)
            print("Successfully uploaded index.html")
        
        # Close connection
        ftp.quit()
        print("Upload complete!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    upload_files()