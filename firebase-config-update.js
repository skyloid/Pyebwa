// Firebase configuration - REPLACE WITH YOUR ACTUAL VALUES
// Get these from Firebase Console: Project Settings → General → Your apps → Web app

const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY_HERE", // Example: "AIzaSyDOCAbC123dEf456GhI789jKl012-MnO"
    authDomain: "your-project-id.firebaseapp.com", // Example: "pyebwa-app.firebaseapp.com"
    projectId: "your-project-id", // Example: "pyebwa-app"
    storageBucket: "your-project-id.appspot.com", // Example: "pyebwa-app.appspot.com"
    messagingSenderId: "123456789012", // Example: "123456789012"
    appId: "1:123456789012:web:abcdef123456789012345" // Example format
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Auth state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        console.log('User signed in:', user.email);
        // Store user session
        sessionStorage.setItem('pyebwaUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
        }));
    } else {
        // User is signed out
        console.log('User signed out');
        sessionStorage.removeItem('pyebwaUser');
    }
});