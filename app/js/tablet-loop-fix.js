// Aggressive tablet loop fix
(function() {
    'use strict';
    
    console.log('[Tablet Loop Fix] Initializing aggressive loop prevention...');
    
    // Check if this is a tablet
    const isTablet = window.DeviceDetection && window.DeviceDetection.isTablet();
    if (!isTablet) {
        console.log('[Tablet Loop Fix] Not a tablet, skipping tablet-specific fixes');
        return;
    }
    
    console.log('[Tablet Loop Fix] Tablet detected - applying aggressive loop prevention');
    
    // Override window.location.href to intercept all redirects
    const originalLocationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
    const originalLocationHref = Object.getOwnPropertyDescriptor(window.location, 'href');
    
    // Track redirect attempts
    let redirectAttempts = 0;
    const redirectHistory = [];
    
    // Check if we're in a loop
    const checkLoop = () => {
        const loopData = JSON.parse(sessionStorage.getItem('tabletLoopData') || '{}');
        const now = Date.now();
        const timeWindow = 30000; // 30 seconds
        
        // Clean old entries
        loopData.attempts = (loopData.attempts || []).filter(attempt => 
            now - attempt.time < timeWindow
        );
        
        // Check if too many redirects
        if (loopData.attempts.length >= 3) {
            console.error('[Tablet Loop Fix] LOOP DETECTED - Blocking all redirects!');
            return true;
        }
        
        return false;
    };
    
    // Record redirect attempt
    const recordRedirect = (from, to) => {
        const loopData = JSON.parse(sessionStorage.getItem('tabletLoopData') || '{}');
        loopData.attempts = loopData.attempts || [];
        loopData.attempts.push({
            time: Date.now(),
            from: from,
            to: to
        });
        sessionStorage.setItem('tabletLoopData', JSON.stringify(loopData));
        
        redirectHistory.push({
            time: new Date().toISOString(),
            from: from,
            to: to
        });
        
        console.log(`[Tablet Loop Fix] Redirect attempt #${loopData.attempts.length}: ${from} -> ${to}`);
    };
    
    // Override location.href setter
    Object.defineProperty(window.location, 'href', {
        get: function() {
            return originalLocationHref.get.call(this);
        },
        set: function(value) {
            const currentUrl = window.location.href;
            
            // Check for loop patterns
            if (value.includes('/app/') && currentUrl.includes('/login')) {
                console.log('[Tablet Loop Fix] Detected app->login redirect');
                redirectAttempts++;
            } else if (value.includes('/login') && currentUrl.includes('/app/')) {
                console.log('[Tablet Loop Fix] Detected login->app redirect');
                redirectAttempts++;
            }
            
            // Record the redirect
            recordRedirect(currentUrl, value);
            
            // Check if we're in a loop
            if (checkLoop()) {
                console.error('[Tablet Loop Fix] BLOCKING REDIRECT due to loop detection');
                showLoopError();
                return;
            }
            
            // Check cooldown
            const lastRedirect = parseInt(localStorage.getItem('tabletLastRedirect') || '0');
            const now = Date.now();
            const cooldown = 10000; // 10 second cooldown between redirects
            
            if (now - lastRedirect < cooldown) {
                const remaining = Math.round((cooldown - (now - lastRedirect)) / 1000);
                console.warn(`[Tablet Loop Fix] Redirect blocked - cooldown active (${remaining}s remaining)`);
                showCooldownMessage(remaining);
                return;
            }
            
            // Allow the redirect
            console.log('[Tablet Loop Fix] Allowing redirect to:', value);
            localStorage.setItem('tabletLastRedirect', now.toString());
            return originalLocationHref.set.call(this, value);
        }
    });
    
    // Show loop error
    const showLoopError = () => {
        // Remove any existing error
        const existing = document.getElementById('tabletLoopError');
        if (existing) existing.remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.id = 'tabletLoopError';
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 3px solid red;
            padding: 30px;
            z-index: 99999;
            text-align: center;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            max-width: 90%;
            width: 400px;
        `;
        
        errorDiv.innerHTML = `
            <h2 style="color: red; margin-bottom: 20px;">Authentication Loop Detected</h2>
            <p style="margin-bottom: 20px;">We've detected a login loop on your tablet. This has been stopped to protect your session.</p>
            <button onclick="clearTabletLoopData()" style="
                background: #4CAF50;
                color: white;
                border: none;
                padding: 10px 20px;
                font-size: 16px;
                border-radius: 5px;
                cursor: pointer;
                margin: 5px;
            ">Clear Data & Retry</button>
            <button onclick="stayOnPage()" style="
                background: #2196F3;
                color: white;
                border: none;
                padding: 10px 20px;
                font-size: 16px;
                border-radius: 5px;
                cursor: pointer;
                margin: 5px;
            ">Stay on This Page</button>
            <div style="margin-top: 20px; font-size: 12px; color: #666;">
                <details>
                    <summary style="cursor: pointer;">Debug Info</summary>
                    <pre style="text-align: left; font-size: 11px; overflow: auto; max-height: 200px;">
${JSON.stringify(redirectHistory, null, 2)}
                    </pre>
                </details>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
    };
    
    // Show cooldown message
    const showCooldownMessage = (seconds) => {
        // Remove any existing message
        const existing = document.getElementById('tabletCooldown');
        if (existing) existing.remove();
        
        const cooldownDiv = document.createElement('div');
        cooldownDiv.id = 'tabletCooldown';
        cooldownDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff9800;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 99999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        cooldownDiv.innerHTML = `
            <strong>Redirect Blocked</strong><br>
            Please wait ${seconds} seconds...
        `;
        
        document.body.appendChild(cooldownDiv);
        
        // Auto-remove after cooldown
        setTimeout(() => {
            cooldownDiv.remove();
        }, seconds * 1000);
    };
    
    // Global functions
    window.clearTabletLoopData = () => {
        sessionStorage.removeItem('tabletLoopData');
        localStorage.removeItem('tabletLastRedirect');
        localStorage.removeItem('lastRedirectTime');
        sessionStorage.clear();
        alert('Loop data cleared. Reloading page...');
        // Use replace to avoid adding to history
        window.location.replace(window.location.origin + '/app/');
    };
    
    window.stayOnPage = () => {
        const errorDiv = document.getElementById('tabletLoopError');
        if (errorDiv) errorDiv.remove();
    };
    
    // Monitor auth state changes
    let authStateChanges = 0;
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            authStateChanges++;
            console.log(`[Tablet Loop Fix] Auth state change #${authStateChanges}:`, user ? user.email : 'null');
            
            // If auth state changes rapidly, it might indicate a problem
            if (authStateChanges > 5) {
                console.warn('[Tablet Loop Fix] Too many auth state changes - possible issue');
            }
        });
    }
    
    // Add visual indicator
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: #ff9800;
        color: white;
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 12px;
        z-index: 99999;
    `;
    indicator.textContent = 'Tablet Loop Protection Active';
    document.body.appendChild(indicator);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        indicator.style.display = 'none';
    }, 5000);
    
    console.log('[Tablet Loop Fix] Protection active');
})();