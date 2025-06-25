import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { Coordinate } from '../types';

interface PedometerSession {
  points: Coordinate[];
  distances: number[]; // Distance between each point
  totalSteps: number;
  isWalking: boolean;
  currentSegmentSteps: number;
  startSteps: number;
}

interface Props {
  onComplete: (points: Coordinate[], totalDistance: number) => void;
  onCancel: () => void;
}

export const PedometerFieldMapper: React.FC<Props> = ({ onComplete, onCancel }) => {
  const { t } = useTranslation();
  const [session, setSession] = useState<PedometerSession>({
    points: [],
    distances: [],
    totalSteps: 0,
    isWalking: false,
    currentSegmentSteps: 0,
    startSteps: 0,
  });
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<boolean | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    checkPedometerAvailability();
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const checkPedometerAvailability = async () => {
    const isAvailable = await Pedometer.isAvailableAsync();
    setIsPedometerAvailable(isAvailable);
    
    if (!isAvailable) {
      Alert.alert(
        t('common.error'),
        'Step counting is not available on this device. Using GPS-only mode.',
        [{ text: 'OK' }]
      );
    }
  };

  const getCurrentLocation = async (): Promise<Coordinate | null> => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      
      const coord: Coordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date(),
        accuracy: location.coords.accuracy || undefined,
      };
      
      setCurrentLocation(coord);
      return coord;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  const startWalking = async () => {
    if (!isPedometerAvailable) {
      Alert.alert(t('common.error'), 'Pedometer not available');
      return;
    }

    // Get current location for starting point
    const location = await getCurrentLocation();
    if (!location) {
      Alert.alert(t('common.error'), 'Unable to get current location');
      return;
    }

    // If this is the first point, add it
    if (session.points.length === 0) {
      setSession(prev => ({
        ...prev,
        points: [location],
      }));
    }

    // Start pedometer subscription
    const sub = Pedometer.watchStepCount(result => {
      setSession(prev => ({
        ...prev,
        currentSegmentSteps: result.steps - prev.startSteps,
      }));
    });
    setSubscription(sub);

    // Get current step count as baseline
    const start = await Pedometer.getStepCountAsync(new Date(Date.now() - 1000), new Date());
    
    setSession(prev => ({
      ...prev,
      isWalking: true,
      startSteps: start.steps,
      currentSegmentSteps: 0,
    }));
  };

  const markPoint = async () => {
    if (!session.isWalking) {
      Alert.alert(t('common.error'), 'Start walking first');
      return;
    }

    // Stop walking
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }

    // Get current location
    const location = await getCurrentLocation();
    if (!location) {
      Alert.alert(t('common.error'), 'Unable to get current location');
      return;
    }

    // Calculate distance (average step length is ~0.75m)
    const distance = session.currentSegmentSteps * 0.75;

    setSession(prev => ({
      ...prev,
      points: [...prev.points, location],
      distances: [...prev.distances, distance],
      totalSteps: prev.totalSteps + prev.currentSegmentSteps,
      isWalking: false,
      currentSegmentSteps: 0,
    }));
  };

  const completeMapping = () => {
    if (session.points.length < 4) {
      Alert.alert(t('common.error'), 'Need at least 4 points to create a field');
      return;
    }

    // Close the polygon
    const closedPoints = [...session.points];
    if (closedPoints.length > 0) {
      closedPoints.push(closedPoints[0]);
    }

    // Calculate total distance
    const totalDistance = session.distances.reduce((sum, d) => sum + d, 0);

    onComplete(closedPoints, totalDistance);
  };

  const undoLastPoint = () => {
    if (session.points.length > 1) {
      setSession(prev => ({
        ...prev,
        points: prev.points.slice(0, -1),
        distances: prev.distances.slice(0, -1),
      }));
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pedometer Field Mapping</Text>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {isPedometerAvailable === false && (
        <View style={styles.warning}>
          <Ionicons name="warning" size={20} color="#FF9800" />
          <Text style={styles.warningText}>Step counting unavailable</Text>
        </View>
      )}

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Points</Text>
          <Text style={styles.statValue}>{session.points.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Steps</Text>
          <Text style={styles.statValue}>{session.totalSteps}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Current Segment</Text>
          <Text style={styles.statValue}>{session.currentSegmentSteps}</Text>
        </View>
      </View>

      {currentLocation && currentLocation.accuracy && (
        <View style={styles.accuracy}>
          <Ionicons 
            name="location" 
            size={16} 
            color={currentLocation.accuracy < 10 ? '#4CAF50' : '#FF9800'} 
          />
          <Text style={styles.accuracyText}>
            GPS Accuracy: {Math.round(currentLocation.accuracy)}m
          </Text>
        </View>
      )}

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          {session.points.length === 0 
            ? 'Tap "Start Walking" at your first corner'
            : session.isWalking
            ? `Walk to corner ${session.points.length + 1} and tap "Mark Point"`
            : session.points.length < 4
            ? 'Tap "Start Walking" to continue to next corner'
            : 'You can complete the field or add more points'}
        </Text>
      </View>

      <View style={styles.segmentList}>
        {session.distances.map((distance, index) => (
          <View key={index} style={styles.segment}>
            <Text style={styles.segmentText}>
              Side {index + 1}: {formatDistance(distance)} ({Math.round(distance / 0.75)} steps)
            </Text>
          </View>
        ))}
        {session.isWalking && (
          <View style={styles.currentSegment}>
            <ActivityIndicator size="small" color="#00217D" />
            <Text style={styles.currentSegmentText}>
              Walking... {session.currentSegmentSteps} steps (~{formatDistance(session.currentSegmentSteps * 0.75)})
            </Text>
          </View>
        )}
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
            onPress={markPoint}
          >
            <Ionicons name="location" size={24} color="white" />
            <Text style={styles.buttonText}>Mark Point</Text>
          </TouchableOpacity>
        )}

        {session.points.length > 1 && !session.isWalking && (
          <TouchableOpacity
            style={[styles.button, styles.undoButton]}
            onPress={undoLastPoint}
          >
            <Ionicons name="arrow-undo" size={24} color="white" />
            <Text style={styles.buttonText}>Undo</Text>
          </TouchableOpacity>
        )}

        {session.points.length >= 4 && !session.isWalking && (
          <TouchableOpacity
            style={[styles.button, styles.completeButton]}
            onPress={completeMapping}
          >
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text style={styles.buttonText}>Complete</Text>
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
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  warningText: {
    marginLeft: 10,
    color: '#856404',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00217D',
  },
  accuracy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  accuracyText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
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
  segmentList: {
    marginBottom: 20,
  },
  segment: {
    backgroundColor: '#e8f5e9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  segmentText: {
    fontSize: 14,
    color: '#2e7d32',
  },
  currentSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
  },
  currentSegmentText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#1976d2',
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
  markButton: {
    backgroundColor: '#00217D',
  },
  undoButton: {
    backgroundColor: '#FF9800',
  },
  completeButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});