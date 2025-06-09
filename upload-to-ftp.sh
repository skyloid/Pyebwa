#!/bin/bash

# FTP credentials
FTP_HOST="145.223.107.9"
FTP_USER="u316621955"
FTP_PASS='3!xuk?tkj]L$$Q>A'
FTP_PATH="/home/u316621955/domains/pyebwa.com/public_html"

# Local source directory
SOURCE_DIR="/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com"

echo "Starting FTP upload to pyebwa.com..."

# Create FTP commands file
cat > /tmp/ftp_commands.txt << EOF
user $FTP_USER $FTP_PASS
binary
cd $FTP_PATH
put $SOURCE_DIR/index.html index.html
mkdir css
cd css
put $SOURCE_DIR/css/styles.css styles.css
cd ..
mkdir js
cd js
put $SOURCE_DIR/js/firebase-config.js firebase-config.js
put $SOURCE_DIR/js/auth.js auth.js
put $SOURCE_DIR/js/app.js app.js
cd ..
put $SOURCE_DIR/.htaccess .htaccess
bye
EOF

# Execute FTP upload
ftp -n -v $FTP_HOST < /tmp/ftp_commands.txt

# Clean up
rm /tmp/ftp_commands.txt

echo "FTP upload completed!"