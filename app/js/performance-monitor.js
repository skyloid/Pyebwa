// Performance Monitoring for Pyebwa App
(function() {
    'use strict';
    
    const PerformanceMonitor = {
        metrics: {
            pageLoad: {},
            apiCalls: {},
            resourceTiming: {},
            userInteractions: {}
        },
        
        // Initialize performance monitoring
        init() {
            this.measurePageLoad();
            this.setupResourceObserver();
            this.setupAPIInterceptor();
            this.setupInteractionTracking();
            this.reportVitals();
            
            // Send metrics every 30 seconds if any collected
            setInterval(() => this.sendMetrics(), 30000);
        },
        
        // Measure page load performance
        measurePageLoad() {
            if ('performance' in window) {
                window.addEventListener('load', () => {
                    setTimeout(() => {
                        const perfData = window.performance.timing;
                        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                        const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
                        const firstPaintTime = this.getFirstPaintTime();
                        
                        this.metrics.pageLoad = {
                            pageLoadTime,
                            domReadyTime,
                            firstPaintTime,
                            dnsLookup: perfData.domainLookupEnd - perfData.domainLookupStart,
                            tcpConnect: perfData.connectEnd - perfData.connectStart,
                            serverResponse: perfData.responseEnd - perfData.requestStart,
                            domProcessing: perfData.domComplete - perfData.domLoading,
                            timestamp: new Date().toISOString(),
                            url: window.location.pathname
                        };
                        
                        console.log('Page Load Metrics:', this.metrics.pageLoad);
                    }, 0);
                });
            }
        },
        
        // Get First Paint time
        getFirstPaintTime() {
            if ('performance' in window && window.performance.getEntriesByType) {
                const paintEntries = performance.getEntriesByType('paint');
                const firstPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
                return firstPaint ? Math.round(firstPaint.startTime) : null;
            }
            return null;
        },
        
        // Setup Resource Timing Observer
        setupResourceObserver() {
            if ('PerformanceObserver' in window) {
                // Observe resource timing
                const resourceObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'resource') {
                            this.trackResource(entry);
                        }
                    }
                });
                
                try {
                    resourceObserver.observe({ entryTypes: ['resource'] });
                } catch (e) {
                    console.warn('Resource observer not supported:', e);
                }
                
                // Observe largest contentful paint
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    if (entries.length > 0) {
                        const lastEntry = entries[entries.length - 1];
                        if (lastEntry && lastEntry.startTime) {
                            this.metrics.pageLoad.largestContentfulPaint = Math.round(lastEntry.startTime);
                        }
                    }
                });
                
                try {
                    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                } catch (e) {
                    console.warn('LCP observer not supported:', e);
                }
            }
        },
        
        // Track individual resource performance
        trackResource(entry) {
            const resourceType = this.getResourceType(entry.name);
            
            if (!this.metrics.resourceTiming[resourceType]) {
                this.metrics.resourceTiming[resourceType] = [];
            }
            
            this.metrics.resourceTiming[resourceType].push({
                name: entry.name.split('/').pop(),
                duration: Math.round(entry.duration),
                size: entry.transferSize || 0,
                startTime: Math.round(entry.startTime)
            });
            
            // Keep only last 10 entries per type
            if (this.metrics.resourceTiming[resourceType].length > 10) {
                this.metrics.resourceTiming[resourceType].shift();
            }
        },
        
        // Determine resource type from URL
        getResourceType(url) {
            if (url.includes('.js')) return 'scripts';
            if (url.includes('.css')) return 'styles';
            if (url.match(/\.(jpg|jpeg|png|gif|svg|webp)/i)) return 'images';
            if (url.includes('firebase') || url.includes('api')) return 'api';
            return 'other';
        },
        
        // Setup API call interceptor
        setupAPIInterceptor() {
            const originalFetch = window.fetch;
            
            window.fetch = async (...args) => {
                const startTime = performance.now();
                const url = args[0];
                
                try {
                    const response = await originalFetch(...args);
                    const endTime = performance.now();
                    
                    this.trackAPICall({
                        url: typeof url === 'string' ? url : url.url,
                        duration: Math.round(endTime - startTime),
                        status: response.status,
                        method: args[1]?.method || 'GET',
                        timestamp: new Date().toISOString()
                    });
                    
                    return response;
                } catch (error) {
                    const endTime = performance.now();
                    
                    this.trackAPICall({
                        url: typeof url === 'string' ? url : url.url,
                        duration: Math.round(endTime - startTime),
                        status: 0,
                        error: error.message,
                        method: args[1]?.method || 'GET',
                        timestamp: new Date().toISOString()
                    });
                    
                    throw error;
                }
            };
        },
        
        // Track API call performance
        trackAPICall(data) {
            const endpoint = this.getEndpointName(data.url);
            
            if (!this.metrics.apiCalls[endpoint]) {
                this.metrics.apiCalls[endpoint] = {
                    count: 0,
                    totalDuration: 0,
                    averageDuration: 0,
                    errors: 0,
                    lastCall: null
                };
            }
            
            const metric = this.metrics.apiCalls[endpoint];
            metric.count++;
            metric.totalDuration += data.duration;
            metric.averageDuration = Math.round(metric.totalDuration / metric.count);
            metric.lastCall = data.timestamp;
            
            if (data.error || data.status >= 400) {
                metric.errors++;
            }
            
            // Log slow API calls
            if (data.duration > 2000) {
                console.warn(`Slow API call to ${endpoint}: ${data.duration}ms`);
            }
        },
        
        // Extract endpoint name from URL
        getEndpointName(url) {
            try {
                const urlObj = new URL(url, window.location.origin);
                return urlObj.pathname.split('/').filter(Boolean).slice(-2).join('/');
            } catch {
                return url;
            }
        },
        
        // Setup user interaction tracking
        setupInteractionTracking() {
            // Track click interactions
            document.addEventListener('click', (e) => {
                const target = e.target.closest('button, a, .clickable');
                if (target) {
                    this.trackInteraction('click', target);
                }
            }, true);
            
            // Track form submissions
            document.addEventListener('submit', (e) => {
                this.trackInteraction('submit', e.target);
            }, true);
            
            // Track route changes
            window.addEventListener('popstate', () => {
                this.trackInteraction('navigation', { url: window.location.pathname });
            });
        },
        
        // Track user interactions
        trackInteraction(type, element) {
            const timestamp = performance.now();
            const key = `${type}_${Date.now()}`;
            
            this.metrics.userInteractions[key] = {
                type,
                timestamp: Math.round(timestamp),
                element: this.getElementIdentifier(element),
                url: window.location.pathname
            };
            
            // Keep only last 20 interactions
            const interactions = Object.keys(this.metrics.userInteractions);
            if (interactions.length > 20) {
                delete this.metrics.userInteractions[interactions[0]];
            }
        },
        
        // Get element identifier for tracking
        getElementIdentifier(element) {
            if (element.url) return element.url;
            if (element.id) return `#${element.id}`;
            if (element.className) return `.${element.className.split(' ')[0]}`;
            if (element.tagName) return element.tagName.toLowerCase();
            return 'unknown';
        },
        
        // Report Core Web Vitals
        reportVitals() {
            if ('web-vital' in window) return;
            
            // Simple CLS tracking
            let clsValue = 0;
            let clsEntries = [];
            
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        const firstSessionEntry = clsEntries[0];
                        const lastSessionEntry = clsEntries[clsEntries.length - 1];
                        
                        if (clsEntries.length > 0 && 
                            lastSessionEntry && 
                            firstSessionEntry &&
                            entry.startTime - lastSessionEntry.startTime < 1000 &&
                            entry.startTime - firstSessionEntry.startTime < 5000) {
                            clsEntries.push(entry);
                            clsValue += entry.value;
                        } else {
                            clsEntries = [entry];
                            clsValue = entry.value;
                        }
                    }
                }
                
                this.metrics.pageLoad.cumulativeLayoutShift = clsValue;
            });
            
            try {
                observer.observe({ type: 'layout-shift', buffered: true });
            } catch (e) {
                console.warn('Layout shift observer not supported:', e);
            }
            
            // First Input Delay
            if ('PerformanceEventTiming' in window) {
                const fidObserver = new PerformanceObserver((list) => {
                    const firstInput = list.getEntries()[0];
                    if (firstInput) {
                        this.metrics.pageLoad.firstInputDelay = Math.round(firstInput.processingStart - firstInput.startTime);
                    }
                });
                
                try {
                    fidObserver.observe({ type: 'first-input', buffered: true });
                } catch (e) {
                    console.warn('First input observer not supported:', e);
                }
            }
        },
        
        // Send metrics to analytics
        sendMetrics() {
            const hasMetrics = Object.keys(this.metrics.pageLoad).length > 0 ||
                             Object.keys(this.metrics.apiCalls).length > 0;
            
            if (!hasMetrics) return;
            
            // In production, you would send this to your analytics service
            // For now, just log to console
            console.log('Performance Metrics Report:', {
                timestamp: new Date().toISOString(),
                metrics: this.metrics
            });
            
            // Store in localStorage for debugging
            try {
                const storedMetrics = JSON.parse(localStorage.getItem('pyebwaPerformanceMetrics') || '[]');
                storedMetrics.push({
                    timestamp: new Date().toISOString(),
                    metrics: this.metrics
                });
                
                // Keep only last 10 reports
                if (storedMetrics.length > 10) {
                    storedMetrics.shift();
                }
                
                localStorage.setItem('pyebwaPerformanceMetrics', JSON.stringify(storedMetrics));
            } catch (e) {
                console.error('Failed to store metrics:', e);
            }
        },
        
        // Get current performance summary
        getSummary() {
            return {
                pageLoad: this.metrics.pageLoad,
                apiCallsSummary: Object.entries(this.metrics.apiCalls).map(([endpoint, data]) => ({
                    endpoint,
                    ...data
                })),
                resourceSummary: Object.entries(this.metrics.resourceTiming).map(([type, resources]) => ({
                    type,
                    count: resources.length,
                    totalDuration: resources.reduce((sum, r) => sum + r.duration, 0),
                    totalSize: resources.reduce((sum, r) => sum + r.size, 0)
                })),
                recentInteractions: Object.values(this.metrics.userInteractions).slice(-5)
            };
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PerformanceMonitor.init());
    } else {
        PerformanceMonitor.init();
    }
    
    // Export for debugging
    window.pyebwaPerformance = PerformanceMonitor;
})();