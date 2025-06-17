# PYEBWA Token Technical Documentation for Claude Code

## Project Overview

PYEBWA Token is a Solana-based blockchain system that creates an economic bridge between Haitian diaspora families preserving their cultural heritage and tree planters in Haiti. The system uses token economics to automatically fund environmental restoration whenever families preserve memories.

## Architecture

### System Components

```
pyebwa-token/
├── programs/pyebwa-token/    # Solana Program (Rust/Anchor)
│   ├── src/
│   │   ├── lib.rs           # Program entry point
│   │   ├── instructions/    # Core operations
│   │   │   ├── initialize.rs
│   │   │   ├── purchase_tokens.rs
│   │   │   ├── preserve_heritage.rs
│   │   │   ├── submit_planting.rs
│   │   │   └── verify_planting.rs
│   │   ├── state/           # Account structures
│   │   │   ├── token_pool.rs
│   │   │   ├── family_account.rs
│   │   │   ├── planter_account.rs
│   │   │   └── planting_evidence.rs
│   │   └── errors.rs        # Custom error types
│   └── tests/
│
├── web/                      # React Frontend (TypeScript)
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API/blockchain services
│   │   ├── store/          # Redux state management
│   │   └── utils/          # Helper functions
│   └── public/
│
├── mobile/                   # React Native App
│   ├── src/
│   │   ├── screens/        # App screens
│   │   ├── components/     # Reusable components
│   │   ├── services/       # GPS, camera, blockchain
│   │   └── navigation/     # React Navigation setup
│   └── assets/
│
└── backend/                  # Node.js Services
    ├── src/
    │   ├── api/            # REST endpoints
    │   ├── services/       # Business logic
    │   │   ├── ipfs.service.ts
    │   │   ├── verification.service.ts
    │   │   └── satellite.service.ts
    │   ├── workers/        # Background jobs
    │   └── utils/          # Utilities
    └── tests/
```

## Data Models

### On-Chain Accounts (Solana)

#### TokenPool
```rust
pub struct TokenPool {
    pub authority: Pubkey,
    pub total_supply: u64,
    pub trees_funded: u64,
    pub heritage_preserved: u64,
    pub token_price: u64,        // In lamports
    pub tree_fund_rate: u16,     // Basis points (10000 = 100%)
    pub bump: u8,
}
```

#### FamilyAccount
```rust
pub struct FamilyAccount {
    pub owner: Pubkey,
    pub token_balance: u64,
    pub heritage_items: u32,
    pub trees_funded: u32,
    pub total_spent: u64,
    pub created_at: i64,
    pub bump: u8,
}
```

#### PlanterAccount
```rust
pub struct PlanterAccount {
    pub owner: Pubkey,
    pub verified: bool,
    pub trees_planted: u32,
    pub trees_verified: u32,
    pub earnings: u64,
    pub reputation_score: u16,
    pub gps_coordinates: [f64; 2],
    pub created_at: i64,
    pub bump: u8,
}
```

#### PlantingEvidence
```rust
pub struct PlantingEvidence {
    pub planter: Pubkey,
    pub tree_count: u16,
    pub gps_coordinates: [f64; 2],
    pub ipfs_hash: String,
    pub submitted_at: i64,
    pub verified: bool,
    pub verified_by: Option<Pubkey>,
    pub verified_at: Option<i64>,
    pub payment_released: bool,
    pub bump: u8,
}
```

### Off-Chain Data (IPFS)

#### Heritage Item
```typescript
interface HeritageItem {
  id: string;
  familyId: string;
  type: 'photo' | 'document' | 'audio' | 'video';
  title: string;
  description?: string;
  ipfsHash: string;
  encryptionKey: string;
  metadata: {
    size: number;
    mimeType: string;
    duration?: number; // For audio/video
    language?: string;
    tags: string[];
  };
  tokenCost: number;
  treesFunded: number;
  createdAt: string;
}
```

#### Planting Evidence
```typescript
interface PlantingEvidenceIPFS {
  planterId: string;
  photos: Array<{
    ipfsHash: string;
    gpsCoordinates: [number, number];
    timestamp: string;
    deviceId: string;
  }>;
  treeSpecies: string[];
  plantingConditions: {
    weather: string;
    soilType: string;
    waterSource: string;
  };
  communityAttestation?: {
    coordinatorId: string;
    signature: string;
    timestamp: string;
  };
}
```

## Core Workflows

