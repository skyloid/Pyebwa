#!/usr/bin/env python3
"""
Unified deployment script for Pyebwa
Replaces 85+ individual deployment scripts with a single, secure solution
"""
import os
import sys
import ftplib
import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import List, Tuple, Dict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class PyebwaDeployer:
    def __init__(self):
        """Initialize deployer with environment variables"""
        self.ftp_host = os.getenv('FTP_HOST')
        self.ftp_port = int(os.getenv('FTP_PORT', 21))
        self.ftp_user = os.getenv('FTP_USER')
        self.ftp_pass = os.getenv('FTP_PASS')
        
        if not all([self.ftp_host, self.ftp_user, self.ftp_pass]):
            raise ValueError("Missing FTP credentials. Please check .env file")
        
        self.ftp = None
        self.deployment_log = []
        
    def connect(self):
        """Establish FTP connection"""
        try:
            self.ftp = ftplib.FTP()
            self.ftp.connect(self.ftp_host, self.ftp_port)
            self.ftp.login(self.ftp_user, self.ftp_pass)
            self.log(f"✓ Connected to {self.ftp_host}")
            return True
        except Exception as e:
            self.log(f"✗ FTP connection failed: {str(e)}", error=True)
            return False
    
    def disconnect(self):
        """Close FTP connection"""
        if self.ftp:
            try:
                self.ftp.quit()
                self.log("✓ Disconnected from FTP")
            except:
                pass
    
    def log(self, message: str, error: bool = False):
        """Log deployment messages"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        print(log_entry)
        self.deployment_log.append({
            'timestamp': timestamp,
            'message': message,
            'error': error
        })
    
    def ensure_remote_dir(self, remote_dir: str):
        """Create remote directory if it doesn't exist"""
        try:
            self.ftp.cwd('/')
            dirs = remote_dir.strip('/').split('/')
            for dir_part in dirs:
                if dir_part:
                    try:
                        self.ftp.cwd(dir_part)
                    except:
                        self.ftp.mkd(dir_part)
                        self.ftp.cwd(dir_part)
        except Exception as e:
            self.log(f"Warning: Could not ensure directory {remote_dir}: {e}")
    
    def upload_file(self, local_path: str, remote_path: str) -> bool:
        """Upload a single file via FTP"""
        try:
            # Ensure the remote directory exists
            remote_dir = os.path.dirname(remote_path)
            if remote_dir:
                self.ensure_remote_dir(remote_dir)
            
            # Navigate to root and then to target directory
            self.ftp.cwd('/')
            if remote_dir:
                self.ftp.cwd(remote_dir)
            
            # Upload the file
            filename = os.path.basename(remote_path)
            with open(local_path, 'rb') as file:
                self.ftp.storbinary(f'STOR {filename}', file)
            
            self.log(f"✓ Uploaded: {local_path} → {remote_path}")
            return True
            
        except Exception as e:
            self.log(f"✗ Failed to upload {local_path}: {str(e)}", error=True)
            return False
    
    def deploy_files(self, file_mappings: List[Tuple[str, str]]) -> int:
        """Deploy multiple files"""
        success_count = 0
        for local_file, remote_file in file_mappings:
            if os.path.exists(local_file):
                if self.upload_file(local_file, remote_file):
                    success_count += 1
            else:
                self.log(f"✗ File not found: {local_file}", error=True)
        
        return success_count
    
    def save_deployment_log(self):
        """Save deployment log to file"""
        log_dir = Path('logs/deployments')
        log_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = log_dir / f"deployment_{timestamp}.json"
        
        with open(log_file, 'w') as f:
            json.dump({
                'deployment_time': datetime.now().isoformat(),
                'logs': self.deployment_log
            }, f, indent=2)
        
        self.log(f"✓ Deployment log saved to {log_file}")

