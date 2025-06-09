#!/usr/bin/env python3
"""
Test that modal windows have been removed from pyebwa.com homepage
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime

def test_homepage():
    print(f"\n=== Testing Homepage Modal Removal - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    
    try:
        # Fetch the homepage
        print("Fetching pyebwa.com homepage...")
        response = requests.get("https://pyebwa.com", timeout=10)
        print(f"✓ Status: {response.status_code}")
        
        if response.status_code != 200:
            print("✗ Failed to fetch homepage")
            return
        
        # Parse HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Test 1: Check for modal elements
        print("\n1. Checking for modal elements in HTML:")
        print("-" * 50)
        
        modal_elements = {
            'loginModal': soup.find(id='loginModal'),
            'signupModal': soup.find(id='signupModal'),
            'modalOverlay': soup.find(id='modalOverlay'),
            'loginForm': soup.find(id='loginForm'),
            'signupForm': soup.find(id='signupForm')
        }
        
        for element_id, element in modal_elements.items():
            if element:
                if element_id == 'modalOverlay':
                    print(f"✓ {element_id}: Found (kept as requested)")
                else:
                    print(f"✗ {element_id}: Still exists (should be removed)")
            else:
                if element_id == 'modalOverlay':
                    print(f"✗ {element_id}: Not found (should be kept)")
                else:
                    print(f"✓ {element_id}: Removed successfully")
        
        # Test 2: Check for auth buttons
        print("\n2. Checking authentication buttons:")
        print("-" * 50)
        
        auth_buttons = {
            'loginBtn': soup.find(id='loginBtn'),
            'signupBtn': soup.find(id='signupBtn'),
            'ctaBtn': soup.find(id='ctaBtn')
        }
        
        for btn_id, btn in auth_buttons.items():
            if btn:
                print(f"✓ {btn_id}: Found")
            else:
                print(f"✗ {btn_id}: Not found")
        
        # Test 3: Check JavaScript content
        print("\n3. Checking JavaScript configuration:")
        print("-" * 50)
        
        js_checks = [
            ('showModal function removed', 'function showModal' not in response.text),
            ('Modal references removed', 'loginModal' not in response.text or response.text.count('loginModal') <= 2),
            ('Redirect to login implemented', 'pyebwa.com/login/' in response.text),
            ('Old secure.pyebwa.com removed', 'secure.pyebwa.com' not in response.text)
        ]
        
        for check_name, check_result in js_checks:
            if check_result:
                print(f"✓ {check_name}")
            else:
                print(f"✗ {check_name}")
        
        # Test 4: Check for modal CSS classes
        print("\n4. Checking for modal-related content:")
        print("-" * 50)
        
        modal_content = [
            ('Login form fields', 'loginEmail' in response.text),
            ('Signup form fields', 'signupEmail' in response.text),
            ('Modal close buttons', 'modal-close' in response.text and response.text.count('modal-close') > 2),
            ('Social login buttons', 'googleSignIn' in response.text)
        ]
        
        for content_name, exists in modal_content:
            if not exists:
                print(f"✓ {content_name}: Removed")
            else:
                print(f"✗ {content_name}: Still present")
        
        # Summary
        print("\n=== Summary ===")
        modal_overlay_exists = modal_elements['modalOverlay'] is not None
        login_modal_removed = modal_elements['loginModal'] is None
        signup_modal_removed = modal_elements['signupModal'] is None
        
        if modal_overlay_exists and login_modal_removed and signup_modal_removed:
            print("\n✅ SUCCESS: Modal windows removed, overlay kept as requested!")
        else:
            print("\n⚠️  PARTIAL SUCCESS: Some issues found, check details above")
        
        print("\nAuthentication flow:")
        print("- All auth buttons should redirect to https://pyebwa.com/login/")
        print("- No modal windows should appear on the homepage")
        print("- Modal overlay div kept for potential future use")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")

if __name__ == "__main__":
    test_homepage()