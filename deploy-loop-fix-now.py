#!/usr/bin/env python3
"""
Emergency deployment to fix login loop using working FTP credentials
"""

import ftplib
from datetime import datetime

# Working FTP credentials
FTP_HOST = "145.223.107.9"
FTP_USER = "u316621955.pyebwa.com"
FTP_PASS = "~3jB~XmCbjO>K2VY"

def upload_file_from_string(ftp, content, remote_path):
    """Upload content as a file to FTP server"""
    try:
        from io import BytesIO
        file_obj = BytesIO(content.encode('utf-8'))
        ftp.storbinary(f'STOR {remote_path}', file_obj)
        print(f"✓ Uploaded: {remote_path}")
        return True
    except Exception as e:
        print(f"✗ Error uploading {remote_path}: {str(e)}")
        return False

def upload_file(ftp, local_path, remote_path):
    """Upload a file to FTP server"""
    try:
        with open(local_path, 'rb') as file:
            ftp.storbinary(f'STOR {remote_path}', file)
        print(f"✓ Uploaded: {remote_path}")
        return True
    except Exception as e:
        print(f"✗ Error uploading {remote_path}: {str(e)}")
        return False

def main():
    print(f"\n=== Emergency Loop Fix Deployment - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    
    # Simple login page content (in case file doesn't exist)
    simple_login_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pyebwa Login</title>
    <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f7fa;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
        }
        h1 {
            color: #00217D;
            text-align: center;
            margin-bottom: 30px;
        }
        input {
            width: 100%;
            padding: 12px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            box-sizing: border-box;
        }
        button {
            width: 100%;
            padding: 12px;
            background: #00217D;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 10px;
        }
        button:hover {
            background: #001654;
        }
        .message {
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            text-align: center;
        }
        .error {
            background: #fee;
            color: #c33;
        }
        .success {
            background: #efe;
            color: #060;
        }
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
        <button onclick="window.location.href='/'" style="background: #6c757d; margin-top: 20px;">Go to Homepage</button>
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
                const result = await firebase.auth().signInWithEmailAndPassword(email, password);
                messageDiv.className = 'message success';
                messageDiv.textContent = 'Success! Redirecting...';
                setTimeout(() => { window.location.href = '/app/'; }, 1500);
            } catch (error) {
                messageDiv.className = 'message error';
                let errorMsg = 'Login failed';
                if (error.code === 'auth/user-not-found') errorMsg = 'No account found with this email';
                else if (error.code === 'auth/wrong-password') errorMsg = 'Incorrect password';
                else if (error.code === 'auth/invalid-email') errorMsg = 'Invalid email address';
                messageDiv.textContent = errorMsg;
            }
        });
        
        // Check if already logged in
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                document.getElementById('message').className = 'message success';
                document.getElementById('message').textContent = 'Already logged in. Redirecting...';
                setTimeout(() => { window.location.href = '/app/'; }, 1000);
            }
        });
    </script>
</body>
</html>'''
    
    try:
        # Connect to FTP
        print(f"Connecting to FTP server at {FTP_HOST}...")
        ftp = ftplib.FTP(FTP_HOST, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print("✓ Connected successfully\n")
        
        # List current directory to verify connection
        print("Current FTP directory contents:")
        ftp.retrlines('LIST')
        print()
        
        # Upload critical files to stop the loop
        print("Uploading critical files to stop the loop...\n")
        
        # 1. Upload simple-login.html to root
        print("1. Uploading simple-login.html...")
        upload_file_from_string(ftp, simple_login_content, 'simple-login.html')
        
        # 2. Upload the updated app.js
        print("\n2. Uploading updated app/js/app.js...")
        upload_file(ftp, 'app/js/app.js', 'app/js/app.js')
        
        # 3. Upload the updated app/index.html with fixed paths
        print("\n3. Uploading updated app/index.html...")
        upload_file(ftp, 'app/index.html', 'app/index.html')
        
        # 4. Try to create login directory and upload the proper login page
        print("\n4. Creating login directory and uploading login/index.html...")
        try:
            ftp.mkd('login')
            print("✓ Created login directory")
        except:
            print("ℹ Login directory already exists or couldn't be created")
        
        try:
            upload_file(ftp, 'login/index.html', 'login/index.html')
        except:
            print("ℹ Couldn't upload login/index.html - using simple-login.html fallback")
        
        # Close connection
        ftp.quit()
        print("\n✓ FTP connection closed")
        
        print("\n=== Deployment Complete ===")
        print("\nThe login loop should now be fixed!")
        print("\nTest the fix:")
        print("1. Clear your browser cache")
        print("2. Visit https://rasin.pyebwa.com/app/")
        print("3. You should see the login page (not a loop)")
        print("4. After login, the app should load with proper styling")
        
    except Exception as e:
        print(f"\n✗ Deployment failed: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Check if FTP credentials are correct")
        print("2. Verify FTP server is accessible")
        print("3. Check file permissions")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())