import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { Coordinate } from '../types';
import { getPreciseDistance, getAreaOfPolygon } from 'geolib';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GPSStepSession {
  points: Coordinate[];
  isWalking: boolean;
  stepCount: number;
  gpsDistance: number;
  stepDistance: number;
  strideLength: number; // meters per step
}

interface Props {
  onComplete: (points: Coordinate[], totalDistance: number) => void;
  onCancel: () => void;
}

export const GPSStepFieldMapper: React.FC<Props> = ({ onComplete, onCancel }) => {
  const { t } = useTranslation();
  const [session, setSession] = useState<GPSStepSession>({
    points: [],
    isWalking: false,
    stepCount: 0,
    gpsDistance: 0,
    stepDistance: 0,
    strideLength: 0.762, // Default average stride length
  });
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [showStrideSetting, setShowStrideSetting] = useState(false);
  const [strideInput, setStrideInput] = useState('0.762');
  const locationSubscription = useRef<any>(null);
  const walkingSubscription = useRef<any>(null);
  const lastPosition = useRef<Coordinate | null>(null);

  useEffect(() => {
    // Load saved stride length
    loadStrideLength();
    
    // Start location monitoring
    startLocationTracking();

    return () => {
      stopTracking();
    };
  }, []);

  const loadStrideLength = async () => {
    try {
      const saved = await AsyncStorage.getItem('userStrideLength');
      if (saved) {
        setSession(prev => ({ ...prev, strideLength: parseFloat(saved) }));
        setStrideInput(saved);
      }
    } catch (error) {
      console.error('Error loading stride length:', error);
    }
  };

  const saveStrideLength = async () => {
    const stride = parseFloat(strideInput);
    if (isNaN(stride) || stride < 0.3 || stride > 2) {
      Alert.alert(t('common.error'), 'Please enter a valid stride length between 0.3 and 2 meters');
      return;
    }
    
    try {
      await AsyncStorage.setItem('userStrideLength', strideInput);
      setSession(prev => ({ ...prev, strideLength: stride }));
      setShowStrideSetting(false);
      Alert.alert(t('common.success'), `Stride length set to ${stride}m`);
    } catch (error) {
      console.error('Error saving stride length:', error);
    }
  };

  const startLocationTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('camera.locationPermissionDenied'));
      return;
    }

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (location) => {
        const coord: Coordinate = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: new Date(),
          accuracy: location.coords.accuracy || undefined,
        };
        setCurrentLocation(coord);
      }
    );
    locationSubscription.current = sub;
  };

  const startWalking = async () => {
    if (!currentLocation) {
      Alert.alert(t('common.error'), 'Waiting for GPS signal...');
      return;
    }

    // Mark starting point
    const startPoint = { ...currentLocation };
    setSession(prev => ({
      ...prev,
      points: [...prev.points, startPoint],
      isWalking: true,
      stepCount: 0,
      gpsDistance: 0,
      stepDistance: 0,
    }));
    lastPosition.current = startPoint;

    // Start tracking movement with distance interval
    if (walkingSubscription.current) {
      walkingSubscription.current.remove();
    }

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5, // Only update when moved 5+ meters
      },
      (location) => {
        if (lastPosition.current && location.coords.accuracy && location.coords.accuracy <= 15) {
          const distance = getPreciseDistance(
            { latitude: lastPosition.current.latitude, longitude: lastPosition.current.longitude },
            { latitude: location.coords.latitude, longitude: location.coords.longitude }
          );
          
          if (distance >= 5) {
            setSession(prev => ({
              ...prev,
              gpsDistance: prev.gpsDistance + distance,
            }));
            
            lastPosition.current = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              timestamp: new Date(),
              accuracy: location.coords.accuracy,
            };
          }
        }
      }
    );
    walkingSubscription.current = sub;
  };

  const markCorner = async () => {
    if (!session.isWalking || !currentLocation) {
      Alert.alert(t('common.error'), 'Start walking first');
      return;
    }

    // Get accurate position by averaging
    const readings: Coordinate[] = [];
    for (let i = 0; i < 10; i++) {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        
        if (location.coords.accuracy && location.coords.accuracy <= 15) {
          readings.push({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: new Date(),
            accuracy: location.coords.accuracy,
          });
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
      
      if (i < 9) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    if (readings.length === 0) {
      Alert.alert(t('common.error'), 'Unable to get accurate GPS reading');
      return;
    }
    
    // Average the readings
    const avgLat = readings.reduce((sum, r) => sum + r.latitude, 0) / readings.length;
    const avgLng = readings.reduce((sum, r) => sum + r.longitude, 0) / readings.length;
    const avgAccuracy = readings.reduce((sum, r) => sum + (r.accuracy || 0), 0) / readings.length;
    
    const cornerPoint: Coordinate = {
      latitude: avgLat,
      longitude: avgLng,
      timestamp: new Date(),
      accuracy: avgAccuracy,
    };
    
    setSession(prev => ({
      ...prev,
      points: [...prev.points, cornerPoint],
      isWalking: false,
    }));
    
    // Stop walking subscription
    if (walkingSubscription.current) {
      walkingSubscription.current.remove();
      walkingSubscription.current = null;
    }

    Alert.alert(
      t('fieldMapper.pointAdded'),
      `Corner ${session.points.length + 1} marked\nGPS Distance: ${Math.round(session.gpsDistance)}m\nStep Distance: ${Math.round(session.stepDistance)}m`
    );
  };

  const addSteps = (steps: number) => {
    if (!session.isWalking) return;
    
    setSession(prev => ({
      ...prev,
      stepCount: prev.stepCount + steps,
      stepDistance: (prev.stepCount + steps) * prev.strideLength,
    }));
  };

  const stopTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }
    if (walkingSubscription.current) {
      walkingSubscription.current.remove();
    }
  };

  const completeMapping = () => {
    if (session.points.length < 4) {
      Alert.alert(t('common.error'), 'Need at least 4 corners');
      return;
    }

    // Use GPS distance as primary, step distance as validation
    const finalDistance = session.gpsDistance > 0 ? session.gpsDistance : session.stepDistance;
    onComplete(session.points, finalDistance);
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

  const area = calculateArea();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GPS + Step Tracking</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => setShowStrideSetting(true)}>
            <Ionicons name="settings" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Corners</Text>
          <Text style={styles.statValue}>{session.points.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>GPS Distance</Text>
          <Text style={styles.statValue}>{formatDistance(session.gpsDistance)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Step Distance</Text>
          <Text style={styles.statValue}>{formatDistance(session.stepDistance)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Area</Text>
          <Text style={styles.statValue}>
            {area > 0 ? `${Math.round(area)} m²` : '0 m²'}
          </Text>
        </View>
      </View>

      {currentLocation && currentLocation.accuracy && (
        <View style={styles.accuracy}>
          <Ionicons 
            name="location" 
            size={16} 
            color={currentLocation.accuracy < 10 ? '#4CAF50' : currentLocation.accuracy < 20 ? '#FF9800' : '#F44336'} 
          />
          <Text style={styles.accuracyText}>
            GPS: {Math.round(currentLocation.accuracy)}m
          </Text>
        </View>
      )}

      {session.isWalking && (
        <View style={styles.stepCounter}>
          <Text style={styles.stepCounterTitle}>Manual Step Counter</Text>
          <Text style={styles.stepCount}>{session.stepCount} steps</Text>
          <View style={styles.stepButtons}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => addSteps(10)}
            >
              <Text style={styles.stepButtonText}>+10</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => addSteps(50)}
            >
              <Text style={styles.stepButtonText}>+50</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => addSteps(100)}
            >
              <Text style={styles.stepButtonText}>+100</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.strideInfo}>
            Stride: {session.strideLength}m per step
          </Text>
        </View>
      )}

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          {session.points.length === 0 
            ? 'Walk to first corner and tap "Start Walking"'
            : session.isWalking
            ? 'Walk to next corner, count your steps, then tap "Mark Corner"'
            : session.points.length < 4
            ? 'Tap "Start Walking" to continue to next corner'
            : 'You have enough corners to complete the field'}
        </Text>
      </View>

      <View style={styles.buttons}>
        {!session.isWalking ? (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={startWalking}
            disabled={session.points.length >= 10}
          >
            <Ionicons name="walk" size={24} color="white" />
            <Text style={styles.buttonText}>Start Walking</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.markButton]}
            onPress={markCorner}
          >
            <Ionicons name="location" size={24} color="white" />
            <Text style={styles.buttonText}>Mark Corner</Text>
          </TouchableOpacity>
        )}

        {session.points.length >= 4 && !session.isWalking && (
          <TouchableOpacity
            style={[styles.button, styles.completeButton]}
            onPress={completeMapping}
          >
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text style={styles.buttonText}>Complete Field</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stride Length Setting Modal */}
      {showStrideSetting && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Your Stride Length</Text>
            <Text style={styles.modalText}>
              Measure your average step length in meters. 
              Default is 0.762m (2.5 feet).
            </Text>
            <TextInput
              style={styles.input}
              value={strideInput}
              onChangeText={setStrideInput}
              keyboardType="numeric"
              placeholder="0.762"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowStrideSetting(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveStrideLength}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  headerButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00217D',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#f0f5ff',
    padding: 15,
    borderRadius: 10,
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 18,
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
  },
  stepCounter: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  stepCounterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00217D',
    marginBottom: 10,
  },
  stepCount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00217D',
    marginBottom: 10,
  },
  stepButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  stepButton: {
    backgroundColor: '#00217D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  stepButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  strideInfo: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  instructions: {
    backgroundColor: '#f0f5ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 16,
    color: '#00217D',
    textAlign: 'center',
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
    backgroundColor: '#2196F3',
  },
  markButton: {
    backgroundColor: '#00217D',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00217D',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#00217D',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});