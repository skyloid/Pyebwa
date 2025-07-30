// Apply saved theme immediately to prevent flash
(function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
})();

// Cookie helper function
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Debug: Log when script loads
console.log('App.js loaded - Modal functionality removed, translation system removed to avoid conflicts');

// App functionality without conflicting translation system
document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const ctaBtn = document.getElementById('ctaBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.querySelector('.mobile-nav');

    // Login button - redirect to rasin.pyebwa.com with language preference
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            // Get current language from cookie or localStorage
            const currentLang = getCookie('pyebwa_lang') || localStorage.getItem('pyebwaLang') || 'ht';
            window.location.href = `https://rasin.pyebwa.com/login.html?lang=${currentLang}`;
        });
    }

    // Signup button - redirect to rasin.pyebwa.com with language preference
    if (signupBtn) {
        signupBtn.addEventListener('click', function() {
            // Get current language from cookie or localStorage
            const currentLang = getCookie('pyebwa_lang') || localStorage.getItem('pyebwaLang') || 'ht';
            window.location.href = `https://rasin.pyebwa.com/signup.html?lang=${currentLang}`;
        });
    }

    // CTA button - redirect to rasin.pyebwa.com signup with language preference
    if (ctaBtn) {
        ctaBtn.addEventListener('click', function() {
            // Get current language from cookie or localStorage
            const currentLang = getCookie('pyebwa_lang') || localStorage.getItem('pyebwaLang') || 'ht';
            window.location.href = `https://rasin.pyebwa.com/signup.html?lang=${currentLang}`;
        });
    }
    
    // Mobile menu functionality
    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileNav.classList.toggle('active');
            mobileMenuBtn.querySelector('.material-icons').textContent = 
                mobileNav.classList.contains('active') ? 'close' : 'menu';
        });
    }
    
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            
            // Update icon
            const icon = themeToggle.querySelector('.material-icons');
            if (icon) {
                icon.textContent = isDark ? 'light_mode' : 'dark_mode';
            }
        });
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add active class to current navigation item
const currentLocation = location.pathname;
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    if (link.getAttribute('href') === currentLocation) {
        link.classList.add('active');
    }
});