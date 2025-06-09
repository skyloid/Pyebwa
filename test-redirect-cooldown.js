// Test script for redirect cooldown functionality

const REDIRECT_COOLDOWN = 30000; // 30 seconds

function canRedirect() {
    const lastRedirect = parseInt(localStorage.getItem('lastRedirectTime') || '0');
    const now = Date.now();
    
    if (now - lastRedirect < REDIRECT_COOLDOWN) {
        console.log(`[Redirect Cooldown] Active - ${Math.round((REDIRECT_COOLDOWN - (now - lastRedirect)) / 1000)}s remaining`);
        return false;
    }
    
    console.log('[Redirect Cooldown] Ready to redirect');
    localStorage.setItem('lastRedirectTime', now.toString());
    return true;
}

// Test 1: First redirect should be allowed
console.log('\n=== Test 1: First redirect ===');
localStorage.removeItem('lastRedirectTime');
console.log('Expected: true, Actual:', canRedirect());

// Test 2: Immediate second redirect should be blocked
console.log('\n=== Test 2: Immediate redirect (should be blocked) ===');
console.log('Expected: false, Actual:', canRedirect());

// Test 3: Check cooldown status
console.log('\n=== Test 3: Check cooldown remaining ===');
const lastRedirect = parseInt(localStorage.getItem('lastRedirectTime') || '0');
const now = Date.now();
const remaining = Math.round((REDIRECT_COOLDOWN - (now - lastRedirect)) / 1000);
console.log('Cooldown remaining:', remaining, 'seconds');

// Test 4: Simulate expired cooldown
console.log('\n=== Test 4: Simulate expired cooldown ===');
localStorage.setItem('lastRedirectTime', (Date.now() - 31000).toString()); // 31 seconds ago
console.log('Expected: true, Actual:', canRedirect());

// Test 5: Multiple rapid attempts
console.log('\n=== Test 5: Multiple rapid attempts ===');
for (let i = 0; i < 5; i++) {
    console.log(`Attempt ${i + 1}:`, canRedirect() ? 'ALLOWED' : 'BLOCKED');
}

console.log('\n=== Test Complete ===');
console.log('Current lastRedirectTime:', new Date(parseInt(localStorage.getItem('lastRedirectTime'))).toLocaleString());