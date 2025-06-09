#!/bin/bash

echo "=== Setting up Pyebwa Authentication Server ==="

# Install dependencies
echo "Installing dependencies..."
npm install

# Create systemd service file
echo "Creating systemd service..."
sudo tee /etc/systemd/system/pyebwa-auth.service > /dev/null << 'EOF'
[Unit]
Description=Pyebwa Authentication Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/auth-server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Replace $USER with actual username
sudo sed -i "s/\$USER/$USER/g" /etc/systemd/system/pyebwa-auth.service

# Reload systemd
echo "Configuring systemd..."
sudo systemctl daemon-reload
sudo systemctl enable pyebwa-auth

# Start the service
echo "Starting authentication server..."
sudo systemctl start pyebwa-auth

# Check status
echo ""
echo "=== Service Status ==="
sudo systemctl status pyebwa-auth --no-pager

echo ""
echo "=== Setup Complete! ==="
echo "The authentication server is now running on port 9112"
echo ""
echo "Access points:"
echo "  - Internal: http://localhost:9112"
echo "  - External: http://145.223.119.193:9112"
echo "  - Secure: https://secure.pyebwa.com (configure proxy to point here)"
echo ""
echo "Commands:"
echo "  - sudo systemctl status pyebwa-auth   # Check status"
echo "  - sudo systemctl stop pyebwa-auth     # Stop server"
echo "  - sudo systemctl restart pyebwa-auth  # Restart server"
echo "  - sudo journalctl -u pyebwa-auth -f   # View logs"