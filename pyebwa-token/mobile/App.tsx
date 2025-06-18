import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, TextInput, Alert, ScrollView } from 'react-native';
// Camera imports are causing issues with expo-camera 16.1.8
// import { CameraScreen } from './src/screens/CameraScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [screen, setScreen] = React.useState('login');
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userType, setUserType] = React.useState<'family' | 'planter'>('family');
  
  // Auth form state
  const [mode, setMode] = React.useState<'login' | 'register'>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [authLoading, setAuthLoading] = React.useState(false);

  // Check authentication status on app start
  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const savedAuth = await AsyncStorage.getItem('isLoggedIn');
      const savedUserType = await AsyncStorage.getItem('userType');
      
      if (savedAuth === 'true') {
        setIsLoggedIn(true);
        setUserType(savedUserType as 'family' | 'planter' || 'family');
        setScreen('home');
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (mode === 'register' && !name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setAuthLoading(true);
    try {
      // Simulate authentication
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save auth state
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('userType', userType);
      await AsyncStorage.setItem('userEmail', email);
      await AsyncStorage.setItem('userName', name || 'Demo User');

      setIsLoggedIn(true);
      setScreen('home');
      
      Alert.alert('Success', `${mode === 'login' ? 'Logged in' : 'Account created'} successfully!`);
    } catch (error) {
      Alert.alert('Error', 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoLogin = async (type: 'family' | 'planter') => {
    setAuthLoading(true);
    try {
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('userType', type);
      await AsyncStorage.setItem('userEmail', `${type}@demo.com`);
      await AsyncStorage.setItem('userName', `Demo ${type.charAt(0).toUpperCase() + type.slice(1)} User`);

      setUserType(type);
      setIsLoggedIn(true);
      setScreen('home');
    } catch (error) {
      Alert.alert('Error', 'Demo login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      await AsyncStorage.removeItem('userType');
      await AsyncStorage.removeItem('userEmail');
      await AsyncStorage.removeItem('userName');

      setIsLoggedIn(false);
      setScreen('login');
      setEmail('');
      setPassword('');
      setName('');
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

  // Login/Register screen
  if (screen === 'login') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20, minHeight: 600 }}>
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Image 
              source={require('./assets/icon.png')} 
              style={{ width: 100, height: 100, marginBottom: 20 }} 
            />
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#00217D', marginBottom: 5 }}>
              PYEBWA Token
            </Text>
            <Text style={{ fontSize: 16, color: '#666' }}>
              Preserve Heritage • Plant Trees
            </Text>
          </View>

          {/* Mode Toggle */}
          <View style={{ 
            flexDirection: 'row', 
            backgroundColor: '#e0e0e0', 
            borderRadius: 25, 
            marginBottom: 30,
            padding: 4
          }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 20,
                backgroundColor: mode === 'login' ? '#00217D' : 'transparent',
                alignItems: 'center'
              }}
              onPress={() => setMode('login')}
            >
              <Text style={{ 
                color: mode === 'login' ? 'white' : '#666',
                fontWeight: mode === 'login' ? 'bold' : 'normal'
              }}>
                Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 20,
                backgroundColor: mode === 'register' ? '#00217D' : 'transparent',
                alignItems: 'center'
              }}
              onPress={() => setMode('register')}
            >
              <Text style={{ 
                color: mode === 'register' ? 'white' : '#666',
                fontWeight: mode === 'register' ? 'bold' : 'normal'
              }}>
                Register
              </Text>
            </TouchableOpacity>
          </View>

          {/* User Type Selection (for registration) */}
          {mode === 'register' && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, color: '#333', marginBottom: 10 }}>
                I am a:
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 15,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: userType === 'family' ? '#00217D' : '#ddd',
                    backgroundColor: userType === 'family' ? '#f0f5ff' : 'white',
                  }}
                  onPress={() => setUserType('family')}
                >
                  <Text style={{
                    textAlign: 'center',
                    fontSize: 14,
                    color: userType === 'family' ? '#00217D' : '#666',
                    fontWeight: userType === 'family' ? 'bold' : 'normal'
                  }}>
                    👨‍👩‍👧‍👦 Family Member
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 15,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: userType === 'planter' ? '#00217D' : '#ddd',
                    backgroundColor: userType === 'planter' ? '#f0f5ff' : 'white',
                  }}
                  onPress={() => setUserType('planter')}
                >
                  <Text style={{
                    textAlign: 'center',
                    fontSize: 14,
                    color: userType === 'planter' ? '#00217D' : '#666',
                    fontWeight: userType === 'planter' ? 'bold' : 'normal'
                  }}>
                    🌳 Tree Planter
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Name Input (for registration) */}
          {mode === 'register' && (
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 10,
                padding: 15,
                marginBottom: 15,
                fontSize: 16,
                backgroundColor: 'white',
              }}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999"
            />
          )}

          {/* Email Input */}
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 10,
              padding: 15,
              marginBottom: 15,
              fontSize: 16,
              backgroundColor: 'white',
            }}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          {/* Password Input */}
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 10,
              padding: 15,
              marginBottom: 20,
              fontSize: 16,
              backgroundColor: 'white',
            }}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#999"
          />

          {/* Auth Button */}
          <TouchableOpacity
            style={{
              backgroundColor: '#00217D',
              paddingVertical: 15,
              borderRadius: 10,
              alignItems: 'center',
              marginBottom: 20,
              opacity: authLoading ? 0.7 : 1
            }}
            onPress={handleAuth}
            disabled={authLoading}
          >
            {authLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                {mode === 'login' ? 'Login' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#ddd' }} />
            <Text style={{ marginHorizontal: 10, color: '#999' }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#ddd' }} />
          </View>

          {/* Demo Login Buttons */}
          <Text style={{ textAlign: 'center', color: '#666', marginBottom: 10 }}>
            Try with demo account:
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#4CAF50',
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: 'center',
              }}
              onPress={() => handleDemoLogin('family')}
              disabled={authLoading}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Demo Family
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#4CAF50',
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: 'center',
              }}
              onPress={() => handleDemoLogin('planter')}
              disabled={authLoading}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Demo Planter
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Dashboard screen
  if (screen === 'home') {
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
                onPress={() => Alert.alert('Coming Soon', 'Heritage upload feature will be available soon!')}
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
  }

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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
          <Text style={{ fontSize: 18, color: '#333', marginBottom: 20 }}>Camera Feature</Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 40 }}>
            Camera functionality requires a development build due to expo-camera compatibility issues.
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: '#00217D', padding: 15, borderRadius: 10, marginTop: 20 }}
            onPress={() => Alert.alert('Camera Demo', 'This would capture a photo and validate GPS location in Haiti for tree planting verification.')}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>📸 Simulate Capture</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}