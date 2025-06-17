# PYEBWA Token API Documentation

## Base URL

**Production**: `https://api.pyebwa.com`  
**Development**: `http://localhost:4000`

## Authentication

All API endpoints (except public ones) require JWT authentication:

```http
Authorization: Bearer <jwt_token>
```

## Response Format

All responses follow this format:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2024-01-15T12:00:00Z"
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Detailed error message"
  },
  "timestamp": "2024-01-15T12:00:00Z"
}
```

## Endpoints

### Authentication

#### Register Family Account
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "firstName": "Jean",
  "lastName": "Baptiste",
  "country": "US"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "walletAddress": "5XmP...8Hk"
    }
  }
}
```

### Token Operations

#### Get Token Price
```http
GET /api/tokens/price?amount=100000
```

Response:
```json
{
  "success": true,
  "data": {
    "tokenAmount": 100000,
    "priceUSD": 10.00,
    "pricePerToken": 0.0001,
    "treesF funded": 50
  }
}
```

#### Purchase Tokens
```http
POST /api/payment/create-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 10.00,
  "tokenAmount": 100000,
  "currency": "USD"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_1234_secret_5678",
    "paymentIntentId": "pi_1234"
  }
}
```

### Heritage Preservation

#### Upload Photo/Video
```http
POST /api/ipfs/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
encrypt: true
metadata: {
  "type": "photo",
  "caption": "Family reunion 2023",
  "date": "2023-12-25",
  "location": "Port-au-Prince"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "hash": "QmX7...9Hk",
    "size": 2048576,
    "url": "https://gateway.pinata.cloud/ipfs/QmX7...9Hk",
    "tokensSpent": 50,
    "treesFunded": 0.25
  }
}
```

#### Upload Multiple Files
```http
POST /api/ipfs/upload-multiple
Authorization: Bearer <token>
Content-Type: multipart/form-data

files: [<binary>, <binary>]
encrypt: true
```

#### Retrieve File
```http
GET /api/ipfs/retrieve/{hash}?decrypt=true
Authorization: Bearer <token>
```

#### Search Heritage Content
```http
GET /api/ipfs/search?filename=family&type=image&limit=20
Authorization: Bearer <token>
```

### Tree Planting (Mobile App)

#### Register as Planter
```http
POST /api/planter/register
Content-Type: application/json

{
  "firstName": "Marie",
  "lastName": "Joseph",
  "phone": "+50937123456",
  "location": {
    "latitude": 18.5944,
    "longitude": -72.3074
  },
  "community": "Kenscoff"
}
```

#### Start Planting Session
```http
POST /api/planter/session/start
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_123",
    "startTime": "2024-01-15T08:00:00Z"
  }
}
```

#### Submit Planting Evidence
```http
POST /api/planter/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "session_123",
  "photos": [
    {
      "ipfsHash": "QmX7...9Hk",
      "location": {
        "latitude": 18.5944,
        "longitude": -72.3074
      },
      "timestamp": "2024-01-15T08:30:00Z"
    }
  ],
  "totalTrees": 50,
  "species": ["mango", "moringa"],
  "location": {
    "latitude": 18.5944,
    "longitude": -72.3074
  }
}
```

#### Get Earnings
```http
GET /api/planter/earnings
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "totalEarnings": 15000,
    "pendingPayments": 2000,
    "paidOut": 13000,
    "treesPlanted": 150,
    "treesVerified": 140,
    "earnings": {
      "total": "$1.50",
      "pending": "$0.20",
      "paid": "$1.30"
    }
  }
}
```

### Verification

#### Get Verification Status
```http
GET /api/verification/{submissionId}
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "verified": true,
    "score": 0.92,
    "checks": {
      "gps": true,
      "satellite": true,
      "photoAnalysis": true,
      "duplicateCheck": true,
      "communityAttestation": true
    }
  }
}
```

### Analytics

