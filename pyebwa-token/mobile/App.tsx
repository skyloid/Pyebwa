import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, TextInput, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import './src/i18n'; // Initialize i18n
import { LanguageSwitcher } from './src/components/LanguageSwitcher';
import { HeritageUploadScreen } from './src/screens/HeritageUploadScreen';
import { TokenPurchaseScreen } from './src/screens/TokenPurchaseScreen';
import { FieldMapperScreen } from './src/screens/FieldMapperScreen';
import { PlanterCameraScreen } from './src/screens/PlanterCameraScreen';
import { FieldManagementScreen } from './src/screens/FieldManagementScreen';
import { AnalyticsDashboard } from './src/screens/AnalyticsDashboard';

export default function App() {
  const { t, i18n } = useTranslation();
  const [screen, setScreen] = React.useState<'login' | 'home' | 'camera' | 'heritage' | 'purchase' | 'fieldMapper' | 'fieldManagement' | 'analytics'>('login');
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userType, setUserType] = React.useState<'family' | 'planter' | 'validator'>('family');
  
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
      Alert.alert(t('common.error'), t('auth.emailRequired'));
      return;
    }

    if (mode === 'register' && !name) {
      Alert.alert(t('common.error'), t('auth.nameRequired'));
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
      
      Alert.alert(t('common.success'), t(mode === 'login' ? 'auth.loginSuccess' : 'auth.registerSuccess'));
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.authError'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoLogin = async (type: 'family' | 'planter' | 'validator') => {
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
      Alert.alert(t('common.error'), t('auth.authError'));
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
        <Text style={{ marginTop: 10, color: '#666' }}>{t('common.loading')}</Text>
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
              {t('app.name')}
            </Text>
            <Text style={{ fontSize: 16, color: '#666' }}>
              {t('app.tagline')}
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
                {t('auth.login')}
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
                {t('auth.register')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* User Type Selection (for registration) */}
          {mode === 'register' && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, color: '#333', marginBottom: 10 }}>
                {t('auth.iAmA')}
              </Text>
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, color: '#333', marginBottom: 10 }}>
                  {t('auth.iAmA')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
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
                    {t('auth.familyMember')}
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
                    {t('auth.treePlanter')}
                  </Text>
                </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 15,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: userType === 'validator' ? '#00217D' : '#ddd',
                    backgroundColor: userType === 'validator' ? '#f0f5ff' : 'white',
                  }}
                  onPress={() => setUserType('validator')}
                >
                  <Text style={{
                    textAlign: 'center',
                    fontSize: 14,
                    color: userType === 'validator' ? '#00217D' : '#666',
                    fontWeight: userType === 'validator' ? 'bold' : 'normal'
                  }}>
                    🔍 Validator
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
              placeholder={t('auth.fullName')}
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
            placeholder={t('auth.email')}
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
            placeholder={t('auth.password')}
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
                {t(mode === 'login' ? 'auth.login' : 'auth.createAccount')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#ddd' }} />
            <Text style={{ marginHorizontal: 10, color: '#999' }}>{t('auth.or')}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#ddd' }} />
          </View>

          {/* Demo Login Buttons */}
          <Text style={{ textAlign: 'center', color: '#666', marginBottom: 10 }}>
            {t('auth.demoLogin')}
          </Text>
          <View style={{ gap: 10 }}>
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
                  {t('auth.demoFamily')}
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
                  {t('auth.demoPlanter')}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: '#FF6B6B',
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: 'center',
              }}
              onPress={() => handleDemoLogin('validator')}
              disabled={authLoading}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Demo Validator
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
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>{t('app.name')}</Text>
          <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5 }}>
            {t(userType === 'planter' ? 'dashboard.planterDashboard' : userType === 'validator' ? 'validator.dashboard' : 'dashboard.familyDashboard')}
          </Text>
        </View>
        
        <View style={{ flex: 1, padding: 20 }}>
          {/* Language Switcher */}
          <LanguageSwitcher />
          {userType === 'validator' ? (
            <>
              {/* Validator Dashboard */}
              <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#00217D' }}>12</Text>
                    <Text style={{ fontSize: 14, color: '#666', marginTop: 5 }}>{t('validator.myFields')}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#00217D' }}>45.2</Text>
                    <Text style={{ fontSize: 14, color: '#666', marginTop: 5 }}>Hectares</Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: '#FF6B6B', padding: 20, borderRadius: 15, alignItems: 'center' }}
                  onPress={() => setScreen('fieldMapper')}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{t('validator.createField')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: '#00217D', padding: 20, borderRadius: 15, alignItems: 'center' }}
                  onPress={() => setScreen('fieldManagement')}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{t('validator.manageFields')}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 }}>{t('validator.activeFields')}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#666' }}>{t('validator.totalArea')}</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#00217D' }}>45.2 ha</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <Text style={{ fontSize: 14, color: '#666' }}>{t('validator.capacityUsed')}</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4CAF50' }}>2,150 / 10,000</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={{ backgroundColor: '#4CAF50', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 20 }}
                onPress={() => setScreen('analytics')}
              >
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{t('dashboard.viewAnalytics')}</Text>
              </TouchableOpacity>
            </>
          ) : userType === 'planter' ? (
            <>
              {/* Planter Dashboard */}
              <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, color: '#666', marginBottom: 10 }}>{t('dashboard.yourEarnings')}</Text>
                <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#4CAF50' }}>1,000 PYEBWA</Text>
                <Text style={{ fontSize: 16, color: '#999', marginTop: 5 }}>≈ $0.10 USD</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
                <View style={{ flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 15, alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#00217D' }}>50</Text>
                  <Text style={{ fontSize: 14, color: '#666', marginTop: 5 }}>{t('dashboard.treesPlanted')}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 15, alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#00217D' }}>200</Text>
                  <Text style={{ fontSize: 14, color: '#666', marginTop: 5 }}>{t('dashboard.pending')}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: '#00217D', padding: 20, borderRadius: 15, alignItems: 'center' }}
                  onPress={() => setScreen('camera')}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{t('dashboard.submitNewPlanting')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: '#4CAF50', padding: 20, borderRadius: 15, alignItems: 'center' }}
                  onPress={() => setScreen('analytics')}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{t('dashboard.viewAnalytics')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Family Dashboard */}
              <View style={{ backgroundColor: '#e8f5e9', padding: 20, borderRadius: 15, marginBottom: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2e7d32', marginBottom: 15, textAlign: 'center' }}>
                  {t('dashboard.yourImpact')}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#2e7d32' }}>25</Text>
                    <Text style={{ fontSize: 14, color: '#558b2f', marginTop: 5 }}>{t('dashboard.treesFunded')}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#2e7d32' }}>500</Text>
                    <Text style={{ fontSize: 14, color: '#558b2f', marginTop: 5 }}>{t('dashboard.co2Offset')}</Text>
                  </View>
                </View>
              </View>

              <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, color: '#666', marginBottom: 10 }}>{t('dashboard.tokenBalance')}</Text>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#00217D', marginBottom: 15 }}>100 PYEBWA</Text>
                <TouchableOpacity 
                  style={{ backgroundColor: '#D41125', paddingHorizontal: 30, paddingVertical: 10, borderRadius: 20 }}
                  onPress={() => setScreen('purchase')}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>{t('dashboard.buyMoreTokens')}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: '#00217D', padding: 20, borderRadius: 15, alignItems: 'center' }}
                  onPress={() => setScreen('heritage')}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{t('dashboard.uploadHeritage')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: '#4CAF50', padding: 20, borderRadius: 15, alignItems: 'center' }}
                  onPress={() => setScreen('analytics')}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{t('dashboard.viewAnalytics')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity 
            style={{ backgroundColor: '#D41125', padding: 15, borderRadius: 10, alignItems: 'center' }}
            onPress={handleLogout}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{t('auth.logout')}</Text>
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
            <Text style={{ color: 'white', fontSize: 18 }}>{t('camera.back')}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>{t('camera.plantTrees')}</Text>
        </View>
        <PlanterCameraScreen />
      </View>
    );
  }

  // Heritage Upload Screen
  if (screen === 'heritage') {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: '#00217D', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => setScreen('home')}
            style={{ marginRight: 15 }}
          >
            <Text style={{ color: 'white', fontSize: 18 }}>{t('camera.back')}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>{t('dashboard.uploadHeritage')}</Text>
        </View>
        <HeritageUploadScreen />
      </View>
    );
  }

  // Token Purchase Screen
  if (screen === 'purchase') {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: '#00217D', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => setScreen('home')}
            style={{ marginRight: 15 }}
          >
            <Text style={{ color: 'white', fontSize: 18 }}>{t('camera.back')}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>{t('dashboard.buyMoreTokens')}</Text>
        </View>
        <TokenPurchaseScreen />
      </View>
    );
  }

  // Field Mapper Screen
  if (screen === 'fieldMapper') {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: '#FF6B6B', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => setScreen('home')}
            style={{ marginRight: 15 }}
          >
            <Text style={{ color: 'white', fontSize: 18 }}>{t('camera.back')}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>{t('validator.createField')}</Text>
        </View>
        <FieldMapperScreen />
      </View>
    );
  }

  // Field Management Screen
  if (screen === 'fieldManagement') {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: '#00217D', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => setScreen('home')}
            style={{ marginRight: 15 }}
          >
            <Text style={{ color: 'white', fontSize: 18 }}>{t('camera.back')}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>{t('validator.manageFields')}</Text>
        </View>
        <FieldManagementScreen />
      </View>
    );
  }

  // Analytics Dashboard
  if (screen === 'analytics') {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: '#4CAF50', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => setScreen('home')}
            style={{ marginRight: 15 }}
          >
            <Text style={{ color: 'white', fontSize: 18 }}>{t('camera.back')}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>{t('analytics.dashboard')}</Text>
        </View>
        <AnalyticsDashboard />
      </View>
    );
  }
}