import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import authService from '../services/authService';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'validator' | 'planter'>('planter');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await authService.login(email, password);
      onLoginSuccess();
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please check your credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (type: 'validator' | 'planter') => {
    setLoading(true);
    try {
      await authService.demoLogin(type);
      onLoginSuccess();
    } catch (error: any) {
      Alert.alert('Demo Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/icon.png')}
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
                userType === 'validator' && styles.userTypeButtonActive,
              ]}
              onPress={() => setUserType('validator')}
            >
              <Text
                style={[
                  styles.userTypeText,
                  userType === 'validator' && styles.userTypeTextActive,
                ]}
              >
                ✅ Validator
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
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#999"
          />

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.demoText}>Try with demo account:</Text>
          <View style={styles.demoButtonsContainer}>
            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => handleDemoLogin('validator')}
              disabled={loading}
            >
              <Text style={styles.demoButtonText}>Demo Validator</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => handleDemoLogin('planter')}
              disabled={loading}
            >
              <Text style={styles.demoButtonText}>Demo Planter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00217D',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    paddingHorizontal: 30,
    flex: 1,
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
    marginTop: 10,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999',
  },
  demoText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
  },
  demoButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  demoButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  demoButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});