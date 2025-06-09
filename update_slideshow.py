#!/usr/bin/env python3
"""
Automatic slideshow updater for pyebwa.com
Scans the SlideShow directory and updates the index.html file
"""
import ftplib
import os
import re
from datetime import datetime

# FTP credentials
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

# Local file path
LOCAL_INDEX = '/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/index.html'

def get_slideshow_images():
    """Get list of images from SlideShow directory via FTP"""
    images = []
    try:
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        ftp.cwd(FTP_DIR + '/images/SlideShow')
        
        # Get file list
        files = []
        ftp.retrlines('LIST', lambda x: files.append(x))
        
        # Parse filenames and filter for images
        for file_info in files:
            parts = file_info.split()
            if len(parts) >= 9:
                filename = parts[-1]
                # Check if it's an image file
                if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif')):
                    images.append(filename)
        
        ftp.quit()
        print(f"[{datetime.now()}] Found {len(images)} images in SlideShow directory")
        return sorted(images)  # Sort for consistent ordering
        
    except Exception as e:
        print(f"[{datetime.now()}] Error getting images: {e}")
        return []

def generate_slideshow_html(images):
    """Generate HTML for slideshow with found images"""
    if not images:
        # Return gradient fallback if no images
        return '''        <!-- Haiti Slideshow -->
        <div class="slideshow-container">
            <div class="slide active" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
                <div class="slide-overlay"></div>
            </div>
        </div>
        
        <!-- Overlay -->
        <div class="slideshow-overlay"></div>
        
        <div class="hero-content">'''
    
    html = '        <!-- Haiti Slideshow -->\n'
    html += '        <div class="slideshow-container">\n'
    
    for i, image in enumerate(images):
        active = ' active' if i == 0 else ''
        # Create a nice alt text from filename
        alt_text = image.replace('-', ' ').replace('_', ' ').rsplit('.', 1)[0].title()
        html += f'            <div class="slide{active}">\n'
        html += f'                <img src="https://pyebwa.com/images/SlideShow/{image}" alt="{alt_text}">\n'
        html += f'            </div>\n'
    
    html += '        </div>\n'
    html += '        \n'
    html += '        <!-- Overlay -->\n'
    html += '        <div class="slideshow-overlay"></div>\n'
    html += '        \n'
    html += '        <div class="hero-content">'
    return html

def update_index_file(slideshow_html):
    """Update the index.html file with new slideshow content"""
    try:
        # Read current file
        with open(LOCAL_INDEX, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find and replace slideshow section
        # Pattern to match from slideshow to hero-content opening
        pattern = r'(\s*)<!-- Haiti Slideshow -->.*?<div class="hero-content">'
        
        # Replace with new slideshow HTML
        new_content = re.sub(pattern, slideshow_html, content, flags=re.DOTALL)
        
        # Check if replacement was made
        if new_content != content:
            # Write updated content
            with open(LOCAL_INDEX, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"[{datetime.now()}] Updated index.html with new slideshow")
            return True
        else:
            print(f"[{datetime.now()}] No changes needed to index.html")
            return False
            
    except Exception as e:
        print(f"[{datetime.now()}] Error updating index file: {e}")
        return False

def upload_index_file():
    """Upload the updated index.html to server"""
    try:
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        ftp.cwd(FTP_DIR)
        
        with open(LOCAL_INDEX, 'rb') as f:
            ftp.storbinary('STOR index.html', f)
        
        ftp.quit()
        print(f"[{datetime.now()}] Uploaded updated index.html to server")
        return True
        
    except Exception as e:
        print(f"[{datetime.now()}] Error uploading file: {e}")
        return False

def main():
    """Main function to update slideshow"""
    print(f"\n[{datetime.now()}] Starting slideshow update...")
    
    # Get current images
    images = get_slideshow_images()
    
    if images:
        # Generate new slideshow HTML
        slideshow_html = generate_slideshow_html(images)
        
        # Update local file
        if update_index_file(slideshow_html):
            # Upload to server
            upload_index_file()
    else:
        print(f"[{datetime.now()}] No images found, keeping current slideshow")
    
    print(f"[{datetime.now()}] Slideshow update complete")

if __name__ == "__main__":
    main()