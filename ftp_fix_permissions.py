#!/usr/bin/env python3
import ftplib

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = r"3!xuk?tkj]L$$Q>A"

def fix_permissions():
    try:
        # Connect to FTP server
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print(f"✓ Connected to {FTP_HOST}")
        
        # Try to fix permissions
        try:
            # Fix directory permissions (755)
            ftp.sendcmd('SITE CHMOD 755 css')
            print("✓ Fixed permissions for css directory")
            
            ftp.sendcmd('SITE CHMOD 755 js')
            print("✓ Fixed permissions for js directory")
            
            ftp.sendcmd('SITE CHMOD 755 images')
            print("✓ Fixed permissions for images directory")
            
            ftp.sendcmd('SITE CHMOD 755 locales')
            print("✓ Fixed permissions for locales directory")
            
        except Exception as e:
            print(f"Error fixing permissions: {e}")
        
        ftp.quit()
        
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    fix_permissions()