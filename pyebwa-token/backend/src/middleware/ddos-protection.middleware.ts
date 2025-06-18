import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';
import Redis from 'ioredis';

// Redis client for DDoS tracking
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 2, // Separate DB for DDoS protection
});

interface DDoSConfig {
  // Request patterns
  maxRequestsPerSecond: number;
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  
  // Connection patterns
  maxConnectionsPerIP: number;
  maxNewConnectionsPerMinute: number;
  
  // Payload protection
  maxPayloadSize: number; // bytes
  maxHeaderSize: number; // bytes
  
  // Behavioral patterns
  maxIdenticalRequests: number;
  identicalRequestWindow: number; // ms
  
  // Blacklist duration
  blacklistDuration: number; // seconds
  
  // Whitelist
  whitelistedIPs: string[];
  whitelistedUserAgents: string[];
}

const defaultConfig: DDoSConfig = {
  maxRequestsPerSecond: 10,
  maxRequestsPerMinute: 100,
  maxRequestsPerHour: 3000,
  maxConnectionsPerIP: 50,
  maxNewConnectionsPerMinute: 20,
  maxPayloadSize: 10 * 1024 * 1024, // 10MB
  maxHeaderSize: 8 * 1024, // 8KB
  maxIdenticalRequests: 5,
  identicalRequestWindow: 60000, // 1 minute
  blacklistDuration: 3600, // 1 hour
  whitelistedIPs: (process.env.DDOS_WHITELIST_IPS || '').split(',').filter(Boolean),
  whitelistedUserAgents: ['Pingdom', 'UptimeRobot', 'StatusCake'],
};

// Track connection counts
const connectionCounts = new Map<string, number>();

// Track request patterns
interface RequestPattern {
  hash: string;
  count: number;
  firstSeen: number;
}

const requestPatterns = new Map<string, RequestPattern>();

// Get client IP
const getClientIP = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'] as string;
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
};

// Generate request hash for pattern detection
const generateRequestHash = (req: Request): string => {
  const components = [
    req.method,
    req.path,
    JSON.stringify(req.query),
    req.headers['user-agent'] || '',
  ];
  
  return createHash('sha256')
    .update(components.join('|'))
    .digest('hex');
};

// Check if IP is blacklisted
const isBlacklisted = async (ip: string): Promise<boolean> => {
  try {
    const blacklisted = await redis.get(`ddos:blacklist:${ip}`);
    return !!blacklisted;
  } catch (error) {
    logger.error('DDoS blacklist check error:', error);
    return false;
  }
};

// Add IP to blacklist
const blacklistIP = async (ip: string, reason: string, duration?: number): Promise<void> => {
  try {
    const ttl = duration || defaultConfig.blacklistDuration;
    await redis.setex(`ddos:blacklist:${ip}`, ttl, reason);
    logger.warn(`IP blacklisted: ${ip} - Reason: ${reason}`);
  } catch (error) {
    logger.error('DDoS blacklist error:', error);
  }
};

// Track request rates
const trackRequestRate = async (ip: string): Promise<{
  perSecond: number;
  perMinute: number;
  perHour: number;
}> => {
  const now = Date.now();
  const second = Math.floor(now / 1000);
  const minute = Math.floor(now / 60000);
  const hour = Math.floor(now / 3600000);
  
  const keys = [
    `ddos:rate:${ip}:s:${second}`,
    `ddos:rate:${ip}:m:${minute}`,
    `ddos:rate:${ip}:h:${hour}`,
  ];
  
  try {
    // Increment counters
    const pipeline = redis.pipeline();
    keys.forEach((key, index) => {
      pipeline.incr(key);
      pipeline.expire(key, [2, 120, 7200][index]); // 2s, 2m, 2h expiry
    });
    
    const results = await pipeline.exec();
    
    return {
      perSecond: results?.[0]?.[1] as number || 0,
      perMinute: results?.[2]?.[1] as number || 0,
      perHour: results?.[4]?.[1] as number || 0,
    };
  } catch (error) {
    logger.error('DDoS rate tracking error:', error);
    return { perSecond: 0, perMinute: 0, perHour: 0 };
  }
};

