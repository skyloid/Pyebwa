#!/usr/bin/env python3
import subprocess

print("Deploying Mobile Navigation Fixes")
print("-" * 50)

# Files to upload
files_to_upload = [
    ('app/index.html', '/htdocs/rasin.pyebwa.com/app/'),
    ('app/js/mobile-nav-enhanced.js', '/htdocs/rasin.pyebwa.com/app/js/'),
    ('app/css/mobile-fix.css', '/htdocs/rasin.pyebwa.com/app/css/'),
    ('mobile-test.html', '/htdocs/rasin.pyebwa.com/')
]

# FTP credentials
ftp_script = """
open ftp.pyebwa.com
user pyebwa Boston2013
binary
"""

for local_file, remote_dir in files_to_upload:
    print(f"\nUploading {local_file}...")
    
    with open('/tmp/ftp_commands.txt', 'w') as f:
        f.write(ftp_script)
        f.write(f"cd {remote_dir}\n")
        f.write(f"put {local_file}\n")
        f.write("quit\n")
    
    try:
        result = subprocess.run(['ftp', '-n', '-v'], 
                              stdin=open('/tmp/ftp_commands.txt', 'r'),
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✓ Successfully uploaded {local_file}")
        else:
            print(f"✗ Failed to upload {local_file}")
    except Exception as e:
        print(f"✗ Error: {e}")

print("\n" + "-" * 50)
print("Mobile fixes deployed!")
print("\nWhat's been fixed:")
print("1. Enhanced touch event handling")
print("2. Swipe-to-close gesture for mobile menu")
print("3. Prevention of duplicate menus on Android")
print("4. Better iOS Safari compatibility")
print("5. Improved tap response times")
print("\nTest the fixes:")
print("- Mobile test page: https://rasin.pyebwa.com/mobile-test.html")
print("- Main app: https://rasin.pyebwa.com/app/")
print("\nPlease test on actual mobile devices!")