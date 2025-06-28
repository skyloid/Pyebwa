import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { familyRouter } from './api/family.routes';
import { planterRouter } from './api/planter.routes';
import { verificationRouter } from './api/verification.routes';
import { adminRouter } from './api/admin.routes';
import { userRouter } from './api/user.routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['https://rasin.pyebwa.com', 'http://localhost:19000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '0.1.0'
  });
});

// Routes
app.use('/api/family', familyRouter);
app.use('/api/planter', planterRouter);
app.use('/api/verify', verificationRouter);
app.use('/api/admin', adminRouter);
app.use('/api/users', userRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
