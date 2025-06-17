# PYEBWA Token Deployment Guide

This guide covers deploying all components of the PYEBWA Token platform to production.

## 📋 Prerequisites

- Solana CLI tools installed
- Node.js 18+ and npm
- Docker and Docker Compose
- PostgreSQL 14+
- Redis 6+
- SSL certificates
- Domain names configured

## 🔑 Environment Setup

### 1. Create Production Environment Files

```bash
# Backend (.env.production)
NODE_ENV=production
PORT=4000

# Database
DATABASE_URL=postgresql://user:password@host:5432/pyebwa_prod
REDIS_URL=redis://host:6379

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PROGRAM_ID=PyEb...your_program_id
SOLANA_PRIVATE_KEY=your_base58_private_key

# IPFS & Storage
IPFS_API_URL=https://ipfs.infura.io:5001
PINATA_API_KEY=your_pinata_key
PINATA_SECRET=your_pinata_secret
WEB3_STORAGE_TOKEN=your_web3_storage_token
ENCRYPTION_KEY=your_32_byte_hex_key

# Payment Providers
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
MOONPAY_API_KEY=your_moonpay_key
MOONPAY_WEBHOOK_SECRET=your_moonpay_secret

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
EMAIL_FROM=noreply@pyebwa.com

# APIs
SATELLITE_API_KEY=your_planet_labs_key
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Security
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
```

### 2. Web Frontend Environment

```bash
# web/.env.production
REACT_APP_API_URL=https://api.pyebwa.com
REACT_APP_SOLANA_RPC=https://api.mainnet-beta.solana.com
REACT_APP_PROGRAM_ID=PyEb...your_program_id
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_...
REACT_APP_MOONPAY_PUBLIC_KEY=pk_live_...
```

### 3. Mobile App Environment

```bash
# mobile/.env.production
EXPO_PUBLIC_API_URL=https://api.pyebwa.com
EXPO_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
EXPO_PUBLIC_PROGRAM_ID=PyEb...your_program_id
```

## 🚀 Deployment Steps

### 1. Deploy Solana Smart Contract

```bash
cd programs/pyebwa-token

# Build the program
anchor build

# Deploy to mainnet
anchor deploy --provider.cluster mainnet

# Verify deployment
solana program show <PROGRAM_ID>

# Initialize token pool
npm run initialize-pool
```

### 2. Database Setup

```bash
# Create production database
psql -U postgres -c "CREATE DATABASE pyebwa_prod;"

# Run migrations
cd backend
npm run migrate:prod

# Seed initial data
npm run seed:prod
```

### 3. Backend Deployment

#### Using Docker

```bash
cd backend

# Build Docker image
docker build -t pyebwa-backend:latest .

# Run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

#### Using PM2

```bash
# Install PM2
npm install -g pm2

# Build backend
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.pyebwa.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.pyebwa.com;

    ssl_certificate /etc/ssl/certs/pyebwa.com.crt;
    ssl_certificate_key /etc/ssl/private/pyebwa.com.key;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Web Frontend Deployment

#### Vercel Deployment

```bash
cd web

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env pull
```

#### Manual Build

```bash
# Build for production
npm run build

# Upload to CDN/S3
aws s3 sync build/ s3://pyebwa-web --delete
aws cloudfront create-invalidation --distribution-id ABCD --paths "/*"
```

### 5. Mobile App Deployment

#### iOS (App Store)

```bash
cd mobile

# Build for iOS
expo build:ios

# Upload to App Store Connect
expo upload:ios
```

#### Android (Google Play)

```bash
# Build for Android
expo build:android

# Upload to Google Play
expo upload:android
```

### 6. Configure Monitoring

#### Set up Datadog

```bash
# Install Datadog agent
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=your_api_key \
DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Configure APM
npm install --save dd-trace
```

#### Configure Logging

```javascript
// backend/src/utils/logger.ts
import { createLogger } from 'winston';
import DatadogWinston from 'datadog-winston';

const logger = createLogger({
  transports: [
    new DatadogWinston({
      apiKey: process.env.DATADOG_API_KEY,
      hostname: 'pyebwa-backend',
      service: 'pyebwa-token',
      ddsource: 'nodejs',
      environment: 'production'
    })
  ]
});
```

## 🔒 Security Checklist

- [ ] SSL certificates installed and auto-renewing
- [ ] Environment variables secured
- [ ] Database connections encrypted
- [ ] API rate limiting enabled
- [ ] DDoS protection configured
- [ ] WAF rules in place
- [ ] Secrets rotated regularly
- [ ] Backup systems tested
- [ ] Incident response plan documented

## 📊 Post-Deployment

### 1. Health Checks

```bash
# API health
curl https://api.pyebwa.com/health

# Database connectivity
curl https://api.pyebwa.com/health/db

# Redis connectivity
curl https://api.pyebwa.com/health/redis

# Blockchain connectivity
curl https://api.pyebwa.com/health/blockchain
```

### 2. Performance Testing

```bash
# Load testing with k6
k6 run tests/load/api-stress.js

# Mobile app performance
firebase test:android tests/performance/app-launch.yml
```

### 3. Monitoring Setup

- **Uptime**: Configure Pingdom/UptimeRobot
- **APM**: Set up Datadog APM dashboards
- **Logs**: Configure log aggregation
- **Alerts**: Set up PagerDuty integration
- **Metrics**: Create custom dashboards

## 🔄 Continuous Deployment

### GitHub Actions Workflow

```yaml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /app/pyebwa-backend
            git pull
            npm install
            npm run build
            pm2 restart pyebwa-backend

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: cd web && npm install && npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🔥 Rollback Procedures

### Smart Contract Rollback

```bash
# Cannot rollback deployed contracts
# Deploy new version with fixes
# Migrate user data if needed
```

### Backend Rollback

```bash
# Using PM2
pm2 list
pm2 restart pyebwa-backend --update-env
pm2 logs pyebwa-backend

# Using Docker
docker-compose down
docker-compose up -d --build
```

### Database Rollback

```bash
# Restore from backup
pg_restore -U postgres -d pyebwa_prod backup_file.sql

# Or rollback migrations
npm run migrate:rollback
```

## 📈 Scaling Considerations

### Horizontal Scaling

1. **Load Balancer**: Configure HAProxy/Nginx
2. **Multiple Backend Instances**: Use PM2 cluster mode
3. **Database Replication**: Set up read replicas
4. **Redis Cluster**: Configure Redis Sentinel
5. **CDN**: Use Cloudflare for static assets

### Vertical Scaling

1. **Upgrade Server**: Increase CPU/RAM
2. **Database Optimization**: Add indexes, optimize queries
3. **Caching**: Implement aggressive caching
4. **Code Optimization**: Profile and optimize hot paths

## 🆘 Troubleshooting

### Common Issues

1. **High Memory Usage**
   ```bash
   pm2 monit
   pm2 restart pyebwa-backend --max-memory-restart 1G
   ```

2. **Database Connection Errors**
   ```bash
   # Check connection pool
   psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
   ```

3. **IPFS Gateway Timeouts**
   ```bash
   # Switch to backup gateway
   # Update IPFS_GATEWAY in environment
   ```

4. **Blockchain RPC Errors**
   ```bash
   # Switch to backup RPC
   # Consider using Quicknode/Alchemy
   ```

## 📞 Support Contacts

- **DevOps Lead**: devops@pyebwa.com
- **Security Team**: security@pyebwa.com
- **On-Call**: +1-xxx-xxx-xxxx
- **Escalation**: cto@pyebwa.com

---

Remember: **Always test in staging before deploying to production!**