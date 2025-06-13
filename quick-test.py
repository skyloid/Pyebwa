#!/usr/bin/env python3
import requests

print("Quick Status Check")
print("-" * 40)

# Test URLs
tests = [
    ("Dark Mode CSS", "https://rasin.pyebwa.com/app/css/app-modern.css?v=3"),
    ("App Main Page", "https://rasin.pyebwa.com/app/"),
    ("Login Page", "https://rasin.pyebwa.com/login.html"),
    ("Test Checklist", "https://rasin.pyebwa.com/manual-test-checklist.html"),
    ("Dark Mode Test", "https://rasin.pyebwa.com/test-dark-mode-complete.html"),
    ("pyebwa.com Login Redirect", "https://pyebwa.com/login/")
]

for name, url in tests:
    try:
        response = requests.get(url, timeout=5, allow_redirects=False)
        status = response.status_code
        
        # Check for redirects
        if status in [301, 302, 303, 307, 308]:
            location = response.headers.get('Location', 'Unknown')
            print(f"✓ {name}: {status} → {location}")
        else:
            print(f"{'✓' if status == 200 else '✗'} {name}: {status}")
            
    except Exception as e:
        print(f"✗ {name}: Error - {str(e)}")

print("-" * 40)

# Check CSS content
print("\nChecking Dark Mode CSS...")
try:
    response = requests.get("https://rasin.pyebwa.com/app/css/app-modern.css?v=3")
    if "background: #000 !important" in response.text:
        print("✓ Dark mode black background found in CSS")
    else:
        print("✗ Dark mode black background NOT found in CSS")
except:
    print("✗ Could not check CSS content")

# Check JS content
print("\nChecking JavaScript Login URLs...")
try:
    response = requests.get("https://pyebwa.com/js/app.js")
    if "https://rasin.pyebwa.com/login.html" in response.text:
        print("✓ Correct login URL in app.js")
    if "https://pyebwa.com/login/" not in response.text:
        print("✓ No old login URLs in app.js")
    else:
        print("✗ Found old login URL in app.js")
except:
    print("✗ Could not check JS content")