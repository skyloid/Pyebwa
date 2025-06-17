import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

// Screens
import { HomeScreen } from './src/screens/HomeScreen';
import { CameraScreen } from './src/screens/CameraScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { EarningsScreen } from './src/screens/EarningsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

// Providers
import { AuthProvider } from './src/providers/AuthProvider';
import { OfflineProvider } from './src/providers/OfflineProvider';

const Tab = createBottomTabNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    authenticateUser();
  }, []);

  const authenticateUser = async () => {
    try {
      // Check if device supports biometric authentication
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to access PYEBWA Planter',
          disableDeviceFallback: false,
        });

        if (result.success) {
          setIsAuthenticated(true);
        }
      } else {
        // If no biometric, check for stored PIN
        const storedPin = await SecureStore.getItemAsync('userPin');
        if (!storedPin) {
          // First time user - set up PIN
          setIsAuthenticated(true); // For now, allow access
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  if (!isAuthenticated) {
    return null; // Show auth screen in real app
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OfflineProvider>
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                  let iconName: keyof typeof Ionicons.glyphMap;

                  switch (route.name) {
                    case 'Home':
                      iconName = focused ? 'home' : 'home-outline';
                      break;
                    case 'Camera':
                      iconName = focused ? 'camera' : 'camera-outline';
                      break;
                    case 'History':
                      iconName = focused ? 'time' : 'time-outline';
                      break;
                    case 'Earnings':
                      iconName = focused ? 'wallet' : 'wallet-outline';
                      break;
                    case 'Profile':
                      iconName = focused ? 'person' : 'person-outline';
                      break;
                    default:
                      iconName = 'alert-circle-outline';
                  }

                  return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#00875A',
                tabBarInactiveTintColor: 'gray',
                headerStyle: {
                  backgroundColor: '#00875A',
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
                options={{ title: 'PYEBWA Planter' }}
              />
              <Tab.Screen 
                name="Camera" 
                component={CameraScreen}
                options={{ title: 'Plant Trees' }}
              />
              <Tab.Screen 
                name="History" 
                component={HistoryScreen}
                options={{ title: 'History' }}
              />
              <Tab.Screen 
                name="Earnings" 
                component={EarningsScreen}
                options={{ title: 'Earnings' }}
              />
              <Tab.Screen 
                name="Profile" 
                component={ProfileScreen}
                options={{ title: 'Profile' }}
              />
            </Tab.Navigator>
          </NavigationContainer>
          <StatusBar style="light" />
        </OfflineProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}