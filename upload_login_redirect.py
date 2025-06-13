#!/usr/bin/env python3
import subprocess
import os

# FTP credentials
ftp_script = """
open ftp.pyebwa.com
user pyebwa Boston2013
binary
"""

print("Setting up Login Redirect...")
print("-" * 50)

# First, create the login directory on the server
print("\nCreating login directory on server...")
with open('/tmp/ftp_commands.txt', 'w') as f:
    f.write(ftp_script)
    f.write("cd /htdocs/pyebwa.com/\n")
    f.write("mkdir login\n")  # This will fail if directory exists, but that's OK
    f.write("quit\n")

subprocess.run(['ftp', '-n', '-v'], 
              stdin=open('/tmp/ftp_commands.txt', 'r'),
              capture_output=True, text=True)

# Files to upload
files_to_upload = [
    ('pyebwa.com/login/index.html', '/htdocs/pyebwa.com/login/'),
    ('pyebwa.com/login/.htaccess', '/htdocs/pyebwa.com/login/')
]

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
            # Don't print stderr as it might contain passwords
    except Exception as e:
        print(f"✗ Error uploading {local_file}: {e}")

print("\n" + "-" * 50)
print("Login redirect setup complete!")
print("\nhttps://pyebwa.com/login/ will now redirect to:")
print("https://rasin.pyebwa.com/login.html")
print("\nThe redirect is implemented with:")
print("1. Server-side .htaccess 301 redirect (fastest)")
print("2. HTML meta refresh (fallback)")
print("3. JavaScript redirect (additional fallback)")