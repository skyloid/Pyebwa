import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { WebSocket } from 'ws';

interface SecurityEvent {
  id: string;
  timestamp: number;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  target?: string;
  description: string;
  metadata?: any;
  resolved?: boolean;
}

enum SecurityEventType {
  // Authentication
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  ACCOUNT_LOCKED = 'account_locked',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  DDOS_ATTACK_DETECTED = 'ddos_attack_detected',
  IP_BLACKLISTED = 'ip_blacklisted',
  
  // API Security
  INVALID_API_KEY = 'invalid_api_key',
  API_ABUSE = 'api_abuse',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
  
  // Data Security
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PERMISSION_VIOLATION = 'permission_violation',
  
  // System Security
  MALWARE_DETECTED = 'malware_detected',
  VULNERABILITY_SCAN = 'vulnerability_scan',
  CONFIG_CHANGE = 'config_change',
  
  // Blockchain Security
  INVALID_TRANSACTION = 'invalid_transaction',
  DOUBLE_SPEND_ATTEMPT = 'double_spend_attempt',
  SMART_CONTRACT_EXPLOIT = 'smart_contract_exploit',
}

export class SecurityMonitorService extends EventEmitter {
  private redis: Redis;
  private events: Map<string, SecurityEvent> = new Map();
  private metrics: SecurityMetrics;
  private alertThresholds: AlertThresholds;
  private wsClients: Set<WebSocket> = new Set();

