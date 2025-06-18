import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response } from 'express';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

// Redis client for rate limiting
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 1, // Use separate DB for rate limiting
});

// Custom key generator based on user ID and IP
const keyGenerator = (req: Request): string => {
  const userId = (req as any).user?.id;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Use user ID if authenticated, otherwise use IP
  return userId ? `user:${userId}` : `ip:${ip}`;
};

// Skip rate limiting for certain IPs (e.g., monitoring services)
const skipList = (process.env.RATE_LIMIT_SKIP_IPS || '').split(',').filter(Boolean);

const skip = (req: Request): boolean => {
  const ip = req.ip || req.connection.remoteAddress || '';
  return skipList.includes(ip);
};

// Different rate limit configurations
export const rateLimiters = {
  // Strict limit for authentication endpoints
  auth: rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:auth:',
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip,
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for auth: ${keyGenerator(req)}`);
      res.status(429).json({
        error: 'Too many authentication attempts. Please try again in 15 minutes.',
        retryAfter: req.rateLimit?.resetTime,
      });
    },
  }),

  // Medium limit for API endpoints
  api: rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:api:',
    }),
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many requests. Please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip,
  }),

  // Strict limit for file uploads
  upload: rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:upload:',
    }),
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 uploads per minute
    message: 'Upload limit exceeded. Please wait before uploading more files.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip,
  }),

  // Very strict limit for payment endpoints
  payment: rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:payment:',
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 payment attempts per hour
    message: 'Too many payment attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip,
    skipSuccessfulRequests: true, // Don't count successful payments
  }),

  // Planter submission limit
  planting: rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:planting:',
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 submissions per hour
    message: 'Submission limit exceeded. Please wait before submitting more.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip,
  }),

  // Public endpoints (more lenient)
  public: rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:public:',
    }),
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests from this IP. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || 'unknown',
    skip,
  }),
};

// Dynamic rate limiter based on user tier
export const dynamicRateLimiter = (options: {
  windowMs: number;
  baseMax: number;
  prefix: string;
}) => {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: `rl:${options.prefix}:`,
    }),
    windowMs: options.windowMs,
    max: async (req: Request) => {
      const user = (req as any).user;
      if (!user) return options.baseMax;

      // Different limits based on user tier
      const tierMultipliers: Record<number, number> = {
        1: 1,    // Basic tier
        2: 2,    // Verified tier (2x limit)
        3: 5,    // Premium tier (5x limit)
      };

      const multiplier = tierMultipliers[user.kycTier] || 1;
      return options.baseMax * multiplier;
    },
    keyGenerator,
    skip,
  });
};

// Sliding window rate limiter for more accurate limiting
export class SlidingWindowRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private prefix: string;

  constructor(windowMs: number, maxRequests: number, prefix: string) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.prefix = prefix;
  }

  async checkLimit(key: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const redisKey = `${this.prefix}:${key}`;

    try {
      // Remove old entries
      await redisClient.zremrangebyscore(redisKey, '-inf', windowStart);

      // Count requests in current window
      const count = await redisClient.zcard(redisKey);

      if (count >= this.maxRequests) {
        // Get oldest request time to calculate reset
        const oldestRequest = await redisClient.zrange(redisKey, 0, 0, 'WITHSCORES');
        const resetAt = oldestRequest.length > 1 
          ? new Date(parseInt(oldestRequest[1]) + this.windowMs)
          : new Date(now + this.windowMs);

        return {
          allowed: false,
          remaining: 0,
          resetAt,
        };
      }

      // Add current request
      await redisClient.zadd(redisKey, now, `${now}-${Math.random()}`);
      await redisClient.expire(redisKey, Math.ceil(this.windowMs / 1000));

      return {
        allowed: true,
        remaining: this.maxRequests - count - 1,
        resetAt: new Date(now + this.windowMs),
      };
    } catch (error) {
      logger.error('Sliding window rate limit error:', error);
      // Allow request on error
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetAt: new Date(now + this.windowMs),
      };
    }
  }

  middleware() {
    return async (req: Request, res: Response, next: Function) => {
      const key = keyGenerator(req);
      const result = await this.checkLimit(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

      if (!result.allowed) {
        logger.warn(`Sliding window rate limit exceeded: ${key}`);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: result.resetAt,
        });
      }

      next();
    };
  }
}

// Distributed rate limiter for multiple servers
export class DistributedRateLimiter {
  private script: string;

  constructor() {
    // Lua script for atomic rate limit check
    this.script = `
      local key = KEYS[1]
      local window = tonumber(ARGV[1])
      local max_requests = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local window_start = now - window

      -- Remove old entries
      redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

      -- Count current requests
      local current = redis.call('ZCARD', key)

      if current >= max_requests then
        return {0, current, redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')[2]}
      end

      -- Add new request
      redis.call('ZADD', key, now, now .. ':' .. math.random())
      redis.call('EXPIRE', key, math.ceil(window / 1000))

      return {1, max_requests - current - 1, now + window}
    `;
  }

  async checkLimit(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    try {
      const result = await redisClient.eval(
        this.script,
        1,
        key,
        windowMs,
        maxRequests,
        Date.now()
      ) as [number, number, number];

      return {
        allowed: result[0] === 1,
        remaining: result[1],
        resetAt: new Date(result[2]),
      };
    } catch (error) {
      logger.error('Distributed rate limit error:', error);
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: new Date(Date.now() + windowMs),
      };
    }
  }
}

// IP-based rate limiter with subnet support
export const ipRateLimiter = (options: {
  windowMs: number;
  max: number;
  prefix: string;
  blockSubnet?: boolean;
}) => {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: `rl:ip:${options.prefix}:`,
    }),
    windowMs: options.windowMs,
    max: options.max,
    keyGenerator: (req: Request) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      
      if (options.blockSubnet && ip.includes('.')) {
        // Block by /24 subnet for IPv4
        const parts = ip.split('.');
        return parts.slice(0, 3).join('.');
      }
      
      return ip;
    },
    skip,
  });
};

// Cost-based rate limiter for expensive operations
export class CostBasedRateLimiter {
  private costs: Map<string, number> = new Map();
  private budget: number;
  private windowMs: number;
  private prefix: string;

  constructor(budget: number, windowMs: number, prefix: string) {
    this.budget = budget;
    this.windowMs = windowMs;
    this.prefix = prefix;
  }

  setCost(operation: string, cost: number) {
    this.costs.set(operation, cost);
  }

  async checkLimit(key: string, operation: string): Promise<{
    allowed: boolean;
    currentCost: number;
    remainingBudget: number;
  }> {
    const cost = this.costs.get(operation) || 1;
    const redisKey = `${this.prefix}:${key}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      // Get current cost in window
      await redisClient.zremrangebyscore(redisKey, '-inf', windowStart);
      const entries = await redisClient.zrange(redisKey, 0, -1, 'WITHSCORES');
      
      let currentCost = 0;
      for (let i = 0; i < entries.length; i += 2) {
        const [, costStr] = entries[i].split(':');
        currentCost += parseInt(costStr);
      }

      if (currentCost + cost > this.budget) {
        return {
          allowed: false,
          currentCost,
          remainingBudget: Math.max(0, this.budget - currentCost),
        };
      }

      // Add new operation
      await redisClient.zadd(redisKey, now, `${now}:${cost}`);
      await redisClient.expire(redisKey, Math.ceil(this.windowMs / 1000));

      return {
        allowed: true,
        currentCost: currentCost + cost,
        remainingBudget: this.budget - currentCost - cost,
      };
    } catch (error) {
      logger.error('Cost-based rate limit error:', error);
      return {
        allowed: true,
        currentCost: 0,
        remainingBudget: this.budget,
      };
    }
  }
}

// Export configured rate limiter
export const rateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  prefix?: string;
}) => {
  const config = {
    windowMs: options?.windowMs || 60 * 1000,
    max: options?.max || 60,
    prefix: options?.prefix || 'general',
  };

  return dynamicRateLimiter({
    windowMs: config.windowMs,
    baseMax: config.max,
    prefix: config.prefix,
  });
};