import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SimpleCameraScreen } from './src/screens/SimpleCameraScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import authService from './src/services/authService';

export default function App() {
  const [screen, setScreen] = React.useState('login');
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userType, setUserType] = React.useState<'family' | 'planter'>('family');

  // Check authentication status on app start
  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      await authService.initializeAuth();
      const isAuthenticated = authService.isLoggedIn();
      setIsLoggedIn(isAuthenticated);
      
      if (isAuthenticated) {
        const type = await authService.getUserType();
        setUserType(type || 'family');
        setScreen('home');
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async () => {
    const type = await authService.getUserType();
    setUserType(type || 'family');
    setIsLoggedIn(true);
    setScreen('home');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsLoggedIn(false);
      setScreen('login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Loading screen
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#00217D" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  if (screen === 'login') {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#00217D', padding: 20, paddingTop: 50 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>PYEBWA Token</Text>
        <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5 }}>
          {userType === 'planter' ? '🌳 Tree Planter Dashboard' : '👨‍👩‍👧‍👦 Family Dashboard'}
        </Text>
      </View>
      
      <View style={{ flex: 1, padding: 20 }}>
        {userType === 'planter' ? (
          <>
            {/* Planter Dashboard */}
            <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, color: '#666', marginBottom: 10 }}>Your Earnings</Text>
              <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#4CAF50' }}>1,000 PYEBWA</Text>
              <Text style={{ fontSize: 16, color: '#999', marginTop: 5 }}>≈ $0.10 USD</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
              <View style={{ flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 15, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#00217D' }}>50</Text>
                <Text style={{ fontSize: 14, color: '#666', marginTop: 5 }}>Trees Planted</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 15, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#00217D' }}>200</Text>
                <Text style={{ fontSize: 14, color: '#666', marginTop: 5 }}>Pending</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={{ backgroundColor: '#00217D', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 20 }}
              onPress={() => setScreen('camera')}
            >
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>📸 Submit New Planting</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Family Dashboard */}
            <View style={{ backgroundColor: '#e8f5e9', padding: 20, borderRadius: 15, marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2e7d32', marginBottom: 15, textAlign: 'center' }}>
                Your Impact
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#2e7d32' }}>25</Text>
                  <Text style={{ fontSize: 14, color: '#558b2f', marginTop: 5 }}>Trees Funded</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#2e7d32' }}>500</Text>
                  <Text style={{ fontSize: 14, color: '#558b2f', marginTop: 5 }}>kg CO₂ Offset</Text>
                </View>
              </View>
            </View>

            <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: '#666', marginBottom: 10 }}>Token Balance</Text>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#00217D', marginBottom: 15 }}>100 PYEBWA</Text>
              <TouchableOpacity style={{ backgroundColor: '#D41125', paddingHorizontal: 30, paddingVertical: 10, borderRadius: 20 }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Buy More Tokens</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={{ backgroundColor: '#00217D', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 20 }}
              onPress={() => setScreen('heritage')}
            >
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>📸 Upload Heritage</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity 
          style={{ backgroundColor: '#D41125', padding: 15, borderRadius: 10, alignItems: 'center' }}
          onPress={handleLogout}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Camera Screen
  if (screen === 'camera') {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: '#00217D', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => setScreen('home')}
            style={{ marginRight: 15 }}
          >
            <Text style={{ color: 'white', fontSize: 18 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>Plant Trees</Text>
        </View>
        <SimpleCameraScreen />
      </View>
    );
  }
}