  constructor() {
    super();
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 3, // Security monitoring DB
    });

    this.metrics = {
      totalEvents: 0,
      eventsByType: new Map(),
      eventsBySeverity: new Map(),
      eventsPerHour: [],
      topThreats: [],
      blockedIPs: new Set(),
      activeThreatLevel: 'low',
    };

    this.alertThresholds = {
      criticalEventsPerHour: 10,
      highEventsPerHour: 50,
      totalEventsPerHour: 500,
      failedLoginsPerIP: 10,
      rateLimitViolations: 100,
    };

    this.initializeMonitoring();
  }

  private async initializeMonitoring() {
    // Load historical data
    await this.loadHistoricalData();

    // Start periodic analysis
    setInterval(() => this.analyzeSecurityTrends(), 60000); // Every minute
    setInterval(() => this.generateSecurityReport(), 3600000); // Every hour
    setInterval(() => this.cleanupOldEvents(), 86400000); // Daily

    logger.info('Security monitoring service initialized');
  }

  // Log security event
  async logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
    };

    // Store in memory
    this.events.set(fullEvent.id, fullEvent);

    // Store in Redis
    await this.storeEvent(fullEvent);

    // Update metrics
    this.updateMetrics(fullEvent);

    // Check for alerts
    await this.checkAlerts(fullEvent);

    // Emit event
    this.emit('security-event', fullEvent);

    // Notify WebSocket clients
    this.broadcastToClients({
      type: 'security-event',
      data: fullEvent,
    });

    logger.info(`Security event logged: ${event.type} - ${event.description}`);
  }

  // Store event in Redis
  private async storeEvent(event: SecurityEvent): Promise<void> {
    try {
      const key = `security:event:${event.id}`;
      await this.redis.setex(key, 2592000, JSON.stringify(event)); // 30 days

      // Add to time series
      await this.redis.zadd(
        'security:events:timeline',
        event.timestamp,
        event.id
      );

      // Add to type index
      await this.redis.sadd(`security:events:type:${event.type}`, event.id);

      // Add to severity index
      await this.redis.sadd(`security:events:severity:${event.severity}`, event.id);
    } catch (error) {
      logger.error('Failed to store security event:', error);
    }
  }

  // Update real-time metrics
  private updateMetrics(event: SecurityEvent): void {
    this.metrics.totalEvents++;

    // Update type counts
    const typeCount = this.metrics.eventsByType.get(event.type) || 0;
    this.metrics.eventsByType.set(event.type, typeCount + 1);

    // Update severity counts
    const severityCount = this.metrics.eventsBySeverity.get(event.severity) || 0;
    this.metrics.eventsBySeverity.set(event.severity, severityCount + 1);

    // Update hourly counts
    const hour = new Date().getHours();
    if (!this.metrics.eventsPerHour[hour]) {
      this.metrics.eventsPerHour[hour] = 0;
    }
    this.metrics.eventsPerHour[hour]++;

    // Update threat level
    this.updateThreatLevel();
  }

  // Check if alerts should be triggered
  private async checkAlerts(event: SecurityEvent): Promise<void> {
    // Critical event alert
    if (event.severity === 'critical') {
      await this.sendAlert({
        type: 'critical-event',
        title: 'Critical Security Event',
        message: `${event.type}: ${event.description}`,
        event,
      });
    }

    // Check threshold violations
    const hour = new Date().getHours();
    const hourlyEvents = this.metrics.eventsPerHour[hour] || 0;

    if (hourlyEvents > this.alertThresholds.totalEventsPerHour) {
      await this.sendAlert({
        type: 'threshold-violation',
        title: 'High Security Event Volume',
        message: `${hourlyEvents} events in the last hour (threshold: ${this.alertThresholds.totalEventsPerHour})`,
      });
    }

    // Pattern-based alerts
    await this.checkPatternAlerts(event);
  }

  // Check for suspicious patterns
  private async checkPatternAlerts(event: SecurityEvent): Promise<void> {
    // Brute force detection
    if (event.type === SecurityEventType.LOGIN_FAILURE && event.source) {
      const failures = await this.getRecentEventCount(
        SecurityEventType.LOGIN_FAILURE,
        event.source,
        300000 // 5 minutes
      );

      if (failures > this.alertThresholds.failedLoginsPerIP) {
        await this.sendAlert({
          type: 'brute-force',
          title: 'Brute Force Attack Detected',
          message: `${failures} failed login attempts from ${event.source}`,
        });
      }
    }

    // DDoS pattern detection
    if (event.type === SecurityEventType.RATE_LIMIT_EXCEEDED) {
      const violations = await this.getRecentEventCount(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        null,
        600000 // 10 minutes
      );

      if (violations > this.alertThresholds.rateLimitViolations) {
        await this.sendAlert({
          type: 'ddos',
          title: 'Possible DDoS Attack',
          message: `${violations} rate limit violations in 10 minutes`,
        });
      }
    }
  }

  // Get recent event count
  private async getRecentEventCount(
    type: SecurityEventType,
    source: string | null,
    timeWindow: number
  ): Promise<number> {
    const cutoff = Date.now() - timeWindow;
    let count = 0;

    for (const event of this.events.values()) {
      if (
        event.type === type &&
        event.timestamp > cutoff &&
        (!source || event.source === source)
      ) {
        count++;
      }
    }

    return count;
  }

  // Send security alert
  private async sendAlert(alert: SecurityAlert): Promise<void> {
    logger.warn(`Security Alert: ${alert.title} - ${alert.message}`);

    // Store alert
    const alertKey = `security:alert:${Date.now()}`;
    await this.redis.setex(alertKey, 86400, JSON.stringify(alert)); // 24 hours

    // Emit alert event
    this.emit('security-alert', alert);

    // Notify WebSocket clients
    this.broadcastToClients({
      type: 'security-alert',
      data: alert,
    });

    // Send to external services (e.g., PagerDuty, Slack)
    await this.sendExternalAlert(alert);
  }

  // Send alert to external services
  private async sendExternalAlert(alert: SecurityAlert): Promise<void> {
    // Implement integration with external alerting services
    // Example: Slack, PagerDuty, email, SMS, etc.
  }

  // Update overall threat level
  private updateThreatLevel(): void {
    const criticalCount = this.metrics.eventsBySeverity.get('critical') || 0;
    const highCount = this.metrics.eventsBySeverity.get('high') || 0;
    const hour = new Date().getHours();
    const hourlyEvents = this.metrics.eventsPerHour[hour] || 0;

    if (criticalCount > 5 || hourlyEvents > 1000) {
      this.metrics.activeThreatLevel = 'critical';
    } else if (criticalCount > 0 || highCount > 10 || hourlyEvents > 500) {
      this.metrics.activeThreatLevel = 'high';
    } else if (highCount > 0 || hourlyEvents > 100) {
      this.metrics.activeThreatLevel = 'medium';
    } else {
      this.metrics.activeThreatLevel = 'low';
    }
  }

  // Analyze security trends
  private async analyzeSecurityTrends(): Promise<void> {
    try {
      const trends: SecurityTrends = {
        timestamp: Date.now(),
        eventGrowthRate: this.calculateGrowthRate(),
        topEventTypes: this.getTopEventTypes(5),
        emergingThreats: await this.detectEmergingThreats(),
        riskScore: this.calculateRiskScore(),
      };

      // Store trends
      await this.redis.setex(
        `security:trends:${trends.timestamp}`,
        604800, // 7 days
        JSON.stringify(trends)
      );

      // Check for anomalies
      if (trends.eventGrowthRate > 2) {
        await this.sendAlert({
          type: 'anomaly',
          title: 'Unusual Security Activity',
          message: `Event rate increased by ${Math.round((trends.eventGrowthRate - 1) * 100)}%`,
        });
      }
    } catch (error) {
      logger.error('Failed to analyze security trends:', error);
    }
  }

  // Calculate event growth rate
  private calculateGrowthRate(): number {
    const now = new Date().getHours();
    const prev = now === 0 ? 23 : now - 1;
    
    const currentHour = this.metrics.eventsPerHour[now] || 0;
    const previousHour = this.metrics.eventsPerHour[prev] || 1;
    
    return currentHour / previousHour;
  }

  // Get top event types
  private getTopEventTypes(limit: number): Array<{ type: string; count: number }> {
    return Array.from(this.metrics.eventsByType.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([type, count]) => ({ type, count }));
  }

  // Detect emerging threats
  private async detectEmergingThreats(): Promise<string[]> {
    const threats: string[] = [];
    
    // Check for rapid increase in specific event types
    for (const [type, count] of this.metrics.eventsByType.entries()) {
      const historicalAvg = await this.getHistoricalAverage(type);
      if (count > historicalAvg * 3) {
        threats.push(`Unusual increase in ${type} events`);
      }
    }
    
    return threats;
  }

  // Get historical average for event type
  private async getHistoricalAverage(type: string): Promise<number> {
    // Implement historical data analysis
    return 10; // Placeholder
  }

  // Calculate overall risk score
  private calculateRiskScore(): number {
    const weights = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1,
    };
    
    let score = 0;
    for (const [severity, count] of this.metrics.eventsBySeverity.entries()) {
      score += (count * weights[severity as keyof typeof weights]) || 0;
    }
    
    return Math.min(score / 100, 1); // Normalize to 0-1
  }

  // Generate security report
  private async generateSecurityReport(): Promise<SecurityReport> {
    const report: SecurityReport = {
      timestamp: Date.now(),
      period: '1h',
      summary: {
        totalEvents: this.metrics.totalEvents,
        threatLevel: this.metrics.activeThreatLevel,
        riskScore: this.calculateRiskScore(),
      },
      events: {
        byType: Object.fromEntries(this.metrics.eventsByType),
        bySeverity: Object.fromEntries(this.metrics.eventsBySeverity),
        timeline: this.metrics.eventsPerHour,
      },
      threats: {
        active: await this.getActiveThreats(),
        blocked: Array.from(this.metrics.blockedIPs),
        emerging: await this.detectEmergingThreats(),
      },
      recommendations: this.generateRecommendations(),
    };
    
    // Store report
    await this.redis.setex(
      `security:report:${report.timestamp}`,
      2592000, // 30 days
      JSON.stringify(report)
    );
    
    return report;
  }

  // Get active threats
  private async getActiveThreats(): Promise<string[]> {
    const threats: string[] = [];
    
    // Check for ongoing attacks
    const recentCritical = await this.getRecentEventCount(
      SecurityEventType.DDOS_ATTACK_DETECTED,
      null,
      300000 // 5 minutes
    );
    
    if (recentCritical > 0) {
      threats.push('Active DDoS attack');
    }
    
    return threats;
  }

  // Generate security recommendations
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.activeThreatLevel === 'high' || this.metrics.activeThreatLevel === 'critical') {
      recommendations.push('Enable enhanced DDoS protection');
      recommendations.push('Review and update firewall rules');
      recommendations.push('Increase monitoring frequency');
    }
    
    const failedLogins = this.metrics.eventsByType.get(SecurityEventType.LOGIN_FAILURE) || 0;
    if (failedLogins > 100) {
      recommendations.push('Implement CAPTCHA for login attempts');
      recommendations.push('Consider implementing 2FA');
    }
    
    return recommendations;
  }

  // Load historical data
  private async loadHistoricalData(): Promise<void> {
    try {
      // Load recent events
      const recentEvents = await this.redis.zrevrangebyscore(
        'security:events:timeline',
        Date.now(),
        Date.now() - 3600000, // Last hour
        'WITHSCORES'
      );
      
      for (let i = 0; i < recentEvents.length; i += 2) {
        const eventId = recentEvents[i];
        const eventData = await this.redis.get(`security:event:${eventId}`);
        if (eventData) {
          const event = JSON.parse(eventData);
          this.events.set(event.id, event);
          this.updateMetrics(event);
        }
      }
    } catch (error) {
      logger.error('Failed to load historical data:', error);
    }
  }

  // Clean up old events
  private async cleanupOldEvents(): Promise<void> {
    const cutoff = Date.now() - 86400000; // 24 hours
    
    // Clean memory
    for (const [id, event] of this.events.entries()) {
      if (event.timestamp < cutoff) {
        this.events.delete(id);
      }
    }
    
    // Clean Redis
    await this.redis.zremrangebyscore('security:events:timeline', '-inf', cutoff);
  }

  // WebSocket management
  addWebSocketClient(ws: WebSocket): void {
    this.wsClients.add(ws);
    
    // Send initial data
    ws.send(JSON.stringify({
      type: 'initial-data',
      data: {
        metrics: this.getMetrics(),
        recentEvents: this.getRecentEvents(50),
      },
    }));
    
    ws.on('close', () => {
      this.wsClients.delete(ws);
    });
  }

  // Broadcast to WebSocket clients
  private broadcastToClients(message: any): void {
    const data = JSON.stringify(message);
    for (const client of this.wsClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  // Public API methods
  getMetrics(): SecurityMetrics {
    return {
      ...this.metrics,
      eventsByType: Object.fromEntries(this.metrics.eventsByType),
      eventsBySeverity: Object.fromEntries(this.metrics.eventsBySeverity),
      blockedIPs: Array.from(this.metrics.blockedIPs),
    };
  }

  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return Array.from(this.events.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async getEventById(id: string): Promise<SecurityEvent | null> {
    const event = this.events.get(id);
    if (event) return event;
    
    const data = await this.redis.get(`security:event:${id}`);
    return data ? JSON.parse(data) : null;
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Types
interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Map<string, number> | Record<string, number>;
  eventsBySeverity: Map<string, number> | Record<string, number>;
  eventsPerHour: number[];
  topThreats: string[];
  blockedIPs: Set<string> | string[];
  activeThreatLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface AlertThresholds {
  criticalEventsPerHour: number;
  highEventsPerHour: number;
  totalEventsPerHour: number;
  failedLoginsPerIP: number;
  rateLimitViolations: number;
}

interface SecurityAlert {
  type: string;
  title: string;
  message: string;
  event?: SecurityEvent;
  timestamp?: number;
}

interface SecurityTrends {
  timestamp: number;
  eventGrowthRate: number;
  topEventTypes: Array<{ type: string; count: number }>;
  emergingThreats: string[];
  riskScore: number;
}

interface SecurityReport {
  timestamp: number;
  period: string;
  summary: {
    totalEvents: number;
    threatLevel: string;
    riskScore: number;
  };
  events: {
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    timeline: number[];
  };
  threats: {
    active: string[];
    blocked: string[];
    emerging: string[];
  };
  recommendations: string[];
}

// Export singleton instance
export const securityMonitor = new SecurityMonitorService();