import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';

export default function App() {
  const [screen, setScreen] = useState('login');
  const [userType, setUserType] = useState<'family' | 'planter'>('family');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    // Simulate login
    setTimeout(() => {
      setLoading(false);
      setScreen('home');
    }, 1000);
  };

  const handleTestAPI = async () => {
    try {
      const response = await fetch('https://b0aa-2a02-4780-10-4eaa-00-1.ngrok-free.app/api/health');
      const data = await response.json();
      Alert.alert('API Test', `Status: ${data.status}\nVersion: ${data.version}`);
    } catch (error) {
      Alert.alert('API Error', 'Could not connect to backend');
    }
  };

  // Login Screen
  if (screen === 'login') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <Image
              source={require('./assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>PYEBWA Token</Text>
            <Text style={styles.subtitle}>Preserve Heritage • Plant Trees</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>I am a:</Text>
            <View style={styles.userTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'family' && styles.userTypeButtonActive,
                ]}
                onPress={() => setUserType('family')}
              >
                <Text
                  style={[
                    styles.userTypeText,
                    userType === 'family' && styles.userTypeTextActive,
                  ]}
                >
                  👨‍👩‍👧‍👦 Family Member
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'planter' && styles.userTypeButtonActive,
                ]}
                onPress={() => setUserType('planter')}
              >
                <Text
                  style={[
                    styles.userTypeText,
                    userType === 'planter' && styles.userTypeTextActive,
                  ]}
                >
                  🌳 Tree Planter
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoButton, { marginTop: 20 }]}
              onPress={handleLogin}
            >
              <Text style={styles.demoButtonText}>Quick Demo Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Home Screen
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PYEBWA Token</Text>
        <Text style={styles.headerSubtitle}>
          {userType === 'planter' ? '🌳 Tree Planter' : '👨‍👩‍👧‍👦 Family Member'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {userType === 'planter' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Earnings</Text>
              <Text style={styles.bigNumber}>1,000 PYEBWA</Text>
              <Text style={styles.cardSubtext}>≈ $0.10 USD</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>50</Text>
                <Text style={styles.statLabel}>Trees Planted</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>200</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>📸 Submit New Planting</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Impact</Text>
              <View style={styles.impactRow}>
                <View style={styles.impactItem}>
                  <Text style={styles.impactNumber}>25</Text>
                  <Text style={styles.impactLabel}>Trees Funded</Text>
                </View>
                <View style={styles.impactItem}>
                  <Text style={styles.impactNumber}>500</Text>
                  <Text style={styles.impactLabel}>kg CO₂</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>💰 Buy More Tokens</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.testButton} onPress={handleTestAPI}>
          <Text style={styles.testButtonText}>Test API Connection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setScreen('login')}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 50,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00217D',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  formContainer: {
    paddingHorizontal: 30,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  userTypeContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 10,
  },
  userTypeButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  userTypeButtonActive: {
    borderColor: '#00217D',
    backgroundColor: '#f0f5ff',
  },
  userTypeText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  userTypeTextActive: {
    color: '#00217D',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: 'white',
  },
  loginButton: {
    backgroundColor: '#00217D',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  demoButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  demoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#00217D',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  bigNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  cardSubtext: {
    fontSize: 16,
    color: '#999',
    marginTop: 5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  statCard: {
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
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00217D',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  impactItem: {
    alignItems: 'center',
  },
  impactNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  impactLabel: {
    fontSize: 14,
    color: '#558b2f',
    marginTop: 5,
  },
  actionButton: {
    backgroundColor: '#00217D',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#D41125',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});