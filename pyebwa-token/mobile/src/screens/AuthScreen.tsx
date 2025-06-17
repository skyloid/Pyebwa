import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import authService from '../services/authService';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [userType, setUserType] = useState<'family' | 'planter'>('family');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (mode === 'register' && !name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await authService.login(email, password);
      } else {
        await authService.register(email, password, name, userType);
      }
      onAuthSuccess();
    } catch (error: any) {
      Alert.alert('Authentication Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (type: 'family' | 'planter') => {
    setLoading(true);
    try {
      await authService.demoLogin(type);
      onAuthSuccess();
    } catch (error: any) {
      Alert.alert('Demo Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#f5f5f5' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Image 
              source={require('../../assets/icon.png')} 
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
              autoCapitalize="words"
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
            autoCapitalize="none"
            keyboardType="email-address"
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
              opacity: loading ? 0.7 : 1
            }}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
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
              disabled={loading}
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
              disabled={loading}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Demo Planter
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};