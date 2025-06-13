#!/usr/bin/env python3
import requests
import json
import time
from datetime import datetime
from urllib.parse import urlparse

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

def print_test(name, passed, details=""):
    status = f"{GREEN}✓ PASS{RESET}" if passed else f"{RED}✗ FAIL{RESET}"
    print(f"{status} {name}")
    if details:
        print(f"  {YELLOW}→ {details}{RESET}")

def test_url_redirect(url, expected_redirect=None, follow_redirects=False):
    """Test if a URL redirects to the expected location"""
    try:
        response = requests.get(url, allow_redirects=follow_redirects, timeout=10)
        
        if expected_redirect and not follow_redirects:
            # Check if it's a redirect
            if response.status_code in [301, 302, 303, 307, 308]:
                redirect_url = response.headers.get('Location', '')
                return redirect_url == expected_redirect, f"Redirects to: {redirect_url}"
            else:
                return False, f"Status code: {response.status_code}, no redirect"
        
        return response.status_code == 200, f"Status code: {response.status_code}"
    except Exception as e:
        return False, f"Error: {str(e)}"

def test_css_content(url, search_text):
    """Test if CSS file contains specific text"""
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            content = response.text
            if search_text in content:
                return True, "Found expected CSS rule"
            else:
                return False, "CSS rule not found in file"
        else:
            return False, f"Status code: {response.status_code}"
    except Exception as e:
        return False, f"Error: {str(e)}"

def test_javascript_content(url, search_texts):
    """Test if JavaScript file contains specific text"""
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            content = response.text
            missing = []
            for text in search_texts:
                if text not in content:
                    missing.append(text)
            
            if not missing:
                return True, "All expected content found"
            else:
                return False, f"Missing: {', '.join(missing[:2])}..."
        else:
            return False, f"Status code: {response.status_code}"
    except Exception as e:
        return False, f"Error: {str(e)}"

def test_html_meta_redirect(url, expected_redirect):
    """Test if HTML page has meta refresh redirect"""
    try:
        response = requests.get(url, allow_redirects=False, timeout=10)
        if response.status_code == 200:
            content = response.text.lower()
            if 'meta http-equiv="refresh"' in content and expected_redirect.lower() in content:
                return True, "Meta refresh redirect found"
            else:
                return False, "No meta refresh or wrong redirect URL"
        else:
            return False, f"Status code: {response.status_code}"
    except Exception as e:
        return False, f"Error: {str(e)}"

