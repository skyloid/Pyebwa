#!/usr/bin/env python3
"""
Deploy slideshow fix using rsync over SSH
Alternative approach that might work better
"""
import subprocess
import os
from datetime import datetime

# SSH credentials
SSH_HOST = '145.223.107.9'
SSH_PORT = '65002'
SSH_USER = 'u316621955'
SSH_PASS = 'z_NlY6|cU*w[iR92y,qazrf`Lm{iMD@VqrE'

# Files to upload
files = [
    ('pyebwa.com/index.html', 'index.html'),
    ('pyebwa.com/css/styles.css', 'css/styles.css'),
    ('pyebwa.com/css/slideshow-immediate-fix.css', 'css/slideshow-immediate-fix.css'),
    ('pyebwa.com/css/slideshow-fallback.css', 'css/slideshow-fallback.css'),
    ('pyebwa.com/js/slideshow-enhanced-v2.js', 'js/slideshow-enhanced-v2.js'),
]

print("=" * 60)
print("Pyebwa.com Slideshow Fix Deployment")
print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 60)
print()
print("Since automated upload is failing, please use these manual commands:")
print()
print("1. First, install sshpass if not already installed:")
print("   sudo apt-get install sshpass")
print()
print("2. Then run these commands from the directory:")
print("   cd /home/pyebwa-rasin/htdocs/rasin.pyebwa.com")
print()

for local_file, remote_file in files:
    print(f"# Upload {remote_file}")
    # Use printf to handle special characters in password
    cmd = f'''sshpass -p 'z_NlY6|cU*w[iR92y,qazrf`Lm{{iMD@VqrE' scp -o StrictHostKeyChecking=no -P {SSH_PORT} {local_file} {SSH_USER}@{SSH_HOST}:/home/u316621955/domains/pyebwa.com/public_html/{remote_file}'''
    print(cmd)
    print()

print("=" * 60)
print("Alternative: Manual SCP commands")
print("=" * 60)
print()
print("If sshpass doesn't work, use regular SCP and enter password when prompted:")
print(f"Password: {SSH_PASS}")
print()

for local_file, remote_file in files:
    cmd = f"scp -P {SSH_PORT} {local_file} {SSH_USER}@{SSH_HOST}:/home/u316621955/domains/pyebwa.com/public_html/{remote_file}"
    print(cmd)

print()
print("=" * 60)
print("Alternative: Use SFTP client")
print("=" * 60)
print()
print("1. Use FileZilla, Cyberduck, or WinSCP")
print(f"2. Host: {SSH_HOST}")
print(f"3. Port: {SSH_PORT}")
print(f"4. Protocol: SFTP/SSH")
print(f"5. Username: {SSH_USER}")
print(f"6. Password: {SSH_PASS}")
print("7. Remote directory: /home/u316621955/domains/pyebwa.com/public_html/")
print()
print("Upload these files:")
for local_file, remote_file in files:
    print(f"  - {local_file} → {remote_file}")

print()
print("=" * 60)
print("Verification after upload:")
print("=" * 60)
print("1. Visit https://pyebwa.com/")
print("2. Clear browser cache (Ctrl+F5)")
print("3. Watch slideshow - should change every 5 seconds")
print("4. The CSS-only animation will work immediately!")