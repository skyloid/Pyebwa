#!/bin/bash

# Test Authentication Flow Script
echo "=== Testing Pyebwa Authentication Flow ==="
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Direct access to rasin.pyebwa.com/app
echo -e "${YELLOW}Test 1: Direct access to rasin.pyebwa.com/app (should redirect to auth)${NC}"
response=$(curl -s -I -L -w "%{url_effective}\n" "https://rasin.pyebwa.com/app/" | tail -1)
echo "Final URL: $response"
if [[ $response == *"secure.pyebwa.com"* ]]; then
    echo -e "${GREEN}✓ Correctly redirected to secure.pyebwa.com${NC}"
else
    echo -e "${RED}✗ Did not redirect to secure.pyebwa.com${NC}"
fi
echo

# Test 2: Check secure.pyebwa.com redirect parameters
echo -e "${YELLOW}Test 2: Check secure.pyebwa.com redirect URL format${NC}"
redirect_url=$(curl -s -I "https://rasin.pyebwa.com/app/" | grep -i "location:" | cut -d' ' -f2 | tr -d '\r')
echo "Redirect URL: $redirect_url"
if [[ $redirect_url == *"redirect="* ]]; then
    echo -e "${GREEN}✓ Redirect parameter included${NC}"
    # Extract the redirect parameter
    redirect_param=$(echo "$redirect_url" | grep -oP 'redirect=\K[^&]+')
    decoded_redirect=$(python3 -c "import urllib.parse; print(urllib.parse.unquote('$redirect_param'))")
    echo "Decoded redirect target: $decoded_redirect"
else
    echo -e "${RED}✗ Redirect parameter missing${NC}"
fi
echo

# Test 3: Check auth server endpoints
echo -e "${YELLOW}Test 3: Check auth server endpoints${NC}"
endpoints=("/" "/js/firebase-config.js" "/js/auth.js" "/js/secure-app.js" "/css/auth.css")
for endpoint in "${endpoints[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9112$endpoint")
    if [[ $status == "200" ]]; then
        echo -e "${GREEN}✓ $endpoint - Status: $status${NC}"
    else
        echo -e "${RED}✗ $endpoint - Status: $status${NC}"
    fi
done
echo

# Test 4: Check two-hop redirect logic in secure-app.js
echo -e "${YELLOW}Test 4: Verify two-hop redirect logic${NC}"
if grep -q "pyebwa.com/?auth=success&login=true&redirect=" auth-server/public/js/secure-app.js; then
    echo -e "${GREEN}✓ Two-hop redirect logic found in secure-app.js${NC}"
    grep -n "pyebwa.com/?auth=success" auth-server/public/js/secure-app.js | head -3
else
    echo -e "${RED}✗ Two-hop redirect logic not found${NC}"
fi
echo

# Test 5: Check if pyebwa.com has auth success handler
echo -e "${YELLOW}Test 5: Check pyebwa.com auth success handler${NC}"
if grep -q "authSuccess\|auth=success" pyebwa.com/js/app.js; then
    echo -e "${GREEN}✓ Auth success handler found in app.js${NC}"
else
    echo -e "${RED}✗ Auth success handler NOT found in app.js${NC}"
    echo "The pyebwa.com/js/app.js needs to be updated with the authSuccess handler!"
fi
echo

# Test 6: Simulate authentication flow with curl
echo -e "${YELLOW}Test 6: Simulate authentication flow${NC}"
echo "1. User visits: https://rasin.pyebwa.com/app/"
echo "2. Redirects to: https://secure.pyebwa.com/?redirect=https://rasin.pyebwa.com/app/"
echo "3. After auth, redirects to: https://pyebwa.com/?auth=success&login=true&redirect=https://rasin.pyebwa.com/app/"
echo "4. Finally redirects to: https://rasin.pyebwa.com/app/?login=true&auth=success"
echo

# Test 7: Check Firebase configuration
echo -e "${YELLOW}Test 7: Check Firebase configuration${NC}"
firebase_config=$(curl -s "http://localhost:9112/js/firebase-config.js" | grep -c "apiKey")
if [[ $firebase_config -gt 0 ]]; then
    echo -e "${GREEN}✓ Firebase configuration loaded${NC}"
else
    echo -e "${RED}✗ Firebase configuration not found${NC}"
fi
echo

# Test 8: Check auth relay page
echo -e "${YELLOW}Test 8: Check auth relay page${NC}"
if [[ -f "pyebwa.com/auth-relay.html" ]]; then
    echo -e "${GREEN}✓ Auth relay page exists${NC}"
    if grep -q "postMessage" pyebwa.com/auth-relay.html; then
        echo -e "${GREEN}✓ PostMessage communication configured${NC}"
    fi
else
    echo -e "${RED}✗ Auth relay page not found${NC}"
fi
echo

echo "=== Authentication Flow Test Complete ==="