def run_tests():
    print_header("PYEBWA COMPREHENSIVE TEST SUITE")
    print(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    total_tests = 0
    passed_tests = 0
    
    # Test 1: Dark Mode CSS
    print_header("1. DARK MODE HEADER TESTS")
    
    test_name = "CSS file accessibility"
    passed, details = test_url_redirect("https://rasin.pyebwa.com/app/css/app-modern.css?v=3", follow_redirects=True)
    print_test(test_name, passed, details)
    total_tests += 1
    if passed: passed_tests += 1
    
    test_name = "Dark mode CSS rule"
    passed, details = test_css_content(
        "https://rasin.pyebwa.com/app/css/app-modern.css?v=3",
        "body.dark-mode .app-header"
    )
    print_test(test_name, passed, details)
    total_tests += 1
    if passed: passed_tests += 1
    
    test_name = "Black background color in CSS"
    passed, details = test_css_content(
        "https://rasin.pyebwa.com/app/css/app-modern.css?v=3",
        "background: #000 !important"
    )
    print_test(test_name, passed, details)
    total_tests += 1
    if passed: passed_tests += 1
    
    # Test 2: Login Redirects
    print_header("2. LOGIN REDIRECT TESTS")
    
    test_name = "pyebwa.com/login/ redirect"
    passed, details = test_url_redirect(
        "https://pyebwa.com/login/",
        "https://rasin.pyebwa.com/login.html"
    )
    print_test(test_name, passed, details)
    total_tests += 1
    if passed: passed_tests += 1
    
    test_name = "pyebwa.com/login/ HTML fallback"
    passed, details = test_html_meta_redirect(
        "https://pyebwa.com/login/",
        "https://rasin.pyebwa.com/login.html"
    )
    print_test(test_name, passed, details)
    total_tests += 1
    if passed: passed_tests += 1
    
    test_name = "Login page accessibility"
    passed, details = test_url_redirect("https://rasin.pyebwa.com/login.html", follow_redirects=True)
    print_test(test_name, passed, details)
    total_tests += 1
    if passed: passed_tests += 1
    
    # Test 3: JavaScript Login References
    print_header("3. JAVASCRIPT LOGIN URL TESTS")
    
    test_name = "app.js correct login URL"
    passed, details = test_javascript_content(
        "https://pyebwa.com/js/app.js",
        ["https://rasin.pyebwa.com/login.html"]
    )
    print_test(test_name, passed, details)
    total_tests += 1
    if passed: passed_tests += 1
    
    test_name = "app.js no old login URLs"
    response = requests.get("https://pyebwa.com/js/app.js", timeout=10)
    passed = "https://pyebwa.com/login/" not in response.text
    details = "No references to old login URL" if passed else "Found old login URL"
    print_test(test_name, passed, details)
    total_tests += 1
    if passed: passed_tests += 1
    
    # Test 4: App Features
    print_header("4. APP FEATURE TESTS")
    
    test_name = "App index page"
    passed, details = test_url_redirect("https://rasin.pyebwa.com/app/", follow_redirects=True)
    print_test(test_name, passed, details)
    total_tests += 1
    if passed: passed_tests += 1
    
    test_name = "PNG logo in app"
    passed, details = test_url_redirect("https://rasin.pyebwa.com/app/images/pyebwa-logo.png", follow_redirects=True)
    print_test(test_name, passed, details)
    total_tests += 1
    if passed: passed_tests += 1
    
    test_name = "Favicon in app"
    passed, details = test_url_redirect("https://rasin.pyebwa.com/app/favicon.ico", follow_redirects=True)
    print_test(test_name, passed, details)
    total_tests += 1
    if passed: passed_tests += 1
    
    # Test 5: Test Pages
    print_header("5. TEST PAGE ACCESSIBILITY")
    
    test_pages = [
        "https://rasin.pyebwa.com/test-dark-mode-complete.html",
        "https://rasin.pyebwa.com/test-dark-mode-header.html"
    ]
    
    for page in test_pages:
        test_name = f"Test page: {page.split('/')[-1]}"
        passed, details = test_url_redirect(page, follow_redirects=True)
        print_test(test_name, passed, details)
        total_tests += 1
        if passed: passed_tests += 1
    
    # Test 6: Main Site Features
    print_header("6. MAIN SITE TESTS")
    
    test_name = "Main site homepage"
    passed, details = test_url_redirect("https://pyebwa.com/", follow_redirects=True)
    print_test(test_name, passed, details)
    total_tests += 1
    if passed: passed_tests += 1
    
    test_name = "Cookie utility script"
    passed, details = test_url_redirect("https://rasin.pyebwa.com/app/js/cookies.js", follow_redirects=True)
    print_test(test_name, passed, details)
    total_tests += 1
    if passed: passed_tests += 1
    
    test_name = "Translations script"
    passed, details = test_url_redirect("https://rasin.pyebwa.com/app/js/translations.js", follow_redirects=True)
    print_test(test_name, passed, details)
    total_tests += 1
    if passed: passed_tests += 1
    
    # Summary
    print_header("TEST SUMMARY")
    success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {GREEN}{passed_tests}{RESET}")
    print(f"Failed: {RED}{total_tests - passed_tests}{RESET}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if success_rate == 100:
        print(f"\n{GREEN}🎉 All tests passed!{RESET}")
    elif success_rate >= 80:
        print(f"\n{YELLOW}⚠️  Most tests passed, but some issues need attention.{RESET}")
    else:
        print(f"\n{RED}❌ Multiple tests failed. Please investigate.{RESET}")
    
    # Recommendations
    if total_tests - passed_tests > 0:
        print_header("RECOMMENDATIONS")
        print("1. Check server configuration for redirects")
        print("2. Verify files were uploaded correctly")
        print("3. Clear browser cache and test manually")
        print("4. Check .htaccess file permissions")

if __name__ == "__main__":
    run_tests()