import { EventEmitter } from 'events';
import * as tf from '@tensorflow/tfjs-node';
import { logger } from '../utils/logger';
import { securityMonitor } from './security-monitor.service';

interface AnomalyDetector {
  name: string;
  detect(data: any): Promise<AnomalyResult>;
  train?(historicalData: any[]): Promise<void>;
}

interface AnomalyResult {
  isAnomaly: boolean;
  confidence: number;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  metadata?: any;
}

export class AnomalyDetectionService extends EventEmitter {
  private detectors: Map<string, AnomalyDetector> = new Map();
  private models: Map<string, tf.LayersModel> = new Map();
  private thresholds: Map<string, number> = new Map();
  private historicalData: Map<string, any[]> = new Map();

  constructor() {
    super();
    this.initializeDetectors();
  }

  private async initializeDetectors() {
    // Statistical anomaly detector
    this.registerDetector('statistical', new StatisticalAnomalyDetector());
    
    // Machine learning anomaly detector
    this.registerDetector('ml', new MLAnomalyDetector());
    
    // Pattern-based anomaly detector
    this.registerDetector('pattern', new PatternAnomalyDetector());
    
    // Time series anomaly detector
    this.registerDetector('timeseries', new TimeSeriesAnomalyDetector());
    
    // Behavioral anomaly detector
    this.registerDetector('behavioral', new BehavioralAnomalyDetector());

    logger.info('Anomaly detection service initialized');
  }

  // Register a new detector
  registerDetector(name: string, detector: AnomalyDetector): void {
    this.detectors.set(name, detector);
    this.thresholds.set(name, 0.7); // Default threshold
  }

  // Analyze data for anomalies
  async analyze(data: any, detectorNames?: string[]): Promise<AnomalyResult[]> {
    const detectorsToUse = detectorNames || Array.from(this.detectors.keys());
    const results: AnomalyResult[] = [];

    for (const detectorName of detectorsToUse) {
      const detector = this.detectors.get(detectorName);
      if (!detector) continue;

      try {
        const result = await detector.detect(data);
        
        // Check against threshold
        const threshold = this.thresholds.get(detectorName) || 0.7;
        if (result.confidence >= threshold) {
          results.push(result);
          
          // Log security event
          await this.logAnomalyEvent(result, data);
        }
      } catch (error) {
        logger.error(`Anomaly detector ${detectorName} failed:`, error);
      }
    }

    return results;
  }

  // Log anomaly as security event
  private async logAnomalyEvent(anomaly: AnomalyResult, data: any): Promise<void> {
    await securityMonitor.logEvent({
      type: 'anomaly_detected',
      severity: anomaly.severity,
      source: data.source || 'system',
      description: anomaly.description,
      metadata: {
        anomalyType: anomaly.type,
        confidence: anomaly.confidence,
        ...anomaly.metadata,
      },
    });
  }

  // Train ML models with historical data
  async trainModels(dataType: string, historicalData: any[]): Promise<void> {
    this.historicalData.set(dataType, historicalData);

    // Train each detector that supports training
    for (const [name, detector] of this.detectors.entries()) {
      if (detector.train) {
        try {
          await detector.train(historicalData);
          logger.info(`Trained ${name} detector with ${historicalData.length} samples`);
        } catch (error) {
          logger.error(`Failed to train ${name} detector:`, error);
        }
      }
    }
  }

  // Update detection threshold
  updateThreshold(detectorName: string, threshold: number): void {
    this.thresholds.set(detectorName, Math.max(0, Math.min(1, threshold)));
  }
}

// Statistical Anomaly Detector
class StatisticalAnomalyDetector implements AnomalyDetector {
  name = 'statistical';
  private stats: Map<string, { mean: number; stdDev: number }> = new Map();

  async detect(data: any): Promise<AnomalyResult> {
    const metrics = this.extractMetrics(data);
    let anomalyScore = 0;
    const anomalies: string[] = [];

    for (const [metric, value] of Object.entries(metrics)) {
      const stat = this.stats.get(metric);
      if (!stat) continue;

      // Z-score calculation
      const zScore = Math.abs((value - stat.mean) / stat.stdDev);
      
      if (zScore > 3) {
        anomalyScore += 0.3;
        anomalies.push(`${metric}: ${zScore.toFixed(2)} std devs`);
      } else if (zScore > 2) {
        anomalyScore += 0.2;
        anomalies.push(`${metric}: ${zScore.toFixed(2)} std devs`);
      }
    }

    const isAnomaly = anomalyScore > 0.5;
    
    return {
      isAnomaly,
      confidence: Math.min(anomalyScore, 1),
      type: 'statistical',
      description: isAnomaly ? `Statistical anomaly detected: ${anomalies.join(', ')}` : 'No anomaly',
      severity: anomalyScore > 0.8 ? 'high' : anomalyScore > 0.5 ? 'medium' : 'low',
      metadata: { anomalies, metrics },
    };
  }

