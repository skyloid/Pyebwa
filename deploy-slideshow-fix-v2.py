#!/usr/bin/env python3
"""
Deploy slideshow visual fix v2
"""
import ftplib
import os
from datetime import datetime

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_PORT = 21
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'qazrf`Lm{iMD@VqrEo87T8D@6'

# Files to upload
files_to_upload = [
    ('pyebwa.com/index.html', 'index.html'),
    ('pyebwa.com/css/slideshow-immediate-fix-v2.css', 'css/slideshow-immediate-fix-v2.css'),
]

def upload_file(ftp, local_path, remote_path):
    """Upload a single file via FTP"""
    try:
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {remote_path}', file)
        print(f'✓ Uploaded: {remote_path}')
        return True
    except Exception as e:
        print(f'✗ Failed to upload {remote_path}: {str(e)}')
        return False

def main():
    print("=" * 60)
    print("Pyebwa.com Slideshow Visual Fix v2")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Connect to FTP
    print(f"\nConnecting to FTP server...")
    try:
        ftp = ftplib.FTP()
        ftp.connect(FTP_HOST, FTP_PORT, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected successfully!")
        
        # Upload files
        print(f"\nUploading fixes...")
        success_count = 0
        
        for local_file, remote_file in files_to_upload:
            if os.path.exists(local_file):
                if upload_file(ftp, local_file, remote_file):
                    success_count += 1
            else:
                print(f"✗ Missing: {local_file}")
        
        # Close connection
        ftp.quit()
        print("\n✓ FTP connection closed")
        
        if success_count > 0:
            print("\n✅ Slideshow visual fix deployed!")
            print("\nWhat was fixed:")
            print("• Removed conflicting CSS animations")
            print("• Fixed z-index stacking (active slide = 100)")
            print("• Added inline styles to override conflicts")
            print("• Ensured opacity transitions work properly")
            
            print("\nTo verify:")
            print("1. Visit https://pyebwa.com/")
            print("2. Force refresh (Ctrl+F5)")
            print("3. Images should now change every 7 seconds")
            print("4. Watch for smooth fade transitions")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == '__main__':
    main()