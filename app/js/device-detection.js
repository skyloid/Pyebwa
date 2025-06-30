// Device detection utilities
(function() {
    'use strict';
    
    // Device detection helper
    const DeviceDetection = {
        // Check if device is a tablet
        isTablet() {
            const userAgent = navigator.userAgent.toLowerCase();
            
            // iPad detection (including iPad Pro)
            if (/ipad|macintosh/i.test(userAgent) && 'ontouchend' in document) {
                return true;
            }
            
            // Android tablets
            if (/android/i.test(userAgent) && !/mobile/i.test(userAgent)) {
                return true;
            }
            
            // Windows tablets
            if (/windows nt/i.test(userAgent) && /touch/i.test(userAgent)) {
                return true;
            }
            
            // Kindle
            if (/kindle|silk/i.test(userAgent)) {
                return true;
            }
            
            // Generic tablet detection based on screen size
            const screenWidth = window.innerWidth || document.documentElement.clientWidth;
            const screenHeight = window.innerHeight || document.documentElement.clientHeight;
            const minDimension = Math.min(screenWidth, screenHeight);
            const maxDimension = Math.max(screenWidth, screenHeight);
            
            // Tablets typically have min dimension > 600 and max < 1366
            if (minDimension >= 600 && maxDimension <= 1366) {
                // Additional check for touch support
                if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
                    return true;
                }
            }
            
            return false;
        },
        
        // Check if device is mobile
        isMobile() {
            const userAgent = navigator.userAgent.toLowerCase();
            return /android.*mobile|iphone|ipod|windows phone|blackberry|bb10|opera mini|iemobile/i.test(userAgent);
        },
        
        // Check if device is desktop
        isDesktop() {
            return !this.isTablet() && !this.isMobile();
        },
        
        // Get device type string
        getDeviceType() {
            if (this.isTablet()) return 'tablet';
            if (this.isMobile()) return 'mobile';
            return 'desktop';
        },
        
        // Get detailed device info
        getDeviceInfo() {
            return {
                type: this.getDeviceType(),
                userAgent: navigator.userAgent,
                screenWidth: window.innerWidth || document.documentElement.clientWidth,
                screenHeight: window.innerHeight || document.documentElement.clientHeight,
                touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
                orientation: window.orientation !== undefined ? window.orientation : 'N/A'
            };
        }
    };
    
    // Export to global scope
    window.DeviceDetection = DeviceDetection;
    
    // Log device info on load
    console.log('[Device Detection] Device type:', DeviceDetection.getDeviceType());
    console.log('[Device Detection] Device info:', DeviceDetection.getDeviceInfo());
})();