  async train(historicalData: any[]): Promise<void> {
    const metricArrays: Map<string, number[]> = new Map();

    // Collect all metrics
    for (const data of historicalData) {
      const metrics = this.extractMetrics(data);
      for (const [metric, value] of Object.entries(metrics)) {
        if (!metricArrays.has(metric)) {
          metricArrays.set(metric, []);
        }
        metricArrays.get(metric)!.push(value);
      }
    }

    // Calculate statistics
    for (const [metric, values] of metricArrays.entries()) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      this.stats.set(metric, { mean, stdDev });
    }
  }

  private extractMetrics(data: any): Record<string, number> {
    // Extract numerical metrics from data
    const metrics: Record<string, number> = {};
    
    if (data.requestRate) metrics.requestRate = data.requestRate;
    if (data.errorRate) metrics.errorRate = data.errorRate;
    if (data.responseTime) metrics.responseTime = data.responseTime;
    if (data.cpuUsage) metrics.cpuUsage = data.cpuUsage;
    if (data.memoryUsage) metrics.memoryUsage = data.memoryUsage;
    
    return metrics;
  }
}

// Machine Learning Anomaly Detector
class MLAnomalyDetector implements AnomalyDetector {
  name = 'ml';
  private model: tf.LayersModel | null = null;
  private scaler: { mean: number[]; std: number[] } | null = null;

  async detect(data: any): Promise<AnomalyResult> {
    if (!this.model) {
      return {
        isAnomaly: false,
        confidence: 0,
        type: 'ml',
        description: 'Model not trained',
        severity: 'low',
      };
    }

    const features = this.extractFeatures(data);
    const normalizedFeatures = this.normalize(features);
    
    // Predict using autoencoder
    const input = tf.tensor2d([normalizedFeatures]);
    const prediction = this.model.predict(input) as tf.Tensor;
    const reconstructed = await prediction.array() as number[][];
    
    // Calculate reconstruction error
    const error = this.calculateReconstructionError(normalizedFeatures, reconstructed[0]);
    
    input.dispose();
    prediction.dispose();

    const threshold = 0.1; // Reconstruction error threshold
    const isAnomaly = error > threshold;
    const confidence = Math.min(error / threshold, 1);

    return {
      isAnomaly,
      confidence,
      type: 'ml',
      description: isAnomaly ? `ML anomaly detected with error: ${error.toFixed(4)}` : 'Normal behavior',
      severity: confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low',
      metadata: { reconstructionError: error, features },
    };
  }

  async train(historicalData: any[]): Promise<void> {
    const featureMatrix = historicalData.map(data => this.extractFeatures(data));
    
    // Calculate normalization parameters
    this.calculateScaler(featureMatrix);
    
    // Normalize features
    const normalizedFeatures = featureMatrix.map(features => this.normalize(features));
    
    // Build autoencoder model
    this.model = this.buildAutoencoder(normalizedFeatures[0].length);
    
    // Prepare training data
    const xs = tf.tensor2d(normalizedFeatures);
    const ys = xs; // Autoencoder trains to reconstruct input
    
    // Train model
    await this.model.fit(xs, ys, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            logger.info(`ML training epoch ${epoch}: loss=${logs?.loss.toFixed(4)}`);
          }
        },
      },
    });
    
    xs.dispose();
  }

  private buildAutoencoder(inputDim: number): tf.LayersModel {
    const encoder = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [inputDim], units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
      ],
    });

    const decoder = tf.sequential({
      layers: [
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: inputDim, activation: 'sigmoid' }),
      ],
    });

    const input = tf.input({ shape: [inputDim] });
    const encoded = encoder.apply(input);
    const decoded = decoder.apply(encoded);

    const autoencoder = tf.model({ inputs: input, outputs: decoded as tf.SymbolicTensor });
    
    autoencoder.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
    });

    return autoencoder;
  }

  private extractFeatures(data: any): number[] {
    // Extract features for ML model
    return [
      data.requestRate || 0,
      data.errorRate || 0,
      data.responseTime || 0,
      data.uniqueIPs || 0,
      data.bytesTransferred || 0,
      data.cpu || 0,
      data.memory || 0,
      data.diskIO || 0,
    ];
  }

  private calculateScaler(features: number[][]): void {
    const numFeatures = features[0].length;
    const mean = new Array(numFeatures).fill(0);
    const std = new Array(numFeatures).fill(0);

    // Calculate mean
    for (const feature of features) {
      for (let i = 0; i < numFeatures; i++) {
        mean[i] += feature[i] / features.length;
      }
    }

    // Calculate standard deviation
    for (const feature of features) {
      for (let i = 0; i < numFeatures; i++) {
        std[i] += Math.pow(feature[i] - mean[i], 2) / features.length;
      }
    }

    for (let i = 0; i < numFeatures; i++) {
      std[i] = Math.sqrt(std[i]) || 1; // Avoid division by zero
    }

    this.scaler = { mean, std };
  }

  private normalize(features: number[]): number[] {
    if (!this.scaler) return features;
    
    return features.map((value, i) => (value - this.scaler!.mean[i]) / this.scaler!.std[i]);
  }

  private calculateReconstructionError(original: number[], reconstructed: number[]): number {
    let error = 0;
    for (let i = 0; i < original.length; i++) {
      error += Math.pow(original[i] - reconstructed[i], 2);
    }
    return Math.sqrt(error / original.length);
  }
}

