# Pyebwa Navigation Structure

## Main Website (pyebwa.com)
All pages have a consistent navigation menu with the following links:
- **Home** - Landing page with hero section
- **About** - Company story, mission, values, and team
- **Our Mission** - One Billion Trees for Haiti initiative
- **Contact** - Contact form, FAQ, and support information

### Navigation Implementation:
- Located in the header of each page
- Responsive design with mobile support
- Active page highlighting
- Login/Signup buttons redirect to secure.pyebwa.com

## Application (rasin.pyebwa.com/app)
The family tree application has:

### Internal Navigation:
- **Pyebwa Fanmi** (Family Tree) - Main tree view
- **Manm yo** (Members) - Family members list
- **Istwa** (Stories) - Family stories

### External Links:
Added to user dropdown menu:
- Home (pyebwa.com)
- About
- Our Mission
- Contact

All external links open in new tabs to preserve the app state.

## Authentication (secure.pyebwa.com)
- Standalone authentication page
- Redirects users back to their origin after login
- No navigation menu (focused on auth only)

## Navigation Flow:
1. Users land on pyebwa.com
2. Can explore About, Mission, Contact pages
3. Click Login/Signup → secure.pyebwa.com
4. After auth → rasin.pyebwa.com/app
5. From app, can access main site pages via user menu

## Files Updated:
- pyebwa.com/index.html ✓
- pyebwa.com/about.html ✓
- pyebwa.com/mission.html ✓
- pyebwa.com/contact.html ✓
- app/index.html ✓ (added external links)

All navigation menus are now properly connected and functional!