# Deployment configurations
DEPLOYMENT_CONFIGS = {
    'app': {
        'description': 'Deploy main application files',
        'files': [
            ('app/index.html', 'public_html/app/index.html'),
            ('app/js/app-unified.js', 'public_html/app/js/app.js'),
            ('app/css/app.css', 'public_html/app/css/app.css'),
        ]
    },
    'landing': {
        'description': 'Deploy landing page files',
        'files': [
            ('pyebwa.com/index.html', 'public_html/index.html'),
            ('pyebwa.com/js/app.js', 'public_html/js/app.js'),
            ('pyebwa.com/css/styles.css', 'public_html/css/styles.css'),
        ]
    },
    'auth': {
        'description': 'Deploy authentication files',
        'files': [
            ('app/js/auth-simple.js', 'public_html/app/js/auth-simple.js'),
            ('app/js/firebase-config-secure.js', 'public_html/app/js/firebase-config-secure.js'),
            ('login-simple.html', 'public_html/login.html'),
            ('signup.html', 'public_html/signup.html'),
        ]
    },
    'mobile': {
        'description': 'Deploy mobile-specific files',
        'files': [
            ('app/css/mobile.css', 'public_html/app/css/mobile.css'),
            ('app/css/mobile-nav-fix.css', 'public_html/app/css/mobile-nav-fix.css'),
            ('app/js/mobile-nav-simple.js', 'public_html/app/js/mobile-nav-simple.js'),
        ]
    },
    'all': {
        'description': 'Deploy all application files',
        'files': []  # Will be populated with all files from other configs
    }
}

# Populate 'all' config
all_files = []
for config_name, config in DEPLOYMENT_CONFIGS.items():
    if config_name != 'all':
        all_files.extend(config['files'])
DEPLOYMENT_CONFIGS['all']['files'] = list(set(all_files))  # Remove duplicates

def main():
    parser = argparse.ArgumentParser(description='Deploy Pyebwa files securely')
    parser.add_argument(
        'target',
        choices=list(DEPLOYMENT_CONFIGS.keys()),
        help='Deployment target'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be deployed without uploading'
    )
    parser.add_argument(
        '--files',
        nargs='+',
        help='Additional files to deploy (format: local:remote)'
    )
    
    args = parser.parse_args()
    
    # Get deployment configuration
    config = DEPLOYMENT_CONFIGS[args.target]
    files_to_deploy = config['files'].copy()
    
    # Add any additional files
    if args.files:
        for file_spec in args.files:
            if ':' in file_spec:
                local, remote = file_spec.split(':', 1)
                files_to_deploy.append((local, remote))
            else:
                print(f"Invalid file specification: {file_spec}")
                print("Use format: local_path:remote_path")
                return 1
    
    print(f"Deploying {args.target}: {config['description']}")
    print(f"Total files to deploy: {len(files_to_deploy)}")
    print('-' * 50)
    
    if args.dry_run:
        print("DRY RUN - No files will be uploaded")
        for local, remote in files_to_deploy:
            exists = "✓" if os.path.exists(local) else "✗"
            print(f"{exists} {local} → {remote}")
        return 0
    
    # Initialize deployer
    try:
        deployer = PyebwaDeployer()
    except ValueError as e:
        print(f"Error: {e}")
        print("Please create a .env file with FTP credentials")
        print("See .env.example for template")
        return 1
    
    # Connect and deploy
    if not deployer.connect():
        return 1
    
    try:
        success_count = deployer.deploy_files(files_to_deploy)
        
        print('-' * 50)
        print(f"Deployment complete! {success_count}/{len(files_to_deploy)} files uploaded.")
        
        if success_count < len(files_to_deploy):
            print("\n⚠️  Some files failed to upload. Check the logs for details.")
            return_code = 1
        else:
            print("\n✓ All files deployed successfully!")
            return_code = 0
        
    finally:
        deployer.disconnect()
        deployer.save_deployment_log()
    
    return return_code

if __name__ == '__main__':
    sys.exit(main())