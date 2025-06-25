import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { Coordinate } from '../types';
import { getPreciseDistance, getAreaOfPolygon } from 'geolib';

interface ManualSession {
  points: Coordinate[];
  isMarkingPoint: boolean; // True while collecting GPS readings
  isTracking: boolean; // True when actively tracking movement
  lastTrackedPoint?: Coordinate; // Last point tracked for distance interval
}

interface Props {
  onComplete: (points: Coordinate[], totalDistance: number) => void;
  onCancel: () => void;
}

export const ManualFieldMapper: React.FC<Props> = ({ onComplete, onCancel }) => {
  const { t } = useTranslation();
  const [session, setSession] = useState<ManualSession>({
    points: [],
    isMarkingPoint: false,
    isTracking: false,
  });
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [fieldArea, setFieldArea] = useState(0);
  const locationSubscription = useRef<any>(null);

  useEffect(() => {
    // Start continuous location monitoring
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        // High-frequency updates for current position display
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
      }
    })();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const markCorner = async () => {
    if (session.isMarkingPoint) {
      return; // Already marking a point
    }

    setSession(prev => ({ ...prev, isMarkingPoint: true }));
    const readings: Coordinate[] = [];
    
    // Collect 15 GPS readings over 7.5 seconds for better averaging
    for (let i = 0; i < 15; i++) {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        
        if (location.coords.accuracy && location.coords.accuracy <= 20) {
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
      
      // Wait 500ms between readings
      if (i < 14) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (readings.length === 0) {
      Alert.alert(t('common.error'), 'Unable to get accurate GPS readings. Please try again.');
      setSession(prev => ({ ...prev, isMarkingPoint: false }));
      return;
    }
    
    // Calculate average position
    const avgLat = readings.reduce((sum, r) => sum + r.latitude, 0) / readings.length;
    const avgLng = readings.reduce((sum, r) => sum + r.longitude, 0) / readings.length;
    const avgAccuracy = readings.reduce((sum, r) => sum + (r.accuracy || 0), 0) / readings.length;
    
    const averagedPoint: Coordinate = {
      latitude: avgLat,
      longitude: avgLng,
      timestamp: new Date(),
      accuracy: avgAccuracy,
    };
    
    // Add to points
    setSession(prev => ({
      ...prev,
      points: [...prev.points, averagedPoint],
      isMarkingPoint: false,
    }));
    
    Alert.alert(
      t('fieldMapper.pointAdded'),
      `Corner ${session.points.length + 1} marked (${readings.length} readings averaged, accuracy: ${Math.round(avgAccuracy)}m)`
    );
  };

  const undoLastPoint = () => {
    if (session.points.length > 0) {
      setSession(prev => ({
        ...prev,
        points: prev.points.slice(0, -1),
      }));
    }
  };

  const calculateDistance = (p1: Coordinate, p2: Coordinate): number => {
    return getPreciseDistance(
      { latitude: p1.latitude, longitude: p1.longitude },
      { latitude: p2.latitude, longitude: p2.longitude }
    );
  };

  const calculateTotalDistance = (): number => {
    let total = 0;
    for (let i = 1; i < session.points.length; i++) {
      total += calculateDistance(session.points[i-1], session.points[i]);
    }
    // Add closing distance
    if (session.points.length > 2) {
      total += calculateDistance(session.points[session.points.length - 1], session.points[0]);
    }
    return total;
  };

  const calculateFieldArea = (): number => {
    if (session.points.length < 3) return 0;
    
    const polygonPoints = session.points.map(p => ({
      latitude: p.latitude,
      longitude: p.longitude
    }));
    
    return getAreaOfPolygon(polygonPoints);
  };

  // Update area and distance whenever points change
  useEffect(() => {
    setTotalDistance(calculateTotalDistance());
    setFieldArea(calculateFieldArea());
  }, [session.points]);

  const completeMapping = () => {
    if (session.points.length < 4) {
      Alert.alert(t('common.error'), 'Need at least 4 points to create a field');
      return;
    }

    const totalDistance = calculateTotalDistance();
    onComplete(session.points, totalDistance);
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const getInstructions = (): string => {
    if (session.isMarkingPoint) {
      return 'Stand still at the corner. We\'re collecting GPS readings...';
    }
    if (session.points.length === 0) {
      return 'Walk to the first corner of your field and tap "Mark Corner"';
    }
    if (session.points.length < 4) {
      return `Walk to corner ${session.points.length + 1} and tap "Mark Corner"`;
    }
    return 'You have enough points. You can complete the field or add more corners.';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manual Field Mapping</Text>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Corners Marked</Text>
          <Text style={styles.statValue}>{session.points.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Perimeter</Text>
          <Text style={styles.statValue}>
            {formatDistance(totalDistance)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Area</Text>
          <Text style={styles.statValue}>
            {fieldArea > 0 ? `${Math.round(fieldArea)} m²` : '0 m²'}
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
          <Text style={[
            styles.accuracyText,
            { color: currentLocation.accuracy < 10 ? '#4CAF50' : currentLocation.accuracy < 20 ? '#FF9800' : '#F44336' }
          ]}>
            GPS Accuracy: {Math.round(currentLocation.accuracy)}m
            {currentLocation.accuracy > 20 && ' (Poor signal)'}
          </Text>
          <View style={styles.signalBars}>
            <View style={[
              styles.signalBar,
              { backgroundColor: currentLocation.accuracy < 20 ? '#4CAF50' : '#ccc' }
            ]} />
            <View style={[
              styles.signalBar,
              { backgroundColor: currentLocation.accuracy < 15 ? '#4CAF50' : '#ccc' }
            ]} />
            <View style={[
              styles.signalBar,
              { backgroundColor: currentLocation.accuracy < 10 ? '#4CAF50' : '#ccc' }
            ]} />
            <View style={[
              styles.signalBar,
              { backgroundColor: currentLocation.accuracy < 5 ? '#4CAF50' : '#ccc' }
            ]} />
          </View>
        </View>
      )}

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>{getInstructions()}</Text>
        <Text style={styles.tipText}>
          Tip: For best accuracy, wait for GPS accuracy under 10m before marking corners
        </Text>
      </View>

      <ScrollView style={styles.pointsList}>
        {session.points.map((point, index) => (
          <View key={index} style={styles.pointItem}>
            <View style={styles.pointInfo}>
              <Text style={styles.pointNumber}>Corner {index + 1}</Text>
              <Text style={styles.pointAccuracy}>
                Accuracy: {point.accuracy ? `${Math.round(point.accuracy)}m` : 'Unknown'}
              </Text>
            </View>
            {index > 0 && (
              <Text style={styles.pointDistance}>
                Distance from previous: {formatDistance(calculateDistance(session.points[index-1], point))}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, session.isMarkingPoint ? styles.recordingButton : styles.markButton]}
          onPress={markCorner}
          disabled={session.isMarkingPoint || session.points.length >= 10}
        >
          {session.isMarkingPoint ? (
            <>
              <ActivityIndicator color="white" size="small" />
              <Text style={styles.buttonText}>Getting GPS Fix...</Text>
            </>
          ) : (
            <>
              <Ionicons name="location" size={24} color="white" />
              <Text style={styles.buttonText}>Mark Corner</Text>
            </>
          )}
        </TouchableOpacity>

        {session.points.length > 0 && !session.isMarkingPoint && (
          <TouchableOpacity
            style={[styles.button, styles.undoButton]}
            onPress={undoLastPoint}
          >
            <Ionicons name="arrow-undo" size={24} color="white" />
            <Text style={styles.buttonText}>Undo Last</Text>
          </TouchableOpacity>
        )}

        {session.points.length >= 4 && !session.isMarkingPoint && (
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: '#f0f5ff',
    padding: 15,
    borderRadius: 10,
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
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  accuracyText: {
    marginLeft: 5,
    fontSize: 14,
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
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  pointsList: {
    maxHeight: 200,
    marginBottom: 20,
  },
  pointItem: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  pointInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  pointAccuracy: {
    fontSize: 14,
    color: '#666',
  },
  pointDistance: {
    fontSize: 12,
    color: '#999',
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
  markButton: {
    backgroundColor: '#00217D',
  },
  recordingButton: {
    backgroundColor: '#D41125',
  },
  undoButton: {
    backgroundColor: '#FF9800',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signalBars: {
    flexDirection: 'row',
    gap: 2,
    marginLeft: 10,
  },
  signalBar: {
    width: 4,
    height: 12,
    borderRadius: 2,
  },
});