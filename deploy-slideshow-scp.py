#!/usr/bin/env python3
"""
Deploy slideshow fix for pyebwa.com using SCP
This script uploads the enhanced slideshow with CSS fallback via SSH
"""
import subprocess
import os
from datetime import datetime
import sys

# SSH credentials
SSH_HOST = '145.223.107.9'
SSH_PORT = '65002'
SSH_USER = 'u316621955'
SSH_PASS = 'z_NlY6|cU*w[iR92y,qazrf`Lm{iMD@VqrE'

# Remote base directory (adjust if needed)
REMOTE_BASE = '/home/u316621955/domains/pyebwa.com/public_html'

# Files to upload for the slideshow fix
files_to_upload = [
    # Main page with slideshow
    ('pyebwa.com/index.html', 'index.html'),
    # CSS files with slideshow animations
    ('pyebwa.com/css/styles.css', 'css/styles.css'),
    ('pyebwa.com/css/slideshow-fallback.css', 'css/slideshow-fallback.css'),
    ('pyebwa.com/css/slideshow-immediate-fix.css', 'css/slideshow-immediate-fix.css'),
    # Enhanced JavaScript slideshow
    ('pyebwa.com/js/slideshow-enhanced-v2.js', 'js/slideshow-enhanced-v2.js'),
]

def run_command(cmd, description=""):
    """Run a shell command and return success status"""
    try:
        if description:
            print(f"  {description}...", end='', flush=True)
        
        # Use sshpass to provide password non-interactively
        full_cmd = f'sshpass -p "{SSH_PASS}" {cmd}'
        
        result = subprocess.run(
            full_cmd,
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            if description:
                print(" ✓")
            return True, result.stdout
        else:
            if description:
                print(" ✗")
            print(f"Error: {result.stderr}")
            return False, result.stderr
    except Exception as e:
        if description:
            print(" ✗")
        print(f"Exception: {str(e)}")
        return False, str(e)

def check_sshpass():
    """Check if sshpass is installed"""
    try:
        result = subprocess.run(['which', 'sshpass'], capture_output=True)
        return result.returncode == 0
    except:
        return False

def create_remote_directory(remote_dir):
    """Create directory on remote server if it doesn't exist"""
    cmd = f'ssh -p {SSH_PORT} {SSH_USER}@{SSH_HOST} "mkdir -p {REMOTE_BASE}/{remote_dir}"'
    return run_command(cmd, f"Creating directory {remote_dir}")

def upload_file(local_path, remote_path):
    """Upload a single file via SCP"""
    # Ensure remote directory exists
    remote_dir = os.path.dirname(remote_path)
    if remote_dir:
        create_remote_directory(remote_dir)
    
    # Upload the file
    remote_full_path = f"{REMOTE_BASE}/{remote_path}"
    cmd = f'scp -P {SSH_PORT} "{local_path}" {SSH_USER}@{SSH_HOST}:"{remote_full_path}"'
    
    success, output = run_command(cmd, f"Uploading {remote_path}")
    return success

def main():
    print("=" * 60)
    print("Pyebwa.com Slideshow Fix Deployment (SCP)")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Check if sshpass is installed
    if not check_sshpass():
        print("\n❌ Error: sshpass is not installed")
        print("\nTo install sshpass:")
        print("  Ubuntu/Debian: sudo apt-get install sshpass")
        print("  macOS: brew install hudochenkov/sshpass/sshpass")
        print("\nAlternatively, you can use the manual SCP commands below")
        print_manual_commands()
        return
    
    # Test SSH connection
    print("\nTesting SSH connection...")
    test_cmd = f'ssh -p {SSH_PORT} {SSH_USER}@{SSH_HOST} "echo Connection successful"'
    success, output = run_command(test_cmd, "Connecting to server")
    
    if not success:
        print("\n❌ Failed to connect to server")
        print("\nTroubleshooting:")
        print("1. Check your internet connection")
        print("2. Verify SSH credentials are correct")
        print("3. Ensure SSH port 65002 is not blocked")
        print("\nYou can try manual upload:")
        print_manual_commands()
        return
    
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
    
    # Upload files
    print(f"\nUploading {len(existing_files)} files...")
    success_count = 0
    
    for local_file, remote_file in existing_files:
        if upload_file(local_file, remote_file):
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
        print("5. Enhanced JavaScript as progressive enhancement")
        
        print("\nTo verify the fix:")
        print("1. Visit https://pyebwa.com/")
        print("2. Watch for slideshow transitions (every 5 seconds)")
        print("3. Clear browser cache if needed (Ctrl+F5)")
        print("4. Check browser console for any errors")
    else:
        print("\n❌ No files were uploaded successfully")

def print_manual_commands():
    """Print manual SCP commands for user to run"""
    print("\n" + "-" * 60)
    print("MANUAL SCP COMMANDS")
    print("-" * 60)
    print("\nYou can manually upload files using these commands:")
    print("(Run from directory: /home/pyebwa-rasin/htdocs/rasin.pyebwa.com)")
    print()
    
    for local_file, remote_file in files_to_upload:
        remote_full = f"{REMOTE_BASE}/{remote_file}"
        print(f"scp -P {SSH_PORT} {local_file} {SSH_USER}@{SSH_HOST}:{remote_full}")
    
    print("\nNote: You'll be prompted for the password for each file.")
    print(f"Password: {SSH_PASS}")

if __name__ == '__main__':
    main()