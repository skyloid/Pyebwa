#!/usr/bin/env python3
import ftplib
import os

# FTP configuration
FTP_HOST = "pyebwa.com"
FTP_USER = "pyebwa"
FTP_PASS = "!kxy38H%gH#qr2B"

print("Deploying member display fix...")

try:
    # Connect to FTP
    ftp = ftplib.FTP_TLS(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    ftp.prot_p()  # Enable protection
    
    # Change to rasin subdomain directory
    ftp.cwd('public_html/rasin.pyebwa.com')
    
    # Upload app.js
    print("Uploading app.js...")
    ftp.cwd('app/js')
    with open('app/js/app.js', 'rb') as f:
        ftp.storbinary('STOR app.js', f)
    print("✅ app.js uploaded")
    
    # Upload debug page
    print("Uploading debug-members.html...")
    ftp.cwd('/public_html/rasin.pyebwa.com')
    with open('debug-members.html', 'rb') as f:
        ftp.storbinary('STOR debug-members.html', f)
    print("✅ debug-members.html uploaded")
    
    ftp.quit()
    print("\n✅ Deployment complete!")
    
except Exception as e:
    print(f"❌ Error: {e}")