#\!/bin/bash
# Pyebwa Server Startup Script
# Wait for system to be ready
sleep 30

# Set up environment
export PATH="/home/pyebwa-rasin/.nvm/versions/node/v22.16.0/bin:$PATH"
export NVM_DIR="/home/pyebwa-rasin/.nvm"

# Change to project directory
cd /home/pyebwa-rasin/htdocs/rasin.pyebwa.com

# Start PM2 if not running
if \! pm2 list  < /dev/null |  grep -q "pyebwa-server.*online"; then
    pm2 start ecosystem.config.js
    pm2 save
fi