// Track new connections
const trackNewConnection = async (ip: string): Promise<number> => {
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const key = `ddos:new-conn:${ip}:${minute}`;
  
  try {
    const count = await redis.incr(key);
    await redis.expire(key, 120); // 2 minute expiry
    return count;
  } catch (error) {
    logger.error('DDoS connection tracking error:', error);
    return 0;
  }
};

// Main DDoS protection middleware
export const ddosProtection = (config: Partial<DDoSConfig> = {}) => {
  const cfg = { ...defaultConfig, ...config };
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    
    // Check whitelist
    if (cfg.whitelistedIPs.includes(ip)) {
      return next();
    }
    
    if (cfg.whitelistedUserAgents.some(ua => userAgent.includes(ua))) {
      return next();
    }
    
    try {
      // Check blacklist
      if (await isBlacklisted(ip)) {
        logger.warn(`Blocked blacklisted IP: ${ip}`);
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Check payload size
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > cfg.maxPayloadSize) {
        await blacklistIP(ip, 'Payload too large');
        return res.status(413).json({ error: 'Payload too large' });
      }
      
      // Check header size
      const headerSize = JSON.stringify(req.headers).length;
      if (headerSize > cfg.maxHeaderSize) {
        await blacklistIP(ip, 'Headers too large');
        return res.status(431).json({ error: 'Request header fields too large' });
      }
      
      // Track request rates
      const rates = await trackRequestRate(ip);
      
      if (rates.perSecond > cfg.maxRequestsPerSecond) {
        await blacklistIP(ip, 'Too many requests per second', 300); // 5 min
        return res.status(429).json({ error: 'Too many requests' });
      }
      
      if (rates.perMinute > cfg.maxRequestsPerMinute) {
        await blacklistIP(ip, 'Too many requests per minute', 600); // 10 min
        return res.status(429).json({ error: 'Too many requests' });
      }
      
      if (rates.perHour > cfg.maxRequestsPerHour) {
        await blacklistIP(ip, 'Too many requests per hour', 3600); // 1 hour
        return res.status(429).json({ error: 'Too many requests' });
      }
      
      // Track connection count
      let connCount = connectionCounts.get(ip) || 0;
      if (connCount >= cfg.maxConnectionsPerIP) {
        await blacklistIP(ip, 'Too many connections');
        return res.status(503).json({ error: 'Too many connections' });
      }
      
      // Track new connections
      if (!connectionCounts.has(ip)) {
        const newConnCount = await trackNewConnection(ip);
        if (newConnCount > cfg.maxNewConnectionsPerMinute) {
          await blacklistIP(ip, 'Too many new connections');
          return res.status(503).json({ error: 'Connection rate limit exceeded' });
        }
        connectionCounts.set(ip, 1);
      } else {
        connectionCounts.set(ip, connCount + 1);
      }
      
      // Detect identical request patterns
      const requestHash = generateRequestHash(req);
      const patternKey = `${ip}:${requestHash}`;
      const pattern = requestPatterns.get(patternKey);
      
      if (pattern) {
        pattern.count++;
        const timeDiff = Date.now() - pattern.firstSeen;
        
        if (timeDiff <= cfg.identicalRequestWindow && pattern.count > cfg.maxIdenticalRequests) {
          await blacklistIP(ip, 'Suspicious request pattern');
          return res.status(403).json({ error: 'Suspicious activity detected' });
        }
      } else {
        requestPatterns.set(patternKey, {
          hash: requestHash,
          count: 1,
          firstSeen: Date.now(),
        });
      }
      
      // Clean up old patterns periodically
      if (Math.random() < 0.01) { // 1% chance
        const cutoff = Date.now() - cfg.identicalRequestWindow;
        for (const [key, pattern] of requestPatterns.entries()) {
          if (pattern.firstSeen < cutoff) {
            requestPatterns.delete(key);
          }
        }
      }
      
      // Decrement connection count on response finish
      res.on('finish', () => {
        const count = connectionCounts.get(ip);
        if (count && count > 1) {
          connectionCounts.set(ip, count - 1);
        } else {
          connectionCounts.delete(ip);
        }
      });
      
      next();
    } catch (error) {
      logger.error('DDoS protection error:', error);
      next(); // Allow request on error
    }
  };
};

