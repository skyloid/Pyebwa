#!/bin/bash

# SSH connection details
HOST="secure.pyebwa.com"
USER="pyebwa-secure"
PASS="Tqt6F3w5bEUGZ8acrJ9J"

echo "Setting up secure.pyebwa.com for authentication..."

# Create setup script
cat > /tmp/secure_setup.sh << 'EOF'
#!/bin/bash

echo "=== Setting up secure.pyebwa.com ==="

# Create directory structure
mkdir -p ~/public_html/{css,js,images}
cd ~/public_html

# Create index.html with login/signup interface
cat > index.html << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pyebwa Secure Login</title>
    <link rel="stylesheet" href="css/auth.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    
    <!-- Firebase SDK -->
    <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js"></script>
</head>
<body>
    <div class="auth-container">
        <div class="auth-box">
            <h1 class="logo">Pyebwa</h1>
            <p class="tagline">Secure Authentication</p>
            
            <!-- Login Form -->
            <div id="loginForm" class="auth-form active">
                <h2>Sign In</h2>
                <form id="loginFormElement">
                    <div class="form-group">
                        <input type="email" id="loginEmail" placeholder="Email" required>
                    </div>
                    <div class="form-group">
                        <input type="password" id="loginPassword" placeholder="Password" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Sign In</button>
                </form>
                
                <div class="social-divider">
                    <span>Or continue with</span>
                </div>
                
                <div class="social-buttons">
                    <button type="button" class="btn-social" id="googleSignIn">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
                        <span>Google</span>
                    </button>
                    <button type="button" class="btn-social" id="facebookSignIn">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg" alt="Facebook">
                        <span>Facebook</span>
                    </button>
                </div>
                
                <p class="form-footer">
                    Don't have an account? <a href="#" id="showSignup">Sign up</a>
                </p>
            </div>
            
            <!-- Signup Form -->
            <div id="signupForm" class="auth-form">
                <h2>Create Account</h2>
                <form id="signupFormElement">
                    <div class="form-group">
                        <input type="text" id="signupName" placeholder="Full Name" required>
                    </div>
                    <div class="form-group">
                        <input type="email" id="signupEmail" placeholder="Email" required>
                    </div>
                    <div class="form-group">
                        <input type="password" id="signupPassword" placeholder="Password" required>
                    </div>
                    <div class="form-group">
                        <input type="password" id="signupConfirm" placeholder="Confirm Password" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Create Account</button>
                </form>
                
                <div class="social-divider">
                    <span>Or continue with</span>
                </div>
                
                <div class="social-buttons">
                    <button type="button" class="btn-social" id="googleSignUp">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
                        <span>Google</span>
                    </button>
                    <button type="button" class="btn-social" id="facebookSignUp">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg" alt="Facebook">
                        <span>Facebook</span>
                    </button>
                </div>
                
                <p class="form-footer">
                    Already have an account? <a href="#" id="showLogin">Sign in</a>
                </p>
            </div>
        </div>
    </div>
    
    <script src="js/firebase-config.js"></script>
    <script src="js/auth.js"></script>
    <script src="js/secure-app.js"></script>
</body>
</html>
HTML

echo "✓ Created index.html"

# Create CSS file
cat > css/auth.css << 'CSS'
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --primary-red: #D41125;
    --primary-blue: #00217D;
    --accent-yellow: #FFC72C;
    --white: #FFFFFF;
    --gray-50: #F9FAFB;
    --gray-100: #F3F4F6;
    --gray-200: #E5E7EB;
    --gray-300: #D1D5DB;
    --gray-600: #4B5563;
    --gray-800: #1F2937;
    --gray-900: #111827;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.auth-container {
    width: 100%;
    max-width: 400px;
    padding: 20px;
}

.auth-box {
    background: var(--white);
    border-radius: 16px;
    padding: 40px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.logo {
    text-align: center;
    font-size: 36px;
    font-weight: 800;
    background: linear-gradient(135deg, #D41125 0%, #FF1744 50%, #D41125 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
}

.tagline {
    text-align: center;
    color: var(--gray-600);
    margin-bottom: 30px;
}

.auth-form {
    display: none;
}

.auth-form.active {
    display: block;
}

.auth-form h2 {
    text-align: center;
    margin-bottom: 24px;
    color: var(--gray-900);
}

.form-group {
    margin-bottom: 16px;
}

.form-group input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid var(--gray-200);
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.2s;
}

.form-group input:focus {
    outline: none;
    border-color: var(--primary-blue);
    box-shadow: 0 0 0 3px rgba(0, 33, 125, 0.1);
}

.btn {
    width: 100%;
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-primary {
    background: var(--primary-blue);
    color: var(--white);
}

.btn-primary:hover {
    background: #001654;
    transform: translateY(-1px);
}

.social-divider {
    text-align: center;
    margin: 20px 0;
    position: relative;
}

.social-divider span {
    background: var(--white);
    padding: 0 10px;
    color: var(--gray-600);
    font-size: 14px;
}

.social-divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--gray-200);
    z-index: -1;
}

