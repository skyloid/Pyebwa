// Emergency Authentication Fix - Stops loops immediately
console.log('[EMERGENCY FIX] Loading auth emergency fix...');

// Aggressive loop prevention
(function() {
    // Skip if we're already handling a loop
    if (window.pyebwaLoopHandling) {
        return;
    }
    
    // Check if we're in a loop
    const loopKey = 'pyebwaLoopDetected';
    const lastVisitKey = 'pyebwaLastVisit';
    const visitCountKey = 'pyebwaVisitCount';
    const currentTime = Date.now();
    const lastVisit = parseInt(localStorage.getItem(lastVisitKey) || '0');
    
    // Get visit count in last 10 seconds
    let visitCount = parseInt(localStorage.getItem(visitCountKey) || '0');
    
    // Reset count if more than 10 seconds since last visit
    if (currentTime - lastVisit > 10000) {
        visitCount = 0;
    }
    
    // Increment visit count
    visitCount++;
    localStorage.setItem(visitCountKey, visitCount.toString());
    
    // If more than 3 visits in 10 seconds, we're likely in a loop
    if (visitCount > 3 && currentTime - lastVisit < 10000) {
        console.error('[EMERGENCY FIX] LOOP DETECTED! Stopping all redirects...');
        console.log('[EMERGENCY FIX] Visit count:', visitCount, 'in last 10 seconds');
        localStorage.setItem(loopKey, 'true');
        window.pyebwaLoopHandling = true;
        
        // Clear EVERYTHING
        sessionStorage.clear();
        localStorage.removeItem('pyebwaRedirectData');
        localStorage.removeItem(lastVisitKey);
        localStorage.removeItem(visitCountKey);
        
        // Stop all execution
        window.stop();
        
        // Wait for DOM to be ready before showing emergency UI
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', showEmergencyUI);
        } else {
            showEmergencyUI();
        }
        
        function showEmergencyUI() {
            // Show emergency UI
            document.body.innerHTML = `
            <div style="max-width: 600px; margin: 100px auto; padding: 20px; font-family: Arial, sans-serif; text-align: center;">
                <h1 style="color: red;">Authentication Loop Stopped</h1>
                <p>We've detected and stopped an authentication loop.</p>
                <p style="background: #fffacd; padding: 10px; border-radius: 5px; margin: 20px 0;">
                    <strong>Note:</strong> There is a 30-second cooldown between login attempts to prevent loops.
                </p>
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
Cooldown Active: ${localStorage.getItem('lastRedirectTime') ? 'Yes' : 'No'}
                    </pre>
                </details>
            </div>
        `;
        
        // Define button functions
        window.clearAndRestart = function() {
            localStorage.clear();
            sessionStorage.clear();
            // Specifically clear redirect cooldown and loop detection
            localStorage.removeItem('lastRedirectTime');
            localStorage.removeItem('pyebwaLoopDetected');
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
        } // End of showEmergencyUI function
        
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

// Intercept location changes (wrapped in try-catch to prevent conflicts)
try {
    const originalLocationSetter = Object.getOwnPropertyDescriptor(window, 'location');
    if (originalLocationSetter && originalLocationSetter.configurable !== false) {
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
    }
} catch (error) {
    console.warn('[EMERGENCY FIX] Could not override location (another script may have already done this):', error);
}

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