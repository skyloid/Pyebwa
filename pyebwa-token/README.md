# PYEBWA Token - Connecting Heritage to Homeland

## 🌳 Overview

PYEBWA Token is a revolutionary blockchain-based system that connects the Haitian diaspora's cultural preservation efforts directly to environmental restoration in Haiti. Every family photo, story, or document preserved by diaspora families automatically funds tree planting initiatives in Haiti, creating a sustainable economic bridge between heritage and homeland.

## 🎯 Mission

**"Every memory preserved plants a tree in Haiti"**

We transform the act of preserving family heritage into direct environmental and economic impact in Haiti by:
- Enabling diaspora families to preserve their memories on blockchain
- Automatically funding tree planters in Haiti with spent tokens
- Creating sustainable employment for rural communities
- Restoring Haiti's forests one family photo at a time

## 💡 How It Works

### For Diaspora Families
1. **Purchase** PYEBWA tokens (starting at $0.0001 each)
2. **Preserve** family photos, stories, and documents on IPFS + blockchain
3. **Track** the trees your memories have funded in Haiti
4. **Connect** with your ancestral homeland through environmental impact

### For Tree Planters in Haiti
1. **Register** as a verified planter with GPS-enabled phone
2. **Plant** trees and capture GPS-tagged photos
3. **Submit** evidence to blockchain for verification
4. **Receive** automatic payments in PYEBWA tokens

### Economic Flow
```
Diaspora Family → Buys Tokens → Preserves Heritage → Funds Trees → Pays Planters
     $10              100k         50 photos           250 trees      $50 earned
```

## 🏗️ Architecture

```
pyebwa-token/
├── programs/         # Solana smart contracts (Rust/Anchor)
├── web/             # React frontend for families
├── mobile/          # React Native app for planters
├── backend/         # Node.js services
└── scripts/         # Deployment and utilities
```

## 🚀 Quick Start

### Prerequisites
```bash
# Install required tools
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
npm install -g @coral-xyz/anchor-cli
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
npm install -g expo-cli
```

### Installation
```bash
# Clone repository
git clone https://github.com/pyebwa/pyebwa-token.git
cd pyebwa-token

# Run setup script
chmod +x project-structure.sh
./project-structure.sh

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

### Development
```bash
# Build Solana program
anchor build

# Run tests
anchor test