### 1. Token Purchase Flow
```typescript
// Web Frontend
const purchaseTokens = async (amount: number, paymentMethod: 'sol' | 'card') => {
  // 1. Calculate cost
  const cost = calculateTokenCost(amount);
  
  // 2. Process payment
  if (paymentMethod === 'sol') {
    const tx = await program.methods
      .purchaseTokens(new BN(amount))
      .accounts({
        buyer: wallet.publicKey,
        tokenPool: tokenPoolPDA,
        familyAccount: familyAccountPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  } else {
    // MoonPay integration
    const session = await createMoonPaySession(amount, cost);
    await redirectToMoonPay(session);
  }
  
  // 3. Update UI
  await refreshBalance();
};
```

### 2. Heritage Preservation Flow
```typescript
// Web Frontend
const preserveHeritage = async (file: File, metadata: HeritageMetadata) => {
  // 1. Encrypt file
  const { encrypted, key } = await encryptFile(file);
  
  // 2. Upload to IPFS
  const ipfsHash = await ipfs.add(encrypted);
  
  // 3. Calculate token cost
  const cost = calculatePreservationCost(file.type, file.size);
  
  // 4. Create blockchain record
  const tx = await program.methods
    .preserveHeritage(
      ipfsHash,
      cost,
      metadata.type,
      Math.floor(cost * TREE_FUND_RATE)
    )
    .accounts({
      family: wallet.publicKey,
      familyAccount: familyAccountPDA,
      tokenPool: tokenPoolPDA,
      treeFund: treeFundPDA,
    })
    .rpc();
  
  // 5. Store encryption key securely
  await storeEncryptionKey(ipfsHash, key);
};
```

### 3. Tree Planting Submission Flow
```typescript
// Mobile App
const submitPlanting = async (photos: Photo[], treeCount: number) => {
  // 1. Validate GPS coordinates
  const isValid = await validateGPSCoordinates(photos);
  if (!isValid) throw new Error('Invalid GPS data');
  
  // 2. Upload photos to IPFS
  const photoHashes = await Promise.all(
    photos.map(photo => ipfs.add(photo.data))
  );
  
  // 3. Create evidence bundle
  const evidence: PlantingEvidenceIPFS = {
    planterId: wallet.publicKey.toString(),
    photos: photos.map((photo, i) => ({
      ipfsHash: photoHashes[i],
      gpsCoordinates: photo.gps,
      timestamp: photo.timestamp,
      deviceId: getDeviceId(),
    })),
    treeSpecies: selectedSpecies,
    plantingConditions: getCurrentConditions(),
  };
  
  // 4. Upload evidence to IPFS
  const evidenceHash = await ipfs.add(JSON.stringify(evidence));
  
  // 5. Submit to blockchain
  const tx = await program.methods
    .submitPlanting(
      treeCount,
      photos[0].gps,
      evidenceHash
    )
    .accounts({
      planter: wallet.publicKey,
      planterAccount: planterAccountPDA,
      plantingEvidence: plantingEvidencePDA,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
};
```

### 4. Verification Flow
```typescript
// Backend Service
const verifyPlanting = async (evidenceId: string) => {
  // 1. Fetch evidence from blockchain
  const evidence = await program.account.plantingEvidence.fetch(evidencePDA);
  
  // 2. Retrieve IPFS data
  const ipfsData = await ipfs.get(evidence.ipfsHash);
  const evidenceData: PlantingEvidenceIPFS = JSON.parse(ipfsData);
  
  // 3. Run verification checks
  const checks = await Promise.all([
    verifyGPSCoordinates(evidenceData.photos),
    verifySatelliteImagery(evidence.gpsCoordinates),
    verifyPhotoAuthenticity(evidenceData.photos),
    verifyCommunityAttestation(evidenceData.communityAttestation),
  ]);
  
  // 4. Calculate verification score
  const score = calculateVerificationScore(checks);
  
  // 5. Update blockchain if verified
  if (score >= VERIFICATION_THRESHOLD) {
    const tx = await program.methods
      .verifyPlanting()
      .accounts({
        authority: verifierWallet.publicKey,
        plantingEvidence: evidencePDA,
        planterAccount: planterAccountPDA,
        tokenPool: tokenPoolPDA,
        treeFund: treeFundPDA,
      })
      .rpc();
  }
  
  return { verified: score >= VERIFICATION_THRESHOLD, score };
};
```

## Security Considerations

