#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = r"3!xuk?tkj]L$$Q>A"

def explore_domains():
    try:
        # Connect to FTP server
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print(f"✓ Connected to {FTP_HOST}")
        
        # Go to root
        try:
            ftp.cwd("/")
            print(f"\nRoot directory: {ftp.pwd()}")
            ftp.retrlines('LIST')
            
            # Look for domains directory
            print("\n\nLooking for domains structure...")
            ftp.cwd("/home/u316621955")
            print(f"\nIn home directory: {ftp.pwd()}")
            ftp.retrlines('LIST')
            
            # Check if domains exists
            try:
                ftp.cwd("domains")
                print(f"\n\nIn domains directory: {ftp.pwd()}")
                ftp.retrlines('LIST')
                
                # Check for pyebwa.com
                try:
                    ftp.cwd("pyebwa.com")
                    print(f"\n\nIn pyebwa.com directory: {ftp.pwd()}")
                    ftp.retrlines('LIST')
                except:
                    print("\nNo pyebwa.com directory found")
                    
            except:
                print("\nNo domains directory found")
                
        except Exception as e:
            print(f"Error navigating: {e}")
        
        ftp.quit()
        
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    explore_domains()