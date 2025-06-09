#!/usr/bin/env python3
"""
Test the complete authentication flow
"""

import requests
import time

def test_redirect_flow():
    """Test the authentication redirect flow"""
    print("=== Testing Authentication Flow ===\n")
    
    # Test 1: App redirect
    print("1. Testing app redirect when not authenticated:")
    print("-" * 50)
    
    try:
        session = requests.Session()
        response = session.get("https://rasin.pyebwa.com/app/", allow_redirects=False)
        
        print(f"Initial request to: https://rasin.pyebwa.com/app/")
        print(f"Response status: {response.status_code}")
        
        if 'location' in response.headers:
            print(f"Redirects to: {response.headers['location']}")
        else:
            # Check JavaScript redirect in content
            if 'window.location.href' in response.text:
                import re
                match = re.search(r'window\.location\.href\s*=\s*[\'"]([^\'"]+)[\'"]', response.text)
                if match:
                    print(f"JavaScript redirect to: {match.group(1)}")
            else:
                print("No redirect found - checking content...")
                if 'Pyebwa - Your Family Tree' in response.text:
                    print("✓ App page loaded (contains app content)")
                if 'firebase-auth-compat.js' in response.text:
                    print("✓ Firebase auth script present")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 2: Login page accessibility
    print("\n2. Testing login pages:")
    print("-" * 50)
    
    login_urls = [
        ("https://pyebwa.com/login/", "Primary login page"),
        ("https://pyebwa.com/simple-login.html", "Fallback login page"),
    ]
    
    for url, desc in login_urls:
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                print(f"✓ {desc}: {url}")
                if 'loginForm' in response.text:
                    print("  ✓ Contains login form")
                if 'firebase-auth-compat.js' in response.text:
                    print("  ✓ Contains Firebase auth")
                if 'rasin.pyebwa.com/app/' in response.text:
                    print("  ✓ Redirects back to rasin.pyebwa.com after login")
            else:
                print(f"✗ {desc}: {url} (Status: {response.status_code})")
        except Exception as e:
            print(f"✗ {desc}: {url} (Error: {e})")
    
    # Test 3: Check for loops
    print("\n3. Testing for redirect loops:")
    print("-" * 50)
    
    try:
        session = requests.Session()
        visited_urls = []
        url = "https://rasin.pyebwa.com/app/"
        
        for i in range(5):
            response = session.get(url, allow_redirects=False, timeout=5)
            visited_urls.append(f"{url} -> {response.status_code}")
            
            if response.status_code in [301, 302, 303, 307, 308]:
                url = response.headers.get('Location', '')
                if not url.startswith('http'):
                    # Handle relative URLs
                    from urllib.parse import urljoin
                    url = urljoin(response.url, url)
            else:
                break
        
        print("Redirect chain:")
        for v in visited_urls:
            print(f"  {v}")
        
        if len(visited_urls) > 3:
            print("\n⚠️  Potential redirect loop!")
        else:
            print("\n✓ No redirect loop detected")
            
    except Exception as e:
        print(f"Error testing redirects: {e}")
    
    # Summary
    print("\n=== Summary ===")
    print("\nExpected flow:")
    print("1. User visits https://rasin.pyebwa.com/app/")
    print("2. JavaScript detects no auth and redirects to https://pyebwa.com/login/")
    print("3. User logs in")
    print("4. After login, redirected back to https://rasin.pyebwa.com/app/")
    print("5. App loads with user authenticated")

if __name__ == "__main__":
    test_redirect_flow()