# Start development servers
npm run dev:web      # Web frontend (localhost:3000)
npm run dev:mobile   # Mobile app (Expo)
npm run dev:backend  # Backend services (localhost:4000)
```

## 💰 Token Economics

### Token Pricing
- **Initial Price**: $0.0001 per PYEBWA token
- **Minimum Purchase**: 1,000 tokens ($0.10)
- **Price Growth**: 0.01% per million tokens minted

### Heritage Preservation Costs
| Content Type | PYEBWA Cost | USD Value | Trees Funded |
|-------------|-------------|-----------|--------------|
| Photo | 50 | $0.005 | 0.25 trees |
| Document | 100 | $0.01 | 0.5 trees |
| Audio Story | 500 | $0.05 | 2.5 trees |
| Video Memory | 2,000 | $0.20 | 10 trees |

### Tree Planter Payments
- **Per Tree Planted**: 200 PYEBWA ($0.02)
- **Target Hourly Rate**: $2/hour (100 trees)
- **Verification Bonus**: 50 PYEBWA per batch
- **Community Coordinator**: 10% of verified plantings

## 🌍 Environmental Impact

### Carbon Sequestration
- Each tree absorbs ~250kg CO₂ over 10 years
- 1 family photo = 62.5kg CO₂ offset
- 1 video memory = 2,500kg CO₂ offset

### Reforestation Goals
- **Year 1**: 50,000 trees (10 hectares)
- **Year 5**: 5 million trees (1,000 hectares)
- **Year 10**: 50 million trees (10,000 hectares)

### Species Focus
- Mango (food security)
- Moringa (nutrition)
- Cedar (construction)
- Bamboo (erosion control)

## 🔐 Security Features

### Smart Contract Security
- Multi-signature escrow for funds
- Time-locked payment releases
- Role-based access control
- Overflow protection

### Data Privacy
- Encrypted IPFS storage
- Anonymized GPS data
- User-controlled permissions
- GDPR compliant

### Verification System
- GPS coordinate validation
- Satellite imagery checks
- AI photo verification
- Community attestation

## 📱 Mobile App Features

### For Tree Planters
- **Offline Mode**: Work without internet
- **GPS Tracking**: Automatic location tagging
- **Batch Upload**: Queue photos for submission
- **Payment Tracking**: Real-time earnings
- **Multi-language**: Kreyòl, French, English

### For Families
- **Heritage Gallery**: View preserved memories
- **Impact Map**: See funded trees
- **Family Sharing**: Invite relatives
- **Story Templates**: Guided preservation

## 🌟 Unique Features

### Heritage Bonuses
- **Kreyòl Content**: 2x tree funding
- **Elder Stories**: 3x tree funding
- **Historical Documents**: 5x tree funding

### Community Features
- **Village Pools**: Fund specific regions
- **Family Forests**: Dedicated groves
- **Memorial Trees**: Honor ancestors
- **School Programs**: Educational initiatives

## 📊 Success Metrics

### Environmental KPIs
- Trees planted and verified
- Hectares reforested
- CO₂ sequestered
- Biodiversity index

### Economic KPIs
- Planter income generated
- Jobs created
- Token circulation
- Platform revenue

### Cultural KPIs
- Memories preserved
- Families connected
- Languages documented
- Stories shared

## 🤝 Partners

### In Haiti
- Ministry of Environment
- Local tree nurseries
- Community organizations
- Agricultural cooperatives

### International
- Haitian diaspora organizations
- Environmental NGOs
- Blockchain foundations
- Impact investors

## 🚦 Roadmap

### Phase 1: Foundation (Q1 2025)
- [ ] Smart contract deployment
- [ ] Web platform launch
- [ ] Mobile app beta
- [ ] First 1,000 families

### Phase 2: Growth (Q2-Q3 2025)
- [ ] 10,000 active families
- [ ] 500 verified planters
- [ ] 250,000 trees planted
- [ ] Token exchange listing

### Phase 3: Scale (Q4 2025)
- [ ] 50,000 families
- [ ] 2,500 planters
- [ ] 1 million trees
- [ ] International expansion

### Phase 4: Impact (2026+)
- [ ] 500,000 families globally
- [ ] 10,000 jobs in Haiti
- [ ] 10 million trees annually
- [ ] Carbon credit integration

## 🛠️ Technology Stack

### Blockchain
- **Network**: Solana
- **Framework**: Anchor
- **Token Standard**: SPL Token
- **Storage**: IPFS + Arweave

### Frontend
- **Web**: React + TypeScript
- **Mobile**: React Native + Expo
- **UI**: Tailwind CSS
- **State**: Redux Toolkit

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: PostgreSQL
- **Cache**: Redis

### Infrastructure
- **Hosting**: AWS/Vercel
- **CDN**: Cloudflare
- **Monitoring**: Datadog
- **CI/CD**: GitHub Actions

## 👥 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Areas of Focus
- Smart contract development
- Mobile app features
- GPS verification algorithms
- Community outreach
- Impact measurement

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) for details.

## 📞 Contact

- **Website**: [pyebwa.com](https://pyebwa.com)
- **Email**: token@pyebwa.com
- **Discord**: [Join our community](https://discord.gg/pyebwa)
- **Twitter**: [@pyebwatoken](https://twitter.com/pyebwatoken)

---

**Together, we're not just preserving memories - we're planting the future of Haiti.** 🌱🇭🇹

*"Chak souvni se yon pyebwa pou Ayiti"* - Every memory is a tree for Haiti