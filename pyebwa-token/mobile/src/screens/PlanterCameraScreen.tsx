import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { FieldMappingService } from '../services/FieldMappingService';
import { PlantingField, Coordinate } from '../types';

interface CapturedPhoto {
  id: string;
  uri: string;
  location: Coordinate;
  fieldId?: string;
  fieldName?: string;
  timestamp: Date;
}

export const PlanterCameraScreen: React.FC = () => {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [nearbyField, setNearbyField] = useState<PlantingField | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'valid' | 'invalid' | 'outside'>('loading');
  const [distance, setDistance] = useState<number | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState('mango');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldService = FieldMappingService.getInstance();

  useEffect(() => {
    checkLocationAndField();
    const interval = setInterval(checkLocationAndField, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const checkLocationAndField = async () => {
    try {
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('camera.locationPermissionDenied'));
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const currentCoord: Coordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date(),
        accuracy: location.coords.accuracy || undefined,
      };

      setCurrentLocation(currentCoord);

      // Validate location against fields
      const validation = await fieldService.validateLocation(currentCoord);

      if (validation.isValid && validation.field) {
        setLocationStatus('valid');
        setNearbyField(validation.field);
        setDistance(null);
      } else if (validation.field && validation.distance) {
        setLocationStatus('outside');
        setNearbyField(validation.field);
        setDistance(validation.distance);
      } else {
        setLocationStatus('invalid');
        setNearbyField(null);
        setDistance(null);
      }
    } catch (error) {
      console.error('Location error:', error);
      setLocationStatus('invalid');
    }
  };

  const capturePhoto = async () => {
    if (locationStatus !== 'valid') {
      Alert.alert(
        t('camera.invalidLocation'),
        locationStatus === 'outside' && nearbyField && distance
          ? t('camera.outsideField', { 
              field: nearbyField.name, 
              distance: Math.round(distance) 
            })
          : t('camera.noValidField')
      );
      return;
    }

    // Check if field has capacity
    if (nearbyField && nearbyField.plantedCount >= nearbyField.capacity) {
      Alert.alert(t('common.error'), t('camera.fieldFull', { field: nearbyField.name }));
      return;
    }

    // Check if selected species is allowed
    if (nearbyField && !nearbyField.allowedSpecies.includes(selectedSpecies)) {
      Alert.alert(
        t('common.error'), 
        t('camera.speciesNotAllowed', { 
          species: t(`trees.${selectedSpecies}`),
          field: nearbyField.name 
        })
      );
      return;
    }

    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('heritage.cameraPermissionDenied'));
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        exif: true,
      });

      if (!result.canceled && result.assets[0]) {
        const photo: CapturedPhoto = {
          id: `photo_${Date.now()}`,
          uri: result.assets[0].uri,
          location: currentLocation!,
          fieldId: nearbyField?.id,
          fieldName: nearbyField?.name,
          timestamp: new Date(),
        };

        setPhotos([...photos, photo]);
        Alert.alert(t('camera.success'), t('camera.photoCaptured'));
      }
    } catch (error) {
      Alert.alert(t('camera.error'), t('camera.captureError'));
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos(photos.filter(p => p.id !== photoId));
  };

  const submitPhotos = async () => {
    if (photos.length === 0) {
      Alert.alert(t('camera.noPhotos'), t('camera.captureFirst'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate submission
      await new Promise(resolve => setTimeout(resolve, 2000));

      const tokens = photos.length * 20; // 20 tokens per tree
      Alert.alert(
        t('camera.success'),
        t('camera.submissionSuccess', {
          count: photos.length,
          species: t(`trees.${selectedSpecies}`),
          tokens,
        }),
        [{ text: 'OK', onPress: () => setPhotos([]) }]
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('camera.submissionError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const treeSpecies = [
    { id: 'mango', name: t('trees.mango'), icon: '🥭' },
    { id: 'moringa', name: t('trees.moringa'), icon: '🌿' },
    { id: 'cedar', name: t('trees.cedar'), icon: '🌲' },
    { id: 'bamboo', name: t('trees.bamboo'), icon: '🎋' },
  ];

  const getLocationStatusIcon = () => {
    switch (locationStatus) {
      case 'valid':
        return <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />;
      case 'outside':
        return <MaterialIcons name="warning" size={24} color="#FF9800" />;
      case 'invalid':
        return <Ionicons name="close-circle" size={24} color="#F44336" />;
      default:
        return <ActivityIndicator size="small" color="#999" />;
    }
  };

  const getLocationStatusText = () => {
    if (locationStatus === 'loading') {
      return t('camera.checkingLocation');
    }
    if (locationStatus === 'valid' && nearbyField) {
      const remaining = nearbyField.capacity - nearbyField.plantedCount;
      return t('camera.inField', { field: nearbyField.name, remaining });
    }
    if (locationStatus === 'outside' && nearbyField && distance) {
      return t('camera.nearField', { field: nearbyField.name, distance: Math.round(distance) });
    }
    return t('camera.noFieldsNearby');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Location Status Card */}
      <View style={[
        styles.statusCard,
        locationStatus === 'valid' ? styles.validStatus : 
        locationStatus === 'outside' ? styles.warningStatus : 
        styles.invalidStatus
      ]}>
        <View style={styles.statusHeader}>
          {getLocationStatusIcon()}
          <Text style={styles.statusTitle}>{t('camera.locationStatus')}</Text>
        </View>
        <Text style={styles.statusText}>{getLocationStatusText()}</Text>
        {currentLocation && currentLocation.accuracy && (
          <Text style={styles.accuracyText}>
            {t('camera.gpsAccuracy')}: {Math.round(currentLocation.accuracy)}m
          </Text>
        )}
      </View>

      {/* Field Info */}
      {nearbyField && locationStatus === 'valid' && (
        <View style={styles.fieldInfo}>
          <Text style={styles.fieldName}>{nearbyField.name}</Text>
          <View style={styles.fieldStats}>
            <View style={styles.fieldStat}>
              <Text style={styles.fieldStatLabel}>{t('camera.capacity')}</Text>
              <Text style={styles.fieldStatValue}>
                {nearbyField.plantedCount} / {nearbyField.capacity}
              </Text>
            </View>
            <View style={styles.fieldStat}>
              <Text style={styles.fieldStatLabel}>{t('camera.allowedSpecies')}</Text>
              <View style={styles.speciesIcons}>
                {nearbyField.allowedSpecies.map(species => {
                  const tree = treeSpecies.find(t => t.id === species);
                  return tree ? (
                    <Text key={species} style={styles.speciesIcon}>{tree.icon}</Text>
                  ) : null;
                })}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Species Selection */}
      <Text style={styles.sectionTitle}>{t('camera.selectSpecies')}</Text>
      <View style={styles.speciesContainer}>
        {treeSpecies.map(species => {
          const isAllowed = !nearbyField || nearbyField.allowedSpecies.includes(species.id);
          return (
            <TouchableOpacity
              key={species.id}
              style={[
                styles.speciesButton,
                selectedSpecies === species.id && styles.selectedSpecies,
                !isAllowed && styles.disabledSpecies,
              ]}
              onPress={() => isAllowed && setSelectedSpecies(species.id)}
              disabled={!isAllowed}
            >
              <Text style={styles.speciesButtonIcon}>{species.icon}</Text>
              <Text style={[
                styles.speciesButtonText,
                selectedSpecies === species.id && styles.selectedSpeciesText,
                !isAllowed && styles.disabledSpeciesText,
              ]}>
                {species.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Capture Button */}
      <TouchableOpacity
        style={[
          styles.captureButton,
          locationStatus !== 'valid' && styles.disabledButton,
        ]}
        onPress={capturePhoto}
        disabled={locationStatus !== 'valid'}
      >
        <Ionicons name="camera" size={24} color="white" />
        <Text style={styles.captureButtonText}>{t('camera.captureTree')}</Text>
      </TouchableOpacity>

      {/* Photo Preview */}
      {photos.length > 0 && (
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>
            {t('camera.photosCaptured', { count: photos.length })}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.photoList}>
              {photos.map(photo => (
                <View key={photo.id} style={styles.photoItem}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(photo.id)}
                  >
                    <Ionicons name="close-circle" size={24} color="#F44336" />
                  </TouchableOpacity>
                  <Text style={styles.photoField}>{photo.fieldName}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Submit Button */}
      {photos.length > 0 && (
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={submitPhotos}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={24} color="white" />
              <Text style={styles.submitButtonText}>
                {photos.length === 1 
                  ? t('camera.submitTrees', { count: photos.length })
                  : t('camera.submitTreesPlural', { count: photos.length })}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  statusCard: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 2,
  },
  validStatus: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  warningStatus: {
    backgroundColor: '#fff3e0',
    borderColor: '#FF9800',
  },
  invalidStatus: {
    backgroundColor: '#ffebee',
    borderColor: '#F44336',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  accuracyText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  fieldInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fieldName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00217D',
    marginBottom: 10,
  },
  fieldStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  fieldStat: {
    alignItems: 'center',
  },
  fieldStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  fieldStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  speciesIcons: {
    flexDirection: 'row',
    gap: 5,
  },
  speciesIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  speciesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  speciesButton: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSpecies: {
    backgroundColor: '#e3f2fd',
    borderColor: '#00217D',
  },
  disabledSpecies: {
    opacity: 0.5,
    backgroundColor: '#f0f0f0',
  },
  speciesButtonIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  speciesButtonText: {
    fontSize: 12,
    color: '#666',
  },
  selectedSpeciesText: {
    color: '#00217D',
    fontWeight: 'bold',
  },
  disabledSpeciesText: {
    color: '#999',
  },
  captureButton: {
    backgroundColor: '#00217D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10,
    marginBottom: 20,
  },
  captureButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  photoSection: {
    marginBottom: 20,
  },
  photoList: {
    flexDirection: 'row',
    gap: 10,
  },
  photoItem: {
    position: 'relative',
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  photoField: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10,
    marginBottom: 40,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});