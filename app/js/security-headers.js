// Security Headers Implementation for Pyebwa App
(function() {
    'use strict';
    
    const SecurityHeaders = {
        // Content Security Policy configuration
        cspConfig: {
            'default-src': ["'self'"],
            'script-src': [
                "'self'",
                "'unsafe-inline'", // Will be removed after refactoring inline scripts
                "https://www.gstatic.com",
                "https://www.googletagmanager.com",
                "https://fonts.googleapis.com"
            ],
            'style-src': [
                "'self'",
                "'unsafe-inline'", // For dynamic styles, will implement nonces later
                "https://fonts.googleapis.com"
            ],
            'img-src': [
                "'self'",
                "data:",
                "blob:",
                "https://*.googleusercontent.com",
                "https://firebasestorage.googleapis.com",
                "https://picsum.photos" // For dashboard background images
            ],
            'font-src': [
                "'self'",
                "https://fonts.gstatic.com"
            ],
            'connect-src': [
                "'self'",
                "https://*.firebaseio.com",
                "https://*.firebaseapp.com",
                "https://identitytoolkit.googleapis.com",
                "https://securetoken.googleapis.com",
                "https://firestore.googleapis.com",
                "https://firebasestorage.googleapis.com",
                "wss://*.firebaseio.com"
            ],
            'media-src': [
                "'self'",
                "blob:",
                "https://firebasestorage.googleapis.com" // For audio/video playback
            ],
            'frame-src': ["'none'"],
            'object-src': ["'none'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
            'upgrade-insecure-requests': true
        },
        
        // Initialize security headers
        init() {
            this.setupCSP();
            this.setupSecurityMeta();
            this.setupClickjackingProtection();
            this.monitorViolations();
            this.protectSensitiveData();
        },
        
        // Setup Content Security Policy
        setupCSP() {
            // Build CSP string
            const cspParts = [];
            for (const [directive, sources] of Object.entries(this.cspConfig)) {
                if (directive === 'upgrade-insecure-requests' && sources === true) {
                    cspParts.push(directive);
                } else if (Array.isArray(sources)) {
                    cspParts.push(`${directive} ${sources.join(' ')}`);
                }
            }
            
            const cspString = cspParts.join('; ');
            
            // Add CSP meta tag
            const cspMeta = document.createElement('meta');
            cspMeta.httpEquiv = 'Content-Security-Policy';
            cspMeta.content = cspString;
            document.head.appendChild(cspMeta);
            
            console.log('CSP enabled:', cspString);
        },
        
        // Add security-related meta tags
        setupSecurityMeta() {
            const securityMeta = [
                { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
                { 'http-equiv': 'X-Frame-Options', content: 'DENY' },
                { name: 'referrer', content: 'strict-origin-when-cross-origin' }
            ];
            
            securityMeta.forEach(meta => {
                const tag = document.createElement('meta');
                if (meta['http-equiv']) {
                    tag.httpEquiv = meta['http-equiv'];
                } else {
                    tag.name = meta.name;
                }
                tag.content = meta.content;
                document.head.appendChild(tag);
            });
        },
        
        // Protect against clickjacking
        setupClickjackingProtection() {
            // Check if we're in an iframe
            if (window.self !== window.top) {
                // Attempt to break out of iframe
                try {
                    window.top.location = window.self.location;
                } catch (e) {
                    // If we can't break out, hide the body
                    document.body.style.display = 'none';
                    console.error('Clickjacking attempt detected and blocked');
                }
            }
        },
        
        // Monitor CSP violations
        monitorViolations() {
            // Listen for CSP violation reports
            document.addEventListener('securitypolicyviolation', (e) => {
                const violation = {
                    blockedURI: e.blockedURI,
                    violatedDirective: e.violatedDirective,
                    originalPolicy: e.originalPolicy,
                    timestamp: new Date().toISOString(),
                    sourceFile: e.sourceFile,
                    lineNumber: e.lineNumber,
                    columnNumber: e.columnNumber
                };
                
                console.warn('CSP Violation:', violation);
                
                // Store violations for analysis (limit to 50)
                const violations = JSON.parse(localStorage.getItem('cspViolations') || '[]');
                violations.push(violation);
                if (violations.length > 50) {
                    violations.shift();
                }
                localStorage.setItem('cspViolations', JSON.stringify(violations));
                
                // In production, send to monitoring service
                // this.reportViolation(violation);
            });
        },
        
        // Protect sensitive data in URLs and logs
        protectSensitiveData() {
            // Override console methods in production
            if (window.location.hostname !== 'localhost') {
                const noop = () => {};
                const methods = ['log', 'debug', 'info', 'warn'];
                
                methods.forEach(method => {
                    const original = console[method];
                    console[method] = function(...args) {
                        // Filter out sensitive data
                        const filtered = args.map(arg => {
                            if (typeof arg === 'string') {
                                // Remove auth tokens
                                arg = arg.replace(/Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, 'Bearer [REDACTED]');
                                // Remove email addresses
                                arg = arg.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
                            }
                            return arg;
                        });
                        original.apply(console, filtered);
                    };
                });
            }
            
            // Clean URLs of sensitive parameters
            this.cleanSensitiveURLParams();
        },
        
        // Remove sensitive parameters from URLs
        cleanSensitiveURLParams() {
            const sensitiveParams = ['token', 'auth', 'key', 'session', 'password'];
            const url = new URL(window.location.href);
            let cleaned = false;
            
            sensitiveParams.forEach(param => {
                if (url.searchParams.has(param)) {
                    url.searchParams.delete(param);
                    cleaned = true;
                }
            });
            
            if (cleaned) {
                window.history.replaceState({}, document.title, url.pathname + url.search);
            }
        },
        
        // Get CSP violation report
        getViolationReport() {
            const violations = JSON.parse(localStorage.getItem('cspViolations') || '[]');
            return {
                count: violations.length,
                violations: violations,
                summary: this.summarizeViolations(violations)
            };
        },
        
        // Summarize violations by directive
        summarizeViolations(violations) {
            const summary = {};
            violations.forEach(v => {
                const directive = v.violatedDirective.split(' ')[0];
                summary[directive] = (summary[directive] || 0) + 1;
            });
            return summary;
        },
        
        // Clear violation logs
        clearViolations() {
            localStorage.removeItem('cspViolations');
        },
        
        // Generate nonce for inline scripts (future implementation)
        generateNonce() {
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            return btoa(String.fromCharCode.apply(null, array));
        },
        
        // Check security headers (for testing)
        checkHeaders() {
            const report = {
                csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
                xContentType: !!document.querySelector('meta[http-equiv="X-Content-Type-Options"]'),
                xFrame: !!document.querySelector('meta[http-equiv="X-Frame-Options"]'),
                referrer: !!document.querySelector('meta[name="referrer"]'),
                inIframe: window.self !== window.top,
                violations: this.getViolationReport()
            };
            
            return report;
        }
    };
    
    // Initialize security headers
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SecurityHeaders.init());
    } else {
        SecurityHeaders.init();
    }
    
    // Export for testing
    window.pyebwaSecurity = SecurityHeaders;
})();