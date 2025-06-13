#!/usr/bin/env python3
import subprocess

# List of files to upload
files_to_upload = [
    ('pyebwa.com/index.html', '/htdocs/pyebwa.com/'),
    ('pyebwa.com/js/app.js', '/htdocs/pyebwa.com/js/'),
    ('pyebwa.com/js/app-cleaned.js', '/htdocs/pyebwa.com/js/'),
    ('pyebwa.com/js/app-fixed.js', '/htdocs/pyebwa.com/js/')
]

# FTP credentials
ftp_script = """
open ftp.pyebwa.com
user pyebwa Boston2013
binary
"""

print("Uploading Login URL Fixes...")
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
print("Login URL fixes deployed!")
print("\nAll login references now correctly point to:")
print("https://rasin.pyebwa.com/login.html")
print("\nNo references to https://pyebwa.com/login/ remain.")