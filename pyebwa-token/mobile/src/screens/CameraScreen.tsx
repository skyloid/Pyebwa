import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

interface CapturedPhoto {
  uri: string;
  location: Location.LocationObject | null;
  timestamp: Date;
  id: string;
}

export const CameraScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [type, setType] = useState(CameraType.back);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<string>('mango');
  const cameraRef = useRef<Camera>(null);
  const { addToQueue } = useOfflineQueue();

  useEffect(() => {
    (async () => {
      // Request camera permission
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      setHasPermission(cameraStatus.status === 'granted');

      // Request location permission
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(locationStatus.status === 'granted');

      // Request media library permission
      await MediaLibrary.requestPermissionsAsync();

      // Get current location
      if (locationStatus.status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCurrentLocation(location);
      }
    })();
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      // Get current GPS location
      let location = currentLocation;
      if (hasLocationPermission) {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCurrentLocation(location);
      }

      // Validate GPS is in Haiti
      if (location && !isLocationInHaiti(location.coords.latitude, location.coords.longitude)) {
        Alert.alert('Invalid Location', 'GPS shows you are not in Haiti. Please check your location.');
        setIsCapturing(false);
        return;
      }

      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: true,
      });

      // Create photo object
      const capturedPhoto: CapturedPhoto = {
        uri: photo.uri,
        location,
        timestamp: new Date(),
        id: `photo_${Date.now()}`,
      };

      // Add to captured photos
      setCapturedPhotos(prev => [...prev, capturedPhoto]);

      // Save to media library
      await MediaLibrary.createAssetAsync(photo.uri);

    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  };

  const isLocationInHaiti = (lat: number, lon: number): boolean => {
    return lat >= 18.0 && lat <= 20.1 && lon >= -74.5 && lon <= -71.6;
  };

  const submitPlanting = async () => {
    if (capturedPhotos.length === 0) {
      Alert.alert('No Photos', 'Please capture at least one photo before submitting.');
      return;
    }

    try {
      // Create submission data
      const submission = {
        photos: capturedPhotos,
        species: selectedSpecies,
        treeCount: capturedPhotos.length,
        timestamp: new Date(),
        deviceId: 'device_123', // Get actual device ID
      };

      // Add to offline queue
      await addToQueue('planting_submission', submission);

      Alert.alert(
        'Success',
        `${capturedPhotos.length} tree(s) submitted for verification!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCapturedPhotos([]);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting:', error);
      Alert.alert('Error', 'Failed to submit planting evidence');
    }
  };

  if (hasPermission === null || hasLocationPermission === null) {
    return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
  }

  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  const treeSpecies = [
    { id: 'mango', name: 'Mango', icon: '🥭' },
    { id: 'moringa', name: 'Moringa', icon: '🌿' },
    { id: 'cedar', name: 'Cedar', icon: '🌲' },
    { id: 'bamboo', name: 'Bamboo', icon: '🎋' },
  ];

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={type} ref={cameraRef}>
        <View style={styles.overlay}>
          {/* GPS Status */}
          <View style={styles.gpsStatus}>
            <Ionicons 
              name="location" 
              size={20} 
              color={currentLocation ? '#00875A' : '#FF6B6B'} 
            />
            <Text style={styles.gpsText}>
              {currentLocation 
                ? `${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`
                : 'No GPS signal'}
            </Text>
          </View>

          {/* Capture button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.captureButton, isCapturing && styles.capturingButton]}
              onPress={takePicture}
              disabled={isCapturing}
            >
              <Ionicons name="camera" size={40} color="white" />
            </TouchableOpacity>
          </View>

          {/* Photo count */}
          {capturedPhotos.length > 0 && (
            <View style={styles.photoCount}>
              <Text style={styles.photoCountText}>
                {capturedPhotos.length} photo(s) captured
              </Text>
            </View>
          )}
        </View>
      </Camera>

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        {/* Species selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.speciesSelector}>
          {treeSpecies.map(species => (
            <TouchableOpacity
              key={species.id}
              style={[
                styles.speciesButton,
                selectedSpecies === species.id && styles.selectedSpecies
              ]}
              onPress={() => setSelectedSpecies(species.id)}
            >
              <Text style={styles.speciesIcon}>{species.icon}</Text>
              <Text style={styles.speciesName}>{species.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Submit button */}
        {capturedPhotos.length > 0 && (
          <TouchableOpacity style={styles.submitButton} onPress={submitPlanting}>
            <Text style={styles.submitButtonText}>
              Submit {capturedPhotos.length} Tree{capturedPhotos.length > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  gpsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    margin: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  gpsText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 12,
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00875A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  capturingButton: {
    opacity: 0.5,
  },
  photoCount: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 20,
  },
  photoCountText: {
    color: 'white',
    fontWeight: 'bold',
  },
  bottomPanel: {
    backgroundColor: 'white',
    padding: 20,
  },
  speciesSelector: {
    marginBottom: 15,
  },
  speciesButton: {
    alignItems: 'center',
    marginRight: 15,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  selectedSpecies: {
    backgroundColor: '#00875A',
  },
  speciesIcon: {
    fontSize: 30,
  },
  speciesName: {
    marginTop: 5,
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: '#00875A',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});