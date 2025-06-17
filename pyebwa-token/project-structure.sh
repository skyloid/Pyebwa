#!/bin/bash

# PYEBWA Token Project Structure Setup Script
# This script creates the complete directory structure and initial files

echo "🌳 Setting up PYEBWA Token Project Structure..."

# Create main directories
mkdir -p programs/pyebwa-token/{src/{instructions,state},tests}
mkdir -p web/{src/{components,hooks,services,store,utils},public,tests}
mkdir -p mobile/{src/{screens,components,services,navigation},assets,tests}
mkdir -p backend/{src/{api,services,workers,utils},tests}
mkdir -p scripts
mkdir -p docs

# Create Solana Program files
cat > programs/pyebwa-token/Cargo.toml << 'EOF'
[package]
name = "pyebwa-token"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "pyebwa_token"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"
solana-program = "1.17.0"
EOF

cat > programs/pyebwa-token/Anchor.toml << 'EOF'
[features]
seeds = false
skip-lint = false

[programs.localnet]
pyebwa_token = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
EOF

cat > programs/pyebwa-token/src/lib.rs << 'EOF'
use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod pyebwa_token {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
        instructions::initialize::handler(ctx, params)
    }

    pub fn purchase_tokens(ctx: Context<PurchaseTokens>, amount: u64) -> Result<()> {
        instructions::purchase_tokens::handler(ctx, amount)
    }

    pub fn preserve_heritage(
        ctx: Context<PreserveHeritage>,
        ipfs_hash: String,
        heritage_type: HeritageType,
        token_cost: u64,
    ) -> Result<()> {
        instructions::preserve_heritage::handler(ctx, ipfs_hash, heritage_type, token_cost)
    }

    pub fn submit_planting(
        ctx: Context<SubmitPlanting>,
        tree_count: u16,
        gps_coordinates: [f64; 2],
        evidence_hash: String,
    ) -> Result<()> {
        instructions::submit_planting::handler(ctx, tree_count, gps_coordinates, evidence_hash)
    }

    pub fn verify_planting(ctx: Context<VerifyPlanting>) -> Result<()> {
        instructions::verify_planting::handler(ctx)
    }
}
EOF

# Create Web Frontend files
cat > web/package.json << 'EOF'
{
  "name": "pyebwa-token-web",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@coral-xyz/anchor": "^0.29.0",
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/wallet-adapter-wallets": "^0.19.32",
    "@solana/web3.js": "^1.87.6",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "redux": "^5.0.0",
    "react-redux": "^9.0.0",
    "@reduxjs/toolkit": "^2.0.0",
    "axios": "^1.6.0",
    "ipfs-http-client": "^60.0.1",
    "typescript": "^5.3.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "tailwindcss": "^3.3.0"
  }
}
EOF

cat > web/src/App.tsx << 'EOF'
import React from 'react';
import { WalletProvider } from './providers/WalletProvider';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from './screens/Dashboard';
import { PreserveHeritage } from './screens/PreserveHeritage';
import { Impact } from './screens/Impact';

function App() {
  return (
    <WalletProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/preserve" element={<PreserveHeritage />} />
          <Route path="/impact" element={<Impact />} />
        </Routes>
      </Router>
    </WalletProvider>
  );
}

export default App;
EOF

# Create Mobile App files
cat > mobile/package.json << 'EOF'
{
  "name": "pyebwa-token-mobile",
  "version": "0.1.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~49.0.0",
    "expo-camera": "~13.4.4",
    "expo-location": "~16.1.0",
    "expo-media-library": "~15.4.1",
    "expo-file-system": "~15.4.4",
    "react": "18.2.0",
    "react-native": "0.72.6",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "@solana/web3.js": "^1.87.6",
    "react-native-crypto": "^2.2.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.14",
    "typescript": "^5.1.3"
  }
}
EOF

