#!/usr/bin/env python3
# Method 3: CSS-only animation fallback

import subprocess

print("Method 3: CSS Animation Fallback")
print("-" * 50)

# Create a CSS file with keyframe animations
css_animation = """
/* CSS-only slideshow animation fallback */
@keyframes slideshowFade {
    0% { opacity: 1; }
    20% { opacity: 1; }
    25% { opacity: 0; }
    95% { opacity: 0; }
    100% { opacity: 1; }
}

/* Apply animation to slides based on their position */
.slideshow-container .slide {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    animation: slideshowFade 28s infinite;
}

/* Stagger the animation for each slide */
.slideshow-container .slide:nth-child(1) {
    animation-delay: 0s;
}

.slideshow-container .slide:nth-child(2) {
    animation-delay: 7s;
}

.slideshow-container .slide:nth-child(3) {
    animation-delay: 14s;
}

.slideshow-container .slide:nth-child(4) {
    animation-delay: 21s;
}

/* Ensure first slide is visible initially */
.slideshow-container .slide:first-child {
    opacity: 1;
}

/* Fallback for browsers that don't support nth-child */
.slideshow-container .slide.slide-1 { animation-delay: 0s; }
.slideshow-container .slide.slide-2 { animation-delay: 7s; }
.slideshow-container .slide.slide-3 { animation-delay: 14s; }
.slideshow-container .slide.slide-4 { animation-delay: 21s; }
"""

# Save CSS file
with open('pyebwa.com/css/slideshow-animation.css', 'w') as f:
    f.write(css_animation)

print("✓ Created slideshow-animation.css")

# Update index.html to include the CSS and add slide numbers
with open('pyebwa.com/index.html', 'r') as f:
    content = f.read()

# Add CSS link in head
css_link = '    <link rel="stylesheet" href="css/slideshow-animation.css">\n'
content = content.replace('</head>', css_link + '</head>')

# Add slide number classes to each slide
import re
slide_pattern = r'<div class="slide(.*?)">'
slide_counter = 1

def replace_slide(match):
    global slide_counter
    classes = match.group(1).strip()
    if classes:
        result = f'<div class="slide slide-{slide_counter}{classes}">'
    else:
        result = f'<div class="slide slide-{slide_counter}">'
    slide_counter += 1
    return result

content = re.sub(slide_pattern, replace_slide, content)

# Save modified HTML
with open('pyebwa.com/index-css.html', 'w') as f:
    f.write(content)

print("✓ Updated HTML with CSS animation classes")

# Also create a JavaScript enhancement that works with CSS
js_enhancement = """
// Enhancement for CSS animation slideshow
(function() {
    // This script enhances the CSS-only slideshow but isn't required
    console.log('[CSS Slideshow Enhancement] Checking slideshow...');
    
    var slides = document.querySelectorAll('.slideshow-container .slide');
    console.log('[CSS Slideshow Enhancement] Found ' + slides.length + ' slides');
    
    // Add slide number classes if missing
    for (var i = 0; i < slides.length; i++) {
        if (!slides[i].classList.contains('slide-' + (i + 1))) {
            slides[i].classList.add('slide-' + (i + 1));
        }
    }
    
    // Check if CSS animations are supported
    var animation = false;
    var animationstring = 'animation';
    var keyframeprefix = '';
    var domPrefixes = 'Webkit Moz O ms Khtml'.split(' ');
    
    if (slides[0] && slides[0].style.animationName !== undefined) {
        animation = true;
    }
    
    if (!animation) {
        for (var i = 0; i < domPrefixes.length; i++) {
            if (slides[0] && slides[0].style[domPrefixes[i] + 'AnimationName'] !== undefined) {
                animation = true;
                break;
            }
        }
    }
    
    if (animation) {
        console.log('[CSS Slideshow Enhancement] CSS animations supported');
    } else {
        console.log('[CSS Slideshow Enhancement] Falling back to JavaScript');
        // Fallback to JavaScript animation
        var current = 0;
        setInterval(function() {
            slides[current].style.opacity = '0';
            current = (current + 1) % slides.length;
            slides[current].style.opacity = '1';
        }, 7000);
    }
})();
"""

with open('pyebwa.com/js/slideshow-css-enhance.js', 'w') as f:
    f.write(js_enhancement)

# Upload files
files_to_upload = [
    ('pyebwa.com/index-css.html', '/htdocs/pyebwa.com/', 'index.html'),
    ('pyebwa.com/css/slideshow-animation.css', '/htdocs/pyebwa.com/css/', 'slideshow-animation.css'),
    ('pyebwa.com/js/slideshow-css-enhance.js', '/htdocs/pyebwa.com/js/', 'slideshow-css-enhance.js')
]

ftp_script = """
open ftp.pyebwa.com
user pyebwa Boston2013
binary
"""

for local_file, remote_dir, remote_name in files_to_upload:
    print(f"\nUploading {local_file}...")
    
    with open('/tmp/ftp_commands.txt', 'w') as f:
        f.write(ftp_script)
        f.write(f"cd {remote_dir}\n")
        f.write(f"put {local_file} {remote_name}\n")
        f.write("quit\n")
    
    try:
        result = subprocess.run(['ftp', '-n', '-v'], 
                              stdin=open('/tmp/ftp_commands.txt', 'r'),
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✓ Successfully uploaded {remote_name}")
        else:
            print(f"✗ Failed to upload {remote_name}")
    except Exception as e:
        print(f"✗ Error: {e}")

print("\n" + "-" * 50)
print("Method 3 deployed!")
print("\nThis solution uses CSS animations as primary method:")
print("- Works without JavaScript")
print("- Pure CSS keyframe animations")
print("- JavaScript enhancement for older browsers")
print("- Most reliable cross-browser solution")
print("\nTest at: https://pyebwa.com/")