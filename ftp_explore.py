#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = r"3!xuk?tkj]L$$Q>A"

def explore_ftp():
    try:
        # Connect to FTP server
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print(f"✓ Connected to {FTP_HOST}")
        
        # Get current directory
        current_dir = ftp.pwd()
        print(f"\nCurrent directory: {current_dir}")
        
        # List directory contents
        print("\nDirectory listing:")
        ftp.retrlines('LIST')
        
        # Try to find the public directory
        print("\n\nLooking for domains directory...")
        try:
            ftp.cwd("domains")
            print("✓ Changed to domains directory")
            print("\nContents of domains:")
            ftp.retrlines('LIST')
            
            # Try pyebwa.com
            try:
                ftp.cwd("pyebwa.com")
                print("\n✓ Changed to pyebwa.com directory")
                print("\nContents of pyebwa.com:")
                ftp.retrlines('LIST')
            except:
                print("✗ Could not change to pyebwa.com")
                
        except:
            print("✗ No domains directory found")
        
        ftp.quit()
        
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    explore_ftp()