cat > mobile/app.json << 'EOF'
{
  "expo": {
    "name": "PYEBWA Planter",
    "slug": "pyebwa-planter",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.pyebwa.planter",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "This app needs GPS to verify tree planting locations.",
        "NSCameraUsageDescription": "This app needs camera access to capture tree planting evidence."
      }
    },
    "android": {
      "package": "com.pyebwa.planter",
      "permissions": ["CAMERA", "ACCESS_FINE_LOCATION", "WRITE_EXTERNAL_STORAGE"]
    }
  }
}
EOF

# Create Backend files
cat > backend/package.json << 'EOF'
{
  "name": "pyebwa-token-backend",
  "version": "0.1.0",
  "description": "Backend services for PYEBWA Token",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "@solana/web3.js": "^1.87.6",
    "ipfs-http-client": "^60.0.1",
    "pg": "^8.11.3",
    "redis": "^4.6.11",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "multer": "^1.4.5-lts.1",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "nodemon": "^3.0.2",
    "ts-node": "^10.9.1",
    "jest": "^29.7.0"
  }
}
EOF

cat > backend/src/index.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { familyRouter } from './api/family.routes';
import { planterRouter } from './api/planter.routes';
import { verificationRouter } from './api/verification.routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/family', familyRouter);
app.use('/api/planter', planterRouter);
app.use('/api/verify', verificationRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
EOF

# Create environment template
cat > .env.example << 'EOF'
# Solana Configuration
SOLANA_NETWORK=devnet
PROGRAM_ID=your_deployed_program_id
ADMIN_KEYPAIR=your_admin_keypair

# IPFS Configuration
IPFS_API_URL=https://ipfs.infura.io:5001
IPFS_GATEWAY=https://ipfs.io/ipfs/
PINATA_API_KEY=your_pinata_key
PINATA_SECRET=your_pinata_secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pyebwa_token
REDIS_URL=redis://localhost:6379

# Payment Processing
MOONPAY_API_KEY=your_moonpay_key
MOONPAY_SECRET=your_moonpay_secret

# Verification Services
SATELLITE_API_KEY=your_planet_labs_key
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_32_byte_encryption_key

# Application
NODE_ENV=development
PORT=4000
WEB_URL=http://localhost:3000
EOF

# Create Docker files
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: pyebwa_token
      POSTGRES_USER: pyebwa
      POSTGRES_PASSWORD: pyebwa123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    depends_on:
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgresql://pyebwa:pyebwa123@postgres:5432/pyebwa_token
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./backend:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
EOF

# Create GitHub Actions workflow
mkdir -p .github/workflows
cat > .github/workflows/test.yml << 'EOF'
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: coral-xyz/anchor-action@v0.29.0
      - run: anchor test

  test-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd web && npm ci && npm test

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd backend && npm ci && npm test
EOF

# Create initial documentation
cat > docs/CONTRIBUTING.md << 'EOF'
# Contributing to PYEBWA Token

Thank you for your interest in contributing to PYEBWA Token! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/pyebwa-token.git`
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Run tests: `npm test`
6. Commit: `git commit -m "Add your feature"`
7. Push: `git push origin feature/your-feature`
8. Create a Pull Request

## Development Setup

See README.md for detailed setup instructions.

## Code Style

- Use TypeScript for all JavaScript code
- Follow Rust formatting guidelines for Solana programs
- Run linters before committing
- Write comprehensive tests

## Areas of Contribution

- Smart contract development
- Frontend features
- Mobile app improvements
- Documentation
- Community outreach
- Bug fixes

## Questions?

Join our Discord: https://discord.gg/pyebwa
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.log

# Production
build/
dist/
target/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDEs
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Solana
.anchor/
test-ledger/
*.so

# Mobile
*.ipa
*.apk
*.aab
.expo/

# Misc
npm-debug.log*
yarn-debug.log*
yarn-error.log*
EOF

echo "✅ Project structure created successfully!"
echo ""
echo "Next steps:"
echo "1. Run 'npm install' in web/, mobile/, and backend/ directories"
echo "2. Install Rust and Anchor CLI if not already installed"
echo "3. Copy .env.example to .env and configure"
echo "4. Run 'anchor build' in programs/pyebwa-token/"
echo "5. Start development with 'npm run dev' in each component"
echo ""
echo "🌳 Happy coding! Let's plant trees with technology!"
EOF