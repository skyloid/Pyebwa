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
async function handleAuthSuccess(user) {
    try {
        // Get the ID token
        const idToken = await user.getIdToken();
        
        // Store auth state
        sessionStorage.setItem('pyebwaAuth', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
        }));
        
        // For cross-domain auth, we need to pass the token
        // Check if redirecting to a different domain
        const currentDomain = window.location.hostname;
        const targetUrl = new URL(redirectUrl);
        const targetDomain = targetUrl.hostname;
        
        // Always do direct redirect to avoid loops
        const separator = redirectUrl.includes('?') ? '&' : '?';
        window.location.href = redirectUrl + separator + 'auth=success&login=true';
    } catch (error) {
        console.error('Error in handleAuthSuccess:', error);
        // Fallback to simple redirect
        const separator = redirectUrl.includes('?') ? '&' : '?';
        window.location.href = redirectUrl + separator + 'auth=success&login=true';
    }
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
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Signing in...';
    
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        handleAuthSuccess(result.user);
    } catch (error) {
        alert('Login failed: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
});

// Signup form submission
document.getElementById('signupFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (password !== confirm) {
        alert('Passwords do not match!');
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Creating account...';
    
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
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});

// Google Sign In
document.getElementById('googleSignIn').addEventListener('click', async () => {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        
        // Check if user exists in Firestore
        const userDoc = await db.collection('users').doc(result.user.uid).get();
        if (!userDoc.exists) {
            // Create user profile
            await db.collection('users').doc(result.user.uid).set({
                uid: result.user.uid,
                email: result.user.email,
                fullName: result.user.displayName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        handleAuthSuccess(result.user);
    } catch (error) {
        alert('Google sign in failed: ' + error.message);
    }
});

document.getElementById('googleSignUp').addEventListener('click', async () => {
    // Same as sign in for Google
    document.getElementById('googleSignIn').click();
});

// Facebook Sign In
document.getElementById('facebookSignIn').addEventListener('click', async () => {
    try {
        const result = await auth.signInWithPopup(facebookProvider);
        
        // Check if user exists in Firestore
        const userDoc = await db.collection('users').doc(result.user.uid).get();
        if (!userDoc.exists) {
            // Create user profile
            await db.collection('users').doc(result.user.uid).set({
                uid: result.user.uid,
                email: result.user.email,
                fullName: result.user.displayName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        handleAuthSuccess(result.user);
    } catch (error) {
        alert('Facebook sign in failed: ' + error.message);
    }
});

document.getElementById('facebookSignUp').addEventListener('click', async () => {
    // Same as sign in for Facebook
    document.getElementById('facebookSignIn').click();
});