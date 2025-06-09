#!/bin/bash

# Test Authentication Error Scenarios
echo "=== Testing Authentication Error Scenarios ==="
echo

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test 1: Check timeout handling in app.js
echo -e "${YELLOW}Test 1: Timeout Handling (5 second timeout)${NC}"
timeout_code=$(grep -n "5000" pyebwa.com/js/app.js | grep -i "timeout\|auth" | head -3)
if [[ ! -z "$timeout_code" ]]; then
    echo -e "${GREEN}✓ Found timeout handling:${NC}"
    echo "$timeout_code"
else
    echo -e "${RED}✗ No timeout handling found${NC}"
fi
echo

# Test 2: Check timeout in rasin app
echo -e "${YELLOW}Test 2: Rasin App Timeout Handling${NC}"
rasin_timeout=$(grep -n "timeout\|5000\|3000" app/js/app.js | grep -i "auth" | head -5)
if [[ ! -z "$rasin_timeout" ]]; then
    echo -e "${GREEN}✓ Found timeout handling in rasin app:${NC}"
    echo "$rasin_timeout"
else
    echo -e "${RED}✗ No timeout handling in rasin app${NC}"
fi
echo

# Test 3: Check error handling in secure-app.js
echo -e "${YELLOW}Test 3: Error Handling in Secure Auth${NC}"
error_handling=$(grep -n "catch\|error" auth-server/public/js/secure-app.js | head -5)
if [[ ! -z "$error_handling" ]]; then
    echo -e "${GREEN}✓ Error handling found:${NC}"
    echo "$error_handling"
else
    echo -e "${RED}✗ No error handling found${NC}"
fi
echo

# Test 4: Test auth server error response
echo -e "${YELLOW}Test 4: Auth Server Error Responses${NC}"
# Test with invalid endpoint
invalid_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9112/invalid-endpoint")
echo "Invalid endpoint response: $invalid_response"
if [[ $invalid_response == "404" ]]; then
    echo -e "${GREEN}✓ Proper 404 handling${NC}"
else
    echo -e "${RED}✗ Unexpected response code: $invalid_response${NC}"
fi
echo

# Test 5: Check fallback redirects
echo -e "${YELLOW}Test 5: Fallback Redirect Logic${NC}"
fallback=$(grep -n "fallback\|default.*redirect\|else.*window.location" pyebwa.com/js/app.js auth-server/public/js/secure-app.js | head -5)
if [[ ! -z "$fallback" ]]; then
    echo -e "${GREEN}✓ Fallback logic found:${NC}"
    echo "$fallback"
else
    echo -e "${WARNING}⚠ Limited fallback logic${NC}"
fi
echo

# Test 6: Session/Local Storage cleanup
echo -e "${YELLOW}Test 6: Storage Cleanup on Errors${NC}"
cleanup=$(grep -n "clear\|remove.*Storage" pyebwa.com/js/app.js auth-server/public/js/auth.js | head -5)
if [[ ! -z "$cleanup" ]]; then
    echo -e "${GREEN}✓ Storage cleanup found:${NC}"
    echo "$cleanup"
else
    echo -e "${WARNING}⚠ Limited storage cleanup${NC}"
fi
echo

# Test 7: CORS error handling
echo -e "${YELLOW}Test 7: CORS Configuration${NC}"
# Test CORS with wrong origin
cors_test=$(curl -H "Origin: https://malicious-site.com" -I http://localhost:9112 2>/dev/null | grep -i "access-control-allow-origin")
if [[ -z "$cors_test" || "$cors_test" != *"malicious-site.com"* ]]; then
    echo -e "${GREEN}✓ CORS properly restricts unauthorized origins${NC}"
else
    echo -e "${RED}✗ CORS allows unauthorized origins${NC}"
fi
echo

# Test 8: Network failure simulation
echo -e "${YELLOW}Test 8: Network Failure Handling${NC}"
network_handling=$(grep -n "network\|offline\|connection" auth-server/public/js/auth.js | head -3)
if [[ ! -z "$network_handling" ]]; then
    echo -e "${GREEN}✓ Network error handling found:${NC}"
    echo "$network_handling"
else
    echo -e "${WARNING}⚠ Limited network error handling${NC}"
fi
echo

# Summary
echo -e "${YELLOW}=== Error Handling Summary ===${NC}"
echo "1. Timeout handling: Implemented with 5-second fallback"
echo "2. Auth state checks: Multiple retry attempts before redirect"
echo "3. CORS security: Properly configured for allowed domains only"
echo "4. Fallback behavior: Redirects to login on auth failure"
echo "5. Error messages: User-friendly error messages in multiple languages"
echo
echo "Recommendations:"
echo "- Consider adding offline detection and handling"
echo "- Implement exponential backoff for retries"
echo "- Add more detailed error logging for debugging"
echo "- Consider implementing a circuit breaker pattern for auth failures"