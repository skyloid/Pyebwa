#!/usr/bin/env python3
import ftplib

# FTP credentials for www.pyebwa.com
FTP_HOST = '145.223.107.9'
FTP_USER = 'u316621955.pyebwa.com'
FTP_PASS = 'Y5eTq?Pn|YFo&Jk#'
FTP_DIR = '/public_html'

try:
    # Connect to FTP
    print(f"Connecting to FTP server {FTP_HOST}...")
    ftp = ftplib.FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    print("Connected successfully!")
    
    # Upload mission.html
    ftp.cwd(FTP_DIR)
    with open('pyebwa.com/mission.html', 'rb') as f:
        ftp.storbinary('STOR mission.html', f)
    print("✓ mission.html uploaded successfully!")
    
    # Close connection
    ftp.quit()
    
    print("\n✅ Haiti-focused mission page deployed!")
    print("\nKey updates:")
    print("- Title: 'One Billion Trees for Haiti'")
    print("- Explains why Haiti needs reforestation (98% forest loss)")
    print("- Haiti-specific impact metrics:")
    print("  • 90% erosion reduction")
    print("  • 60% flood prevention")
    print("  • 2X agricultural yield")
    print("  • 100K+ Haitian jobs")
    print("- Strategic planting regions in Haiti:")
    print("  • Northern Mountains")
    print("  • Coastal Areas (mangroves)")
    print("  • Agricultural Zones")
    print("- Focus on Haitian community partnerships")
    print("\nThe mission is now clearly focused on reforesting Haiti specifically.")
    
except Exception as e:
    print(f"❌ Error: {e}")