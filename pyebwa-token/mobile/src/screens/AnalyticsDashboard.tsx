import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AnalyticsService, AnalyticsMetrics } from '../services/AnalyticsService';
import { FieldMappingService } from '../services/FieldMappingService';

const { width: screenWidth } = Dimensions.get('window');

export const AnalyticsDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  const analyticsService = AnalyticsService.getInstance();
  const fieldService = FieldMappingService.getInstance();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const fields = await fieldService.getAllFields();
      const analyticsData = await analyticsService.generateAnalytics(fields);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatArea = (area: number): string => {
    if (area < 10000) {
      return `${Math.round(area)} m²`;
    }
    return `${(area / 10000).toFixed(2)} ha`;
  };

  const formatCurrency = (amount: number): string => {
    return `$${(amount * 0.0001).toFixed(2)}`; // Assuming 1 token = $0.0001
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    icon: string,
    color: string,
    subtitle?: string,
    trend?: number
  ) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      {trend !== undefined && (
        <View style={styles.trendContainer}>
          <MaterialIcons
            name={trend >= 0 ? 'trending-up' : 'trending-down'}
            size={16}
            color={trend >= 0 ? '#4CAF50' : '#F44336'}
          />
          <Text style={[
            styles.trendText,
            { color: trend >= 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </Text>
        </View>
      )}
    </View>
  );

  const renderSimpleChart = (data: Array<{ date: string; count: number }>) => {
    const maxValue = Math.max(...data.map(d => d.count), 1);
    const chartWidth = screenWidth - 80;
    const chartHeight = 120;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{t('analytics.dailyPlantings')}</Text>
        <View style={[styles.chart, { width: chartWidth, height: chartHeight }]}>
          {data.slice(-14).map((item, index) => {
            const barHeight = (item.count / maxValue) * (chartHeight - 20);
            const barWidth = (chartWidth - 40) / 14;
            
            return (
              <View key={index} style={styles.chartBar}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight || 2,
                      width: barWidth - 2,
                      backgroundColor: item.count > 0 ? '#4CAF50' : '#e0e0e0',
                    },
                  ]}
                />
                <Text style={styles.barLabel}>
                  {new Date(item.date).getDate()}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderSpeciesBreakdown = () => {
    if (!analytics?.speciesBreakdown.length) return null;

    const treeIcons: Record<string, string> = {
      mango: '🥭',
      moringa: '🌿',
      cedar: '🌲',
      bamboo: '🎋',
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('analytics.speciesDistribution')}</Text>
        {analytics.speciesBreakdown.map((item, index) => (
          <View key={index} style={styles.speciesItem}>
            <View style={styles.speciesInfo}>
              <Text style={styles.speciesIcon}>{treeIcons[item.species] || '🌳'}</Text>
              <Text style={styles.speciesName}>{t(`trees.${item.species}`)}</Text>
            </View>
            <View style={styles.speciesStats}>
              <Text style={styles.speciesCount}>{item.count}</Text>
              <Text style={styles.speciesPercentage}>{item.percentage.toFixed(1)}%</Text>
            </View>
            <View style={styles.speciesBar}>
              <View
                style={[
                  styles.speciesBarFill,
                  { width: `${item.percentage}%` },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderTopFields = () => {
    if (!analytics?.topFields.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('analytics.topFields')}</Text>
        {analytics.topFields.map((field, index) => (
          <View key={index} style={styles.fieldItem}>
            <View style={styles.fieldRank}>
              <Text style={styles.rankNumber}>#{index + 1}</Text>
            </View>
            <View style={styles.fieldInfo}>
              <Text style={styles.fieldName}>{field.name}</Text>
              <Text style={styles.fieldStats}>
                {field.treesPlanted} trees • {formatArea(field.area)}
              </Text>
            </View>
            <View style={styles.utilizationBadge}>
              <Text style={styles.utilizationText}>
                {field.utilizationRate.toFixed(0)}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderTopPlanters = () => {
    if (!analytics?.topPlanters.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('analytics.topPlanters')}</Text>
        {analytics.topPlanters.slice(0, 5).map((planter, index) => (
          <View key={index} style={styles.planterItem}>
            <View style={styles.planterRank}>
              <Text style={styles.rankNumber}>#{index + 1}</Text>
            </View>
            <View style={styles.planterInfo}>
              <Text style={styles.planterName}>{planter.name}</Text>
              <Text style={styles.planterStats}>
                {planter.treesPlanted} trees • {planter.fieldsWorked} fields
              </Text>
            </View>
            <View style={styles.tokensEarned}>
              <Text style={styles.tokensText}>{planter.tokensEarned}</Text>
              <Text style={styles.tokensLabel}>tokens</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00217D" />
        <Text style={styles.loadingText}>{t('analytics.generatingInsights')}</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="analytics-outline" size={64} color="#ccc" />
        <Text style={styles.errorText}>{t('analytics.noData')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAnalytics}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('analytics.dashboard')}</Text>
        <TouchableOpacity onPress={loadAnalytics}>
          <Ionicons name="refresh" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        {renderMetricCard(
          t('analytics.totalTrees'),
          formatNumber(analytics.totalPlanted),
          'leaf',
          '#4CAF50',
          t('analytics.treesPlanted'),
          analytics.growthRate
        )}
        
        {renderMetricCard(
          t('analytics.co2Offset'),
          `${formatNumber(analytics.co2Offset)} kg`,
          'cloud',
          '#2196F3',
          t('analytics.perYear')
        )}
        
        {renderMetricCard(
          t('analytics.totalFields'),
          analytics.totalFields.toString(),
          'location',
          '#FF9800',
          formatArea(analytics.totalArea)
        )}
        
        {renderMetricCard(
          t('analytics.utilization'),
          `${analytics.utilizationRate.toFixed(1)}%`,
          'pie-chart',
          '#9C27B0',
          `${analytics.totalPlanted} / ${analytics.totalCapacity}`
        )}
      </View>

      {/* Environmental Impact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('analytics.environmentalImpact')}</Text>
        <View style={styles.impactGrid}>
          <View style={styles.impactCard}>
            <Ionicons name="leaf" size={32} color="#4CAF50" />
            <Text style={styles.impactValue}>{formatNumber(analytics.oxygenProduced)} kg</Text>
            <Text style={styles.impactLabel}>{t('analytics.oxygenProduced')}</Text>
          </View>
          <View style={styles.impactCard}>
            <MaterialIcons name="nature" size={32} color="#8BC34A" />
            <Text style={styles.impactValue}>{formatNumber(analytics.carbonStored)} kg</Text>
            <Text style={styles.impactLabel}>{t('analytics.carbonStored')}</Text>
          </View>
        </View>
      </View>

      {/* Financial Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('analytics.tokenEconomy')}</Text>
        <View style={styles.financialGrid}>
          <View style={styles.financialCard}>
            <Text style={styles.financialValue}>{formatNumber(analytics.totalTokensEarned)}</Text>
            <Text style={styles.financialLabel}>{t('analytics.tokensEarned')}</Text>
            <Text style={styles.financialSubtext}>
              {formatCurrency(analytics.totalTokensEarned)} {t('analytics.estimatedValue')}
            </Text>
          </View>
          <View style={styles.financialCard}>
            <Text style={styles.financialValue}>{analytics.averageTokensPerTree.toFixed(0)}</Text>
            <Text style={styles.financialLabel}>{t('analytics.avgTokensPerTree')}</Text>
          </View>
        </View>
      </View>

      {/* Planting Trends */}
      {renderSimpleChart(analytics.dailyPlantings)}

      {/* Species Distribution */}
      {renderSpeciesBreakdown()}

      {/* Top Performing Fields */}
      {renderTopFields()}

      {/* Top Planters */}
      {renderTopPlanters()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#00217D',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  metricsGrid: {
    padding: 20,
    gap: 15,
  },
  metricCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  trendText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  section: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  impactGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  impactCard: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  impactValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  impactLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  financialGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  financialCard: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f0f5ff',
    borderRadius: 10,
  },
  financialValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00217D',
  },
  financialLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  financialSubtext: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  chartContainer: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  chartBar: {
    alignItems: 'center',
  },
  bar: {
    backgroundColor: '#4CAF50',
    borderRadius: 2,
    marginBottom: 5,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
  },
  speciesItem: {
    marginBottom: 15,
  },
  speciesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  speciesIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  speciesName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  speciesStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  speciesCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  speciesPercentage: {
    fontSize: 14,
    color: '#666',
  },
  speciesBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
  },
  speciesBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fieldRank: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00217D',
  },
  fieldInfo: {
    flex: 1,
    marginLeft: 15,
  },
  fieldName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  fieldStats: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  utilizationBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  utilizationText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  planterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  planterRank: {
    width: 40,
    alignItems: 'center',
  },
  planterInfo: {
    flex: 1,
    marginLeft: 15,
  },
  planterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  planterStats: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  tokensEarned: {
    alignItems: 'center',
  },
  tokensText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00217D',
  },
  tokensLabel: {
    fontSize: 10,
    color: '#666',
  },
});