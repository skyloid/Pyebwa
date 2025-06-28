export interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userType: 'family' | 'planter' | 'validator' | 'admin';
  action: string;
  category: 'authentication' | 'transaction' | 'planting' | 'verification' | 'admin' | 'navigation';
  description: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    location?: {
      country?: string;
      city?: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
    };
    deviceInfo?: {
      platform?: string;
      browser?: string;
      isMobile?: boolean;
    };
    transactionDetails?: {
      amount?: number;
      tokensAmount?: number;
      transactionId?: string;
    };
    plantingDetails?: {
      species?: string;
      treeCount?: number;
      location?: {
        lat: number;
        lng: number;
      };
    };
    [key: string]: any;
  };
  timestamp: Date;
  sessionId: string;
  success: boolean;
  errorMessage?: string;
  duration?: number; // in milliseconds
}

export interface UserSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userType: 'family' | 'planter' | 'validator' | 'admin';
  startTime: Date;
  lastActivity: Date;
  endTime?: Date;
  isActive: boolean;
  ipAddress: string;
  userAgent: string;
  deviceInfo: {
    platform: string;
    browser: string;
    isMobile: boolean;
    screenResolution?: string;
  };
  location?: {
    country: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  activityCount: number;
  pagesVisited: string[];
  duration: number; // in milliseconds
}

export interface ActivityFilter {
  userType?: 'family' | 'planter' | 'validator' | 'admin' | 'all';
  category?: 'authentication' | 'transaction' | 'planting' | 'verification' | 'admin' | 'navigation' | 'all';
  action?: string;
  timeRange: '1h' | '24h' | '7d' | '30d' | 'custom';
  startDate?: Date;
  endDate?: Date;
  success?: boolean | 'all';
  searchTerm?: string;
  limit: number;
  offset: number;
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: {
    now: number;
    last24h: number;
    last7d: number;
    last30d: number;
  };
  newUsers: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  usersByType: {
    family: number;
    planter: number;
    validator: number;
    admin: number;
  };
  topActivities: Array<{
    action: string;
    count: number;
    category: string;
  }>;
  activityByHour: number[]; // 24 hours
  activityByDay: number[]; // 7 days
  averageSessionDuration: number; // in minutes
  bounceRate: number; // percentage
  retentionRate: {
    day1: number;
    day7: number;
    day30: number;
  };
  errorRate: number; // percentage
  topPages: Array<{
    page: string;
    views: number;
    uniqueViews: number;
  }>;
  deviceStats: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  browserStats: Array<{
    browser: string;
    count: number;
    percentage: number;
  }>;
  locationStats: Array<{
    country: string;
    count: number;
    percentage: number;
  }>;
}

export interface SuspiciousActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  suspicionType: 'multiple_logins' | 'unusual_location' | 'rapid_actions' | 'failed_authentications' | 'bot_behavior' | 'fraud_indicators';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  details: {
    threshold?: number;
    actualValue?: number;
    pattern?: string;
    riskScore?: number;
    relatedActivities?: string[];
  };
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  investigatedBy?: string;
  resolvedAt?: Date;
  notes?: string;
}

export interface RealTimeUpdate {
  type: 'user_activity' | 'user_session' | 'suspicious_activity' | 'user_analytics';
  data: UserActivity | UserSession | SuspiciousActivity | Partial<UserAnalytics>;
  timestamp: Date;
}

export interface AdminActionLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: 'user' | 'session' | 'system' | 'verification' | 'zone';
  targetId?: string;
  description: string;
  metadata?: any;
  timestamp: Date;
  ipAddress: string;
}