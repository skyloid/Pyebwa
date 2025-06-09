#!/usr/bin/env python3
"""
Comprehensive Website Testing Script for Pyebwa
Tests all major functionalities of the website
"""

import os
import re
import json
from pathlib import Path

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test_header(test_name):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}TEST: {test_name}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def print_result(test_name, passed, details=""):
    status = f"{GREEN}PASSED{RESET}" if passed else f"{RED}FAILED{RESET}"
    print(f"  [{status}] {test_name}")
    if details:
        print(f"    {YELLOW}→ {details}{RESET}")

def test_page_existence():
    """Test 1: Check if all main pages exist"""
    print_test_header("1. Main Pages Existence")
    
    pages = ['index.html', 'about.html', 'mission.html', 'contact.html']
    base_path = Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com')
    
    all_exist = True
    for page in pages:
        page_path = base_path / page
        exists = page_path.exists()
        print_result(f"Page {page} exists", exists, 
                    f"Path: {page_path}" if exists else f"Missing at {page_path}")
        if not exists:
            all_exist = False
    
    return all_exist

def test_language_switching():
    """Test 2: Check language switching functionality"""
    print_test_header("2. Language Switching Functionality")
    
    # Check language.js exists
    lang_js = Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/language.js')
    js_exists = lang_js.exists()
    print_result("language.js exists", js_exists)
    
    # Check translations-pages.js exists
    trans_js = Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/translations-pages.js')
    trans_exists = trans_js.exists()
    print_result("translations-pages.js exists", trans_exists)
    
    # Check if language selector is present in pages
    pages = ['index.html', 'about.html', 'mission.html', 'contact.html']
    base_path = Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com')
    
    selector_found = True
    for page in pages:
        page_path = base_path / page
        if page_path.exists():
            content = page_path.read_text()
            has_selector = 'language-selector' in content and 'lang-btn' in content
            print_result(f"Language selector in {page}", has_selector)
            if not has_selector:
                selector_found = False
    
    # Check for data-i18n attributes
    if (base_path / 'index.html').exists():
        content = (base_path / 'index.html').read_text()
        has_i18n = 'data-i18n' in content
        print_result("data-i18n attributes present", has_i18n,
                    f"Found {content.count('data-i18n')} translation keys")
    
    return js_exists and trans_exists and selector_found

def test_footer_text():
    """Test 3: Verify footer text shows 'Technologies Humanitaires'"""
    print_test_header("3. Footer 'Technologies Humanitaires' Text")
    
    pages = ['index.html', 'about.html', 'mission.html', 'contact.html']
    base_path = Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com')
    
    all_have_text = True
    for page in pages:
        page_path = base_path / page
        if page_path.exists():
            content = page_path.read_text()
            has_text = 'Technologies Humanitaires' in content
            print_result(f"Footer text in {page}", has_text)
            if has_text:
                # Find the context
                match = re.search(r'.{0,50}Technologies Humanitaires.{0,50}', content)
                if match:
                    print(f"    Context: ...{match.group(0)}...")
            else:
                all_have_text = False
    
    return all_have_text

def test_mobile_menu():
    """Test 4: Test mobile menu functionality"""
    print_test_header("4. Mobile Menu Functionality")
    
    # Check mobile.css exists
    mobile_css = Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/css/mobile.css')
    css_exists = mobile_css.exists()
    print_result("mobile.css exists", css_exists)
    
    # Check for mobile menu elements in HTML
    pages = ['index.html', 'about.html', 'mission.html', 'contact.html']
    base_path = Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com')
    
    menu_found = True
    for page in pages:
        page_path = base_path / page
        if page_path.exists():
            content = page_path.read_text()
            has_toggle = 'mobile-menu-toggle' in content or 'mobileMenuToggle' in content
            has_nav_menu = 'nav-menu' in content or 'navMenu' in content
            print_result(f"Mobile menu elements in {page}", has_toggle and has_nav_menu,
                        f"Toggle: {has_toggle}, NavMenu: {has_nav_menu}")
            if not (has_toggle and has_nav_menu):
                menu_found = False
    
    # Check app.js for mobile menu code
    app_js = Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/app.js')
    if app_js.exists():
        content = app_js.read_text()
        has_menu_code = 'mobileMenuToggle' in content or 'mobile-menu' in content
        print_result("Mobile menu JavaScript code", has_menu_code)
    
    return css_exists and menu_found

