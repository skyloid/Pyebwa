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
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { PlantingField, Coordinate } from '../types';
import firebaseFieldService from '../services/firebaseFieldService';
import offlineSync from '../services/offlineSync';
import authService from '../services/authService';
import { useTranslation } from 'react-i18next';

interface CapturedPhoto {
  uri: string;
  location: Location.LocationObject | null;
  timestamp: Date;
  id: string;
}

export const CameraScreen: React.FC = () => {
  const { t } = useTranslation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [type, setType] = useState('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<string>('mango');
  const [nearbyFields, setNearbyFields] = useState<PlantingField[]>([]);
  const [selectedField, setSelectedField] = useState<PlantingField | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cameraRef = useRef<any>(null);
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
        await checkNearbyFields(location);
      }
    })();
  }, []);

  const checkNearbyFields = async (location: Location.LocationObject) => {
    try {
      const coordinate: Coordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date(),
        accuracy: location.coords.accuracy
      };

      const result = await firebaseFieldService.getNearbyFields(coordinate, 1000); // 1km radius
      const allFields = [...result.fieldsInside, ...result.fieldsNearby.map(fn => fn.field)];
      
      setNearbyFields(allFields);
      
      // Auto-select field if location is inside one
      if (result.fieldsInside.length > 0) {
        setSelectedField(result.fieldsInside[0]);
      } else if (result.fieldsNearby.length > 0) {
        setSelectedField(result.fieldsNearby[0].field);
      }
      
    } catch (error) {
      console.error('Error checking nearby fields:', error);
      // Fall back to cached fields if offline
      try {
        const cachedFields = await offlineSync.getCachedFields();
        setNearbyFields(cachedFields);
        if (cachedFields.length > 0) {
          setSelectedField(cachedFields[0]);
        }
      } catch (cacheError) {
        console.error('Error getting cached fields:', cacheError);
      }
    }
  };

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
        await checkNearbyFields(location);
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
      Alert.alert(t('camera.noPhotos'), t('camera.capturePhotoFirst'));
      return;
    }

    if (!selectedField) {
      Alert.alert(t('camera.noField'), t('camera.selectFieldFirst'));
      return;
    }

    // Check authentication
    const user = authService.getCurrentUser();
    const userProfile = authService.getUserProfile();
    
    if (!user || !userProfile) {
      Alert.alert(t('common.error'), t('auth.pleaseLogin'));
      return;
    }

    if (userProfile.userType !== 'planter') {
      Alert.alert(t('common.error'), t('camera.plantersOnly'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit each photo as a separate planting record
      const plantingPromises = capturedPhotos.map(async (photo) => {
        if (!photo.location) {
          throw new Error(t('camera.noLocationData'));
        }

        const coordinate: Coordinate = {
          latitude: photo.location.coords.latitude,
          longitude: photo.location.coords.longitude,
          timestamp: photo.timestamp,
          accuracy: photo.location.coords.accuracy
        };

        // Create planting data
        const plantingData = {
          fieldId: selectedField.id,
          species: selectedSpecies,
          location: coordinate,
          photoUri: photo.uri,
          notes: `Planted on ${photo.timestamp.toLocaleDateString()}`
        };

        // Use offline sync for automatic online/offline handling
        return await offlineSync.createPlanting(plantingData);
      });

      await Promise.all(plantingPromises);

      Alert.alert(
        t('common.success'),
        t('camera.plantingSubmitted', { count: capturedPhotos.length }),
        [
          {
            text: 'OK',
            onPress: () => {
              setCapturedPhotos([]);
              setSelectedField(null);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting planting:', error);
      Alert.alert(t('common.error'), error.message || t('camera.submitError'));
    } finally {
      setIsSubmitting(false);
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