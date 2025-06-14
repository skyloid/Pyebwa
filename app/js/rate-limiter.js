// Rate Limiting for Pyebwa App
(function() {
    'use strict';
    
    const RateLimiter = {
        // Rate limit configurations
        limits: {
            // API endpoints
            login: { max: 5, window: 15 * 60 * 1000, blockDuration: 30 * 60 * 1000 }, // 5 attempts per 15 min, block for 30 min
            register: { max: 3, window: 60 * 60 * 1000, blockDuration: 60 * 60 * 1000 }, // 3 per hour
            passwordReset: { max: 3, window: 60 * 60 * 1000, blockDuration: 60 * 60 * 1000 }, // 3 per hour
            
            // Data operations
            createMember: { max: 50, window: 60 * 60 * 1000 }, // 50 per hour
            updateMember: { max: 100, window: 60 * 60 * 1000 }, // 100 per hour
            uploadPhoto: { max: 20, window: 60 * 60 * 1000 }, // 20 per hour
            
            // General API calls
            api: { max: 1000, window: 60 * 60 * 1000 }, // 1000 per hour
            search: { max: 30, window: 60 * 1000 }, // 30 per minute
            
            // UI interactions
            formSubmit: { max: 10, window: 60 * 1000 }, // 10 per minute
            buttonClick: { max: 30, window: 60 * 1000 } // 30 per minute
        },
        
        // Storage for tracking attempts
        attempts: new Map(),
        blocked: new Map(),
        
        // Initialize rate limiter
        init() {
            this.setupInterceptors();
            this.cleanupInterval();
            this.setupUIProtection();
        },
        
        // Check if action is rate limited
        checkLimit(action, identifier = null) {
            const config = this.limits[action] || this.limits.api;
            const key = `${action}:${identifier || 'global'}`;
            const now = Date.now();
            
            // Check if blocked
            if (this.isBlocked(key)) {
                const blockExpiry = this.blocked.get(key);
                const remainingTime = Math.ceil((blockExpiry - now) / 1000);
                
                return {
                    allowed: false,
                    reason: 'blocked',
                    retryAfter: remainingTime,
                    message: `Too many attempts. Please try again in ${this.formatTime(remainingTime)}.`
                };
            }
            
            // Get attempts for this key
            let attemptData = this.attempts.get(key) || { count: 0, firstAttempt: now, timestamps: [] };
            
            // Clean old timestamps
            attemptData.timestamps = attemptData.timestamps.filter(
                timestamp => now - timestamp < config.window
            );
            
            // Check if limit exceeded
            if (attemptData.timestamps.length >= config.max) {
                // Block if configured
                if (config.blockDuration) {
                    this.block(key, config.blockDuration);
                }
                
                const oldestAttempt = Math.min(...attemptData.timestamps);
                const retryAfter = Math.ceil((oldestAttempt + config.window - now) / 1000);
                
                return {
                    allowed: false,
                    reason: 'rate_limited',
                    retryAfter: retryAfter,
                    remaining: 0,
                    message: `Rate limit exceeded. Please try again in ${this.formatTime(retryAfter)}.`
                };
            }
            
            // Record attempt
            attemptData.timestamps.push(now);
            this.attempts.set(key, attemptData);
            
            return {
                allowed: true,
                remaining: config.max - attemptData.timestamps.length,
                resetAt: Math.min(...attemptData.timestamps) + config.window
            };
        },
        
        // Block an identifier
        block(key, duration) {
            const expiry = Date.now() + duration;
            this.blocked.set(key, expiry);
            
            // Store in localStorage for persistence
            try {
                const blocked = JSON.parse(localStorage.getItem('rateLimitBlocked') || '{}');
                blocked[key] = expiry;
                localStorage.setItem('rateLimitBlocked', JSON.stringify(blocked));
            } catch (e) {
                console.error('Failed to persist block list:', e);
            }
        },
        
        // Check if identifier is blocked
        isBlocked(key) {
            const now = Date.now();
            const blockExpiry = this.blocked.get(key);
            
            if (blockExpiry && blockExpiry > now) {
                return true;
            }
            
            // Check localStorage
            try {
                const blocked = JSON.parse(localStorage.getItem('rateLimitBlocked') || '{}');
                if (blocked[key] && blocked[key] > now) {
                    this.blocked.set(key, blocked[key]);
                    return true;
                }
            } catch (e) {}
            
            return false;
        },
        
        // Setup API interceptors
        setupInterceptors() {
            // Intercept fetch requests
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                const [url, options = {}] = args;
                const endpoint = this.getEndpoint(url);
                
                // Check rate limit
                const limitCheck = this.checkLimit(endpoint, this.getUserIdentifier());
                
                if (!limitCheck.allowed) {
                    // Return rate limit error
                    return Promise.reject(new Error(limitCheck.message));
                }
                
                try {
                    const response = await originalFetch(...args);
                    
                    // Add rate limit headers to response
                    if (limitCheck.remaining !== undefined) {
                        Object.defineProperty(response, 'rateLimitRemaining', {
                            value: limitCheck.remaining
                        });
                    }
                    
                    return response;
                } catch (error) {
                    // Check if it's a 429 response
                    if (error.status === 429) {
                        this.handleRateLimitResponse(endpoint, error);
                    }
                    throw error;
                }
            };
            
            // Intercept Firebase operations
            this.interceptFirebase();
        },
        
        // Intercept Firebase operations
        interceptFirebase() {
            // Wait for Firebase to be ready
            const checkInterval = setInterval(() => {
                if (window.firebase && window.firebase.auth && window.firebase.firestore) {
                    clearInterval(checkInterval);
                    
                    // Intercept auth operations
                    this.interceptAuthMethods();
                    
                    // Intercept Firestore operations
                    this.interceptFirestoreMethods();
                }
            }, 100);
        },
        
        // Intercept auth methods
        interceptAuthMethods() {
            const auth = firebase.auth();
            
            // Sign in methods
            const originalSignIn = auth.signInWithEmailAndPassword;
            auth.signInWithEmailAndPassword = (email, password) => {
                const check = this.checkLimit('login', email);
                if (!check.allowed) {
                    return Promise.reject(new Error(check.message));
                }
                return originalSignIn.call(auth, email, password);
            };
            
            // Create user
            const originalCreateUser = auth.createUserWithEmailAndPassword;
            auth.createUserWithEmailAndPassword = (email, password) => {
                const check = this.checkLimit('register', email);
                if (!check.allowed) {
                    return Promise.reject(new Error(check.message));
                }
                return originalCreateUser.call(auth, email, password);
            };
            
            // Password reset
            const originalPasswordReset = auth.sendPasswordResetEmail;
            auth.sendPasswordResetEmail = (email) => {
                const check = this.checkLimit('passwordReset', email);
                if (!check.allowed) {
                    return Promise.reject(new Error(check.message));
                }
                return originalPasswordReset.call(auth, email);
            };
        },
        
        // Intercept Firestore methods
        interceptFirestoreMethods() {
            // This is simplified - in production, you'd want more comprehensive interception
            const db = firebase.firestore();
            
            // Override collection add
            const originalAdd = db.collection('test').add;
            const collectionProto = Object.getPrototypeOf(db.collection('test'));
            
            collectionProto.add = function(data) {
                const action = this._query.path.segments.join('/');
                const check = RateLimiter.checkLimit(`create_${action}`);
                
                if (!check.allowed) {
                    return Promise.reject(new Error(check.message));
                }
                
                return originalAdd.call(this, data);
            };
        },
        
        // Setup UI protection
        setupUIProtection() {
            // Protect forms
            document.addEventListener('submit', (e) => {
                const form = e.target;
                const check = this.checkLimit('formSubmit', form.id || form.name);
                
                if (!check.allowed) {
                    e.preventDefault();
                    this.showRateLimitMessage(check.message);
                }
            });
            
            // Protect rapid clicking
            const clickedElements = new WeakMap();
            document.addEventListener('click', (e) => {
                const element = e.target.closest('button, a[href]');
                if (!element) return;
                
                const lastClick = clickedElements.get(element) || 0;
                const now = Date.now();
                
                // Prevent clicks within 500ms
                if (now - lastClick < 500) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                
                clickedElements.set(element, now);
                
                // Check rate limit for buttons
                if (element.tagName === 'BUTTON') {
                    const check = this.checkLimit('buttonClick');
                    if (!check.allowed) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showRateLimitMessage(check.message);
                    }
                }
            }, true);
        },
        
        // Get endpoint from URL
        getEndpoint(url) {
            if (typeof url !== 'string') return 'api';
            
            // Map URLs to rate limit actions
            if (url.includes('/login')) return 'login';
            if (url.includes('/register')) return 'register';
            if (url.includes('/reset-password')) return 'passwordReset';
            if (url.includes('/search')) return 'search';
            if (url.includes('/upload')) return 'uploadPhoto';
            
            return 'api';
        },
        
        // Get user identifier
        getUserIdentifier() {
            // Use a combination of methods for identification
            const user = firebase.auth().currentUser;
            if (user) return user.uid;
            
            // Fallback to session ID or IP (would need server support)
            return sessionStorage.getItem('sessionId') || 'anonymous';
        },
        
        // Handle rate limit response from server
        handleRateLimitResponse(endpoint, response) {
            const retryAfter = response.headers?.get('Retry-After') || 60;
            const blockDuration = parseInt(retryAfter) * 1000;
            
            this.block(`${endpoint}:${this.getUserIdentifier()}`, blockDuration);
        },
        
        // Show rate limit message to user
        showRateLimitMessage(message) {
            // Remove existing message
            const existing = document.querySelector('.rate-limit-message');
            if (existing) existing.remove();
            
            const messageEl = document.createElement('div');
            messageEl.className = 'rate-limit-message';
            messageEl.textContent = message;
            
            // Add styles
            messageEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ef4444;
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                max-width: 300px;
                animation: slideIn 0.3s ease-out;
            `;
            
            document.body.appendChild(messageEl);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                messageEl.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => messageEl.remove(), 300);
            }, 5000);
        },
        
        // Format time in seconds to human readable
        formatTime(seconds) {
            if (seconds < 60) return `${seconds} seconds`;
            if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
            return `${Math.floor(seconds / 3600)} hours`;
        },
        
        // Cleanup old attempts periodically
        cleanupInterval() {
            setInterval(() => {
                const now = Date.now();
                
                // Clean attempts
                for (const [key, data] of this.attempts.entries()) {
                    const action = key.split(':')[0];
                    const config = this.limits[action] || this.limits.api;
                    
                    if (data.timestamps.every(t => now - t > config.window)) {
                        this.attempts.delete(key);
                    }
                }
                
                // Clean blocks
                for (const [key, expiry] of this.blocked.entries()) {
                    if (expiry < now) {
                        this.blocked.delete(key);
                    }
                }
                
                // Clean localStorage
                try {
                    const blocked = JSON.parse(localStorage.getItem('rateLimitBlocked') || '{}');
                    const cleaned = {};
                    
                    for (const [key, expiry] of Object.entries(blocked)) {
                        if (expiry > now) {
                            cleaned[key] = expiry;
                        }
                    }
                    
                    localStorage.setItem('rateLimitBlocked', JSON.stringify(cleaned));
                } catch (e) {}
            }, 60000); // Every minute
        },
        
        // Get current limits status
        getStatus() {
            const status = {};
            
            for (const [key, data] of this.attempts.entries()) {
                const [action, identifier] = key.split(':');
                const config = this.limits[action] || this.limits.api;
                const now = Date.now();
                
                const validTimestamps = data.timestamps.filter(
                    t => now - t < config.window
                );
                
                status[key] = {
                    action,
                    identifier,
                    attempts: validTimestamps.length,
                    limit: config.max,
                    remaining: config.max - validTimestamps.length,
                    resetAt: validTimestamps.length > 0 
                        ? new Date(Math.min(...validTimestamps) + config.window)
                        : null,
                    blocked: this.isBlocked(key)
                };
            }
            
            return status;
        },
        
        // Reset limits for testing
        reset() {
            this.attempts.clear();
            this.blocked.clear();
            localStorage.removeItem('rateLimitBlocked');
        }
    };
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => RateLimiter.init());
    } else {
        RateLimiter.init();
    }
    
    // Export for testing
    window.pyebwaRateLimiter = RateLimiter;
})();