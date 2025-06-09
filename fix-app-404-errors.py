#!/usr/bin/env python3
import ftplib
import os

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'

def check_ftp_structure():
    """Check the FTP directory structure"""
    try:
        # Connect to FTP
        print(f"Connecting to FTP server {FTP_HOST}...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("Connected successfully!")
        
        # Check root directory
        print("\n1. Checking root directory:")
        print(f"Current directory: {ftp.pwd()}")
        root_dirs = []
        ftp.dir(root_dirs.append)
        for item in root_dirs[:10]:  # Show first 10 items
            print(f"  {item}")
        
        # Check if domains directory exists
        print("\n2. Checking for domains directory:")
        try:
            ftp.cwd('domains')
            print("  ✓ domains directory exists")
            domains_list = []
            ftp.dir(domains_list.append)
            for item in domains_list:
                if 'pyebwa.com' in item:
                    print(f"  Found: {item}")
            ftp.cwd('..')  # Go back to root
        except:
            print("  ✗ domains directory not found")
        
        # Check if public_html exists in root
        print("\n3. Checking for public_html in root:")
        try:
            ftp.cwd('public_html')
            print("  ✓ public_html exists in root")
            print(f"  Current path: {ftp.pwd()}")
            
            # Check for app directory
            print("\n4. Checking for app directory in public_html:")
            app_exists = False
            try:
                ftp.cwd('app')
                app_exists = True
                print("  ✓ app directory exists")
                
                # Check for css and js directories
                print("\n5. Checking app subdirectories:")
                subdirs = []
                ftp.dir(subdirs.append)
                for item in subdirs:
                    print(f"    {item}")
                    
                # Check CSS directory
                try:
                    ftp.cwd('css')
                    print("\n  CSS files:")
                    css_files = []
                    ftp.dir(css_files.append)
                    for item in css_files[:5]:
                        print(f"    {item}")
                    ftp.cwd('..')
                except:
                    print("  ✗ css directory not found")
                
                # Check JS directory
                try:
                    ftp.cwd('js')
                    print("\n  JS files:")
                    js_files = []
                    ftp.dir(js_files.append)
                    for item in js_files[:5]:
                        print(f"    {item}")
                    ftp.cwd('..')
                except:
                    print("  ✗ js directory not found")
                    
                ftp.cwd('..')  # Go back to public_html
            except:
                print("  ✗ app directory not found in public_html")
                
            ftp.cwd('..')  # Go back to root
        except:
            print("  ✗ public_html not found in root")
        
        # Check domains/pyebwa.com/public_html path
        print("\n6. Checking domains/pyebwa.com/public_html path:")
        try:
            ftp.cwd('domains/pyebwa.com/public_html')
            print("  ✓ domains/pyebwa.com/public_html exists")
            print(f"  Current path: {ftp.pwd()}")
            
            # Check for app directory here
            try:
                ftp.cwd('app')
                print("  ✓ app directory exists in domains/pyebwa.com/public_html")
                app_items = []
                ftp.dir(app_items.append)
                print("\n  Contents of app directory:")
                for item in app_items[:10]:
                    print(f"    {item}")
            except:
                print("  ✗ app directory not found in domains/pyebwa.com/public_html")
        except:
            print("  ✗ domains/pyebwa.com/public_html path not found")
        
        ftp.quit()
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")

def upload_app_files():
    """Upload app files to the correct location"""
    try:
        # Connect to FTP
        print(f"\n\n=== UPLOADING APP FILES ===")
        print(f"Connecting to FTP server {FTP_HOST}...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("Connected successfully!")
        
        # Navigate to the correct directory
        # Try both possible paths
        paths_to_try = [
            '/public_html',
            '/domains/pyebwa.com/public_html'
        ]
        
        correct_path = None
        for path in paths_to_try:
            try:
                ftp.cwd(path)
                print(f"✓ Using path: {path}")
                correct_path = path
                break
            except:
                print(f"✗ Path not accessible: {path}")
        
        if not correct_path:
            print("✗ Could not find correct upload path!")
            return
        
        # Create app directory structure
        directories = ['app', 'app/css', 'app/js', 'app/assets', 'app/assets/images']
        for directory in directories:
            try:
                ftp.mkd(directory)
                print(f"✓ Created directory: {directory}")
            except:
                print(f"  Directory already exists: {directory}")
        
        # Upload CSS files
        css_files = ['app.css', 'footer.css', 'logo.css', 'tree.css']
        for css_file in css_files:
            local_path = f'app/css/{css_file}'
            remote_path = f'app/css/{css_file}'
            if os.path.exists(local_path):
                with open(local_path, 'rb') as file:
                    ftp.storbinary(f'STOR {remote_path}', file)
                print(f'✓ Uploaded: {remote_path}')
            else:
                print(f'✗ File not found: {local_path}')
        
        # Upload JS files
        js_files = [
            'app.js', 'app-fixed.js', 'app-loop-fix.js', 
            'auth-emergency-fix.js', 'auth-sync.js', 'firebase-config.js',
            'members.js', 'share-modal.js', 'stories.js', 
            'translations.js', 'tree.js', 'upload-enhanced.js'
        ]
        for js_file in js_files:
            local_path = f'app/js/{js_file}'
            remote_path = f'app/js/{js_file}'
            if os.path.exists(local_path):
                with open(local_path, 'rb') as file:
                    ftp.storbinary(f'STOR {remote_path}', file)
                print(f'✓ Uploaded: {remote_path}')
            else:
                print(f'✗ File not found: {local_path}')
        
        # Upload index.html
        if os.path.exists('app/index.html'):
            with open('app/index.html', 'rb') as file:
                ftp.storbinary('STOR app/index.html', file)
            print('✓ Uploaded: app/index.html')
        
        # Upload other HTML files
        html_files = [
            'auth-bridge.html', 'debug-auth.html', 'diagnose.html',
            'test-auth.html', 'test-auth-fixed.html', 'test-fixes.html',
            'test-image-upload.html', 'test-upload-quick.html', 'test-upload-status.html'
        ]
        for html_file in html_files:
            local_path = f'app/{html_file}'
            remote_path = f'app/{html_file}'
            if os.path.exists(local_path):
                with open(local_path, 'rb') as file:
                    ftp.storbinary(f'STOR {remote_path}', file)
                print(f'✓ Uploaded: {remote_path}')
        
        ftp.quit()
        print("\n✓ All files uploaded successfully!")
        print(f"\n📍 The app should now be accessible at:")
        print(f"   https://rasin.pyebwa.com/app/")
        print(f"\n   CSS files: https://rasin.pyebwa.com/app/css/")
        print(f"   JS files: https://rasin.pyebwa.com/app/js/")
        
    except Exception as e:
        print(f"✗ Error during upload: {str(e)}")

if __name__ == "__main__":
    # First check the FTP structure
    check_ftp_structure()
    
    # Then upload the files
    upload_app_files()