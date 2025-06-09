#!/usr/bin/env python3
"""
Comprehensive authentication tests for Pyebwa app
"""

import requests
import time
from datetime import datetime

def test_url(url, description, expected_status=200):
    """Test if a URL is accessible"""
    try:
        response = requests.head(url, timeout=10, allow_redirects=True)
        status = "✓" if response.status_code == expected_status else "✗"
        print(f"{status} {description}: {url} (Status: {response.status_code})")
        return response.status_code == expected_status
    except Exception as e:
        print(f"✗ {description}: {url} (Error: {str(e)})")
        return False

def test_content(url, description, expected_content):
    """Test if a URL contains expected content"""
    try:
        response = requests.get(url, timeout=10)
        if expected_content in response.text:
            print(f"✓ {description}: Found '{expected_content}'")
            return True
        else:
            print(f"✗ {description}: Missing '{expected_content}'")
            return False
    except Exception as e:
        print(f"✗ {description}: Error - {str(e)}")
        return False

def run_tests():
    print(f"\n=== Pyebwa Authentication Tests - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    
    base_url = "https://rasin.pyebwa.com"
    tests_passed = 0
    total_tests = 0
    
    # Test 1: Check if login pages exist
    print("1. Testing Login Page Availability:")
    print("-" * 50)
    
    login_urls = [
        (f"{base_url}/login/", "Primary login directory"),
        (f"{base_url}/login/index.html", "Login index.html"),
        (f"{base_url}/simple-login.html", "Fallback login page"),
    ]
    
    for url, desc in login_urls:
        total_tests += 1
        if test_url(url, desc):
            tests_passed += 1
    
    # Test 2: Check app pages
    print("\n2. Testing App Pages:")
    print("-" * 50)
    
    app_urls = [
        (f"{base_url}/app/", "App directory"),
        (f"{base_url}/app/index.html", "App index.html"),
    ]
    
    for url, desc in app_urls:
        total_tests += 1
        if test_url(url, desc):
            tests_passed += 1
    
    # Test 3: Check CSS/JS resources
    print("\n3. Testing App Resources (CSS/JS):")
    print("-" * 50)
    
    resource_urls = [
        (f"{base_url}/app/css/app.css", "App CSS"),
        (f"{base_url}/app/css/tree.css", "Tree CSS"),
        (f"{base_url}/app/css/footer.css", "Footer CSS"),
        (f"{base_url}/app/js/firebase-config.js", "Firebase config"),
        (f"{base_url}/app/js/app.js", "App JavaScript"),
        (f"{base_url}/app/js/translations.js", "Translations"),
    ]
    
    for url, desc in resource_urls:
        total_tests += 1
        if test_url(url, desc):
            tests_passed += 1
    
    # Test 4: Check login page content
    print("\n4. Testing Login Page Content:")
    print("-" * 50)
    
    total_tests += 1
    if test_content(f"{base_url}/login/", "Login form", '<form id="loginForm">'):
        tests_passed += 1
    
    total_tests += 1
    if test_content(f"{base_url}/login/", "Firebase script", 'firebase-app-compat.js'):
        tests_passed += 1
    
    # Test 5: Check app redirect behavior
    print("\n5. Testing App Redirect Behavior:")
    print("-" * 50)
    
    total_tests += 1
    try:
        response = requests.get(f"{base_url}/app/", allow_redirects=False, timeout=10)
        if response.status_code == 200:
            print("✓ App page loads without immediate redirect (good)")
            tests_passed += 1
        else:
            print(f"✗ App page returned status {response.status_code}")
    except:
        print("✗ Could not test app redirect behavior")
    
    # Test 6: Check for redirect loops
    print("\n6. Testing for Redirect Loops:")
    print("-" * 50)
    
    total_tests += 1
    try:
        session = requests.Session()
        redirects = []
        url = f"{base_url}/app/"
        
        for i in range(5):  # Check up to 5 redirects
            response = session.get(url, allow_redirects=False, timeout=5)
            if response.status_code in [301, 302, 303, 307, 308]:
                location = response.headers.get('Location', '')
                redirects.append(f"{response.status_code} -> {location}")
                url = location if location.startswith('http') else f"{base_url}{location}"
            else:
                break
        
        if len(redirects) > 3:
            print(f"✗ Potential redirect loop detected ({len(redirects)} redirects):")
            for r in redirects:
                print(f"  {r}")
        else:
            print(f"✓ No redirect loop detected ({len(redirects)} redirects)")
            tests_passed += 1
            if redirects:
                for r in redirects:
                    print(f"  {r}")
    except Exception as e:
        print(f"✗ Error testing redirects: {str(e)}")
    
    # Summary
    print("\n" + "=" * 60)
    print(f"SUMMARY: {tests_passed}/{total_tests} tests passed")
    print("=" * 60)
    
    if tests_passed == total_tests:
        print("\n✅ All tests passed! The authentication system is working correctly.")
    else:
        print(f"\n⚠️  {total_tests - tests_passed} tests failed. Please check the issues above.")
    
    return tests_passed == total_tests

if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)