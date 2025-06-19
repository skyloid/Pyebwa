import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlantingField } from '../types';

export interface PlantingRecord {
  id: string;
  fieldId: string;
  fieldName: string;
  planterId: string;
  planterName: string;
  species: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
  photoUri?: string;
  tokensEarned: number;
  status: 'pending' | 'verified' | 'rejected';
}

export interface AnalyticsMetrics {
  // Overall Stats
  totalFields: number;
  totalArea: number; // square meters
  totalCapacity: number;
  totalPlanted: number;
  utilizationRate: number; // percentage

  // Environmental Impact
  co2Offset: number; // kg CO2 per year
  oxygenProduced: number; // kg O2 per year
  carbonStored: number; // kg carbon stored

  // Financial Metrics
  totalTokensEarned: number;
  totalTokensIssued: number;
  averageTokensPerTree: number;

  // Species Distribution
  speciesBreakdown: Array<{
    species: string;
    count: number;
    percentage: number;
  }>;

  // Field Performance
  topFields: Array<{
    fieldId: string;
    name: string;
    utilizationRate: number;
    treesPlanted: number;
    area: number;
  }>;

  // Time-based Metrics
  plantingsThisMonth: number;
  plantingsLastMonth: number;
  growthRate: number; // percentage change
  dailyPlantings: Array<{
    date: string;
    count: number;
  }>;

  // Planter Leaderboard
  topPlanters: Array<{
    planterId: string;
    name: string;
    treesPlanted: number;
    tokensEarned: number;
    fieldsWorked: number;
  }>;
}

const STORAGE_KEYS = {
  PLANTING_RECORDS: 'planting_records',
  ANALYTICS_CACHE: 'analytics_cache',
};

export class AnalyticsService {
  private static instance: AnalyticsService;
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // Calculate environmental impact per tree
  private calculateTreeImpact(species: string) {
    // Environmental impact data per tree per year (estimated)
    const impactData: Record<string, { co2: number; oxygen: number; carbon: number }> = {
      mango: { co2: 22, oxygen: 16, carbon: 6 },
      moringa: { co2: 18, oxygen: 13, carbon: 5 },
      cedar: { co2: 35, oxygen: 26, carbon: 10 },
      bamboo: { co2: 40, oxygen: 30, carbon: 12 },
    };

    return impactData[species] || impactData.mango;
  }

