#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'

try:
    # Connect to FTP
    print(f"Connecting to FTP server {FTP_HOST}...")
    ftp = ftplib.FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    print("Connected successfully!")
    
    # Get current directory
    print(f"\nCurrent directory: {ftp.pwd()}")
    
    # List directories
    print("\nListing directories:")
    ftp.dir()
    
    # Check images directory
    print("\n\nChecking images directory:")
    ftp.cwd('images')
    ftp.dir()
    
    # Check SlideShow directory
    print("\n\nChecking SlideShow directory:")
    ftp.cwd('SlideShow')
    ftp.dir()
    
    # Close connection
    ftp.quit()
    
except Exception as e:
    print(f"Error: {e}")