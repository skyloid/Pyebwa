#!/usr/bin/env python3
import re

# Pages to update
pages = ['about.html', 'contact.html', 'mission.html']

for page in pages:
    file_path = f'pyebwa.com/{page}'
    
    # Read the file
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Add language selector after <body> tag if it doesn't exist
    if 'language-selector' not in content:
        language_selector = '''    <!-- Language Selector -->
    <div class="language-selector">
        <button class="lang-btn" data-lang="en">EN</button>
        <button class="lang-btn" data-lang="fr">FR</button>
        <button class="lang-btn active" data-lang="ht">HT</button>
    </div>
    
'''
        content = content.replace('<body>\n', '<body>\n' + language_selector)
    
    # Add language.js script before firebase-config.js if it doesn't exist
    if 'language.js' not in content:
        content = content.replace(
            '    <script src="js/firebase-config.js"></script>',
            '    <script src="js/language.js"></script>\n    <script src="js/firebase-config.js"></script>'
        )
    
    # Write back
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"✓ Updated {page}")

print("\nAll pages updated with language support!")