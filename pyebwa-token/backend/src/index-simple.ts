import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true, // Allow all origins for testing
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '0.1.0'
  });
});

// Mock auth endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password, userType } = req.body;
  
  // Mock successful login
  res.json({
    success: true,
    token: 'mock-jwt-token-' + Date.now(),
    user: {
      id: '123',
      email,
      userType: userType || 'family',
      name: 'Test User'
    }
  });
});

// Mock planter endpoints
app.post('/api/planter/submit', (req, res) => {
  res.json({
    success: true,
    message: 'Planting session submitted',
    data: {
      id: Date.now().toString(),
      status: 'pending',
      treesSubmitted: req.body.treeCount || 5
    }
  });
});

app.get('/api/planter/earnings', (_req, res) => {
  res.json({
    success: true,
    data: {
      totalEarnings: 1000,
      pendingEarnings: 200,
      withdrawnEarnings: 800,
      treesPlanted: 50
    }
  });
});

// Mock family endpoints
app.post('/api/family/tokens/purchase', (req, res) => {
  res.json({
    success: true,
    message: 'Token purchase successful',
    data: {
      tokens: req.body.amount || 1000,
      transactionId: Date.now().toString()
    }
  });
});

app.get('/api/family/impact', (_req, res) => {
  res.json({
    success: true,
    data: {
      treesPlanted: 25,
      co2Offset: 500,
      tokensSpent: 5000,
      familiesHelped: 3
    }
  });
});

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});