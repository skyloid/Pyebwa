#!/bin/bash
# Pyebwa Server Monitor Script
# Ensures the server is always running

export PATH="/home/pyebwa-rasin/.nvm/versions/node/v22.16.0/bin:$PATH"
export NVM_DIR="/home/pyebwa-rasin/.nvm"

cd /home/pyebwa-rasin/htdocs/rasin.pyebwa.com

# Check if PM2 process is running
if ! pm2 list | grep -q "pyebwa-server.*online"; then
    echo "$(date): Pyebwa server not running, starting..." >> /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/logs/monitor.log
    pm2 start ecosystem.config.js
    pm2 save
fi

# Check if port 9111 is responding
if ! curl -s http://localhost:9111/health > /dev/null; then
    echo "$(date): Server not responding, restarting..." >> /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/logs/monitor.log
    pm2 restart pyebwa-server
fi