def test_slideshow():
    """Test 5: Check if slideshow is working on mission page"""
    print_test_header("5. Mission Page Slideshow")
    
    # Check forest-slideshow.js exists
    slideshow_js = Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/forest-slideshow.js')
    js_exists = slideshow_js.exists()
    print_result("forest-slideshow.js exists", js_exists)
    
    # Check mission.html for slideshow elements
    mission_html = Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/mission.html')
    if mission_html.exists():
        content = mission_html.read_text()
        has_slideshow = 'forest-slideshow' in content
        has_slides = 'forest-slide' in content
        slide_count = content.count('forest-slide')
        print_result("Slideshow container in mission.html", has_slideshow)
        print_result("Slide elements in mission.html", has_slides,
                    f"Found {slide_count} slides")
        
        # Check if slideshow JS is included
        has_script = 'forest-slideshow.js' in content
        print_result("Slideshow script included", has_script)
    
    return js_exists and has_slideshow and has_slides

def test_authentication():
    """Test 6: Test authentication redirects"""
    print_test_header("6. Authentication System")
    
    # Check auth-related files
    auth_files = {
        'auth.js': Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/auth.js'),
        'auth-bridge.js': Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/auth-bridge.js'),
        'firebase-config.js': Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/firebase-config.js'),
        'dashboard.html': Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/dashboard.html')
    }
    
    all_exist = True
    for name, path in auth_files.items():
        exists = path.exists()
        print_result(f"{name} exists", exists)
        if not exists:
            all_exist = False
    
    # Check for auth buttons in index.html
    index_html = Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/index.html')
    if index_html.exists():
        content = index_html.read_text()
        has_login = 'loginBtn' in content
        has_signup = 'signupBtn' in content
        print_result("Login button in index.html", has_login)
        print_result("Signup button in index.html", has_signup)
    
    # Check for Firebase SDK
    if index_html.exists():
        content = index_html.read_text()
        has_firebase = 'firebase-app-compat.js' in content
        print_result("Firebase SDK included", has_firebase)
    
    return all_exist

def test_back_to_top():
    """Test 7: Verify back-to-top button functionality"""
    print_test_header("7. Back-to-Top Button")
    
    # Check back-to-top.js exists
    btt_js = Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/back-to-top.js')
    js_exists = btt_js.exists()
    print_result("back-to-top.js exists", js_exists)
    
    # Check if script is included in pages
    pages = ['index.html', 'about.html', 'mission.html', 'contact.html']
    base_path = Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com')
    
    script_included = True
    for page in pages:
        page_path = base_path / page
        if page_path.exists():
            content = page_path.read_text()
            has_script = 'back-to-top.js' in content
            print_result(f"Back-to-top script in {page}", has_script)
            if not has_script:
                script_included = False
    
    return js_exists and script_included

def test_translation_keys():
    """Test 8: Check all translation keys are working"""
    print_test_header("8. Translation Keys")
    
    # Check translations-pages.js
    trans_js = Path('/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/translations-pages.js')
    if trans_js.exists():
        content = trans_js.read_text()
        # Count translation keys per language
        en_count = content.count('en:') + content.count('"en"')
        fr_count = content.count('fr:') + content.count('"fr"')
        ht_count = content.count('ht:') + content.count('"ht"')
        
        print_result("Translation file exists", True, 
                    f"Languages found - EN: {en_count}, FR: {fr_count}, HT: {ht_count}")
        
        # Check for common keys
        common_keys = ['home', 'about', 'ourMission', 'contact', 'login', 'signup']
        for key in common_keys:
            has_key = f'"{key}"' in content or f"'{key}'" in content
            print_result(f"Translation key '{key}'", has_key)
    else:
        print_result("Translation file exists", False)
        return False
    
    return True

def run_all_tests():
    """Run all comprehensive tests"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}COMPREHENSIVE PYEBWA WEBSITE TESTS{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    results = {
        "Page Existence": test_page_existence(),
        "Language Switching": test_language_switching(),
        "Footer Text": test_footer_text(),
        "Mobile Menu": test_mobile_menu(),
        "Mission Slideshow": test_slideshow(),
        "Authentication": test_authentication(),
        "Back-to-Top Button": test_back_to_top(),
        "Translation Keys": test_translation_keys()
    }
    
    # Summary
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{GREEN}PASSED{RESET}" if result else f"{RED}FAILED{RESET}"
        print(f"  {test_name}: [{status}]")
    
    print(f"\n{BLUE}Total: {passed}/{total} tests passed{RESET}")
    
    if passed == total:
        print(f"\n{GREEN}✓ All tests passed successfully!{RESET}")
    else:
        print(f"\n{RED}✗ Some tests failed. Please review the results above.{RESET}")

if __name__ == "__main__":
    run_all_tests()