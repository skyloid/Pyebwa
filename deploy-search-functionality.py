#!/usr/bin/env python3
import ftplib
import os
from datetime import datetime

# FTP connection details
FTP_HOST = 'ftp.pyebwa.com'
FTP_USER = 'pyebwa'
FTP_PASS = 'Boston2013'

def upload_file(ftp, local_path, remote_path):
    """Upload a single file to FTP server"""
    try:
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {remote_path}', file)
        print(f"✓ Uploaded: {remote_path}")
        return True
    except Exception as e:
        print(f"✗ Failed to upload {remote_path}: {str(e)}")
        return False

def main():
    print(f"\n{'='*60}")
    print(f"Deploying Search Functionality - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    # Files to upload
    files_to_upload = [
        # Search engine core files
        ('app/js/search-engine.js', '/htdocs/rasin.pyebwa.com/app/js/search-engine.js'),
        ('app/js/search-ui.js', '/htdocs/rasin.pyebwa.com/app/js/search-ui.js'),
        ('app/js/search-migration.js', '/htdocs/rasin.pyebwa.com/app/js/search-migration.js'),
        
        # Updated files with search integration
        ('app/js/app.js', '/htdocs/rasin.pyebwa.com/app/js/app.js'),
        ('app/js/members.js', '/htdocs/rasin.pyebwa.com/app/js/members.js'),
        ('app/index.html', '/htdocs/rasin.pyebwa.com/app/index.html'),
    ]
    
    try:
        # Connect to FTP
        print("Connecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected to FTP server\n")
        
        # Upload files
        success_count = 0
        total_files = len(files_to_upload)
        
        for local_file, remote_file in files_to_upload:
            if os.path.exists(local_file):
                if upload_file(ftp, local_file, remote_file):
                    success_count += 1
            else:
                print(f"✗ Local file not found: {local_file}")
        
        # Close FTP connection
        ftp.quit()
        
        print(f"\n{'='*60}")
        print(f"Deployment Summary: {success_count}/{total_files} files uploaded successfully")
        print(f"{'='*60}")
        
        if success_count == total_files:
            print("\n✓ Search functionality deployed successfully!")
            print("\nFeatures deployed:")
            print("- Full-text search with tokenization")
            print("- Fuzzy name matching (Soundex, Levenshtein distance)")
            print("- Advanced search filters")
            print("- Quick search in header")
            print("- Search results with highlighting")
            print("- Search history and caching")
            print("- Automatic indexing for new members")
            print("- Migration script for existing members")
            print("\nNext steps:")
            print("1. Visit https://rasin.pyebwa.com/app/")
            print("2. Login to your account")
            print("3. The search migration will run automatically")
            print("4. Use Cmd/Ctrl + K to open quick search")
            print("5. Click the filter icon for advanced search")
        else:
            print("\n⚠ Some files failed to upload. Please check the errors above.")
            
    except Exception as e:
        print(f"\n✗ Deployment failed: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())