// Apply saved theme immediately to prevent flash
(function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
})();

// Debug: Log when script loads
console.log('App.js loaded - Modal functionality removed, null checks added');

// Translations
const translations = {
    en: {
        tagline: "Your Family Roots",
        login: "Login",
        signup: "Sign Up",
        heroTitle: "Keep Your Family History Alive",
        heroSubtitle: "Create your family tree, share stories, and connect generations",
        getStarted: "Get Started Now",
        featuresTitle: "Why Pyebwa?",
        feature1Title: "Build Your Tree",
        feature1Desc: "Add family members, photos, and important dates easily",
        feature2Title: "Share Stories",
        feature2Desc: "Preserve memories and family stories for future generations",
        feature3Title: "Connect Family",
        feature3Desc: "Find and connect with family members everywhere",
        allRights: "All rights reserved.",
        poweredBy: "Powered by",
        home: "Home",
        about: "About",
        ourMission: "Our Mission",
        contact: "Contact",
        humanLevelTech: "Humanitarian Technologies"
    },
    fr: {
        tagline: "Vos Racines Familiales",
        login: "Connexion",
        signup: "S'inscrire",
        heroTitle: "Gardez Votre Histoire Familiale Vivante",
        heroSubtitle: "Créez votre arbre généalogique, partagez des histoires et connectez les générations",
        getStarted: "Commencer Maintenant",
        featuresTitle: "Pourquoi Pyebwa?",
        feature1Title: "Construisez Votre Arbre",
        feature1Desc: "Ajoutez facilement des membres de la famille, des photos et des dates importantes",
        feature2Title: "Partagez des Histoires",
        feature2Desc: "Préservez les souvenirs et histoires familiales pour les générations futures",
        feature3Title: "Connectez la Famille",
        feature3Desc: "Trouvez et connectez-vous avec des membres de la famille partout",
        allRights: "Tous droits réservés.",
        poweredBy: "Propulsé par",
        home: "Accueil",
        about: "À propos",
        ourMission: "Notre Mission",
        contact: "Contact",
        humanLevelTech: "Technologies Humanitaires"
    },
    ht: {
        tagline: "Rasin Fanmi Ou",
        login: "Konekte",
        signup: "Enskri",
        heroTitle: "Kenbe Istwa Fanmi Ou Vivan",
        heroSubtitle: "Kreye pyebwa fanmi ou, pataje istwa, epi konekte jenerasyon yo",
        getStarted: "Kòmanse Kounye a",
        featuresTitle: "Poukisa Pyebwa?",
        feature1Title: "Konstwi Pyebwa Ou",
        feature1Desc: "Ajoute manm fanmi, foto, ak dat enpòtan fasilman",
        feature2Title: "Pataje Istwa",
        feature2Desc: "Prezève souvni ak istwa fanmi pou jenerasyon k ap vini yo",
        feature3Title: "Konekte Fanmi",
        feature3Desc: "Jwenn epi konekte ak manm fanmi toupatou",
        allRights: "Tout dwa rezève.",
        poweredBy: "Pwodwi pa",
        home: "Akèy",
        about: "Konsènan",
        ourMission: "Misyon Nou",
        contact: "Kontak",
        humanLevelTech: "Technologies Humanitaires"
    }
};

// Current language
let currentLang = 'ht';

// DOM Elements - with null safety
const modalOverlay = document.getElementById('modalOverlay');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const ctaBtn = document.getElementById('ctaBtn');

// Language switching
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const activeBtn = document.querySelector('.lang-btn.active');
        if (activeBtn) {
            activeBtn.classList.remove('active');
        }
        e.target.classList.add('active');
        currentLang = e.target.dataset.lang;
        updateLanguage();
    });
});

function updateLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.dataset.i18n;
        if (translations[currentLang] && translations[currentLang][key]) {
            element.textContent = translations[currentLang][key];
        }
    });
}

// Authentication functions - redirects to pyebwa.com/login/
function redirectToLogin() {
    console.log('Redirecting to login page');
    window.location.href = 'https://pyebwa.com/login/';
}

// Event listeners - Redirect to pyebwa.com/login/ for auth
if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Login button clicked - redirecting to login page');
        redirectToLogin();
    });
}

if (signupBtn) {
    signupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Signup button clicked - redirecting to login page');
        redirectToLogin();
    });
}

if (ctaBtn) {
    ctaBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('CTA button clicked - redirecting to login page');
        redirectToLogin();
    });
}

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
    if (themeToggle) {
        themeToggle.innerHTML = '<span class="material-icons">light_mode</span>';
    }
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        
        // Update icon
        themeToggle.innerHTML = isDarkMode ? 
            '<span class="material-icons">light_mode</span>' : 
            '<span class="material-icons">dark_mode</span>';
        
        // Save preference
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });
}

// Mobile Menu Toggle - with null checks
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        const isActive = mobileMenu.classList.contains('active');
        mobileMenuBtn.innerHTML = isActive ? 
            '<span class="material-icons">close</span>' : 
            '<span class="material-icons">menu</span>';
    });
}

// Close mobile menu when clicking outside - with null checks
document.addEventListener('click', (e) => {
    if (mobileMenu && mobileMenuBtn && 
        mobileMenu.classList.contains('active') && 
        !mobileMenu.contains(e.target) && 
        !mobileMenuBtn.contains(e.target)) {
        mobileMenu.classList.remove('active');
        mobileMenuBtn.innerHTML = '<span class="material-icons">menu</span>';
    }
});

// Close mobile menu when clicking on a link - with null checks
document.querySelectorAll('.mobile-menu a').forEach(link => {
    link.addEventListener('click', () => {
        if (mobileMenu && mobileMenuBtn) {
            mobileMenu.classList.remove('active');
            mobileMenuBtn.innerHTML = '<span class="material-icons">menu</span>';
        }
    });
});

// Navigation Links
const navLinks = document.querySelectorAll('a[href^="https://rasin.pyebwa.com/app"]');
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        // Check if authenticated before redirecting to app
        const isAuthenticated = localStorage.getItem('pyebwaAuth') === 'true';
        if (isAuthenticated) {
            window.location.href = link.href;
        } else {
            // Redirect to login first
            localStorage.setItem('pyebwaRedirect', link.href);
            redirectToLogin();
        }
    });
});

// Initialize language
updateLanguage();

// Debug: Log initialization complete
console.log('App initialization complete - Authentication redirects to pyebwa.com/login/');