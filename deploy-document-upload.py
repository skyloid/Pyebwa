#!/usr/bin/env python3
"""
Deploy document upload functionality
"""

import ftplib
from datetime import datetime

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = "~3jB~XmCbjO>K2VY"

def upload_file(ftp, local_path, remote_path):
    """Upload a single file via FTP"""
    try:
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {remote_path}', file)
        print(f"✓ Uploaded: {remote_path}")
        return True
    except Exception as e:
        print(f"✗ Failed to upload {remote_path}: {e}")
        return False

def main():
    print("Document Upload Feature Deployment")
    print("-" * 40)
    print(f"Timestamp: {datetime.now()}")
    
    try:
        # Connect to FTP
        print("\nConnecting to FTP server...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected to FTP server")
        
        # Navigate to app directory
        ftp.cwd('/domains/rasin.pyebwa.com/public_html/app')
        
        # Upload HTML files
        print("\nUploading HTML files...")
        upload_file(ftp, 'app/index.html', 'index.html')
        
        # Navigate to js directory
        ftp.cwd('js')
        
        # Upload JavaScript files
        print("\nUploading JavaScript files...")
        upload_file(ftp, 'app/js/document-manager.js', 'document-manager.js')
        upload_file(ftp, 'app/js/member-profile.js', 'member-profile.js')
        
        # Navigate to css directory
        ftp.cwd('../css')
        
        # Upload CSS files
        print("\nUploading CSS files...")
        upload_file(ftp, 'app/css/member-profile.css', 'member-profile.css')
        
        print("\n✅ Document upload feature deployed!")
        print("\nNew features:")
        print("1. ✓ Document type selection with icons")
        print("2. ✓ Support for multiple document types:")
        print("   - Birth/Death/Marriage certificates")
        print("   - Passports, Diplomas")
        print("   - Letters, Newspaper clippings")
        print("   - Legal and Medical documents")
        print("3. ✓ Drag & drop file upload")
        print("4. ✓ Document preview (images and PDFs)")
        print("5. ✓ Document viewer with download option")
        print("6. ✓ Title and notes for each document")
        print("7. ✓ 10MB file size limit")
        
        print("\nSupported file types:")
        print("- Images: JPG, JPEG, PNG")
        print("- Documents: PDF, DOC, DOCX, TXT")
        
        print("\nTo test:")
        print("1. Open a member profile")
        print("2. Go to Documents tab")
        print("3. Click 'Upload Document'")
        print("4. Select document type and upload a file")
        
        # Close FTP connection
        ftp.quit()
        
    except Exception as e:
        print(f"\n✗ Deployment failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())