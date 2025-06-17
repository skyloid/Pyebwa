import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native';

export const HomeScreen: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Mock user data for demo
      const userData = { 
        name: 'Demo User', 
        email: 'demo@pyebwa.com',
        userType: 'planter' 
      };
      setUser(userData);

      // Mock stats data
      if (userData?.userType === 'planter') {
        setStats({ 
          totalEarnings: 1000, 
          treesPlanted: 50, 
          pendingEarnings: 200 
        });
      } else {
        setStats({ 
          treesPlanted: 25, 
          co2Offset: 500, 
          tokensSpent: 100 
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00217D" />
        </View>
      </SafeAreaView>
    );
  }

  const isPlanterView = user?.userType === 'planter';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Welcome back, {user?.name || user?.email || 'User'}!
          </Text>
          <Text style={styles.userType}>
            {isPlanterView ? '🌳 Tree Planter' : '👨‍👩‍👧‍👦 Family Member'}
          </Text>
        </View>

        {isPlanterView ? (
          // Planter Dashboard
          <>
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Your Earnings</Text>
              <Text style={styles.statsValue}>
                {stats?.totalEarnings || 0} PYEBWA
              </Text>
              <Text style={styles.statsSubtext}>
                ≈ ${((stats?.totalEarnings || 0) * 0.0001).toFixed(2)} USD
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats?.treesPlanted || 0}</Text>
                <Text style={styles.statLabel}>Trees Planted</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats?.pendingEarnings || 0}</Text>
                <Text style={styles.statLabel}>Pending Tokens</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>🌱 Submit New Planting</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Family Dashboard
          <>
            <View style={styles.impactCard}>
              <Text style={styles.impactTitle}>Your Impact</Text>
              <View style={styles.impactStats}>
                <View style={styles.impactItem}>
                  <Text style={styles.impactValue}>{stats?.treesPlanted || 0}</Text>
                  <Text style={styles.impactLabel}>Trees Funded</Text>
                </View>
                <View style={styles.impactItem}>
                  <Text style={styles.impactValue}>{stats?.co2Offset || 0}</Text>
                  <Text style={styles.impactLabel}>kg CO₂ Offset</Text>
                </View>
              </View>
            </View>

            <View style={styles.tokenCard}>
              <Text style={styles.tokenTitle}>Token Balance</Text>
              <Text style={styles.tokenValue}>{stats?.tokensSpent || 0} PYEBWA</Text>
              <TouchableOpacity style={styles.buyButton}>
                <Text style={styles.buyButtonText}>Buy More Tokens</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>📸 Upload Heritage</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it Works</Text>
          <Text style={styles.infoText}>
            {isPlanterView
              ? 'Take photos of trees you plant, submit them with GPS location, and earn PYEBWA tokens for each verified tree!'
              : 'Purchase PYEBWA tokens to preserve your family memories on the blockchain. Each token spent directly funds tree planting in Haiti!'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#00217D',
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  userType: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  statsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statsSubtext: {
    fontSize: 16,
    color: '#999',
    marginTop: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 15,
    gap: 15,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00217D',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  impactCard: {
    backgroundColor: '#e8f5e9',
    margin: 15,
    padding: 20,
    borderRadius: 15,
  },
  impactTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 15,
    textAlign: 'center',
  },
  impactStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  impactItem: {
    alignItems: 'center',
  },
  impactValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  impactLabel: {
    fontSize: 14,
    color: '#558b2f',
    marginTop: 5,
  },
  tokenCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tokenTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  tokenValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00217D',
    marginBottom: 15,
  },
  buyButton: {
    backgroundColor: '#D41125',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: '#00217D',
    marginHorizontal: 15,
    marginTop: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 15,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00217D',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
});