// Input Validation and Sanitization for Pyebwa App
(function() {
    'use strict';
    
    const InputValidator = {
        // Validation rules
        rules: {
            email: {
                pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                maxLength: 254,
                message: 'Please enter a valid email address'
            },
            password: {
                minLength: 8,
                maxLength: 128,
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
                message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
            },
            name: {
                pattern: /^[a-zA-ZÀ-ÿ\u0100-\u017f\u0180-\u024f\s\-']{1,100}$/,
                minLength: 1,
                maxLength: 100,
                message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
            },
            phone: {
                pattern: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
                message: 'Please enter a valid phone number'
            },
            date: {
                pattern: /^\d{4}-\d{2}-\d{2}$/,
                validator: (value) => {
                    const date = new Date(value);
                    return date instanceof Date && !isNaN(date) && value === date.toISOString().split('T')[0];
                },
                message: 'Please enter a valid date (YYYY-MM-DD)'
            },
            url: {
                pattern: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
                maxLength: 2048,
                message: 'Please enter a valid URL'
            },
            biography: {
                maxLength: 5000,
                sanitize: true,
                message: 'Biography must be less than 5000 characters'
            },
            familyTreeName: {
                pattern: /^[a-zA-Z0-9\s\-']{1,50}$/,
                minLength: 1,
                maxLength: 50,
                message: 'Family tree name can only contain letters, numbers, spaces, hyphens, and apostrophes'
            }
        },
        
        // HTML entities map for escaping
        htmlEntities: {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        },
        
        // Initialize validator
        init() {
            this.setupFormValidation();
            this.setupRealtimeValidation();
        },
        
        // Validate a single field
        validate(value, type, customRules = {}) {
            const rules = { ...this.rules[type], ...customRules };
            const errors = [];
            
            // Required check
            if (rules.required && !value) {
                errors.push('This field is required');
                return { valid: false, errors };
            }
            
            // Empty values pass if not required
            if (!value && !rules.required) {
                return { valid: true, errors: [] };
            }
            
            // Type conversion
            value = String(value).trim();
            
            // Length checks
            if (rules.minLength && value.length < rules.minLength) {
                errors.push(`Minimum length is ${rules.minLength} characters`);
            }
            
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(`Maximum length is ${rules.maxLength} characters`);
            }
            
            // Pattern check
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push(rules.message || 'Invalid format');
            }
            
            // Custom validator
            if (rules.validator && !rules.validator(value)) {
                errors.push(rules.message || 'Invalid value');
            }
            
            // Range checks for numbers
            if (rules.min !== undefined && Number(value) < rules.min) {
                errors.push(`Minimum value is ${rules.min}`);
            }
            
            if (rules.max !== undefined && Number(value) > rules.max) {
                errors.push(`Maximum value is ${rules.max}`);
            }
            
            return {
                valid: errors.length === 0,
                errors: errors,
                sanitized: rules.sanitize ? this.sanitize(value) : value
            };
        },
        
        // Sanitize HTML content
        sanitize(input, options = {}) {
            const defaults = {
                allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
                allowedAttributes: {
                    'a': ['href', 'title', 'target']
                },
                allowedSchemes: ['http', 'https', 'mailto']
            };
            
            const config = { ...defaults, ...options };
            
            // First, escape all HTML
            let cleaned = this.escapeHtml(input);
            
            // Then selectively unescape allowed tags
            config.allowedTags.forEach(tag => {
                const openTag = new RegExp(`&lt;${tag}(\\s[^&]*)?&gt;`, 'gi');
                const closeTag = new RegExp(`&lt;\\/${tag}&gt;`, 'gi');
                
                cleaned = cleaned.replace(openTag, (match) => {
                    // Validate attributes
                    return this.validateTag(match, tag, config);
                });
                
                cleaned = cleaned.replace(closeTag, `</${tag}>`);
            });
            
            return cleaned;
        },
        
        // Escape HTML entities
        escapeHtml(str) {
            return String(str).replace(/[&<>"'\/]/g, (s) => this.htmlEntities[s]);
        },
        
        // Validate tag attributes
        validateTag(escapedTag, tagName, config) {
            const tag = escapedTag.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            const allowedAttrs = config.allowedAttributes[tagName] || [];
            
            if (allowedAttrs.length === 0) {
                return `<${tagName}>`;
            }
            
            // Parse attributes
            const attrRegex = /(\w+)=["']([^"']+)["']/g;
            const validAttrs = [];
            let match;
            
            while ((match = attrRegex.exec(tag)) !== null) {
                const [, attr, value] = match;
                
                if (allowedAttrs.includes(attr)) {
                    // Special validation for href
                    if (attr === 'href' && !this.isValidUrl(value, config.allowedSchemes)) {
                        continue;
                    }
                    
                    validAttrs.push(`${attr}="${this.escapeHtml(value)}"`);
                }
            }
            
            return validAttrs.length > 0 
                ? `<${tagName} ${validAttrs.join(' ')}>` 
                : `<${tagName}>`;
        },
        
        // Validate URL
        isValidUrl(url, allowedSchemes) {
            try {
                const parsed = new URL(url);
                return allowedSchemes.includes(parsed.protocol.slice(0, -1));
            } catch {
                // Relative URLs are allowed
                return url.startsWith('/') || url.startsWith('#');
            }
        },
        
        // Setup form validation
        setupFormValidation() {
            document.addEventListener('submit', (e) => {
                const form = e.target;
                if (!form.hasAttribute('data-validate')) return;
                
                const errors = this.validateForm(form);
                if (errors.length > 0) {
                    e.preventDefault();
                    this.displayErrors(form, errors);
                }
            });
        },
        
        // Validate entire form
        validateForm(form) {
            const errors = [];
            const inputs = form.querySelectorAll('input, textarea, select');
            
            inputs.forEach(input => {
                const type = input.dataset.validate || input.type;
                const rules = {
                    required: input.hasAttribute('required'),
                    ...this.parseRules(input)
                };
                
                const result = this.validate(input.value, type, rules);
                
                if (!result.valid) {
                    errors.push({
                        field: input.name || input.id,
                        element: input,
                        errors: result.errors
                    });
                }
                
                // Update sanitized value
                if (result.sanitized !== undefined && result.sanitized !== input.value) {
                    input.value = result.sanitized;
                }
            });
            
            return errors;
        },
        
        // Parse validation rules from data attributes
        parseRules(element) {
            const rules = {};
            
            if (element.dataset.minLength) rules.minLength = parseInt(element.dataset.minLength);
            if (element.dataset.maxLength) rules.maxLength = parseInt(element.dataset.maxLength);
            if (element.dataset.min) rules.min = parseFloat(element.dataset.min);
            if (element.dataset.max) rules.max = parseFloat(element.dataset.max);
            if (element.dataset.pattern) rules.pattern = new RegExp(element.dataset.pattern);
            if (element.dataset.message) rules.message = element.dataset.message;
            
            return rules;
        },
        
        // Setup real-time validation
        setupRealtimeValidation() {
            document.addEventListener('blur', (e) => {
                const input = e.target;
                if (!input || typeof input.matches !== 'function' || !input.matches('input, textarea') || !input.dataset.validate) return;
                
                this.validateField(input);
            }, true);
            
            // Validate on input for better UX
            document.addEventListener('input', (e) => {
                const input = e.target;
                if (!input || typeof input.matches !== 'function' || !input.matches('input, textarea') || !input.dataset.validate) return;
                
                // Clear error state if valid
                if (input.classList.contains('error')) {
                    this.validateField(input);
                }
            });
        },
        
        // Validate single field
        validateField(input) {
            const type = input.dataset.validate || input.type;
            const rules = {
                required: input.hasAttribute('required'),
                ...this.parseRules(input)
            };
            
            const result = this.validate(input.value, type, rules);
            
            // Update UI
            if (result.valid) {
                input.classList.remove('error');
                input.classList.add('valid');
                this.clearFieldError(input);
            } else {
                input.classList.remove('valid');
                input.classList.add('error');
                this.showFieldError(input, result.errors[0]);
            }
            
            // Update sanitized value
            if (result.sanitized !== undefined && result.sanitized !== input.value) {
                input.value = result.sanitized;
            }
            
            return result.valid;
        },
        
        // Show field error
        showFieldError(input, message) {
            let errorEl = input.parentElement.querySelector('.field-error');
            
            if (!errorEl) {
                errorEl = document.createElement('div');
                errorEl.className = 'field-error';
                input.parentElement.appendChild(errorEl);
            }
            
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        },
        
        // Clear field error
        clearFieldError(input) {
            const errorEl = input.parentElement.querySelector('.field-error');
            if (errorEl) {
                errorEl.style.display = 'none';
            }
        },
        
        // Display form errors
        displayErrors(form, errors) {
            // Clear previous errors
            form.querySelectorAll('.field-error').forEach(el => el.remove());
            
            // Show new errors
            errors.forEach(error => {
                this.showFieldError(error.element, error.errors[0]);
                error.element.classList.add('error');
            });
            
            // Focus first error field
            if (errors.length > 0) {
                errors[0].element.focus();
            }
        },
        
        // Sanitize object (for Firebase)
        sanitizeObject(obj, schema = {}) {
            const sanitized = {};
            
            for (const [key, value] of Object.entries(obj)) {
                // Skip undefined values
                if (value === undefined) continue;
                
                // Apply schema validation if provided
                if (schema[key]) {
                    const result = this.validate(value, schema[key].type || 'text', schema[key]);
                    if (result.valid) {
                        sanitized[key] = result.sanitized || value;
                    }
                } else {
                    // Default sanitization
                    if (typeof value === 'string') {
                        sanitized[key] = this.escapeHtml(value);
                    } else if (typeof value === 'object' && value !== null) {
                        sanitized[key] = this.sanitizeObject(value);
                    } else {
                        sanitized[key] = value;
                    }
                }
            }
            
            return sanitized;
        },
        
        // Utility functions
        isEmail(email) {
            return this.validate(email, 'email').valid;
        },
        
        isStrongPassword(password) {
            return this.validate(password, 'password').valid;
        },
        
        isValidDate(date) {
            return this.validate(date, 'date').valid;
        },
        
        isValidUrl(url) {
            return this.validate(url, 'url').valid;
        }
    };
    
    // Add CSS for validation states
    const style = document.createElement('style');
    style.textContent = `
        .field-error {
            color: #ef4444;
            font-size: 0.875rem;
            margin-top: 0.25rem;
            display: none;
        }
        
        input.error,
        textarea.error {
            border-color: #ef4444 !important;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }
        
        input.valid,
        textarea.valid {
            border-color: #10b981 !important;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
        
        .error-summary {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 20px;
        }
        
        .error-summary h3 {
            color: #991b1b;
            margin: 0 0 8px 0;
        }
        
        .error-summary ul {
            margin: 0;
            padding-left: 20px;
            color: #b91c1c;
        }
    `;
    document.head.appendChild(style);
    
    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => InputValidator.init());
    } else {
        InputValidator.init();
    }
    
    // Export for use
    window.pyebwaValidator = InputValidator;
})();