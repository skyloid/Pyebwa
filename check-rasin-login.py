#!/usr/bin/env python3
"""
Check if login directory exists on rasin.pyebwa.com
"""

import ftplib

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = "~3jB~XmCbjO>K2VY"

def check_subdomain_structure(ftp):
    """Check the subdomain directory structure"""
    try:
        # List directories in public_html
        print("\nChecking for rasin.pyebwa.com directory:")
        print("-" * 50)
        
        directories = []
        ftp.retrlines('LIST', lambda x: directories.append(x))
        
        for d in directories:
            if 'rasin' in d.lower():
                print(f"Found: {d}")
        
        # Try common subdomain paths
        possible_paths = [
            '/rasin.pyebwa.com',
            '/public_html/rasin.pyebwa.com',
            '/domains/rasin.pyebwa.com',
            '/subdomains/rasin'
        ]
        
        for path in possible_paths:
            try:
                ftp.cwd(path)
                print(f"\n✓ Found subdomain directory at: {path}")
                
                # Check contents
                print("\nContents:")
                ftp.retrlines('LIST')
                
                # Check for login directory
                try:
                    ftp.cwd('login')
                    print("\n✓ Login directory exists!")
                    ftp.cwd('..')
                except:
                    print("\n✗ Login directory NOT found")
                    
                break
                
            except:
                continue
                
    except Exception as e:
        print(f"Error: {e}")

def main():
    print("=== Checking rasin.pyebwa.com Structure ===\n")
    
    try:
        # Connect to FTP
        ftp = ftplib.FTP(FTP_HOST, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected to FTP\n")
        
        # Get current directory
        pwd = ftp.pwd()
        print(f"Current directory: {pwd}")
        
        # Check subdomain structure
        check_subdomain_structure(ftp)
        
        ftp.quit()
        print("\n✓ Done")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")

if __name__ == "__main__":
    main()