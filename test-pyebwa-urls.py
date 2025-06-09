#!/usr/bin/env python3
"""
Test different URL patterns to find the correct domain configuration
"""

import requests
import time

def test_url(url, description):
    """Test if a URL is accessible"""
    try:
        response = requests.get(url, timeout=10, allow_redirects=True)
        print(f"{'✓' if response.status_code == 200 else '✗'} {description}")
        print(f"  URL: {url}")
        print(f"  Status: {response.status_code}")
        print(f"  Final URL: {response.url}")
        if response.status_code == 200:
            # Check if it contains expected content
            if 'Pyebwa Login' in response.text:
                print(f"  ✓ Contains login form")
            elif 'Your Family Tree' in response.text:
                print(f"  ✓ Contains app content")
        print()
        return response.status_code == 200
    except Exception as e:
        print(f"✗ {description}")
        print(f"  URL: {url}")
        print(f"  Error: {str(e)}")
        print()
        return False

def main():
    print("=== Testing Different URL Patterns ===\n")
    
    # Test different domain patterns
    domains = [
        "https://rasin.pyebwa.com",
        "https://pyebwa.com",
        "https://www.pyebwa.com",
        "http://rasin.pyebwa.com",
        "http://pyebwa.com"
    ]
    
    # For each domain, test key pages
    for domain in domains:
        print(f"\nTesting {domain}:")
        print("-" * 60)
        
        test_url(f"{domain}/simple-login.html", "Simple login page")
        test_url(f"{domain}/login/", "Login directory")
        test_url(f"{domain}/app/", "App directory")
        
        # Quick pause to avoid rate limiting
        time.sleep(0.5)
    
    print("\n=== Testing Direct Access ===\n")
    
    # Test the most likely working URLs
    test_url("https://pyebwa.com/simple-login.html", "Main domain simple login")
    test_url("https://pyebwa.com/app/", "Main domain app")
    test_url("https://pyebwa.com/login/", "Main domain login directory")

if __name__ == "__main__":
    main()