  // Add a new planting record
  async addPlantingRecord(record: Omit<PlantingRecord, 'id' | 'timestamp'>): Promise<PlantingRecord> {
    const plantingRecord: PlantingRecord = {
      ...record,
      id: `planting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    const records = await this.getAllPlantingRecords();
    records.push(plantingRecord);
    
    await AsyncStorage.setItem(STORAGE_KEYS.PLANTING_RECORDS, JSON.stringify(records));
    
    // Clear analytics cache to force recalculation
    await AsyncStorage.removeItem(STORAGE_KEYS.ANALYTICS_CACHE);
    
    return plantingRecord;
  }

  // Get all planting records
  async getAllPlantingRecords(): Promise<PlantingRecord[]> {
    try {
      const recordsJson = await AsyncStorage.getItem(STORAGE_KEYS.PLANTING_RECORDS);
      if (!recordsJson) {
        // Create demo data if no records exist
        const demoRecords = await this.createDemoPlantingRecords();
        await AsyncStorage.setItem(STORAGE_KEYS.PLANTING_RECORDS, JSON.stringify(demoRecords));
        return demoRecords;
      }
      
      const records = JSON.parse(recordsJson);
      // Convert timestamp strings back to Date objects
      return records.map((record: any) => ({
        ...record,
        timestamp: new Date(record.timestamp),
      }));
    } catch (error) {
      console.error('Error loading planting records:', error);
      return [];
    }
  }

  // Generate comprehensive analytics
  async generateAnalytics(fields: PlantingField[]): Promise<AnalyticsMetrics> {
    try {
      // Check cache first
      const cached = await this.getCachedAnalytics();
      if (cached) return cached;

      const records = await this.getAllPlantingRecords();
      const verifiedRecords = records.filter(r => r.status === 'verified');

      // Calculate basic metrics
      const totalFields = fields.length;
      const totalArea = fields.reduce((sum, f) => sum + f.area, 0);
      const totalCapacity = fields.reduce((sum, f) => sum + f.capacity, 0);
      const totalPlanted = fields.reduce((sum, f) => sum + f.plantedCount, 0);
      const utilizationRate = totalCapacity > 0 ? (totalPlanted / totalCapacity) * 100 : 0;

      // Calculate environmental impact
      let co2Offset = 0;
      let oxygenProduced = 0;
      let carbonStored = 0;

      verifiedRecords.forEach(record => {
        const impact = this.calculateTreeImpact(record.species);
        co2Offset += impact.co2;
        oxygenProduced += impact.oxygen;
        carbonStored += impact.carbon;
      });

      // Calculate financial metrics
      const totalTokensEarned = verifiedRecords.reduce((sum, r) => sum + r.tokensEarned, 0);
      const totalTokensIssued = records.reduce((sum, r) => sum + r.tokensEarned, 0);
      const averageTokensPerTree = verifiedRecords.length > 0 ? totalTokensEarned / verifiedRecords.length : 0;

      // Species breakdown
      const speciesCounts: Record<string, number> = {};
      verifiedRecords.forEach(record => {
        speciesCounts[record.species] = (speciesCounts[record.species] || 0) + 1;
      });

      const speciesBreakdown = Object.entries(speciesCounts).map(([species, count]) => ({
        species,
        count,
        percentage: (count / verifiedRecords.length) * 100,
      })).sort((a, b) => b.count - a.count);

      // Field performance
      const fieldPerformance = fields.map(field => ({
        fieldId: field.id,
        name: field.name,
        utilizationRate: (field.plantedCount / field.capacity) * 100,
        treesPlanted: field.plantedCount,
        area: field.area,
      })).sort((a, b) => b.utilizationRate - a.utilizationRate);

      const topFields = fieldPerformance.slice(0, 5);

      // Time-based metrics
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const plantingsThisMonth = verifiedRecords.filter(r => r.timestamp >= thisMonthStart).length;
      const plantingsLastMonth = verifiedRecords.filter(r => 
        r.timestamp >= lastMonthStart && r.timestamp <= lastMonthEnd
      ).length;

      const growthRate = plantingsLastMonth > 0 
        ? ((plantingsThisMonth - plantingsLastMonth) / plantingsLastMonth) * 100 
        : 0;

      // Daily plantings for the last 30 days
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const dailyPlantings = last30Days.map(date => {
        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        const count = verifiedRecords.filter(r => 
          r.timestamp >= dayStart && r.timestamp <= dayEnd
        ).length;

        return { date, count };
      });

      // Planter leaderboard
      const planterStats: Record<string, {
        name: string;
        treesPlanted: number;
        tokensEarned: number;
        fieldsWorked: Set<string>;
      }> = {};

      verifiedRecords.forEach(record => {
        if (!planterStats[record.planterId]) {
          planterStats[record.planterId] = {
            name: record.planterName,
            treesPlanted: 0,
            tokensEarned: 0,
            fieldsWorked: new Set(),
          };
        }
        
        planterStats[record.planterId].treesPlanted++;
        planterStats[record.planterId].tokensEarned += record.tokensEarned;
        planterStats[record.planterId].fieldsWorked.add(record.fieldId);
      });

      const topPlanters = Object.entries(planterStats)
        .map(([planterId, stats]) => ({
          planterId,
          name: stats.name,
          treesPlanted: stats.treesPlanted,
          tokensEarned: stats.tokensEarned,
          fieldsWorked: stats.fieldsWorked.size,
        }))
        .sort((a, b) => b.treesPlanted - a.treesPlanted)
        .slice(0, 10);

      const analytics: AnalyticsMetrics = {
        totalFields,
        totalArea,
        totalCapacity,
        totalPlanted,
        utilizationRate,
        co2Offset,
        oxygenProduced,
        carbonStored,
        totalTokensEarned,
        totalTokensIssued,
        averageTokensPerTree,
        speciesBreakdown,
        topFields,
        plantingsThisMonth,
        plantingsLastMonth,
        growthRate,
        dailyPlantings,
        topPlanters,
      };

      // Cache the results
      await this.cacheAnalytics(analytics);
      
      return analytics;
    } catch (error) {
      console.error('Error generating analytics:', error);
      throw error;
    }
  }

  // Cache analytics results
  private async cacheAnalytics(analytics: AnalyticsMetrics): Promise<void> {
    const cache = {
      data: analytics,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.ANALYTICS_CACHE, JSON.stringify(cache));
  }

  // Get cached analytics if not expired
  private async getCachedAnalytics(): Promise<AnalyticsMetrics | null> {
    try {
      const cacheJson = await AsyncStorage.getItem(STORAGE_KEYS.ANALYTICS_CACHE);
      if (!cacheJson) return null;

      const cache = JSON.parse(cacheJson);
      const isExpired = Date.now() - cache.timestamp > this.cacheExpiry;
      
      return isExpired ? null : cache.data;
    } catch (error) {
      return null;
    }
  }

  // Create demo planting records for testing
  private async createDemoPlantingRecords(): Promise<PlantingRecord[]> {
    const species = ['mango', 'moringa', 'cedar', 'bamboo'];
    const planters = [
      { id: 'planter_1', name: 'Jean Baptiste' },
      { id: 'planter_2', name: 'Marie Claire' },
      { id: 'planter_3', name: 'Pierre Michel' },
      { id: 'planter_4', name: 'Rose Ange' },
    ];
    const fields = [
      { id: 'demo_field_1', name: 'North Hill Plantation' },
      { id: 'demo_field_2', name: 'River Valley Zone' },
      { id: 'demo_field_3', name: 'East Garden' },
    ];

    const records: PlantingRecord[] = [];
    
    // Generate records for the last 60 days
    for (let i = 0; i < 150; i++) {
      const daysAgo = Math.floor(Math.random() * 60);
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - daysAgo);
      
      const planter = planters[Math.floor(Math.random() * planters.length)];
      const field = fields[Math.floor(Math.random() * fields.length)];
      const selectedSpecies = species[Math.floor(Math.random() * species.length)];
      
      records.push({
        id: `demo_planting_${i}`,
        fieldId: field.id,
        fieldName: field.name,
        planterId: planter.id,
        planterName: planter.name,
        species: selectedSpecies,
        location: {
          latitude: 18.9712 + (Math.random() - 0.5) * 0.01,
          longitude: -72.2852 + (Math.random() - 0.5) * 0.01,
        },
        timestamp,
        tokensEarned: 20,
        status: Math.random() > 0.1 ? 'verified' : Math.random() > 0.5 ? 'pending' : 'rejected',
      });
    }

    return records;
  }
}