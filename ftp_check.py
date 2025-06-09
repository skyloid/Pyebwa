#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = r"3!xuk?tkj]L$$Q>A"

def check_files():
    try:
        # Connect to FTP server
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print(f"✓ Connected to {FTP_HOST}")
        
        # Get current directory
        current_dir = ftp.pwd()
        print(f"\nCurrent directory: {current_dir}")
        
        # List all files
        print("\nRoot directory contents:")
        ftp.retrlines('LIST')
        
        # Check css directory
        print("\n\nChecking css directory:")
        try:
            ftp.cwd("css")
            ftp.retrlines('LIST')
            ftp.cwd("..")
        except Exception as e:
            print(f"Error accessing css: {e}")
        
        # Check js directory
        print("\n\nChecking js directory:")
        try:
            ftp.cwd("js")
            ftp.retrlines('LIST')
            ftp.cwd("..")
        except Exception as e:
            print(f"Error accessing js: {e}")
        
        # Try to go up and check structure
        print("\n\nTrying parent directory:")
        try:
            ftp.cwd("..")
            print(f"Now in: {ftp.pwd()}")
            ftp.retrlines('LIST')
        except Exception as e:
            print(f"Cannot go to parent: {e}")
        
        ftp.quit()
        
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    check_files()