### Smart Contract Security
1. **Overflow Protection**: All arithmetic operations use checked math
2. **Access Control**: Role-based permissions for admin functions
3. **Escrow System**: Multi-sig required for large payments
4. **Time Locks**: 24-hour delay for critical parameter changes

### Data Security
1. **Encryption**: All heritage items encrypted before IPFS storage
2. **Key Management**: Encryption keys stored in secure vault
3. **Privacy**: GPS coordinates anonymized in public queries
4. **Authentication**: Multi-factor auth for high-value accounts

### Verification Security
1. **GPS Spoofing Prevention**: Multiple validation layers
2. **Photo Tampering Detection**: EXIF data validation
3. **Duplicate Prevention**: Image hashing and comparison
4. **Sybil Resistance**: Phone number verification required

## API Endpoints

### Public API (Backend)

#### Family Endpoints
- `POST /api/auth/register` - Register new family account
- `GET /api/family/balance` - Get token balance
- `GET /api/family/heritage` - List preserved items
- `POST /api/family/preserve` - Upload heritage item
- `GET /api/family/impact` - View trees funded

#### Planter Endpoints
- `POST /api/planter/register` - Register as planter
- `POST /api/planter/submit` - Submit planting evidence
- `GET /api/planter/earnings` - Check earnings
- `GET /api/planter/history` - Planting history

#### Verification Endpoints
- `GET /api/verify/pending` - List pending verifications
- `POST /api/verify/evidence/:id` - Verify evidence
- `GET /api/verify/satellite/:coords` - Get satellite data

### WebSocket Events
- `token_purchased` - New token purchase
- `heritage_preserved` - New item preserved
- `planting_submitted` - New planting evidence
- `planting_verified` - Evidence verified
- `payment_released` - Payment sent to planter

## Environment Variables

### Required Configuration
```bash
# Solana
SOLANA_NETWORK=devnet|mainnet-beta
PROGRAM_ID=<deployed_program_id>
ADMIN_KEYPAIR=<base58_private_key>

# IPFS
IPFS_API_URL=https://ipfs.infura.io:5001
IPFS_GATEWAY=https://ipfs.io/ipfs/
PINATA_API_KEY=<pinata_key>
PINATA_SECRET=<pinata_secret>

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/pyebwa
REDIS_URL=redis://localhost:6379

# External APIs
MOONPAY_API_KEY=<moonpay_key>
MOONPAY_SECRET=<moonpay_secret>
SATELLITE_API_KEY=<planet_labs_key>
GOOGLE_MAPS_API_KEY=<maps_key>

# Security
JWT_SECRET=<random_secret>
ENCRYPTION_KEY=<32_byte_key>
```

## Testing Strategy

### Unit Tests
- Smart contract instruction tests
- Service layer logic tests
- Component rendering tests
- Utility function tests

### Integration Tests
- End-to-end token purchase flow
- Heritage preservation with IPFS
- Planting submission and verification
- Payment release mechanisms

### Performance Tests
- Concurrent user load testing
- IPFS upload/download speeds
- Blockchain transaction throughput
- GPS verification latency

## Deployment

### Smart Contract Deployment
```bash
# Build program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta

# Verify deployment
solana program show <PROGRAM_ID>
```

### Frontend Deployment
```bash
# Build web app
cd web && npm run build

# Deploy to Vercel
vercel --prod

# Build mobile app
cd mobile
expo build:android
expo build:ios
```

### Backend Deployment
```bash
# Build backend
cd backend && npm run build

# Docker deployment
docker build -t pyebwa-backend .
docker push pyebwa/backend:latest

# Deploy to AWS ECS
ecs-cli compose up
```

## Monitoring & Analytics

### Key Metrics
- Token purchase volume
- Heritage items preserved
- Trees planted/verified
- Planter earnings
- User retention rates

### Monitoring Tools
- Datadog for infrastructure
- Sentry for error tracking
- Google Analytics for web
- Mixpanel for mobile
- Custom dashboard for blockchain metrics

## Development Patterns

### Code Style
- TypeScript for all JS/TS code
- Rust formatting with `rustfmt`
- ESLint + Prettier for consistency
- Comprehensive JSDoc comments

### Git Workflow
- Feature branches from `develop`
- PR reviews required
- Automated testing on PR
- Semantic versioning

### Security Practices
- Regular dependency updates
- Security audit before mainnet
- Bug bounty program
- Incident response plan

This documentation provides the technical foundation for implementing the PYEBWA Token system. Focus on simplicity, security, and scalability throughout development.