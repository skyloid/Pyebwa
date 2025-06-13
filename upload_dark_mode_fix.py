#!/usr/bin/env python3
import subprocess
import sys

# List of files to upload
files_to_upload = [
    ('app/css/app-modern.css', '/htdocs/rasin.pyebwa.com/app/css/'),
    ('app/index.html', '/htdocs/rasin.pyebwa.com/app/'),
    ('test-dark-mode-complete.html', '/htdocs/rasin.pyebwa.com/')
]

# FTP credentials (same format as other upload scripts)
ftp_script = """
open ftp.pyebwa.com
user pyebwa Boston2013
binary
"""

print("Uploading Dark Mode Fix Files...")
print("-" * 50)

for local_file, remote_dir in files_to_upload:
    print(f"\nUploading {local_file}...")
    
    # Create FTP command file
    with open('/tmp/ftp_commands.txt', 'w') as f:
        f.write(ftp_script)
        f.write(f"cd {remote_dir}\n")
        f.write(f"put {local_file}\n")
        f.write("quit\n")
    
    # Execute FTP
    try:
        result = subprocess.run(['ftp', '-n', '-v'], 
                              stdin=open('/tmp/ftp_commands.txt', 'r'),
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✓ Successfully uploaded {local_file}")
        else:
            print(f"✗ Failed to upload {local_file}")
            print(result.stderr)
    except Exception as e:
        print(f"✗ Error uploading {local_file}: {e}")

print("\n" + "-" * 50)
print("Deployment complete!")
print("\nTest the fix at:")
print("1. Main app: https://rasin.pyebwa.com/app/")
print("2. Test page: https://rasin.pyebwa.com/test-dark-mode-complete.html")
print("\nMake sure to:")
print("- Clear browser cache or use Incognito/Private mode")
print("- Toggle dark mode to test the header color")
print("- The header should be pure black (#000) in dark mode")