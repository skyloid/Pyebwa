#!/usr/bin/env python3
import re

# Pages to update
pages = ['about.html', 'contact.html', 'mission.html']

for page in pages:
    file_path = f'pyebwa.com/{page}'
    
    # Read the file
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Replace the navigation structure
    old_nav = r'<div class="nav-menu">[\s\S]*?</div>\s*</div>\s*</nav>'
    
    new_nav = '''<div class="nav-menu">
                <a href="index.html" class="nav-link">Home</a>
                <a href="about.html" class="nav-link{about_active}">About</a>
                <a href="mission.html" class="nav-link{mission_active}">Our Mission</a>
                <a href="contact.html" class="nav-link{contact_active}">Contact</a>
                <div class="nav-buttons">
                    <button class="btn btn-ghost" id="loginBtn" data-i18n="login">Login</button>
                    <button class="btn btn-primary" id="signupBtn" data-i18n="signup">Sign Up</button>
                </div>
            </div>
            <button class="mobile-menu-toggle" id="mobileMenuToggle">
                <span class="material-icons">menu</span>
            </button>
            <div class="nav-menu-mobile" id="navMenuMobile">
                <a href="index.html" class="nav-link">Home</a>
                <a href="about.html" class="nav-link{about_active}">About</a>
                <a href="mission.html" class="nav-link{mission_active}">Our Mission</a>
                <a href="contact.html" class="nav-link{contact_active}">Contact</a>
                <div class="nav-actions-mobile">
                    <button class="btn btn-ghost" id="loginBtnMobile" data-i18n="login">Login</button>
                    <button class="btn btn-primary" id="signupBtnMobile" data-i18n="signup">Sign Up</button>
                </div>
            </div>
        </div>
    </nav>'''
    
    # Set active states
    about_active = ' active' if page == 'about.html' else ''
    mission_active = ' active' if page == 'mission.html' else ''
    contact_active = ' active' if page == 'contact.html' else ''
    
    new_nav = new_nav.format(
        about_active=about_active,
        mission_active=mission_active,
        contact_active=contact_active
    )
    
    # Update content
    content = re.sub(old_nav, new_nav, content, flags=re.DOTALL)
    
    # Add mobile menu script
    if 'mobileMenuToggle' not in content:
        # Add before closing body tag
        mobile_script = '''
    <script>
        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const navMenuMobile = document.getElementById('navMenuMobile');
        
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                navMenuMobile.classList.toggle('active');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.navbar') && navMenuMobile.classList.contains('active')) {
                    navMenuMobile.classList.remove('active');
                }
            });
        }
        
        // Mobile login/signup buttons
        const loginBtnMobile = document.getElementById('loginBtnMobile');
        const signupBtnMobile = document.getElementById('signupBtnMobile');
        
        if (loginBtnMobile) {
            loginBtnMobile.addEventListener('click', () => {
                window.location.href = 'https://secure.pyebwa.com/?redirect=' + encodeURIComponent(window.location.href);
            });
        }
        
        if (signupBtnMobile) {
            signupBtnMobile.addEventListener('click', () => {
                window.location.href = 'https://secure.pyebwa.com/?redirect=' + encodeURIComponent(window.location.href);
            });
        }
    </script>
</body>'''
        content = content.replace('</body>', mobile_script)
    
    # Write back
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"✓ Updated {page}")

print("\nAll pages updated with mobile navigation!")