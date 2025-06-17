import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';

export const SimpleCameraScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<string>('mango');
  const [photoCount, setPhotoCount] = useState(0);

  useEffect(() => {
    (async () => {
      // Request camera permission
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      setHasPermission(cameraStatus.status === 'granted');

      // Request location permission
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(locationStatus.status === 'granted');

      // Get current location
      if (locationStatus.status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setCurrentLocation(location);
        } catch (error) {
          console.log('Location error:', error);
        }
      }
    })();
  }, []);

  const isLocationInHaiti = (lat: number, lon: number): boolean => {
    return lat >= 18.0 && lat <= 20.1 && lon >= -74.5 && lon <= -71.6;
  };

  const takePicture = async () => {
    if (!currentLocation) {
      Alert.alert('GPS Required', 'Please enable GPS to verify tree planting location.');
      return;
    }

    const { latitude, longitude } = currentLocation.coords;
    if (!isLocationInHaiti(latitude, longitude)) {
      Alert.alert('Invalid Location', 'GPS shows you are not in Haiti. Tree planting must be verified within Haiti.');
      return;
    }

    // Simulate photo capture
    setPhotoCount(prev => prev + 1);
    Alert.alert(
      'Photo Captured!', 
      `${selectedSpecies} tree photo saved with GPS coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    );
  };

  const submitPlanting = async () => {
    if (photoCount === 0) {
      Alert.alert('No Photos', 'Please capture at least one photo before submitting.');
      return;
    }

    Alert.alert(
      'Success!',
      `${photoCount} ${selectedSpecies} tree(s) submitted for verification!\n\nYou will earn 20 PYEBWA tokens per verified tree.`,
      [
        {
          text: 'OK',
          onPress: () => {
            setPhotoCount(0);
          },
        },
      ]
    );
  };

  if (hasPermission === null || hasLocationPermission === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 16, textAlign: 'center' }}>Requesting camera and location permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 16, textAlign: 'center', color: '#D41125' }}>
          Camera permission denied. Please enable camera access in your device settings.
        </Text>
      </View>
    );
  }

  if (hasLocationPermission === false) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 16, textAlign: 'center', color: '#D41125' }}>
          Location permission denied. GPS is required to verify tree planting in Haiti.
        </Text>
      </View>
    );
  }

  const treeSpecies = [
    { id: 'mango', name: 'Mango', icon: '🥭' },
    { id: 'moringa', name: 'Moringa', icon: '🌿' },
    { id: 'cedar', name: 'Cedar', icon: '🌲' },
    { id: 'bamboo', name: 'Bamboo', icon: '🎋' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* GPS Status */}
      <View style={{ 
        backgroundColor: currentLocation ? '#e8f5e8' : '#ffebee', 
        padding: 15, 
        flexDirection: 'row', 
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Text style={{ fontSize: 18, marginRight: 10 }}>
          {currentLocation ? '🟢' : '🔴'}
        </Text>
        <Text style={{ fontSize: 16, color: currentLocation ? '#2e7d32' : '#c62828' }}>
          {currentLocation 
            ? `GPS: ${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`
            : 'Waiting for GPS signal...'}
        </Text>
      </View>

      {/* Camera Simulation Area */}
      <View style={{ 
        flex: 1, 
        backgroundColor: '#000', 
        justifyContent: 'center', 
        alignItems: 'center',
        margin: 20,
        borderRadius: 15
      }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 60, marginBottom: 20 }}>📸</Text>
          <Text style={{ fontSize: 18, color: 'white', marginBottom: 10 }}>Camera Preview</Text>
          <Text style={{ fontSize: 14, color: '#ccc', textAlign: 'center', paddingHorizontal: 20 }}>
            In a production app, this would show the live camera feed for capturing tree photos
          </Text>
        </View>

        {/* Photo Count */}
        {photoCount > 0 && (
          <View style={{ 
            position: 'absolute', 
            top: 20, 
            right: 20, 
            backgroundColor: 'rgba(0,0,0,0.7)', 
            padding: 10, 
            borderRadius: 20 
          }}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
              {photoCount} photo(s) captured
            </Text>
          </View>
        )}

        {/* Capture Button */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 30,
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#4CAF50',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 4,
            borderColor: 'white',
          }}
          onPress={takePicture}
        >
          <Text style={{ fontSize: 30 }}>📷</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <View style={{ backgroundColor: 'white', padding: 20 }}>
        {/* Species Selector */}
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' }}>
          Select Tree Species:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {treeSpecies.map(species => (
            <TouchableOpacity
              key={species.id}
              style={{
                alignItems: 'center',
                marginRight: 15,
                padding: 15,
                borderRadius: 10,
                backgroundColor: selectedSpecies === species.id ? '#4CAF50' : '#f0f0f0',
                minWidth: 80,
              }}
              onPress={() => setSelectedSpecies(species.id)}
            >
              <Text style={{ fontSize: 25, marginBottom: 5 }}>{species.icon}</Text>
              <Text style={{ 
                fontSize: 12, 
                color: selectedSpecies === species.id ? 'white' : '#333',
                fontWeight: selectedSpecies === species.id ? 'bold' : 'normal'
              }}>
                {species.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Submit Button */}
        {photoCount > 0 && (
          <TouchableOpacity 
            style={{ 
              backgroundColor: '#00217D', 
              padding: 15, 
              borderRadius: 10, 
              alignItems: 'center' 
            }}
            onPress={submitPlanting}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
              Submit {photoCount} {selectedSpecies.charAt(0).toUpperCase() + selectedSpecies.slice(1)} Tree{photoCount > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};