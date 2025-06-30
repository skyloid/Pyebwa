#!/usr/bin/env python3
"""
Deploy slideshow fix for pyebwa.com using Paramiko SSH/SCP
No external tools required - pure Python solution
"""
import os
import sys
from datetime import datetime

try:
    import paramiko
except ImportError:
    print("Error: paramiko is not installed")
    print("Install it with: pip install paramiko")
    print("\nAlternatively, use the manual commands at the end of this script")
    sys.exit(1)

# SSH credentials
SSH_HOST = '145.223.107.9'
SSH_PORT = 65002
SSH_USER = 'u316621955'
SSH_PASS = 'z_NlY6|cU*w[iR92y,qazrf`Lm{iMD@VqrE'

# Remote base directory
REMOTE_BASE = '/home/u316621955/domains/pyebwa.com/public_html'

# Files to upload for the slideshow fix
files_to_upload = [
    ('pyebwa.com/index.html', 'index.html'),
    ('pyebwa.com/css/styles.css', 'css/styles.css'),
    ('pyebwa.com/css/slideshow-fallback.css', 'css/slideshow-fallback.css'),
    ('pyebwa.com/css/slideshow-immediate-fix.css', 'css/slideshow-immediate-fix.css'),
    ('pyebwa.com/js/slideshow-enhanced-v2.js', 'js/slideshow-enhanced-v2.js'),
]

def create_ssh_client():
    """Create and return an SSH client"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    return client

def create_remote_directory(sftp, remote_dir):
    """Create directory on remote server if it doesn't exist"""
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        try:
            # Create parent directories if needed
            parent = os.path.dirname(remote_dir)
            if parent and parent != '/':
                create_remote_directory(sftp, parent)
            sftp.mkdir(remote_dir)
            print(f"  ✓ Created directory: {remote_dir}")
        except Exception as e:
            print(f"  ⚠️  Could not create directory {remote_dir}: {e}")

def upload_file(sftp, local_path, remote_path):
    """Upload a single file via SFTP"""
    try:
        # Ensure remote directory exists
        remote_full_path = f"{REMOTE_BASE}/{remote_path}"
        remote_dir = os.path.dirname(remote_full_path)
        if remote_dir:
            create_remote_directory(sftp, remote_dir)
        
        # Upload the file
        print(f"  Uploading {remote_path}...", end='', flush=True)
        sftp.put(local_path, remote_full_path)
        print(" ✓")
        return True
    except Exception as e:
        print(f" ✗ Error: {str(e)}")
        return False

def main():
    print("=" * 60)
    print("Pyebwa.com Slideshow Fix Deployment (Python/Paramiko)")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Check which files exist locally
    print("\nChecking local files...")
    existing_files = []
    missing_files = []
    
    for local_file, remote_file in files_to_upload:
        if os.path.exists(local_file):
            existing_files.append((local_file, remote_file))
            print(f"  ✓ Found: {local_file}")
        else:
            missing_files.append(local_file)
            print(f"  ✗ Missing: {local_file}")
    
    if missing_files:
        print(f"\n⚠️  Warning: {len(missing_files)} files are missing locally")
    
    if not existing_files:
        print("\n❌ No files to upload!")
        return
    
    # Connect to server
    print(f"\nConnecting to {SSH_HOST}:{SSH_PORT}...")
    client = None
    sftp = None
    
    try:
        client = create_ssh_client()
        client.connect(
            hostname=SSH_HOST,
            port=SSH_PORT,
            username=SSH_USER,
            password=SSH_PASS,
            timeout=30
        )
        print("✓ Connected successfully!")
        
        # Create SFTP client
        sftp = client.open_sftp()
        print("✓ SFTP session established")
        
        # Upload files
        print(f"\nUploading {len(existing_files)} files...")
        success_count = 0
        
        for local_file, remote_file in existing_files:
            if upload_file(sftp, local_file, remote_file):
                success_count += 1
        
        # Summary
        print("\n" + "=" * 60)
        print("DEPLOYMENT SUMMARY")
        print("=" * 60)
        print(f"✓ Successfully uploaded: {success_count}/{len(existing_files)} files")
        
        if success_count > 0:
            print("\n✅ Slideshow fix deployed successfully!")
            print("\nKey improvements:")
            print("1. CSS-only animation (works without JavaScript)")
            print("2. Immediate slideshow start")
            print("3. 5-second intervals per slide")
            print("4. Smooth fade transitions")
            print("5. Works in all browsers")
            
            print("\nTo verify the fix:")
            print("1. Visit https://pyebwa.com/")
            print("2. Watch for slideshow transitions (every 5 seconds)")
            print("3. Clear browser cache if needed (Ctrl+F5)")
            print("4. Check that all slides are cycling")
        
    except paramiko.AuthenticationException:
        print("❌ Authentication failed. Check username and password.")
    except paramiko.SSHException as e:
        print(f"❌ SSH connection error: {str(e)}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    finally:
        if sftp:
            sftp.close()
        if client:
            client.close()
            print("\n✓ Connection closed")

def print_manual_commands():
    """Print manual commands for users without paramiko"""
    print("\n" + "-" * 60)
    print("MANUAL UPLOAD INSTRUCTIONS")
    print("-" * 60)
    print("\nOption 1: Using SCP (command line)")
    print("Run these commands from: /home/pyebwa-rasin/htdocs/rasin.pyebwa.com")
    print()
    
    for local_file, remote_file in files_to_upload:
        remote_full = f"{REMOTE_BASE}/{remote_file}"
        print(f"scp -P {SSH_PORT} {local_file} {SSH_USER}@{SSH_HOST}:{remote_full}")
    
    print(f"\nPassword for each upload: {SSH_PASS}")
    
    print("\n\nOption 2: Using an FTP/SFTP client")
    print("1. Use FileZilla, Cyberduck, or similar")
    print(f"2. Protocol: SFTP")
    print(f"3. Host: {SSH_HOST}")
    print(f"4. Port: {SSH_PORT}")
    print(f"5. Username: {SSH_USER}")
    print(f"6. Password: {SSH_PASS}")
    print(f"7. Navigate to: {REMOTE_BASE}")
    print("8. Upload the files listed above")

if __name__ == '__main__':
    # Check if running with --manual flag
    if len(sys.argv) > 1 and sys.argv[1] == '--manual':
        print_manual_commands()
    else:
        main()
        print("\n(Run with --manual flag to see manual upload commands)")