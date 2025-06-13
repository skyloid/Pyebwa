#!/usr/bin/env python3
import subprocess

# Files to upload
files_to_upload = [
    ('manual-test-checklist.html', '/htdocs/rasin.pyebwa.com/'),
    ('test-dark-mode-complete.html', '/htdocs/rasin.pyebwa.com/'),
    ('test-dark-mode-header.html', '/htdocs/rasin.pyebwa.com/')
]

# FTP credentials
ftp_script = """
open ftp.pyebwa.com
user pyebwa Boston2013
binary
"""

print("Uploading Test Files...")
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
    except Exception as e:
        print(f"✗ Error uploading {local_file}: {e}")

print("\n" + "-" * 50)
print("Test files uploaded!")
print("\nAccess the manual test checklist at:")
print("https://rasin.pyebwa.com/manual-test-checklist.html")