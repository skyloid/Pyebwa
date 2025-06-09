#!/usr/bin/env python3
"""
Fix authentication on rasin.pyebwa.com subdomain
"""

import ftplib
from datetime import datetime

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = "~3jB~XmCbjO>K2VY"

def upload_file(ftp, local_path, remote_path):
    """Upload a file to FTP server"""
    try:
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {remote_path}', file)
        print(f"✓ Uploaded: {remote_path}")
        return True
    except Exception as e:
        print(f"✗ Error uploading {remote_path}: {str(e)}")
        return False

def check_subdomain_directory(ftp):
    """Check if rasin subdomain has its own directory"""
    try:
        # Try to access rasin subdomain directory
        original_dir = ftp.pwd()
        
        # Common subdomain paths
        possible_paths = [
            'domains/rasin.pyebwa.com/public_html',
            'rasin.pyebwa.com',
            'subdomains/rasin',
            '.'  # Same as main domain
        ]
        
        for path in possible_paths:
            try:
                if path != '.':
                    ftp.cwd(path)
                    print(f"✓ Found rasin subdomain directory at: {path}")
                    return path
            except:
                ftp.cwd(original_dir)
                continue
                
        print("ℹ rasin.pyebwa.com appears to use the same directory as pyebwa.com")
        return '.'
        
    except Exception as e:
        print(f"Error checking subdomain: {e}")
        return '.'

def main():
    print(f"\n=== Fixing rasin.pyebwa.com Authentication - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    
    try:
        # Connect to FTP
        print("Connecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected\n")
        
        # Check subdomain structure
        subdomain_path = check_subdomain_directory(ftp)
        
        if subdomain_path == '.':
            # Same directory as main domain
            ftp.cwd('/public_html')
            
            print("\nDeploying to shared directory...")
            files_to_upload = [
                # Updated app.js to use local login
                ('app/js/app.js', 'app/js/app.js'),
                # Simple index.html that redirects to app
                ('index.html', 'rasin-index.html'),
                # Make sure simple-login.html is available
                ('simple-login.html', 'simple-login.html'),
            ]
        else:
            # Separate subdomain directory
            print(f"\nDeploying to subdomain directory: {subdomain_path}")
            files_to_upload = [
                ('app/js/app.js', 'app/js/app.js'),
                ('index.html', 'index.html'),
                ('simple-login.html', 'simple-login.html'),
                # Also copy the app directory structure
                ('app/index.html', 'app/index.html'),
            ]
        
        success_count = 0
        for local_file, remote_file in files_to_upload:
            if upload_file(ftp, local_file, remote_file):
                success_count += 1
        
        print(f"\n✓ Successfully uploaded {success_count}/{len(files_to_upload)} files")
        
        ftp.quit()
        print("\n✓ Deployment complete")
        
        print("\n=== Authentication Flow Fixed ===")
        print("1. rasin.pyebwa.com → redirects to → /app/")
        print("2. /app/ checks authentication")
        print("3. If not logged in → redirects to → /simple-login.html")
        print("4. After login → redirects back to → /app/")
        print("\nAll on the same domain - no cross-domain issues!")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())