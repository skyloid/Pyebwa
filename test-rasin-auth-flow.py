#!/usr/bin/env python3
"""
Test the authentication flow on rasin.pyebwa.com
"""

import requests
from urllib.parse import urlparse, parse_qs
import time

def test_redirect_chain():
    print("=== Testing rasin.pyebwa.com Authentication Flow ===\n")
    
    # Test 1: Check login page accessibility
    print("1. Testing login page accessibility:")
    print("-" * 50)
    
    login_urls = [
        "https://rasin.pyebwa.com/login/",
        "https://rasin.pyebwa.com/simple-login.html",
    ]
    
    for url in login_urls:
        try:
            response = requests.get(url, allow_redirects=False, timeout=10)
            print(f"\nURL: {url}")
            print(f"Status: {response.status_code}")
            
            if response.status_code in [301, 302, 303, 307, 308]:
                location = response.headers.get('Location', 'No location header')
                print(f"Redirects to: {location}")
                
                # Check for JavaScript redirects
            elif response.status_code == 200:
                if 'window.location' in response.text:
                    import re
                    matches = re.findall(r'window\.location(?:\.href)?\s*=\s*[\'"]([^\'"]+)[\'"]', response.text)
                    if matches:
                        print("JavaScript redirects found:")
                        for match in matches[:3]:  # Show first 3
                            print(f"  → {match}")
                else:
                    print("✓ No automatic redirects found")
                    
        except Exception as e:
            print(f"Error testing {url}: {e}")
    
    # Test 2: Check for .htaccess redirects
    print("\n\n2. Testing for server-side redirects:")
    print("-" * 50)
    
    test_paths = [
        "/login/",
        "/login/index.html",
        "/app/",
        "/"
    ]
    
    session = requests.Session()
    for path in test_paths:
        url = f"https://rasin.pyebwa.com{path}"
        try:
            # Follow redirects manually to see the chain
            redirect_chain = []
            current_url = url
            
            for i in range(5):  # Max 5 redirects
                resp = session.get(current_url, allow_redirects=False, timeout=5)
                redirect_chain.append({
                    'url': current_url,
                    'status': resp.status_code,
                    'location': resp.headers.get('Location', 'None')
                })
                
                if resp.status_code not in [301, 302, 303, 307, 308]:
                    break
                    
                # Get next URL
                location = resp.headers.get('Location')
                if location:
                    if location.startswith('http'):
                        current_url = location
                    else:
                        parsed = urlparse(current_url)
                        current_url = f"{parsed.scheme}://{parsed.netloc}{location}"
                else:
                    break
            
            print(f"\nPath: {path}")
            for idx, step in enumerate(redirect_chain):
                print(f"  Step {idx + 1}: {step['status']} - {step['url']}")
                if step['location'] != 'None':
                    print(f"          → {step['location']}")
                    
        except Exception as e:
            print(f"Error testing {path}: {e}")
    
    # Test 3: Check for redirect parameters
    print("\n\n3. Checking for redirect parameters in responses:")
    print("-" * 50)
    
    # Test the app page to see what happens when not authenticated
    try:
        response = requests.get("https://rasin.pyebwa.com/app/", allow_redirects=True, timeout=10)
        final_url = response.url
        parsed = urlparse(final_url)
        params = parse_qs(parsed.query)
        
        print(f"Final URL after redirects: {final_url}")
        if params:
            print("URL parameters found:")
            for key, values in params.items():
                print(f"  {key}: {values}")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_redirect_chain()