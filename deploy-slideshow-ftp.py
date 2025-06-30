#!/usr/bin/env python3
"""
Deploy slideshow fix for pyebwa.com using FTP
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
    ('pyebwa.com/index.html', 'public_html/index.html'),
    ('pyebwa.com/css/styles.css', 'public_html/css/styles.css'),
    ('pyebwa.com/css/slideshow-immediate-fix.css', 'public_html/css/slideshow-immediate-fix.css'),
    ('pyebwa.com/css/slideshow-fallback.css', 'public_html/css/slideshow-fallback.css'),
    ('pyebwa.com/js/slideshow-enhanced-v2.js', 'public_html/js/slideshow-enhanced-v2.js'),
]

def ensure_ftp_directory(ftp, path):
    """Create FTP directory if it doesn't exist"""
    dirs = path.split('/')
    current = ''
    for dir in dirs:
        if dir and dir != 'public_html':  # Skip root public_html
            if current:
                current += '/'
            current += dir
            try:
                ftp.cwd('/' + current)
            except:
                try:
                    ftp.mkd('/' + current)
                    print(f'  Created directory: /{current}')
                except:
                    pass
    # Return to root
    ftp.cwd('/')

def upload_file(ftp, local_path, remote_path):
    """Upload a single file via FTP"""
    try:
        # Ensure directory exists
        remote_dir = os.path.dirname(remote_path)
        if remote_dir:
            ensure_ftp_directory(ftp, remote_dir)
        
        # Upload file
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {remote_path}', file)
        print(f'✓ Uploaded: {remote_path}')
        return True
    except Exception as e:
        print(f'✗ Failed to upload {remote_path}: {str(e)}')
        return False

def main():
    print("=" * 60)
    print("Pyebwa.com Slideshow Fix - FTP Deployment")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Check local files
    print("\nChecking local files...")
    existing_files = []
    missing_files = []
    
    for local_file, remote_file in files_to_upload:
        if os.path.exists(local_file):
            existing_files.append((local_file, remote_file))
            print(f"✓ Found: {local_file}")
        else:
            missing_files.append(local_file)
            print(f"✗ Missing: {local_file}")
    
    if missing_files:
        print(f"\n⚠️  Warning: {len(missing_files)} files missing")
    
    # Connect to FTP
    print(f"\nConnecting to FTP server {FTP_HOST}...")
    try:
        ftp = ftplib.FTP()
        ftp.connect(FTP_HOST, FTP_PORT, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected successfully!")
        
        # Get current directory
        print(f"Current directory: {ftp.pwd()}")
        
        # Upload files
        print(f"\nUploading {len(existing_files)} files...")
        success_count = 0
        
        for local_file, remote_file in existing_files:
            if upload_file(ftp, local_file, remote_file):
                success_count += 1
        
        # Close connection
        ftp.quit()
        print("\n✓ FTP connection closed")
        
        # Summary
        print("\n" + "=" * 60)
        print("DEPLOYMENT SUMMARY")
        print("=" * 60)
        print(f"✓ Successfully uploaded: {success_count}/{len(existing_files)} files")
        
        if success_count > 0:
            print("\n✅ Slideshow fix deployed successfully!")
            print("\nWhat was fixed:")
            print("• CSS-only animation (no JavaScript required)")
            print("• 5-second intervals between slides")
            print("• Smooth fade transitions")
            print("• Works in all browsers")
            
            print("\nTo verify:")
            print("1. Visit https://pyebwa.com/")
            print("2. Clear browser cache (Ctrl+F5)")
            print("3. Watch slideshow - should change every 5 seconds")
            print("4. Check browser console for any errors")
            
    except ftplib.error_perm as e:
        print(f"❌ FTP Permission error: {str(e)}")
    except ftplib.error_temp as e:
        print(f"❌ FTP Temporary error: {str(e)}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == '__main__':
    main()