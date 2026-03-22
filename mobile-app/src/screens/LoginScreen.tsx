import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Divider,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn, signUp, resetPassword } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (isSignUp) {
      if (!formData.displayName) {
        Alert.alert('Error', 'Please enter your full name');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(formData.email, formData.password, formData.displayName);
        Alert.alert('Success', 'Account created successfully!');
      } else {
        await signIn(formData.email, formData.password);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      await resetPassword(formData.email);
      Alert.alert(
        'Password Reset',
        'Password reset email sent. Please check your inbox.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons 
              name="family-outline" 
              size={80} 
              color={theme.colors.primary} 
            />
            <Text style={[styles.title, { color: theme.colors.primary }]}>
              Pyebwa Fanmi
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Your family tree, your heritage
            </Text>
          </View>

          {/* Form Card */}
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text style={[styles.formTitle, { color: theme.colors.onSurface }]}>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>
              
              {isSignUp && (
                <TextInput
                  label="Full Name"
                  value={formData.displayName}
                  onChangeText={(text) => updateFormData('displayName', text)}
                  mode="outlined"
                  style={styles.input}
                  autoCapitalize="words"
                  autoComplete="name"
                />
              )}

              <TextInput
                label="Email"
                value={formData.email}
                onChangeText={(text) => updateFormData('email', text)}
                mode="outlined"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <TextInput
                label="Password"
                value={formData.password}
                onChangeText={(text) => updateFormData('password', text)}
                mode="outlined"
                style={styles.input}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />

              {isSignUp && (
                <TextInput
                  label="Confirm Password"
                  value={formData.confirmPassword}
                  onChangeText={(text) => updateFormData('confirmPassword', text)}
                  mode="outlined"
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                />
              )}

              <Button
                mode="contained"
                onPress={handleAuth}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Button>

              {!isSignUp && (
                <Button
                  mode="text"
                  onPress={handleForgotPassword}
                  style={styles.forgotButton}
                  textColor={theme.colors.primary}
                >
                  Forgot Password?
                </Button>
              )}

              <Divider style={styles.divider} />

              <Button
                mode="outlined"
                onPress={() => setIsSignUp(!isSignUp)}
                style={styles.switchButton}
                textColor={theme.colors.primary}
              >
                {isSignUp 
                  ? 'Already have an account? Sign In' 
                  : "Don't have an account? Sign Up"
                }
              </Button>
            </Card.Content>
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
              Preserve your family history
            </Text>
            <Text style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
              Connect with your heritage
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    marginBottom: 24,
  },
  cardContent: {
    padding: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  forgotButton: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  switchButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
});