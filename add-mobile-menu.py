#!/usr/bin/env python3
import re

# List of files to update
files = [
    'pyebwa.com/about.html',
    'pyebwa.com/contact.html',
    'pyebwa.com/mission.html'
]

for file_path in files:
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Add mobile menu toggle button after nav-menu div
    if 'mobile-menu-toggle' not in content:
        content = content.replace(
            '</div>\n        </div>\n    </nav>',
            '</div>\n            <button class="mobile-menu-toggle" id="mobileMenuToggle">\n                <span class="material-icons">menu</span>\n            </button>\n        </div>\n    </nav>'
        )
    
    # Add mobile menu script before closing body tag
    if 'mobileMenuToggle' not in content:
        mobile_script = '''
    <script>
        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.navbar') && navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                }
            });
            
            // Close menu when clicking a link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                });
            });
        }
    </script>
'''
        # Insert before the existing closing scripts
        content = content.replace('    <script src="js/firebase-config.js">', mobile_script + '    <script src="js/firebase-config.js">')
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"✓ Updated {file_path}")

print("\nMobile menu added to all pages!")