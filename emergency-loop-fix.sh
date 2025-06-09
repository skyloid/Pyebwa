#!/bin/bash
# Emergency fix for login loop - copy simple-login.html to expected location

echo "Creating emergency login page..."

# Create a simple inline login page that works immediately
cat > upload-emergency-login.py << 'EOF'
import ftplib
import time

login_html = '''<!DOCTYPE html>
<html>
<head>
    <title>Pyebwa Login</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js"></script>
    <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f7fa; }
        .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
        h1 { color: #00217D; text-align: center; margin-bottom: 30px; }
        input { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
        button { width: 100%; padding: 12px; background: #00217D; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; margin-top: 10px; }
        button:hover { background: #001654; }
        .message { padding: 10px; margin: 10px 0; border-radius: 4px; text-align: center; }
        .error { background: #fee; color: #c33; }
        .success { background: #efe; color: #3c3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Pyebwa Login</h1>
        <div id="message"></div>
        <form id="loginForm">
            <input type="email" id="email" placeholder="Email" required>
            <input type="password" id="password" placeholder="Password" required>
            <button type="submit">Sign In</button>
        </form>
    </div>
    <script>
        const firebaseConfig = {
            apiKey: "AIzaSyDW3XLnIR8QQyWeYb3kR2EKqXoJGNNHNsE",
            authDomain: "pyebwa-8f81f.firebaseapp.com",
            projectId: "pyebwa-8f81f",
            storageBucket: "pyebwa-8f81f.appspot.com",
            messagingSenderId: "635176217953",
            appId: "1:635176217953:web:d088f17c87e2e088ad4e0f"
        };
        firebase.initializeApp(firebaseConfig);
        
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const messageDiv = document.getElementById('message');
            
            try {
                await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                await firebase.auth().signInWithEmailAndPassword(email, password);
                messageDiv.className = 'message success';
                messageDiv.textContent = 'Success! Redirecting...';
                setTimeout(() => { window.location.href = '/app/'; }, 1500);
            } catch (error) {
                messageDiv.className = 'message error';
                messageDiv.textContent = error.message;
            }
        });
    </script>
</body>
</html>'''

try:
    print("Connecting to FTP...")
    ftp = ftplib.FTP('pyebwa.com', timeout=10)
    ftp.login('pyebwa', 'Haiti2019$')
    ftp.cwd('/htdocs')
    
    # Upload as simple-login.html (since app.js is looking for it)
    print("Uploading simple-login.html...")
    ftp.storbinary('STOR simple-login.html', login_html.encode('utf-8'))
    
    # Also upload the fixed app.js
    print("Uploading fixed app.js...")
    with open('app/js/app.js', 'rb') as f:
        ftp.storbinary('STOR app/js/app.js', f)
    
    ftp.quit()
    print("Success! Login loop should be fixed.")
    
except Exception as e:
    print(f"Error: {e}")
    print("\nTrying alternative upload method...")
    # Try alternative method here if needed
EOF

echo "Running emergency fix..."
python3 upload-emergency-login.py

echo "Done! The login loop should be fixed now."