.social-buttons {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.btn-social {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
    background: var(--white);
    border: 1px solid var(--gray-300);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-social:hover {
    background: var(--gray-50);
    border-color: var(--gray-400);
}

.btn-social img {
    width: 18px;
    height: 18px;
}

.form-footer {
    text-align: center;
    color: var(--gray-600);
    font-size: 14px;
}

.form-footer a {
    color: var(--primary-blue);
    text-decoration: none;
}

.form-footer a:hover {
    text-decoration: underline;
}
CSS

echo "✓ Created auth.css"

# Create firebase-config.js
cat > js/firebase-config.js << 'JS'
// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyApTHhm_Ia0sz63YDw2mYXiXp_qED7NdOQ",
    authDomain: "pyebwa-f5960.firebaseapp.com",
    projectId: "pyebwa-f5960",
    storageBucket: "pyebwa-f5960.firebasestorage.app",
    messagingSenderId: "1042887343749",
    appId: "1:1042887343749:web:c276bf69b6c0895111f3ec",
    measurementId: "G-ZX92K1TMM3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Set persistence
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
JS

echo "✓ Created firebase-config.js"

# Copy auth.js from pyebwa.com
# For now, create a placeholder
cat > js/auth.js << 'JS'
// This file will contain the auth functions from pyebwa.com
// Placeholder for now
JS

echo "✓ Created auth.js placeholder"

# Create secure-app.js
cat > js/secure-app.js << 'JS'
// Secure authentication app logic

// Get redirect URL from query params
const urlParams = new URLSearchParams(window.location.search);
const redirectUrl = urlParams.get('redirect') || 'https://rasin.pyebwa.com/app/';

// Form switching
document.getElementById('showSignup').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('signupForm').classList.add('active');
});

document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('signupForm').classList.remove('active');
    document.getElementById('loginForm').classList.add('active');
});

// Handle successful authentication
function handleAuthSuccess(user) {
    // Store auth state
    sessionStorage.setItem('pyebwaAuth', JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
    }));
    
    // Redirect to target URL
    window.location.href = redirectUrl + '?auth=success';
}

// Check if already authenticated
auth.onAuthStateChanged((user) => {
    if (user) {
        // Already logged in, redirect
        handleAuthSuccess(user);
    }
});

// Login form submission
document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        handleAuthSuccess(result.user);
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
});

// Signup form submission
document.getElementById('signupFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;
    
    if (password !== confirm) {
        alert('Passwords do not match!');
        return;
    }
    
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        await result.user.updateProfile({ displayName: name });
        
        // Create user profile in Firestore
        await db.collection('users').doc(result.user.uid).set({
            uid: result.user.uid,
            email: email,
            fullName: name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        handleAuthSuccess(result.user);
    } catch (error) {
        alert('Signup failed: ' + error.message);
    }
});

// Google Sign In
const googleProvider = new firebase.auth.GoogleAuthProvider();

document.getElementById('googleSignIn').addEventListener('click', async () => {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        handleAuthSuccess(result.user);
    } catch (error) {
        alert('Google sign in failed: ' + error.message);
    }
});

document.getElementById('googleSignUp').addEventListener('click', async () => {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        handleAuthSuccess(result.user);
    } catch (error) {
        alert('Google sign in failed: ' + error.message);
    }
});

// Facebook Sign In
const facebookProvider = new firebase.auth.FacebookAuthProvider();

document.getElementById('facebookSignIn').addEventListener('click', async () => {
    try {
        const result = await auth.signInWithPopup(facebookProvider);
        handleAuthSuccess(result.user);
    } catch (error) {
        alert('Facebook sign in failed: ' + error.message);
    }
});

document.getElementById('facebookSignUp').addEventListener('click', async () => {
    try {
        const result = await auth.signInWithPopup(facebookProvider);
        handleAuthSuccess(result.user);
    } catch (error) {
        alert('Facebook sign in failed: ' + error.message);
    }
});
JS

echo "✓ Created secure-app.js"

# Create .htaccess for proper routing
cat > .htaccess << 'HTACCESS'
# Enable URL rewriting
RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Set default index
DirectoryIndex index.html

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>
HTACCESS

echo "✓ Created .htaccess"

echo "=== Setup complete! ==="
echo "secure.pyebwa.com is now ready for authentication"
echo "Visit https://secure.pyebwa.com to test"
EOF

# Execute the setup script via SSH
echo "Connecting to secure.pyebwa.com..."
echo "$PASS" | ssh -o StrictHostKeyChecking=no $USER@$HOST 'bash -s' < /tmp/secure_setup.sh

echo "Setup complete!"