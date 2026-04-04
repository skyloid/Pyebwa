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

// Get current language preference
function getCurrentLang() {
    return getCookie('pyebwa_lang') || localStorage.getItem('pyebwaLang') || 'ht';
}

// App functionality
document.addEventListener('DOMContentLoaded', function() {
    var loginBtn = document.getElementById('loginBtn');
    var signupBtn = document.getElementById('signupBtn');
    var ctaBtn = document.getElementById('ctaBtn');
    var mobileMenuBtn = document.getElementById('mobileMenuBtn') || document.getElementById('mobileMenuToggle');
    var mobileNav = document.querySelector('.mobile-nav') || document.querySelector('.nav-menu');

    // Login button - append language param to href
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            var lang = getCurrentLang();
            var baseUrl = loginBtn.getAttribute('href') || 'https://rasin.pyebwa.com/login-standalone.html';
            var separator = baseUrl.indexOf('?') === -1 ? '?' : '&';
            window.location.href = baseUrl + separator + 'lang=' + lang;
            e.preventDefault();
        });
    }

    // Signup button - append language param to href
    if (signupBtn) {
        signupBtn.addEventListener('click', function(e) {
            var lang = getCurrentLang();
            var baseUrl = signupBtn.getAttribute('href') || 'https://rasin.pyebwa.com/signup-standalone.html';
            var separator = baseUrl.indexOf('?') === -1 ? '?' : '&';
            window.location.href = baseUrl + separator + 'lang=' + lang;
            e.preventDefault();
        });
    }

    // CTA button - append language param to href
    if (ctaBtn) {
        ctaBtn.addEventListener('click', function(e) {
            var lang = getCurrentLang();
            var baseUrl = ctaBtn.getAttribute('href') || 'https://rasin.pyebwa.com/signup-standalone.html';
            var separator = baseUrl.indexOf('?') === -1 ? '?' : '&';
            window.location.href = baseUrl + separator + 'lang=' + lang;
            e.preventDefault();
        });
    }

    // Mobile menu functionality
    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileNav.classList.toggle('active');
            var icon = mobileMenuBtn.querySelector('.material-icons');
            if (icon) {
                icon.textContent = mobileNav.classList.contains('active') ? 'close' : 'menu';
            }
        });
    }

    // Theme toggle handled by inline script in HTML — no duplicate listener needed
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add active class to current navigation item
var currentLocation = location.pathname;
var navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(function(link) {
    if (link.getAttribute('href') === currentLocation) {
        link.classList.add('active');
    }
});
