// Authentication functions for Firebase

// Error messages in multiple languages
const authErrors = {
    en: {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
        'default': 'An error occurred. Please try again.'
    },
    fr: {
        'auth/email-already-in-use': 'Cet email est déjà enregistré.',
        'auth/invalid-email': 'Adresse email invalide.',
        'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
        'auth/user-not-found': 'Aucun compte trouvé avec cet email.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion.',
        'default': 'Une erreur s\'est produite. Veuillez réessayer.'
    },
    ht: {
        'auth/email-already-in-use': 'Imèl sa deja anrejistre.',
        'auth/invalid-email': 'Adrès imèl pa valab.',
        'auth/weak-password': 'Mo pas la dwe gen omwen 6 karaktè.',
        'auth/user-not-found': 'Pa gen kont ki gen imèl sa.',
        'auth/wrong-password': 'Mo pas la pa kòrèk.',
        'auth/network-request-failed': 'Erè rezo. Tanpri tcheke koneksyon ou.',
        'default': 'Gen yon erè. Tanpri eseye ankò.'
    }
};

// Default language
let currentLang = 'en';

// Get localized error message
function getAuthError(errorCode, lang = 'en') {
    return authErrors[lang][errorCode] || authErrors[lang]['default'];
}

// Create user profile in Firestore
async function createUserProfile(uid, userData) {
    try {
        await db.collection('users').doc(uid).set({
            uid: uid,
            email: userData.email,
            fullName: userData.fullName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            language: currentLang,
            familyTreeId: null // Will be created when they first access rasin.pyebwa.com
        });
        return true;
    } catch (error) {
        console.error('Error creating user profile:', error);
        return false;
    }
}

// Sign up with email and password
async function signUpWithEmail(email, password, fullName) {
    try {
        // Create authentication user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update display name
        await user.updateProfile({
            displayName: fullName
        });
        
        // Create user profile in Firestore
        await createUserProfile(user.uid, {
            email: email,
            fullName: fullName
        });
        
        // Send verification email (optional)
        // await user.sendEmailVerification();
        
        return { success: true, user: user };
    } catch (error) {
        console.error('Signup error:', error);
        return { 
            success: false, 
            error: getAuthError(error.code, currentLang) 
        };
    }
}

// Sign in with email and password
async function signInWithEmail(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Get ID token for cross-domain auth
        const idToken = await user.getIdToken();
        
        // Update last login
        await db.collection('users').doc(user.uid).update({
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return { success: true, user: user, idToken: idToken };
    } catch (error) {
        console.error('Login error:', error);
        return { 
            success: false, 
            error: getAuthError(error.code, currentLang) 
        };
    }
}

// Sign out
async function signOut() {
    try {
        await auth.signOut();
        sessionStorage.clear();
        return { success: true };
    } catch (error) {
        console.error('Signout error:', error);
        return { success: false, error: error.message };
    }
}

// Check if user is authenticated
function isAuthenticated() {
    return auth.currentUser !== null;
}

// Get current user
function getCurrentUser() {
    return auth.currentUser;
}

// Initialize social auth providers
const googleProvider = new firebase.auth.GoogleAuthProvider();
const facebookProvider = new firebase.auth.FacebookAuthProvider();

// Sign in with Google
async function signInWithGoogle() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        
        // Check if user profile exists
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // Create new user profile
            await createUserProfile(user.uid, {
                email: user.email,
                fullName: user.displayName || 'Google User'
            });
        } else {
            // Update last login
            await db.collection('users').doc(user.uid).update({
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Get ID token
        const idToken = await user.getIdToken();
        
        return { success: true, user: user, idToken: idToken };
    } catch (error) {
        console.error('Google sign-in error:', error);
        return { 
            success: false, 
            error: getAuthError(error.code, currentLang) 
        };
    }
}

// Sign in with Facebook
async function signInWithFacebook() {
    try {
        const result = await auth.signInWithPopup(facebookProvider);
        const user = result.user;
        
        // Check if user profile exists
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // Create new user profile
            await createUserProfile(user.uid, {
                email: user.email,
                fullName: user.displayName || 'Facebook User'
            });
        } else {
            // Update last login
            await db.collection('users').doc(user.uid).update({
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Get ID token
        const idToken = await user.getIdToken();
        
        return { success: true, user: user, idToken: idToken };
    } catch (error) {
        console.error('Facebook sign-in error:', error);
        return { 
            success: false, 
            error: getAuthError(error.code, currentLang) 
        };
    }
}