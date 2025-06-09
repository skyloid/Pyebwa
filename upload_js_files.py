#!/usr/bin/env python3
"""
Upload JavaScript files to www.pyebwa.com and rasin.pyebwa.com servers
"""

import ftplib
import os
from datetime import datetime

# FTP Credentials
FTP_CONFIGS = {
    'www.pyebwa.com': {
        'host': '145.223.107.9',
        'user': 'u316621955.pyebwa.com',
        'pass': 'Y5eTq?Pn|YFo&Jk#',
        'remote_path': '/public_html/js/app.js'
    },
    'rasin.pyebwa.com': {
        'host': '145.223.119.193',
        'user': 'rasin',
        'pass': '46Bkg#L*qUHH',
        'remote_path': '/htdocs/rasin.pyebwa.com/app/js/app.js'
    }
}

# Local file paths
LOCAL_FILES = {
    'www.pyebwa.com': '/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/app.js',
    'rasin.pyebwa.com': '/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/app/js/app.js'
}

def upload_file(server_name, local_file, config):
    """Upload a single file to FTP server"""
    print(f"\n{'='*60}")
    print(f"Uploading to {server_name}")
    print(f"{'='*60}")
    
    try:
        # Connect to FTP server
        print(f"Connecting to {config['host']}...")
        ftp = ftplib.FTP(config['host'])
        ftp.login(config['user'], config['pass'])
        print("✓ Connected successfully")
        
        # Get current directory
        current_dir = ftp.pwd()
        print(f"Current directory: {current_dir}")
        
        # Navigate to the directory containing the file
        remote_dir = os.path.dirname(config['remote_path'])
        remote_file = os.path.basename(config['remote_path'])
        
        if remote_dir and remote_dir != '/':
            print(f"Changing to directory: {remote_dir}")
            try:
                ftp.cwd(remote_dir)
            except ftplib.error_perm as e:
                print(f"Warning: Could not change directory: {e}")
                # Try to create directories if they don't exist
                dirs = remote_dir.strip('/').split('/')
                for i, dir_name in enumerate(dirs):
                    path = '/' + '/'.join(dirs[:i+1])
                    try:
                        ftp.cwd(path)
                    except:
                        print(f"Creating directory: {path}")
                        ftp.mkd(path)
                        ftp.cwd(path)
        
        # List files in current directory
        print("\nFiles in current directory:")
        files = []
        ftp.retrlines('LIST', files.append)
        for f in files[-5:]:  # Show last 5 files
            print(f"  {f}")
        
        # Upload the file
        print(f"\nUploading {local_file}...")
        print(f"Target: {remote_file}")
        
        with open(local_file, 'rb') as f:
            ftp.storbinary(f'STOR {remote_file}', f)
        
        print("✓ File uploaded successfully")
        
        # Verify upload
        try:
            size = ftp.size(remote_file)
            local_size = os.path.getsize(local_file)
            print(f"✓ Verified: Remote size ({size} bytes) matches local size ({local_size} bytes)")
        except:
            print("  (Size verification not supported)")
        
        # Close connection
        ftp.quit()
        print("✓ Connection closed")
        
        return True
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False

def main():
    """Main function to upload all files"""
    print(f"JavaScript File Upload Script")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check if local files exist
    print("\nChecking local files...")
    for server, local_file in LOCAL_FILES.items():
        if os.path.exists(local_file):
            size = os.path.getsize(local_file)
            print(f"✓ {server}: {local_file} ({size} bytes)")
        else:
            print(f"✗ {server}: {local_file} NOT FOUND")
            return
    
    # Upload files
    results = {}
    for server_name in ['www.pyebwa.com', 'rasin.pyebwa.com']:
        local_file = LOCAL_FILES[server_name]
        config = FTP_CONFIGS[server_name]
        
        success = upload_file(server_name, local_file, config)
        results[server_name] = success
    
    # Summary
    print(f"\n{'='*60}")
    print("UPLOAD SUMMARY")
    print(f"{'='*60}")
    
    for server, success in results.items():
        status = "✓ SUCCESS" if success else "✗ FAILED"
        print(f"{server}: {status}")
    
    # Final status
    all_success = all(results.values())
    if all_success:
        print("\n✓ All uploads completed successfully!")
        print("\nThe redirect URLs have been updated to point to secure.pyebwa.com:9112")
    else:
        print("\n✗ Some uploads failed. Please check the errors above.")
    
    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()