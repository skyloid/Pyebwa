#!/usr/bin/env python3
"""
Deploy slideshow fix for pyebwa.com main page
This script uploads the enhanced slideshow with CSS fallback
"""
import ftplib
import os
from datetime import datetime

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

# Files to upload for the slideshow fix
files_to_upload = [
    # Main page (ensure it has the slideshow structure)
    ('pyebwa.com/index.html', 'index.html'),
    # CSS files with slideshow animations
    ('pyebwa.com/css/styles.css', 'css/styles.css'),
    ('pyebwa.com/css/slideshow-fallback.css', 'css/slideshow-fallback.css'),
    # Enhanced JavaScript slideshow
    ('pyebwa.com/js/slideshow-enhanced-v2.js', 'js/slideshow-enhanced-v2.js'),
    # Test pages for verification
    ('pyebwa.com/slideshow-minimal-test.html', 'slideshow-minimal-test.html'),
    ('pyebwa.com/slideshow-test-complete.html', 'slideshow-test-complete.html'),
]

def ensure_directory(ftp, path):
    """Ensure a directory exists on the FTP server"""
    dirs = path.split('/')
    for i in range(len(dirs)):
        if dirs[i]:
            subdir = '/'.join(dirs[:i+1])
            try:
                ftp.cwd('/' + subdir)
            except:
                try:
                    ftp.mkd('/' + subdir)
                    print(f'Created directory: /{subdir}')
                except:
                    pass

def upload_file(ftp, local_path, remote_path):
    """Upload a single file"""
    try:
        # Ensure the directory exists
        remote_dir = os.path.dirname(remote_path)
        if remote_dir:
            ensure_directory(ftp, remote_dir)
            ftp.cwd(FTP_DIR)
        
        # Upload the file
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {remote_path}', file)
        print(f'✓ Uploaded: {remote_path}')
        return True
    except Exception as e:
        print(f'✗ Failed to upload {remote_path}: {str(e)}')
        return False

def main():
    print("=" * 60)
    print("Pyebwa.com Slideshow Fix Deployment")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    try:
        # Connect to FTP
        print(f"\nConnecting to FTP server {FTP_HOST}...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected successfully!")
        
        # Change to public_html directory
        ftp.cwd(FTP_DIR)
        print(f"✓ Changed to directory: {FTP_DIR}")
        
        # Check which files exist locally
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
            print(f"\n⚠️  Warning: {len(missing_files)} files are missing locally")
            print("Missing files will be skipped during upload")
        
        # Upload existing files
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
        if missing_files:
            print(f"⚠️  Skipped (missing): {len(missing_files)} files")
        
        if success_count > 0:
            print("\n✅ Slideshow fix deployed successfully!")
            print("\nKey improvements:")
            print("1. CSS-only animation fallback (works without JavaScript)")
            print("2. Enhanced JavaScript with multiple initialization strategies")
            print("3. Automatic fallback to CSS if JavaScript fails")
            print("4. Debug API available in browser console")
            print("5. Better image loading detection")
            
            print("\nTo verify the fix:")
            print("1. Visit https://pyebwa.com/")
            print("2. Watch for slideshow transitions (every 7 seconds)")
            print("3. Check browser console for [Slideshow-v2] messages")
            print("4. Test page: https://pyebwa.com/slideshow-test-complete.html")
            print("5. Minimal test: https://pyebwa.com/slideshow-minimal-test.html")
            
            print("\nDebugging in browser console:")
            print("- window.slideshowAPI.getState() - Check current state")
            print("- window.slideshowAPI.next() - Go to next slide")
            print("- window.slideshowAPI.stop() - Stop slideshow")
            print("- window.slideshowAPI.forceCSS() - Force CSS fallback")
        else:
            print("\n❌ No files were uploaded successfully")
            print("Please check the error messages above")
            
    except Exception as e:
        print(f"\n❌ Deployment failed: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Check FTP credentials are correct")
        print("2. Ensure you have internet connection")
        print("3. Verify the FTP server is accessible")

if __name__ == '__main__':
    main()