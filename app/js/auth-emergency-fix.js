// Emergency Authentication Fix - Stops loops immediately
console.log('[EMERGENCY FIX] Loading auth emergency fix...');

// Aggressive loop prevention
(function() {
    // Check if we're in a loop
    const loopKey = 'pyebwaLoopDetected';
    const lastVisitKey = 'pyebwaLastVisit';
    const currentTime = Date.now();
    const lastVisit = parseInt(localStorage.getItem(lastVisitKey) || '0');
    
    // If visited within last 2 seconds, we're in a loop
    if (currentTime - lastVisit < 2000) {
        console.error('[EMERGENCY FIX] LOOP DETECTED! Stopping all redirects...');
        localStorage.setItem(loopKey, 'true');
        
        // Clear EVERYTHING
        sessionStorage.clear();
        localStorage.removeItem('pyebwaRedirectData');
        localStorage.removeItem(lastVisitKey);
        
        // Stop all execution
        window.stop();
        
        // Show emergency UI
        document.body.innerHTML = `
            <div style="max-width: 600px; margin: 100px auto; padding: 20px; font-family: Arial, sans-serif; text-align: center;">
                <h1 style="color: red;">Authentication Loop Stopped</h1>
                <p>We've detected and stopped an authentication loop.</p>
                <p>Please choose an option:</p>
                <button onclick="clearAndRestart()" style="background: green; color: white; padding: 10px 20px; margin: 10px; border: none; border-radius: 5px; cursor: pointer;">
                    Clear Everything & Start Fresh
                </button>
                <button onclick="goHome()" style="background: blue; color: white; padding: 10px 20px; margin: 10px; border: none; border-radius: 5px; cursor: pointer;">
                    Go to Homepage
                </button>
                <button onclick="stayHere()" style="background: gray; color: white; padding: 10px 20px; margin: 10px; border: none; border-radius: 5px; cursor: pointer;">
                    Stay on This Page
                </button>
                <hr style="margin: 30px 0;">
                <details style="text-align: left; background: #f0f0f0; padding: 10px; border-radius: 5px;">
                    <summary style="cursor: pointer;">Debug Information</summary>
                    <pre style="font-size: 12px;">
URL: ${window.location.href}
Last Visit: ${new Date(lastVisit).toLocaleString()}
Current Time: ${new Date(currentTime).toLocaleString()}
Time Difference: ${currentTime - lastVisit}ms
                    </pre>
                </details>
            </div>
        `;
        
        // Define button functions
        window.clearAndRestart = function() {
            localStorage.clear();
            sessionStorage.clear();
            // Delete all cookies
            document.cookie.split(";").forEach(function(c) { 
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });
            window.location.href = 'https://pyebwa.com';
        };
        
        window.goHome = function() {
            localStorage.removeItem(loopKey);
            window.location.href = 'https://pyebwa.com';
        };
        
        window.stayHere = function() {
            localStorage.removeItem(loopKey);
            location.reload();
        };
        
        // Prevent any further execution
        throw new Error('Loop stopped');
    }
    
    // Update last visit time
    localStorage.setItem(lastVisitKey, currentTime.toString());
    
    // Clear after 10 seconds (not in a loop)
    setTimeout(() => {
        localStorage.removeItem(lastVisitKey);
    }, 10000);
})();

// Override redirect functions
const originalLocation = window.location.href;
let redirectCount = 0;

// Intercept location changes
const originalLocationSetter = Object.getOwnPropertyDescriptor(window, 'location');
Object.defineProperty(window, 'location', {
    get: function() {
        return originalLocationSetter.get.call(window);
    },
    set: function(value) {
        redirectCount++;
        console.log(`[EMERGENCY FIX] Redirect attempt ${redirectCount} to: ${value}`);
        
        // Block redirects if we're in a loop
        if (localStorage.getItem('pyebwaLoopDetected') === 'true') {
            console.error('[EMERGENCY FIX] Redirect blocked due to loop detection');
            return;
        }
        
        // Allow the redirect if not in a loop
        if (redirectCount <= 2) {
            originalLocationSetter.set.call(window, value);
        } else {
            console.error('[EMERGENCY FIX] Too many redirects, blocking');
            localStorage.setItem('pyebwaLoopDetected', 'true');
        }
    }
});

// Add visible indicator
if (!localStorage.getItem('pyebwaLoopDetected')) {
    const indicator = document.createElement('div');
    indicator.id = 'loop-protection-active';
    indicator.innerHTML = '🛡️ Loop Protection Active';
    indicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: rgba(0, 128, 0, 0.8);
        color: white;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 10000;
        cursor: pointer;
    `;
    indicator.onclick = function() {
        if (confirm('Disable loop protection? (Only do this if instructed)')) {
            localStorage.removeItem('pyebwaLastVisit');
            localStorage.removeItem('pyebwaLoopDetected');
            location.reload();
        }
    };
    
    // Add to page when ready
    if (document.body) {
        document.body.appendChild(indicator);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(indicator);
        });
    }
}

console.log('[EMERGENCY FIX] Auth emergency fix loaded successfully');