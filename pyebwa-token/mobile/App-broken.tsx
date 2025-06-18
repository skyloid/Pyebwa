import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Screens
import { HomeScreen } from './src/screens/HomeScreen';
import { CameraScreen } from './src/screens/CameraScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

// Simple Login Component (inline styles to avoid reference issues)
const SimpleLoginScreen = ({ onLogin }: { onLogin: () => void }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 20 }}>
    <View style={{ alignItems: 'center', marginBottom: 40 }}>
      <Image source={require('./assets/icon.png')} style={{ width: 100, height: 100, marginBottom: 20 }} />
      <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#00217D', marginBottom: 5 }}>PYEBWA Token</Text>
      <Text style={{ fontSize: 16, color: '#666' }}>Preserve Heritage • Plant Trees</Text>
    </View>
    <TouchableOpacity 
      style={{ backgroundColor: '#00217D', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 10 }}
      onPress={onLogin}
    >
      <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Demo Login</Text>
    </TouchableOpacity>
  </View>
);

const Tab = createBottomTabNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Simplified auth check for now
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#00217D" />
        <StatusBar style="auto" />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <StatusBar style="auto" />
        <SimpleLoginScreen onLogin={() => setIsLoggedIn(true)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap;

              if (route.name === 'Home') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'Camera') {
                iconName = focused ? 'camera' : 'camera-outline';
              } else if (route.name === 'Profile') {
                iconName = focused ? 'person' : 'person-outline';
              } else {
                iconName = 'help-circle-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#00217D',
            tabBarInactiveTintColor: 'gray',
            headerStyle: {
              backgroundColor: '#00217D',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          })}
        >
          <Tab.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ title: 'Dashboard' }}
          />
          <Tab.Screen 
            name="Camera" 
            component={CameraScreen}
            options={{ title: 'Plant Trees' }}
          />
          <Tab.Screen 
            name="Profile" 
            options={{ title: 'Profile' }}
          >
            {() => <ProfileScreen onLogout={() => setIsLoggedIn(false)} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

