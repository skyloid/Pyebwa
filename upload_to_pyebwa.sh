#!/bin/bash
# Upload script for www.pyebwa.com

cd /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com

# Create FTP batch file
cat > /tmp/ftp_commands.txt << 'EOF'
open 145.223.107.9
user u316621955.pyebwa.com 3!xuk?tkj]L$Q>A
cd domains/pyebwa.com/public_html
put index.html
put favicon.ico
bye
EOF

# Execute FTP commands
ftp -inv < /tmp/ftp_commands.txt

# Clean up
rm /tmp/ftp_commands.txt

echo "Upload complete!"