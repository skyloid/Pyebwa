/**
 * Planting Zone Map Component
 * Displays valid planting zones and user location
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { PLANTING_ZONES, RESTRICTED_AREAS, getAllRegions } from '../data/haitiBoundaries';
import { getLocationValidationDetails, formatDistance } from '../utils/gpsValidator';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PlantingZoneMapProps {
  currentLocation?: Location.LocationObject;
  onClose?: () => void;
}

export const PlantingZoneMap: React.FC<PlantingZoneMapProps> = ({ 
  currentLocation, 
  onClose 
}) => {
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [validationDetails, setValidationDetails] = useState<any>(null);

  useEffect(() => {
    if (currentLocation) {
      const details = getLocationValidationDetails(currentLocation.coords);
      setValidationDetails(details);
    }
  }, [currentLocation]);

  // Convert lat/lon to screen coordinates (simplified projection)
  const latLonToScreen = (lat: number, lon: number) => {
    // Haiti bounds approximately: 18-20.1 N, -74.5 to -71.6 W
    const minLat = 18.0;
    const maxLat = 20.1;
    const minLon = -74.5;
    const maxLon = -71.6;
    
    const x = ((lon - minLon) / (maxLon - minLon)) * (screenWidth - 40) + 20;
    const y = ((maxLat - lat) / (maxLat - minLat)) * (screenHeight * 0.4) + 20;
    
    return { x, y };
  };

  // Draw polygon path
  const getPolygonPath = (coordinates: Array<{ latitude: number; longitude: number }>) => {
    return coordinates.map(coord => {
      const point = latLonToScreen(coord.latitude, coord.longitude);
      return `${point.x},${point.y}`;
    }).join(' ');
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Planting Zones Map</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Map View (Simplified) */}
        <View style={styles.mapContainer}>
          <View style={styles.map}>
            {/* Haiti outline (simplified) */}
            <View style={[styles.haitiOutline]} />
            
            {/* Planting Zones */}
            {PLANTING_ZONES.map(zone => {
              const firstPoint = latLonToScreen(zone.coordinates[0].latitude, zone.coordinates[0].longitude);
              return (
                <TouchableOpacity
                  key={zone.id}
                  style={[
                    styles.zone,
                    styles.plantingZone,
                    { 
                      left: firstPoint.x - 20, 
                      top: firstPoint.y - 20,
                    }
                  ]}
                  onPress={() => setSelectedZone(zone)}
                >
                  <Text style={styles.zoneLabel}>🌳</Text>
                </TouchableOpacity>
              );
            })}
            
            {/* Restricted Areas */}
            {RESTRICTED_AREAS.map(area => {
              const firstPoint = latLonToScreen(area.coordinates[0].latitude, area.coordinates[0].longitude);
              return (
                <View
                  key={area.id}
                  style={[
                    styles.zone,
                    styles.restrictedZone,
                    { 
                      left: firstPoint.x - 20, 
                      top: firstPoint.y - 20,
                    }
                  ]}
                >
                  <Text style={styles.zoneLabel}>🚫</Text>
                </View>
              );
            })}
            
            {/* User Location */}
            {currentLocation && (
              <View
                style={[
                  styles.userLocation,
                  {
                    left: latLonToScreen(
                      currentLocation.coords.latitude,
                      currentLocation.coords.longitude
                    ).x - 10,
                    top: latLonToScreen(
                      currentLocation.coords.latitude,
                      currentLocation.coords.longitude
                    ).y - 10,
                  }
                ]}
              >
                <View style={styles.userLocationDot} />
                <View style={styles.userLocationPulse} />
              </View>
            )}
          </View>
          
          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendIcon, styles.plantingZone]} />
              <Text style={styles.legendText}>Planting Zones</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendIcon, styles.restrictedZone]} />
              <Text style={styles.legendText}>Restricted Areas</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendIcon, styles.userLocationIcon]} />
              <Text style={styles.legendText}>Your Location</Text>
            </View>
          </View>
        </View>

        {/* Location Status */}
        {validationDetails && (
          <View style={[
            styles.statusCard,
            validationDetails.isInPlantingZone ? styles.statusValid : styles.statusWarning
          ]}>
            <Text style={styles.statusTitle}>Current Location Status</Text>
            <Text style={styles.statusText}>
              {validationDetails.isInPlantingZone 
                ? `✓ You are in ${validationDetails.nearestPlantingZone}`
                : validationDetails.isInHaiti
                  ? `⚠ ${formatDistance(validationDetails.distanceToNearestZone || 0)} to nearest planting zone`
                  : '✗ Outside Haiti - planting not allowed'}
            </Text>
            {currentLocation && (
              <Text style={styles.coordinatesText}>
                {currentLocation.coords.latitude.toFixed(4)}°N, {currentLocation.coords.longitude.toFixed(4)}°W
              </Text>
            )}
          </View>
        )}

        {/* Selected Zone Info */}
        {selectedZone && (
          <View style={styles.zoneInfo}>
            <Text style={styles.zoneInfoTitle}>{selectedZone.name}</Text>
            <Text style={styles.zoneInfoDescription}>{selectedZone.description}</Text>
            {selectedZone.plantingInfo && (
              <>
                <Text style={styles.zoneInfoLabel}>Recommended Species:</Text>
                <Text style={styles.zoneInfoText}>
                  {selectedZone.plantingInfo.optimalSpecies.join(', ')}
                </Text>
                <Text style={styles.zoneInfoLabel}>Planting Season:</Text>
                <Text style={styles.zoneInfoText}>{selectedZone.plantingInfo.season}</Text>
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  mapContainer: {
    flex: 1,
    padding: 20,
  },
  map: {
    flex: 1,
    backgroundColor: '#e3f2fd',
    borderRadius: 15,
    position: 'relative',
    overflow: 'hidden',
  },
  haitiOutline: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    width: '80%',
    height: '60%',
    backgroundColor: '#f5f5f5',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#00217D',
  },
  zone: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantingZone: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  restrictedZone: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
    borderWidth: 2,
    borderColor: '#F44336',
  },
  zoneLabel: {
    fontSize: 20,
  },
  userLocation: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
    borderWidth: 2,
    borderColor: 'white',
  },
  userLocationPulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  userLocationIcon: {
    backgroundColor: '#2196F3',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  statusCard: {
    margin: 20,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusValid: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  statusWarning: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  coordinatesText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  zoneInfo: {
    backgroundColor: 'white',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  zoneInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  zoneInfoDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  zoneInfoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  zoneInfoText: {
    fontSize: 14,
    color: '#666',
  },
});