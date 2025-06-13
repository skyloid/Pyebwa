#!/usr/bin/env python3
"""Deploy PDF export files to rasin.pyebwa.com."""

import ftplib
import os
from pathlib import Path

# FTP credentials for rasin.pyebwa.com
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955"  # Main account user
FTP_PASS = "Y5eTq?Pn|YFo&Jk#"
FTP_BASE = "/domains/rasin.pyebwa.com/public_html"

def upload_file(ftp, local_path, remote_path):
    """Upload a single file to FTP server."""
    print(f"Uploading {local_path} to {remote_path}")
    try:
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {remote_path}', file)
        print(f"✓ Successfully uploaded {remote_path}")
        return True
    except Exception as e:
        print(f"✗ Error uploading {remote_path}: {e}")
        return False

def ensure_directory(ftp, directory):
    """Ensure directory exists on FTP server."""
    parts = directory.strip('/').split('/')
    current_path = ""
    
    for part in parts:
        if not part:
            continue
            
        current_path = current_path + "/" + part if current_path else part
        
        try:
            # Try to change to directory
            ftp.cwd('/' + current_path)
        except ftplib.error_perm:
            # Directory doesn't exist, create it
            try:
                ftp.mkd('/' + current_path)
                print(f"Created directory: /{current_path}")
                ftp.cwd('/' + current_path)
            except ftplib.error_perm as e:
                print(f"Could not create directory /{current_path}: {e}")
                pass

def main():
    print("Connecting to FTP server for rasin.pyebwa.com...")
    
    try:
        # Create FTP connection
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected to FTP server")
        
        # List current directory to verify connection
        print("\nCurrent directory listing:")
        ftp.retrlines('LIST', lambda x: print(f"  {x}"))
        
        # Change to rasin.pyebwa.com directory
        try:
            ftp.cwd(FTP_BASE)
            print(f"\n✓ Changed to {FTP_BASE}")
        except Exception as e:
            print(f"\n✗ Could not change to {FTP_BASE}: {e}")
            print("Trying alternate paths...")
            
            # Try alternate paths
            alt_paths = [
                "/home/u316621955/domains/rasin.pyebwa.com/public_html",
                "/domains/rasin.pyebwa.com/public_html",
                "/rasin.pyebwa.com/public_html",
                "/public_html"
            ]
            
            for alt_path in alt_paths:
                try:
                    ftp.cwd(alt_path)
                    print(f"✓ Changed to {alt_path}")
                    FTP_BASE = alt_path
                    break
                except:
                    continue
        
        # Files to upload
        files_to_upload = [
            # Test page
            ('test-pdf-export.html', 'test-pdf-export.html'),
            
            # JavaScript files
            ('app/js/pdf-export.js', 'app/js/pdf-export.js'),
            ('app/js/share-modal.js', 'app/js/share-modal.js'),
            
            # SVG logo
            ('app/images/pyebwa-logo.svg', 'app/images/pyebwa-logo.svg'),
        ]
        
        successful = 0
        failed = 0
        
        # Upload files
        for local_file, remote_file in files_to_upload:
            local_path = f"/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/{local_file}"
            
            if not os.path.exists(local_path):
                print(f"\n✗ Local file not found: {local_path}")
                failed += 1
                continue
            
            # Ensure directory exists
            remote_dir = str(Path(remote_file).parent)
            if remote_dir != '.' and remote_dir != '':
                ensure_directory(ftp, remote_dir)
                ftp.cwd(FTP_BASE)
            
            # Upload file
            if upload_file(ftp, local_path, remote_file):
                successful += 1
            else:
                failed += 1
        
        # Close connection
        ftp.quit()
        
        print(f"\n{'='*60}")
        print(f"Upload Summary:")
        print(f"  ✓ Successful: {successful}")
        print(f"  ✗ Failed: {failed}")
        print(f"{'='*60}")
        
        if successful > 0:
            print(f"\nTest the PDF export at: https://rasin.pyebwa.com/test-pdf-export.html")
            
    except ftplib.error_perm as e:
        print(f"\n✗ FTP Permission Error: {e}")
        print("\nTrying to find the correct path...")
        
        # Try to reconnect and explore
        try:
            ftp = ftplib.FTP(FTP_HOST)
            ftp.login(FTP_USER, FTP_PASS)
            
            print("\nRoot directory listing:")
            ftp.retrlines('LIST')
            
            # Look for domains directory
            try:
                ftp.cwd('/domains')
                print("\n/domains directory listing:")
                ftp.retrlines('LIST')
            except:
                pass
                
            ftp.quit()
        except Exception as e2:
            print(f"Could not explore: {e2}")
            
    except Exception as e:
        print(f"\n✗ Error: {e}")

if __name__ == "__main__":
    main()