// Pattern-based Anomaly Detector
class PatternAnomalyDetector implements AnomalyDetector {
  name = 'pattern';
  private patterns: Map<string, RegExp[]> = new Map();
  private sequences: Map<string, string[]> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns() {
    // SQL injection patterns
    this.patterns.set('sql_injection', [
      /(\b(union|select|insert|update|delete|drop|create)\b.*\b(from|where|table)\b)/i,
      /(\b(or|and)\b\s*\d+\s*=\s*\d+)/i,
      /(--|\#|\/\*|\*\/)/,
    ]);

    // XSS patterns
    this.patterns.set('xss', [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ]);

    // Path traversal patterns
    this.patterns.set('path_traversal', [
      /\.\.(\/|\\)/g,
      /etc\/(passwd|shadow)/gi,
    ]);

    // Command injection patterns
    this.patterns.set('command_injection', [
      /[;&|`]\s*(ls|cat|rm|wget|curl|nc|bash|sh)/gi,
      /\$\(.+\)/g,
    ]);
  }

  async detect(data: any): Promise<AnomalyResult> {
    const detectedPatterns: string[] = [];
    let confidence = 0;

    // Check URL/path patterns
    if (data.path) {
      for (const [patternType, patterns] of this.patterns.entries()) {
        for (const pattern of patterns) {
          if (pattern.test(data.path)) {
            detectedPatterns.push(patternType);
            confidence += 0.3;
            break;
          }
        }
      }
    }

    // Check request body patterns
    if (data.body) {
      const bodyStr = typeof data.body === 'string' ? data.body : JSON.stringify(data.body);
      for (const [patternType, patterns] of this.patterns.entries()) {
        for (const pattern of patterns) {
          if (pattern.test(bodyStr)) {
            detectedPatterns.push(patternType);
            confidence += 0.3;
            break;
          }
        }
      }
    }

    // Check sequence anomalies
    if (data.sequence) {
      const anomalousSequence = this.checkSequenceAnomaly(data.userId, data.sequence);
      if (anomalousSequence) {
        detectedPatterns.push('sequence_anomaly');
        confidence += 0.4;
      }
    }

    const isAnomaly = detectedPatterns.length > 0;
    confidence = Math.min(confidence, 1);

    return {
      isAnomaly,
      confidence,
      type: 'pattern',
      description: isAnomaly 
        ? `Suspicious patterns detected: ${detectedPatterns.join(', ')}`
        : 'No suspicious patterns',
      severity: confidence > 0.7 ? 'high' : confidence > 0.4 ? 'medium' : 'low',
      metadata: { detectedPatterns },
    };
  }

  private checkSequenceAnomaly(userId: string, currentAction: string): boolean {
    const userSequence = this.sequences.get(userId) || [];
    
    // Check for impossible sequences
    const impossibleSequences = [
      ['logout', 'authenticated_action'],
      ['payment_success', 'payment_init'],
      ['verify_2fa', 'login'],
    ];

    if (userSequence.length > 0) {
      const lastAction = userSequence[userSequence.length - 1];
      for (const [prev, next] of impossibleSequences) {
        if (lastAction === prev && currentAction === next) {
          return true;
        }
      }
    }

    // Update sequence
    userSequence.push(currentAction);
    if (userSequence.length > 10) {
      userSequence.shift();
    }
    this.sequences.set(userId, userSequence);

    return false;
  }
}

// Time Series Anomaly Detector
class TimeSeriesAnomalyDetector implements AnomalyDetector {
  name = 'timeseries';
  private windowSize = 60; // 60 data points
  private threshold = 2.5; // Standard deviations

  async detect(data: any): Promise<AnomalyResult> {
    if (!data.timeseries || data.timeseries.length < this.windowSize) {
      return {
        isAnomaly: false,
        confidence: 0,
        type: 'timeseries',
        description: 'Insufficient data',
        severity: 'low',
      };
    }

    const values = data.timeseries.slice(-this.windowSize);
    const current = values[values.length - 1];
    
    // Calculate moving average and standard deviation
    const { mean, stdDev } = this.calculateStats(values.slice(0, -1));
    
    // Check for anomaly using modified z-score
    const zScore = Math.abs((current - mean) / stdDev);
    const isAnomaly = zScore > this.threshold;
    
    // Detect trend changes
    const trendAnomaly = this.detectTrendChange(values);
    
    // Detect seasonality violations
    const seasonalityAnomaly = this.detectSeasonalityViolation(values);

    const confidence = Math.min(
      (zScore / this.threshold) * 0.4 + 
      (trendAnomaly ? 0.3 : 0) +
      (seasonalityAnomaly ? 0.3 : 0),
      1
    );

    return {
      isAnomaly: isAnomaly || trendAnomaly || seasonalityAnomaly,
      confidence,
      type: 'timeseries',
      description: this.generateDescription(zScore, trendAnomaly, seasonalityAnomaly),
      severity: confidence > 0.7 ? 'high' : confidence > 0.4 ? 'medium' : 'low',
      metadata: { zScore, mean, stdDev, current },
    };
  }

  private calculateStats(values: number[]): { mean: number; stdDev: number } {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return { mean, stdDev: Math.sqrt(variance) };
  }

  private detectTrendChange(values: number[]): boolean {
    // Simple trend detection using linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Check if recent trend differs significantly from overall trend
    const recentSlope = this.calculateRecentSlope(values);
    return Math.abs(recentSlope - slope) > Math.abs(slope) * 2;
  }

  private calculateRecentSlope(values: number[]): number {
    const recent = values.slice(-10);
    const n = recent.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = recent.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * recent[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private detectSeasonalityViolation(values: number[]): boolean {
    // Simple seasonality detection (e.g., daily patterns)
    const period = 24; // Assuming hourly data with daily seasonality
    
    if (values.length < period * 2) return false;
    
    const current = values[values.length - 1];
    const historicalSame = values.slice(-period - 1, -period + 1);
    
    if (historicalSame.length === 0) return false;
    
    const expectedValue = historicalSame.reduce((a, b) => a + b, 0) / historicalSame.length;
    const deviation = Math.abs(current - expectedValue) / expectedValue;
    
    return deviation > 0.5; // 50% deviation from expected seasonal value
  }

  private generateDescription(zScore: number, trend: boolean, seasonality: boolean): string {
    const parts: string[] = [];
    
    if (zScore > this.threshold) {
      parts.push(`Value deviates ${zScore.toFixed(2)} standard deviations`);
    }
    if (trend) {
      parts.push('Trend change detected');
    }
    if (seasonality) {
      parts.push('Seasonality violation detected');
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Normal time series behavior';
  }
}

// Behavioral Anomaly Detector
class BehavioralAnomalyDetector implements AnomalyDetector {
  name = 'behavioral';
  private userProfiles: Map<string, UserProfile> = new Map();
  private globalProfile: GlobalProfile;

  constructor() {
    this.globalProfile = {
      avgSessionDuration: 300000, // 5 minutes
      avgRequestsPerSession: 50,
      commonPaths: new Set(['/api/health', '/api/tokens', '/api/heritage']),
      commonUserAgents: new Set(),
    };
  }

  async detect(data: any): Promise<AnomalyResult> {
    const userId = data.userId || data.ip;
    if (!userId) {
      return {
        isAnomaly: false,
        confidence: 0,
        type: 'behavioral',
        description: 'No user identifier',
        severity: 'low',
      };
    }

    const profile = this.getOrCreateProfile(userId);
    const anomalies: string[] = [];
    let confidence = 0;

    // Check login location anomaly
    if (data.location) {
      const locationAnomaly = this.checkLocationAnomaly(profile, data.location);
      if (locationAnomaly) {
        anomalies.push('Unusual login location');
        confidence += 0.3;
      }
    }

    // Check access time anomaly
    if (data.timestamp) {
      const timeAnomaly = this.checkTimeAnomaly(profile, data.timestamp);
      if (timeAnomaly) {
        anomalies.push('Unusual access time');
        confidence += 0.2;
      }
    }

    // Check activity rate anomaly
    if (data.requestCount) {
      const rateAnomaly = this.checkRateAnomaly(profile, data.requestCount);
      if (rateAnomaly) {
        anomalies.push('Abnormal activity rate');
        confidence += 0.3;
      }
    }

    // Check resource access anomaly
    if (data.resource) {
      const resourceAnomaly = this.checkResourceAnomaly(profile, data.resource);
      if (resourceAnomaly) {
        anomalies.push('Unusual resource access');
        confidence += 0.2;
      }
    }

    // Update profile
    this.updateProfile(profile, data);

    const isAnomaly = anomalies.length > 0;
    confidence = Math.min(confidence, 1);

    return {
      isAnomaly,
      confidence,
      type: 'behavioral',
      description: isAnomaly 
        ? `Behavioral anomalies: ${anomalies.join(', ')}`
        : 'Normal user behavior',
      severity: confidence > 0.6 ? 'high' : confidence > 0.3 ? 'medium' : 'low',
      metadata: { anomalies, userId },
    };
  }

  private getOrCreateProfile(userId: string): UserProfile {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        locations: new Set(),
        accessTimes: [],
        requestCounts: [],
        resources: new Set(),
        averageRequestRate: 0,
        typicalAccessHours: new Set(),
      };
      this.userProfiles.set(userId, profile);
    }
    
    return profile;
  }

  private checkLocationAnomaly(profile: UserProfile, location: string): boolean {
    if (profile.locations.size === 0) {
      return false; // First location
    }
    
    // Check if location is new and significantly different
    if (!profile.locations.has(location)) {
      // Could implement geo-distance checking here
      return profile.locations.size > 2; // Anomaly if user has established patterns
    }
    
    return false;
  }

  private checkTimeAnomaly(profile: UserProfile, timestamp: number): boolean {
    const hour = new Date(timestamp).getHours();
    
    if (profile.typicalAccessHours.size === 0) {
      return false; // No established pattern
    }
    
    // Check if access is outside typical hours
    return !profile.typicalAccessHours.has(hour) && profile.typicalAccessHours.size > 10;
  }

  private checkRateAnomaly(profile: UserProfile, requestCount: number): boolean {
    if (profile.averageRequestRate === 0) {
      return false; // No baseline
    }
    
    // Check if request rate is significantly higher than average
    return requestCount > profile.averageRequestRate * 3;
  }

  private checkResourceAnomaly(profile: UserProfile, resource: string): boolean {
    // Check if accessing unusual resource
    if (profile.resources.size === 0) {
      return false; // No established pattern
    }
    
    // Check for sensitive resources
    const sensitivePatterns = ['/admin', '/api/internal', '/debug'];
    const isSensitive = sensitivePatterns.some(pattern => resource.includes(pattern));
    
    return isSensitive && !profile.resources.has(resource);
  }

  private updateProfile(profile: UserProfile, data: any): void {
    profile.lastSeen = Date.now();
    
    if (data.location) {
      profile.locations.add(data.location);
    }
    
    if (data.timestamp) {
      const hour = new Date(data.timestamp).getHours();
      profile.typicalAccessHours.add(hour);
      profile.accessTimes.push(data.timestamp);
      
      // Keep only recent access times
      if (profile.accessTimes.length > 100) {
        profile.accessTimes.shift();
      }
    }
    
    if (data.requestCount) {
      profile.requestCounts.push(data.requestCount);
      
      // Update average
      profile.averageRequestRate = 
        profile.requestCounts.reduce((a, b) => a + b, 0) / profile.requestCounts.length;
      
      // Keep only recent counts
      if (profile.requestCounts.length > 100) {
        profile.requestCounts.shift();
      }
    }
    
    if (data.resource) {
      profile.resources.add(data.resource);
    }
  }
}

// Types
interface UserProfile {
  userId: string;
  firstSeen: number;
  lastSeen: number;
  locations: Set<string>;
  accessTimes: number[];
  requestCounts: number[];
  resources: Set<string>;
  averageRequestRate: number;
  typicalAccessHours: Set<number>;
}

interface GlobalProfile {
  avgSessionDuration: number;
  avgRequestsPerSession: number;
  commonPaths: Set<string>;
  commonUserAgents: Set<string>;
}

// Export singleton instance
export const anomalyDetection = new AnomalyDetectionService();