#!/usr/bin/env python3
# Method 2: Add inline script directly to HTML

import subprocess

print("Method 2: Inline Script in HTML")
print("-" * 50)

# Read current index.html
with open('pyebwa.com/index.html', 'r') as f:
    content = f.read()

# Create inline script to add before closing body tag
inline_script = '''
    <!-- Inline Slideshow Script -->
    <script>
    (function() {
        // Inline slideshow implementation
        function startSlideshow() {
            console.log('[Inline Slideshow] Starting...');
            
            var slides = document.querySelectorAll('.slideshow-container .slide');
            if (!slides || slides.length < 2) {
                console.error('[Inline Slideshow] Not enough slides found');
                return;
            }
            
            var currentSlide = 0;
            var slideInterval = 7000; // 7 seconds
            
            // Initialize first slide
            for (var i = 0; i < slides.length; i++) {
                slides[i].style.opacity = i === 0 ? '1' : '0';
                slides[i].style.display = 'block';
                slides[i].style.position = 'absolute';
                slides[i].style.width = '100%';
                slides[i].style.height = '100%';
                slides[i].style.transition = 'opacity 2s ease-in-out';
            }
            
            function nextSlide() {
                slides[currentSlide].style.opacity = '0';
                currentSlide = (currentSlide + 1) % slides.length;
                slides[currentSlide].style.opacity = '1';
                console.log('[Inline Slideshow] Showing slide ' + (currentSlide + 1));
            }
            
            setInterval(nextSlide, slideInterval);
            console.log('[Inline Slideshow] Started with ' + slides.length + ' slides');
        }
        
        // Try multiple times to ensure DOM is ready
        if (document.readyState === 'complete') {
            startSlideshow();
        } else {
            window.addEventListener('load', startSlideshow);
        }
        setTimeout(startSlideshow, 1000);
        setTimeout(startSlideshow, 2000);
    })();
    </script>
'''

# Remove existing slideshow script reference and add inline script
content = content.replace('<script src="js/main-slideshow.js"></script>', '')
content = content.replace('</body>', inline_script + '\n</body>')

# Save modified file
with open('pyebwa.com/index-inline.html', 'w') as f:
    f.write(content)

print("✓ Created index-inline.html with embedded slideshow script")

# Upload file
ftp_script = """
open ftp.pyebwa.com
user pyebwa Boston2013
binary
"""

print("\nUploading index-inline.html as index.html...")

with open('/tmp/ftp_commands.txt', 'w') as f:
    f.write(ftp_script)
    f.write("cd /htdocs/pyebwa.com/\n")
    f.write("put pyebwa.com/index-inline.html index.html\n")
    f.write("quit\n")

try:
    result = subprocess.run(['ftp', '-n', '-v'], 
                          stdin=open('/tmp/ftp_commands.txt', 'r'),
                          capture_output=True, text=True)
    
    if result.returncode == 0:
        print("✓ Successfully uploaded inline version")
    else:
        print("✗ Failed to upload")
except Exception as e:
    print(f"✗ Error: {e}")

print("\n" + "-" * 50)
print("Method 2 deployed!")
print("\nThis solution embeds the script directly in HTML:")
print("- No external file dependencies")
print("- Multiple initialization attempts")
print("- Direct style manipulation")
print("- Maximum compatibility")
print("\nTest at: https://pyebwa.com/")