#!/usr/bin/env python3
"""
Discover the actual structure and configuration of rasin.pyebwa.com
"""

import ftplib
import requests

# FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = "~3jB~XmCbjO>K2VY"

def test_web_access():
    """Test what files are accessible via web"""
    print("=== Testing Web Access ===\n")
    
    test_urls = [
        # Test root access
        ("https://rasin.pyebwa.com/", "Root"),
        ("https://rasin.pyebwa.com/index.html", "Root index.html"),
        
        # Test app directory
        ("https://rasin.pyebwa.com/app/", "App directory"),
        ("https://rasin.pyebwa.com/app/index.html", "App index.html"),
        
        # Test if files from main domain are accessible
        ("https://rasin.pyebwa.com/simple-login.html", "Simple login"),
        ("https://rasin.pyebwa.com/test.html", "Test file"),
        
        # Test specific paths that might work
        ("https://rasin.pyebwa.com/rasin-index.html", "Rasin index"),
        ("https://rasin.pyebwa.com/public_html/index.html", "Public_html path"),
        ("https://rasin.pyebwa.com/rasin/index.html", "Rasin subdirectory"),
    ]
    
    for url, description in test_urls:
        try:
            response = requests.head(url, timeout=5, allow_redirects=True)
            status = "✓" if response.status_code == 200 else "✗"
            print(f"{status} {description}: {url}")
            print(f"  Status: {response.status_code}, Final URL: {response.url}")
        except Exception as e:
            print(f"✗ {description}: {url}")
            print(f"  Error: {str(e)}")
        print()

def check_ftp_structure(ftp):
    """Check FTP directory structure"""
    print("\n=== Checking FTP Structure ===\n")
    
    # Check root directory
    print("Contents of /public_html:")
    print("-" * 50)
    ftp.cwd('/public_html')
    ftp.retrlines('LIST')
    
    # Look for rasin-specific directories
    print("\n\nLooking for rasin-specific content:")
    print("-" * 50)
    
    possible_locations = [
        '/domains',
        '/public_html/domains',
        '/subdomains',
        '/public_html/subdomains',
        '/addon_domains',
        '/public_html/rasin.pyebwa.com',
        '/rasin.pyebwa.com',
        '/home/u316621955/domains/rasin.pyebwa.com'
    ]
    
    for location in possible_locations:
        try:
            ftp.cwd(location)
            print(f"\n✓ Found directory: {location}")
            print("Contents:")
            ftp.retrlines('LIST')
            # Try to go deeper
            try:
                ftp.cwd('public_html')
                print("\n  Has public_html subdirectory")
                ftp.cwd('..')
            except:
                pass
        except:
            print(f"✗ Not found: {location}")

def create_test_file(ftp):
    """Create a test file to see where it appears"""
    print("\n\n=== Creating Test File ===\n")
    
    try:
        # Go back to main public_html
        ftp.cwd('/public_html')
        
        # Create test file
        test_content = b"RASIN_TEST_FILE - If you can see this, we found the right location!"
        from io import BytesIO
        ftp.storbinary('STOR rasin_test.txt', BytesIO(test_content))
        print("✓ Created test file: rasin_test.txt")
        
        # Test if accessible
        import time
        time.sleep(2)  # Wait for file to propagate
        
        test_urls = [
            "https://pyebwa.com/rasin_test.txt",
            "https://rasin.pyebwa.com/rasin_test.txt",
            "https://www.rasin.pyebwa.com/rasin_test.txt"
        ]
        
        print("\nTesting accessibility:")
        for url in test_urls:
            try:
                response = requests.get(url, timeout=5)
                if response.status_code == 200 and "RASIN_TEST_FILE" in response.text:
                    print(f"✓ Accessible at: {url}")
                else:
                    print(f"✗ Not accessible at: {url}")
            except:
                print(f"✗ Error accessing: {url}")
                
    except Exception as e:
        print(f"Error creating test file: {e}")

def main():
    print("=== Discovering rasin.pyebwa.com Structure ===\n")
    
    # Test web access first
    test_web_access()
    
    # Then check FTP structure
    try:
        print("\n" + "="*60 + "\n")
        ftp = ftplib.FTP(FTP_HOST, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected to FTP\n")
        
        check_ftp_structure(ftp)
        create_test_file(ftp)
        
        ftp.quit()
        print("\n✓ FTP connection closed")
        
    except Exception as e:
        print(f"\n✗ FTP Error: {e}")
    
    print("\n=== Discovery Complete ===")

if __name__ == "__main__":
    main()