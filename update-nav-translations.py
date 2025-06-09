#!/usr/bin/env python3
import re

# Pages to update
pages = ['about.html', 'contact.html', 'mission.html']

for page in pages:
    file_path = f'pyebwa.com/{page}'
    
    # Read the file
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Update Home link
    content = re.sub(
        r'<a href="index.html" class="nav-link">Home</a>',
        '<a href="index.html" class="nav-link" data-i18n="home">Home</a>',
        content
    )
    
    # Update About link (handling active class)
    content = re.sub(
        r'<a href="about.html" class="nav-link( active)?">About</a>',
        r'<a href="about.html" class="nav-link\1" data-i18n="about">About</a>',
        content
    )
    
    # Update Mission link (handling active class)
    content = re.sub(
        r'<a href="mission.html" class="nav-link( active)?">Our Mission</a>',
        r'<a href="mission.html" class="nav-link\1" data-i18n="ourMission">Our Mission</a>',
        content
    )
    
    # Update Contact link (handling active class)
    content = re.sub(
        r'<a href="contact.html" class="nav-link( active)?">Contact</a>',
        r'<a href="contact.html" class="nav-link\1" data-i18n="contact">Contact</a>',
        content
    )
    
    # Write back
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"✓ Updated {page}")

print("\nAll pages updated with translation attributes!")