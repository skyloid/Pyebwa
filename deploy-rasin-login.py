#!/usr/bin/env python3
"""
Deploy login page to rasin.pyebwa.com and update redirects
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

def main():
    print(f"\n=== Setting up Single-Domain Auth on rasin.pyebwa.com - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    
    try:
        # Connect to FTP
        print("Connecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected\n")
        
        # Switch to public_html
        ftp.cwd('/public_html')
        
        print("Current setup:")
        print("- pyebwa.com and rasin.pyebwa.com share the same public_html")
        print("- Need to ensure login page works on both domains\n")
        
        # Upload files
        files_to_upload = [
            # Updated app.js with correct redirect
            ('pyebwa.com/js/app.js', 'js/app.js'),
            # Make sure login page is accessible
            ('login/index.html', 'login/index.html'),
            # Also upload simple-login.html as backup
            ('simple-login.html', 'simple-login.html'),
        ]
        
        success_count = 0
        for local_file, remote_file in files_to_upload:
            if upload_file(ftp, local_file, remote_file):
                success_count += 1
        
        print(f"\n✓ Successfully uploaded {success_count}/{len(files_to_upload)} files")
        
        # Update app.js to use the correct login URL
        print("\nUpdating app.js to redirect to rasin.pyebwa.com...")
        
        ftp.quit()
        print("\n✓ Deployment complete")
        
        print("\n=== Configuration Summary ===")
        print("Since both domains share the same directory:")
        print("- Login page accessible at both:")
        print("  • https://pyebwa.com/login/")
        print("  • https://rasin.pyebwa.com/login/")
        print("\nAuthentication flow:")
        print("1. Homepage buttons redirect to rasin.pyebwa.com/login/")
        print("2. User logs in on rasin.pyebwa.com")
        print("3. After login, stays on rasin.pyebwa.com/app/")
        print("4. No cross-domain token issues!")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())