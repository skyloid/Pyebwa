#!/bin/bash
# Manual deployment script for slideshow fix
# This script provides the exact commands to run

echo "========================================"
echo "Pyebwa.com Slideshow Fix - Manual Deploy"
echo "========================================"
echo
echo "SSH Connection Details:"
echo "Host: 145.223.107.9"
echo "Port: 65002"
echo "User: u316621955"
echo "Pass: z_NlY6|cU*w[iR92y,qazrf\`Lm{iMD@VqrE"
echo
echo "Run these commands from directory:"
echo "cd /home/pyebwa-rasin/htdocs/rasin.pyebwa.com"
echo
echo "========================================"
echo "SCP UPLOAD COMMANDS"
echo "========================================"
echo
echo "# 1. Upload main HTML file with slideshow"
echo "scp -P 65002 pyebwa.com/index.html u316621955@145.223.107.9:/home/u316621955/domains/pyebwa.com/public_html/index.html"
echo
echo "# 2. Upload main CSS with animations"
echo "scp -P 65002 pyebwa.com/css/styles.css u316621955@145.223.107.9:/home/u316621955/domains/pyebwa.com/public_html/css/styles.css"
echo
echo "# 3. Upload slideshow immediate fix CSS (MOST IMPORTANT)"
echo "scp -P 65002 pyebwa.com/css/slideshow-immediate-fix.css u316621955@145.223.107.9:/home/u316621955/domains/pyebwa.com/public_html/css/slideshow-immediate-fix.css"
echo
echo "# 4. Upload fallback CSS (optional)"
echo "scp -P 65002 pyebwa.com/css/slideshow-fallback.css u316621955@145.223.107.9:/home/u316621955/domains/pyebwa.com/public_html/css/slideshow-fallback.css"
echo
echo "# 5. Upload enhanced JavaScript (optional)"
echo "scp -P 65002 pyebwa.com/js/slideshow-enhanced-v2.js u316621955@145.223.107.9:/home/u316621955/domains/pyebwa.com/public_html/js/slideshow-enhanced-v2.js"
echo
echo "========================================"
echo "ALTERNATIVE: Create directories first"
echo "========================================"
echo
echo "# Connect via SSH and create directories:"
echo "ssh -p 65002 u316621955@145.223.107.9"
echo "mkdir -p /home/u316621955/domains/pyebwa.com/public_html/css"
echo "mkdir -p /home/u316621955/domains/pyebwa.com/public_html/js"
echo "exit"
echo
echo "# Then run the SCP commands above"
echo
echo "========================================"
echo "VERIFICATION"
echo "========================================"
echo
echo "After uploading:"
echo "1. Visit https://pyebwa.com/"
echo "2. Clear browser cache (Ctrl+F5)"
echo "3. Watch slideshow - should change every 5 seconds"
echo "4. Check browser console for errors"
echo
echo "The CSS-only fix (slideshow-immediate-fix.css) will"
echo "make the slideshow work without any JavaScript!"
echo
echo "========================================"