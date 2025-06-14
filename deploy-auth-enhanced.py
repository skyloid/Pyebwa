#!/usr/bin/env python3
import subprocess

print("Deploying Enhanced Authentication")
print("-" * 50)

# Files to upload
files_to_upload = [
    ('app/index.html', '/htdocs/rasin.pyebwa.com/app/'),
    ('app/js/auth-enhanced.js', '/htdocs/rasin.pyebwa.com/app/js/'),
    ('test-auth-enhanced.html', '/htdocs/rasin.pyebwa.com/'),
    ('phase1-progress.md', '/htdocs/rasin.pyebwa.com/')
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
print("Enhanced authentication deployed!")
print("\nWhat's been improved:")
print("1. Automatic token refresh every 55 minutes")
print("2. Multiple storage locations for redundancy")
print("3. Better error handling and recovery")
print("4. Auth state persistence checker")
print("5. Network error resilience")
print("\nTest the authentication:")
print("- Test page: https://rasin.pyebwa.com/test-auth-enhanced.html")
print("- Main app: https://rasin.pyebwa.com/app/")
print("\nAuth features:")
print("- Stores auth in localStorage, sessionStorage, and memory")
print("- Automatically attempts to restore lost sessions")
print("- Handles token expiration gracefully")