// Advanced DDoS protection with behavioral analysis
export class BehavioralDDoSProtection {
  private config: DDoSConfig;
  private behaviorProfiles = new Map<string, BehaviorProfile>();
  
  constructor(config: Partial<DDoSConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }
  
  async analyzeRequest(req: Request): Promise<ThreatLevel> {
    const ip = getClientIP(req);
    const profile = await this.getOrCreateProfile(ip);
    
    // Update profile with new request
    profile.requestCount++;
    profile.lastRequestTime = Date.now();
    
    // Analyze various factors
    const factors: ThreatFactor[] = [];
    
    // Request rate acceleration
    const acceleration = this.calculateAcceleration(profile);
    if (acceleration > 2) {
      factors.push({
        type: 'acceleration',
        severity: Math.min(acceleration / 5, 1),
        description: 'Rapid request rate increase',
      });
    }
    
    // User agent switching
    const userAgent = req.headers['user-agent'] || 'unknown';
    if (profile.userAgents.size > 5) {
      factors.push({
        type: 'ua-switching',
        severity: 0.7,
        description: 'Multiple user agents detected',
      });
    }
    profile.userAgents.add(userAgent);
    
    // Path scanning
    if (this.isPathScanning(profile, req.path)) {
      factors.push({
        type: 'path-scanning',
        severity: 0.8,
        description: 'Potential path scanning detected',
      });
    }
    
    // Calculate overall threat level
    const threatScore = factors.reduce((sum, factor) => sum + factor.severity, 0) / 3;
    
    return {
      score: threatScore,
      factors,
      recommendation: this.getRecommendation(threatScore),
    };
  }
  
  private async getOrCreateProfile(ip: string): Promise<BehaviorProfile> {
    let profile = this.behaviorProfiles.get(ip);
    
    if (!profile) {
      profile = {
        ip,
        firstSeen: Date.now(),
        lastRequestTime: Date.now(),
        requestCount: 0,
        requestTimes: [],
        paths: new Set(),
        userAgents: new Set(),
        methods: new Map(),
        errorCount: 0,
      };
      this.behaviorProfiles.set(ip, profile);
    }
    
    // Clean old request times
    const cutoff = Date.now() - 300000; // 5 minutes
    profile.requestTimes = profile.requestTimes.filter(time => time > cutoff);
    profile.requestTimes.push(Date.now());
    
    return profile;
  }
  
  private calculateAcceleration(profile: BehaviorProfile): number {
    if (profile.requestTimes.length < 10) return 0;
    
    const times = profile.requestTimes.slice(-20); // Last 20 requests
    const intervals: number[] = [];
    
    for (let i = 1; i < times.length; i++) {
      intervals.push(times[i] - times[i - 1]);
    }
    
    // Calculate average interval for first and second half
    const mid = Math.floor(intervals.length / 2);
    const firstHalf = intervals.slice(0, mid);
    const secondHalf = intervals.slice(mid);
    
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    // Acceleration is the ratio of interval decrease
    return avgFirst / Math.max(avgSecond, 1);
  }
  
