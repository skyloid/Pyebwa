const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Rate limiting configurations
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 requests per hour
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Configure helmet with custom CSP
const helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "https://www.gstatic.com",
                "https://apis.google.com",
                "https://www.google.com",
                "https://www.googletagmanager.com",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'", // Styles often need unsafe-inline; nonces planned
                "https://fonts.googleapis.com",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "data:"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https:",
                "*.googleusercontent.com"
            ],
            connectSrc: [
                "'self'",
                "https://*.googleapis.com",
                "https://*.google.com",
                "https://identitytoolkit.googleapis.com",
                "https://securetoken.googleapis.com",
                "https://firestore.googleapis.com",
                "https://firebasestorage.googleapis.com",
                "https://firebase.googleapis.com",
                "https://*.firebaseio.com",
                "wss://*.firebaseio.com"
            ],
            frameSrc: [
                "'self'",
                "https://accounts.google.com",
                "https://rasin.pyebwa.com"
            ],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["'self'", "blob:"],
            formAction: ["'self'"],
            upgradeInsecureRequests: [],
            blockAllMixedContent: []
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
};

// CORS configuration function
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'https://www.pyebwa.com',
            'https://pyebwa.com',
            'https://secure.pyebwa.com',
            'https://rasin.pyebwa.com'
        ];
        
        // Reject requests with no origin in production (prevents CORS bypass)
        if (!origin) {
            if (process.env.NODE_ENV === 'production') {
                return callback(new Error('Origin header required'));
            }
            return callback(null, true);
        }
        
        // Remove localhost from production
        if (process.env.NODE_ENV === 'production' && origin.includes('localhost')) {
            return callback(new Error('Localhost not allowed in production'));
        }
        
        // Allow localhost in development
        if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
            return callback(null, true);
        }
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400 // 24 hours
};

// Security middleware setup function
const setupSecurity = (app) => {
    // Basic security headers with helmet
    app.use(helmet(helmetConfig));
    
    // Additional security headers
    app.use((req, res, next) => {
        // Prevent clickjacking
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        
        // Prevent MIME type sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Enable XSS filter
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // Disable client-side caching for sensitive data
        if (req.url.includes('/api/') || req.url.includes('/admin')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        
        // Add security headers for Service Workers
        if (req.url.endsWith('sw.js') || req.url.includes('firebase-messaging-sw.js')) {
            res.setHeader('Service-Worker-Allowed', '/');
            res.setHeader('Cache-Control', 'no-cache');
        }
        
        next();
    });
    
    // Data sanitization against NoSQL query injection
    app.use(mongoSanitize());
    
    // Data sanitization against XSS
    app.use(xss());
    
    // Prevent parameter pollution
    app.use((req, res, next) => {
        // Clean up duplicate query parameters
        for (let param in req.query) {
            if (Array.isArray(req.query[param])) {
                req.query[param] = req.query[param][req.query[param].length - 1];
            }
        }
        next();
    });
    
    // Request size limiting
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    return {
        authLimiter,
        apiLimiter,
        strictLimiter,
        corsOptions
    };
};

module.exports = {
    setupSecurity,
    authLimiter,
    apiLimiter,
    strictLimiter,
    corsOptions
};