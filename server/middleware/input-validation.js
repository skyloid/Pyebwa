const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');

// Input validation rules
const validationRules = {
    email: (value) => {
        if (!value || !validator.isEmail(value)) {
            return 'Invalid email address';
        }
        return null;
    },
    
    password: (value) => {
        if (!value || value.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
            return 'Password must contain uppercase, lowercase, and numbers';
        }
        return null;
    },
    
    name: (value) => {
        if (!value || value.trim().length < 2) {
            return 'Name must be at least 2 characters long';
        }
        if (value.length > 100) {
            return 'Name must be less than 100 characters';
        }
        if (!/^[a-zA-Z\s\-']+$/.test(value)) {
            return 'Name contains invalid characters';
        }
        return null;
    },
    
    biography: (value) => {
        if (value && value.length > 5000) {
            return 'Biography must be less than 5000 characters';
        }
        return null;
    },
    
    date: (value) => {
        if (value && !validator.isDate(value)) {
            return 'Invalid date format';
        }
        return null;
    },
    
    url: (value) => {
        if (value && !validator.isURL(value, { protocols: ['http', 'https'] })) {
            return 'Invalid URL';
        }
        return null;
    },
    
    phone: (value) => {
        if (value && !validator.isMobilePhone(value, 'any')) {
            return 'Invalid phone number';
        }
        return null;
    }
};

// Sanitization functions
const sanitizers = {
    text: (value) => {
        if (!value) return value;
        // Remove any HTML tags and trim
        return validator.escape(value.trim());
    },
    
    html: (value) => {
        if (!value) return value;
        // Use DOMPurify for safe HTML
        return DOMPurify.sanitize(value, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
            ALLOWED_ATTR: []
        });
    },
    
    email: (value) => {
        if (!value) return value;
        return validator.normalizeEmail(value.toLowerCase().trim());
    },
    
    url: (value) => {
        if (!value) return value;
        return validator.trim(value);
    },
    
    number: (value) => {
        if (value === null || value === undefined) return value;
        const num = Number(value);
        return isNaN(num) ? null : num;
    }
};

// File upload validation
const fileValidation = {
    image: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    },
    
    document: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        allowedExtensions: ['.pdf', '.doc', '.docx']
    }
};

// Validation middleware factory
const validateInput = (rules) => {
    return (req, res, next) => {
        const errors = {};
        
        for (const field in rules) {
            const value = req.body[field];
            const rule = rules[field];
            
            if (rule.required && !value) {
                errors[field] = `${field} is required`;
                continue;
            }
            
            if (value && rule.type && validationRules[rule.type]) {
                const error = validationRules[rule.type](value);
                if (error) {
                    errors[field] = error;
                }
            }
            
            if (value && rule.custom) {
                const error = rule.custom(value);
                if (error) {
                    errors[field] = error;
                }
            }
        }
        
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                error: 'Validation failed',
                errors: errors
            });
        }
        
        next();
    };
};

// Sanitization middleware
const sanitizeInput = (fields) => {
    return (req, res, next) => {
        for (const field of fields) {
            if (req.body[field.name] !== undefined) {
                req.body[field.name] = sanitizers[field.type](req.body[field.name]);
            }
        }
        next();
    };
};

// File upload validation middleware
const validateFileUpload = (type) => {
    return (req, res, next) => {
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        
        const config = fileValidation[type];
        if (!config) {
            return res.status(500).json({ error: 'Invalid file type configuration' });
        }
        
        for (const fieldName in req.files) {
            const file = req.files[fieldName];
            
            // Check file size
            if (file.size > config.maxSize) {
                return res.status(400).json({
                    error: `File ${file.name} exceeds maximum size of ${config.maxSize / 1024 / 1024}MB`
                });
            }
            
            // Check MIME type
            if (!config.allowedTypes.includes(file.mimetype)) {
                return res.status(400).json({
                    error: `File type ${file.mimetype} is not allowed`
                });
            }
            
            // Check file extension
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            if (!config.allowedExtensions.includes(ext)) {
                return res.status(400).json({
                    error: `File extension ${ext} is not allowed`
                });
            }
            
            // Additional security: check file content matches MIME type
            // This would require file-type library for deeper inspection
        }
        
        next();
    };
};

// SQL injection prevention for raw queries (if any)
const preventSQLInjection = (value) => {
    if (typeof value !== 'string') return value;
    // Basic SQL injection patterns
    const sqlPatterns = [
        /(\b)(DELETE|DROP|EXEC(UTE)?|INSERT|SELECT|UNION|UPDATE)(\b)/gi,
        /(\-\-)|(\;)|(\||\\)/g,
        /(\')|(\")|(\\x27)|(\\x22)/g
    ];
    
    for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
            throw new Error('Potential SQL injection detected');
        }
    }
    
    return value;
};

module.exports = {
    validationRules,
    sanitizers,
    validateInput,
    sanitizeInput,
    validateFileUpload,
    preventSQLInjection,
    fileValidation
};