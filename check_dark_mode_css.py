import ftplib
from io import BytesIO

# FTP credentials
ftp_host = "ftp.pyebwa.com"
ftp_user = "pyebwa"
ftp_pass = "Boston2013"

try:
    # Connect to FTP
    ftp = ftplib.FTP(ftp_host)
    ftp.login(ftp_user, ftp_pass)
    
    # Change to app/css directory
    ftp.cwd('/htdocs/rasin.pyebwa.com/app/css')
    
    # Download app-modern.css
    content = BytesIO()
    ftp.retrbinary('RETR app-modern.css', content.write)
    content.seek(0)
    
    # Read and search for dark mode header style
    lines = content.read().decode('utf-8').split('\n')
    
    print("Searching for dark mode header styles...")
    print("-" * 50)
    
    for i, line in enumerate(lines, 1):
        # Look for dark mode header section
        if 'body.dark-mode .app-header' in line:
            print(f"\nFound at line {i}:")
            # Print surrounding lines
            start = max(0, i-2)
            end = min(len(lines), i+5)
            for j in range(start, end):
                if j < len(lines):
                    print(f"{j+1}: {lines[j]}")
            break
    
    ftp.quit()
    print("\nFTP check complete.")
    
except Exception as e:
    print(f"Error: {e}")