  private isPathScanning(profile: BehaviorProfile, currentPath: string): boolean {
    profile.paths.add(currentPath);
    
    // Check for common scanning patterns
    const scanPatterns = [
      /\/(admin|config|backup|test|temp|tmp)/i,
      /\.(bak|old|backup|config|conf|log)$/i,
      /\/(wp-admin|phpmyadmin|adminer)/i,
      /\/(\.git|\.env|\.htaccess)/i,
    ];
    
    const suspiciousPaths = Array.from(profile.paths).filter(path =>
      scanPatterns.some(pattern => pattern.test(path))
    );
    
    return suspiciousPaths.length > 3;
  }
  
  private getRecommendation(score: number): string {
    if (score < 0.3) return 'allow';
    if (score < 0.6) return 'challenge';
    if (score < 0.8) return 'rate-limit';
    return 'block';
  }
}

// Types
interface BehaviorProfile {
  ip: string;
  firstSeen: number;
  lastRequestTime: number;
  requestCount: number;
  requestTimes: number[];
  paths: Set<string>;
  userAgents: Set<string>;
  methods: Map<string, number>;
  errorCount: number;
}

interface ThreatFactor {
  type: string;
  severity: number; // 0-1
  description: string;
}

interface ThreatLevel {
  score: number; // 0-1
  factors: ThreatFactor[];
  recommendation: 'allow' | 'challenge' | 'rate-limit' | 'block';
}

// Cloudflare-style challenge system
export const challengeMiddleware = () => {
  const challenges = new Map<string, Challenge>();
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    const challengeToken = req.headers['x-challenge-token'] as string;
    
    // Check if challenge is required
    const protection = new BehavioralDDoSProtection();
    const threat = await protection.analyzeRequest(req);
    
    if (threat.recommendation === 'challenge' || threat.recommendation === 'rate-limit') {
      // Check if valid challenge token exists
      if (challengeToken) {
        const challenge = challenges.get(challengeToken);
        if (challenge && challenge.ip === ip && challenge.solved) {
          return next();
        }
      }
      
      // Generate new challenge
      const newChallenge = generateChallenge();
      challenges.set(newChallenge.token, {
        ...newChallenge,
        ip,
        created: Date.now(),
        solved: false,
      });
      
      // Clean old challenges
      if (Math.random() < 0.1) {
        const cutoff = Date.now() - 300000; // 5 minutes
        for (const [token, challenge] of challenges.entries()) {
          if (challenge.created < cutoff) {
            challenges.delete(token);
          }
        }
      }
      
      return res.status(403).json({
        error: 'Challenge required',
        challenge: {
          token: newChallenge.token,
          type: newChallenge.type,
          data: newChallenge.data,
        },
      });
    }
    
    if (threat.recommendation === 'block') {
      await blacklistIP(ip, 'Behavioral analysis: suspicious activity');
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  };
};

interface Challenge {
  token: string;
  type: 'pow' | 'captcha';
  data: any;
  ip: string;
  created: number;
  solved: boolean;
}

function generateChallenge(): Omit<Challenge, 'ip' | 'created' | 'solved'> {
  const token = createHash('sha256')
    .update(Math.random().toString())
    .digest('hex');
  
  // Simple proof-of-work challenge
  const difficulty = 4;
  const challenge = Math.random().toString(36).substring(2);
  
  return {
    token,
    type: 'pow',
    data: {
      challenge,
      difficulty,
      algorithm: 'sha256',
    },
  };
}

// Export configured middleware
export const configureDDoSProtection = (options?: {
  basic?: boolean;
  behavioral?: boolean;
  challenge?: boolean;
}) => {
  const middlewares: any[] = [];
  
  if (options?.basic !== false) {
    middlewares.push(ddosProtection());
  }
  
  if (options?.behavioral) {
    const protection = new BehavioralDDoSProtection();
    middlewares.push(async (req: Request, res: Response, next: NextFunction) => {
      const threat = await protection.analyzeRequest(req);
      req.threatLevel = threat;
      next();
    });
  }
  
  if (options?.challenge) {
    middlewares.push(challengeMiddleware());
  }
  
  return middlewares;
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      threatLevel?: ThreatLevel;
    }
  }
}