import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { Coordinate } from '../types';
import { getPreciseDistance, getAreaOfPolygon } from 'geolib';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'continuous-mapping-session';

interface ContinuousSession {
  points: Coordinate[];
  isTracking: boolean;
  startTime: Date;
  totalDistance: number;
  lastPoint?: Coordinate;
  isPaused: boolean;
}

interface Props {
  onComplete: (points: Coordinate[], totalDistance: number) => void;
  onCancel: () => void;
}

export const ContinuousFieldMapper: React.FC<Props> = ({ onComplete, onCancel }) => {
  const { t } = useTranslation();
  const [session, setSession] = useState<ContinuousSession>({
    points: [],
    isTracking: false,
    startTime: new Date(),
    totalDistance: 0,
    isPaused: false,
  });
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const locationSubscription = useRef<any>(null);
  const autoSaveInterval = useRef<any>(null);

  useEffect(() => {
    loadSession();
    
    // Handle app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
      stopTracking();
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    // Auto-save session every 5 seconds when tracking
    if (session.isTracking && !session.isPaused) {
      autoSaveInterval.current = setInterval(() => {
        saveSession(session);
      }, 5000);
    } else {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current);
      }
    }
  }, [session.isTracking, session.isPaused]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      loadSession();
    } else if (nextAppState.match(/inactive|background/)) {
      // App went to background
      if (session.isTracking) {
        saveSession(session);
      }
    }
    setAppState(nextAppState);
  };

  const loadSession = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const savedSession = JSON.parse(data);
        // Convert date strings back to Date objects
        savedSession.startTime = new Date(savedSession.startTime);
        savedSession.points = savedSession.points.map((p: any) => ({
          ...p,
          timestamp: new Date(p.timestamp),
        }));
        setSession(savedSession);
        
        // Resume tracking if it was active
        if (savedSession.isTracking && !savedSession.isPaused) {
          startLocationTracking();
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const saveSession = async (sessionToSave: ContinuousSession) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessionToSave));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const startLocationTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('camera.locationPermissionDenied'));
      return;
    }

    // Stop any existing subscription
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }

    // Start high-frequency location tracking
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000, // Update every 2 seconds
        distanceInterval: 5, // Update when moved 5+ meters
      },
      (location) => {
        const coord: Coordinate = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: new Date(),
          accuracy: location.coords.accuracy || undefined,
        };
        
        setCurrentLocation(coord);
        
        // Add point if tracking and not paused
        if (session.isTracking && !session.isPaused) {
          handleLocationUpdate(coord);
        }
      }
    );
    
    locationSubscription.current = sub;
  };

  const handleLocationUpdate = (newLocation: Coordinate) => {
    setSession(prev => {
      if (!prev.isTracking || prev.isPaused) return prev;
      
      // Check accuracy
      if (newLocation.accuracy && newLocation.accuracy > 20) {
        return prev; // Skip inaccurate points
      }
      
      // Calculate distance from last point
      if (prev.lastPoint) {
        const distance = getPreciseDistance(
          { latitude: prev.lastPoint.latitude, longitude: prev.lastPoint.longitude },
          { latitude: newLocation.latitude, longitude: newLocation.longitude }
        );
        
        // Only add point if moved significantly (10+ meters)
        if (distance >= 10) {
          return {
            ...prev,
            points: [...prev.points, newLocation],
            lastPoint: newLocation,
            totalDistance: prev.totalDistance + distance,
          };
        }
      } else {
        // First point
        return {
          ...prev,
          points: [newLocation],
          lastPoint: newLocation,
        };
      }
      
      return prev;
    });
  };

  const startTracking = async () => {
    const newSession: ContinuousSession = {
      points: [],
      isTracking: true,
      startTime: new Date(),
      totalDistance: 0,
      isPaused: false,
    };
    
    setSession(newSession);
    await saveSession(newSession);
    await startLocationTracking();
    
    Alert.alert(
      t('fieldMapper.trackingStarted'),
      'Walk around your field perimeter. Points will be recorded automatically every 10+ meters.'
    );
  };

  const pauseTracking = () => {
    const pausedSession = { ...session, isPaused: true };
    setSession(pausedSession);
    saveSession(pausedSession);
  };

  const resumeTracking = () => {
    const resumedSession = { ...session, isPaused: false };
    setSession(resumedSession);
    saveSession(resumedSession);
  };

  const stopTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    
    const stoppedSession = { ...session, isTracking: false };
    setSession(stoppedSession);
    saveSession(stoppedSession);
  };

  const completeMapping = async () => {
    if (session.points.length < 4) {
      Alert.alert(t('common.error'), 'Need at least 4 points to create a field');
      return;
    }

    // Stop tracking
    stopTracking();
    
    // Clear saved session
    await AsyncStorage.removeItem(STORAGE_KEY);
    
    onComplete(session.points, session.totalDistance);
  };

  const clearSession = async () => {
    Alert.alert(
      t('common.confirm'),
      'Clear all tracking data and start over?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            stopTracking();
            await AsyncStorage.removeItem(STORAGE_KEY);
            setSession({
              points: [],
              isTracking: false,
              startTime: new Date(),
              totalDistance: 0,
              isPaused: false,
            });
          },
        },
      ]
    );
  };

  const calculateArea = (): number => {
    if (session.points.length < 3) return 0;
    
    const polygonPoints = session.points.map(p => ({
      latitude: p.latitude,
      longitude: p.longitude
    }));
    
    return getAreaOfPolygon(polygonPoints);
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const formatDuration = (): string => {
    const diff = new Date().getTime() - session.startTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const area = calculateArea();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Continuous GPS Tracking</Text>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Points</Text>
            <Text style={styles.statValue}>{session.points.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{formatDistance(session.totalDistance)}</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Area</Text>
            <Text style={styles.statValue}>
              {area > 0 ? `${Math.round(area)} m²` : '0 m²'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>
              {session.isTracking ? formatDuration() : '0m'}
            </Text>
          </View>
        </View>
      </View>

      {currentLocation && currentLocation.accuracy && (
        <View style={styles.accuracy}>
          <Ionicons 
            name="location" 
            size={16} 
            color={currentLocation.accuracy < 10 ? '#4CAF50' : currentLocation.accuracy < 20 ? '#FF9800' : '#F44336'} 
          />
          <Text style={[
            styles.accuracyText,
            { color: currentLocation.accuracy < 10 ? '#4CAF50' : currentLocation.accuracy < 20 ? '#FF9800' : '#F44336' }
          ]}>
            GPS: {Math.round(currentLocation.accuracy)}m
          </Text>
          {session.isTracking && (
            <View style={styles.statusIndicator}>
              <View style={[styles.trackingDot, session.isPaused && styles.pausedDot]} />
              <Text style={styles.statusText}>
                {session.isPaused ? 'Paused' : 'Tracking'}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          {!session.isTracking 
            ? 'Start tracking to map your field. Walk around the perimeter.'
            : session.isPaused
            ? 'Tracking is paused. Resume when ready to continue.'
            : `Walk around your field. Points auto-record every 10+ meters. ${session.points.length < 4 ? `Need ${4 - session.points.length} more points.` : 'You have enough points to complete.'}`}
        </Text>
      </View>

      {session.points.length > 0 && (
        <ScrollView style={styles.pointsList}>
          <Text style={styles.pointsTitle}>
            Tracked Path ({session.points.length} points)
          </Text>
          {session.points.slice(-5).reverse().map((point, index) => (
            <View key={index} style={styles.pointItem}>
              <Text style={styles.pointText}>
                Point {session.points.length - index}: {point.accuracy ? `${Math.round(point.accuracy)}m accuracy` : 'Unknown accuracy'}
              </Text>
            </View>
          ))}
          {session.points.length > 5 && (
            <Text style={styles.morePointsText}>
              ... and {session.points.length - 5} more points
            </Text>
          )}
        </ScrollView>
      )}

      <View style={styles.buttons}>
        {!session.isTracking ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.startButton]}
              onPress={startTracking}
            >
              <Ionicons name="play" size={24} color="white" />
              <Text style={styles.buttonText}>Start Tracking</Text>
            </TouchableOpacity>
            
            {session.points.length > 0 && (
              <TouchableOpacity
                style={[styles.button, styles.clearButton]}
                onPress={clearSession}
              >
                <Ionicons name="trash" size={24} color="white" />
                <Text style={styles.buttonText}>Clear Data</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            {!session.isPaused ? (
              <TouchableOpacity
                style={[styles.button, styles.pauseButton]}
                onPress={pauseTracking}
              >
                <Ionicons name="pause" size={24} color="white" />
                <Text style={styles.buttonText}>Pause</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.resumeButton]}
                onPress={resumeTracking}
              >
                <Ionicons name="play" size={24} color="white" />
                <Text style={styles.buttonText}>Resume</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={stopTracking}
            >
              <Ionicons name="stop" size={24} color="white" />
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
          </>
        )}

        {session.points.length >= 4 && !session.isTracking && (
          <TouchableOpacity
            style={[styles.button, styles.completeButton]}
            onPress={completeMapping}
          >
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text style={styles.buttonText}>Complete Field</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00217D',
  },
  stats: {
    backgroundColor: '#f0f5ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00217D',
  },
  accuracy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  accuracyText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  trackingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    marginRight: 5,
  },
  pausedDot: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  instructions: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 16,
    color: '#00217D',
    textAlign: 'center',
  },
  pointsList: {
    maxHeight: 120,
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
  },
  pointsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  pointItem: {
    paddingVertical: 3,
  },
  pointText: {
    fontSize: 12,
    color: '#999',
  },
  morePointsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  buttons: {
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  resumeButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  clearButton: {
    backgroundColor: '#666',
  },
  completeButton: {
    backgroundColor: '#00217D',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});