#### Get User Impact
```http
GET /api/analytics/impact
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "tokensSpent": 500000,
    "treesFunded": 250,
    "co2Offset": 62500,
    "plantersSupported": 12,
    "memoriesPreserved": 234
  }
}
```

#### Get Platform Statistics
```http
GET /api/analytics/platform
```

Response:
```json
{
  "success": true,
  "data": {
    "totalUsers": 10234,
    "totalTreesPlanted": 1234567,
    "totalTreesVerified": 1200000,
    "totalPlanters": 1523,
    "tokensInCirculation": 500000000,
    "currentTokenPrice": 0.000105
  }
}
```

### Payment & Subscriptions

#### Get Payment History
```http
GET /api/payment/history?limit=10&offset=0
Authorization: Bearer <token>
```

#### Get Subscription Plans
```http
GET /api/subscriptions/plans
```

#### Create Subscription
```http
POST /api/subscriptions/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "planId": "growth_monthly",
  "paymentMethodId": "pm_1234"
}
```

#### Cancel Subscription
```http
POST /api/subscriptions/{subscriptionId}/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "immediately": false
}
```

### Storage Analytics

#### Get Storage Usage
```http
GET /api/ipfs/analytics
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "totalFiles": 1234,
    "totalSize": 5368709120,
    "filesByType": {
      "image": 890,
      "video": 234,
      "document": 110
    },
    "monthlyBandwidth": 10737418240
  }
}
```

## Rate Limits

| Endpoint Type | Rate Limit |
|--------------|------------|
| Authentication | 5 requests/minute |
| File Upload | 10 requests/minute |
| File Retrieval | 100 requests/minute |
| Token Purchase | 10 requests/minute |
| Analytics | 30 requests/minute |

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Invalid or missing authentication |
| `INVALID_REQUEST` | Request validation failed |
| `INSUFFICIENT_FUNDS` | Not enough tokens |
| `RATE_LIMITED` | Too many requests |
| `FILE_TOO_LARGE` | File exceeds size limit |
| `INVALID_GPS` | GPS coordinates outside Haiti |
| `DUPLICATE_SUBMISSION` | Evidence already submitted |
| `VERIFICATION_FAILED` | Could not verify planting |

## Webhooks

### Payment Webhook
```http
POST /api/webhooks/payment
Content-Type: application/json
X-Webhook-Signature: <signature>

{
  "event": "payment.succeeded",
  "data": {
    "paymentIntentId": "pi_1234",
    "amount": 1000,
    "currency": "USD"
  }
}
```

### Verification Webhook
```http
POST /api/webhooks/verification
Content-Type: application/json
X-Webhook-Signature: <signature>

{
  "event": "planting.verified",
  "data": {
    "submissionId": "sub_123",
    "planterId": "planter_456",
    "treesVerified": 50,
    "tokensEarned": 10000
  }
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { PyebwaSDK } from '@pyebwa/sdk';

const sdk = new PyebwaSDK({
  apiKey: 'your_api_key',
  network: 'mainnet'
});

// Purchase tokens
const payment = await sdk.purchaseTokens({
  amount: 10.00,
  currency: 'USD'
});

// Upload heritage
const upload = await sdk.uploadHeritage({
  file: fileBuffer,
  type: 'photo',
  metadata: {
    caption: 'Family gathering'
  }
});
```

### Python
```python
from pyebwa import PyebwaClient

client = PyebwaClient(
    api_key='your_api_key',
    network='mainnet'
)

# Purchase tokens
payment = client.purchase_tokens(
    amount=10.00,
    currency='USD'
)

# Upload heritage
upload = client.upload_heritage(
    file=file_data,
    file_type='photo',
    metadata={
        'caption': 'Family gathering'
    }
)
```

## Testing

Use the following test credentials in development:

**Test Credit Card**: `4242 4242 4242 4242`  
**Test Wallet**: `5XmPDM6eSqJLfAURPNRb5KdZGRMvNrKqHZqFcYc8Hk7`

---

For more examples and detailed integration guides, visit our [Developer Portal](https://developers.pyebwa.com).