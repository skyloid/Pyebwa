#!/usr/bin/env python3
# Method 1: Replace main-slideshow.js with simpler slideshow.js

import subprocess

print("Method 1: Simple and Reliable Slideshow")
print("-" * 50)

# Update index.html to use slideshow.js instead of main-slideshow.js
with open('pyebwa.com/index.html', 'r') as f:
    content = f.read()

# Replace the script reference
content = content.replace(
    '<script src="js/main-slideshow.js"></script>',
    '<script src="js/slideshow.js"></script>'
)

with open('pyebwa.com/index.html', 'w') as f:
    f.write(content)

print("✓ Updated index.html to use slideshow.js")

# Upload files
files_to_upload = [
    ('pyebwa.com/index.html', '/htdocs/pyebwa.com/'),
    ('pyebwa.com/js/slideshow.js', '/htdocs/pyebwa.com/js/')
]

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
print("Method 1 deployed!")
print("\nThis solution uses a simple, reliable approach that:")
print("- Waits for DOM to load")
print("- Uses both classList and inline styles for compatibility")
print("- Has fallback initialization after 1 second")
print("- Includes detailed console logging")
print("\nTest at: https://pyebwa.com/")