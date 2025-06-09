#!/usr/bin/env python3
import re

# Pages to update
pages = ['index.html', 'about.html', 'contact.html', 'mission.html']

for page in pages:
    file_path = f'pyebwa.com/{page}'
    
    # Read the file
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Update the Human Level Technologies Inc. link to include data-i18n
    # Look for the pattern and update it
    pattern = r'<a href="https://humanlevel.ai" target="_blank">Human Level Technologies Inc.</a>'
    replacement = '<a href="https://humanlevel.ai" target="_blank" data-i18n="humanLevelTech">Human Level Technologies Inc.</a>'
    
    content = re.sub(pattern, replacement, content)
    
    # Write back
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"✓ Updated {page}")

print("\nAll pages updated with footer translations!")