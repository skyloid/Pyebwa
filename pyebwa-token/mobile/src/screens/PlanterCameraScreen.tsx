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
import { FieldSelector } from '../components/FieldSelector';
import { simplePlantingService } from '../services/SimplePlantingService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [selectedField, setSelectedField] = useState<PlantingField | null>(null);
  const [fieldsInside, setFieldsInside] = useState<PlantingField[]>([]);
  const [fieldsNearby, setFieldsNearby] = useState<Array<{ field: PlantingField; distance: number }>>([]);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'valid' | 'invalid' | 'outside' | 'multiple'>('loading');
  const [selectedSpecies, setSelectedSpecies] = useState('mango');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [fieldLocked, setFieldLocked] = useState(false); // Lock field selection

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

      // Get all fields for debugging
      const allFields = await fieldService.getAllFields();
      console.log(`Total fields available: ${allFields.length}`);
      
      // Get nearby fields
      const nearbyFields = await fieldService.getNearbyFields(currentCoord, 1000);
      setFieldsInside(nearbyFields.fieldsInside);
      setFieldsNearby(nearbyFields.fieldsNearby);
      
      console.log(`Fields at location: ${nearbyFields.fieldsInside.length}`);
      console.log(`Fields nearby: ${nearbyFields.fieldsNearby.length}`);

      // If field is locked and selected, check if we're still reasonably close
      if (fieldLocked && selectedField) {
        // Check if we're inside the selected field
        const stillInside = nearbyFields.fieldsInside.some(f => f.id === selectedField.id);
        
        // Check if we're near the selected field (within 20m tolerance)
        const nearSelected = nearbyFields.fieldsNearby.some(
          item => item.field.id === selectedField.id && item.distance <= 20
        );
        
        if (stillInside) {
          setLocationStatus('valid');
        } else if (nearSelected) {
          setLocationStatus('valid'); // Still consider valid if within 20m
        } else {
          setLocationStatus('outside');
          // Don't clear the field since it's locked
        }
        return; // Don't auto-update when locked
      }

      // Normal auto-selection logic when not locked
      if (nearbyFields.fieldsInside.length === 1) {
        // Single field - auto select
        setSelectedField(nearbyFields.fieldsInside[0]);
        setLocationStatus('valid');
      } else if (nearbyFields.fieldsInside.length > 1) {
        // Multiple fields - need selection
        setLocationStatus('multiple');
        if (!selectedField || !nearbyFields.fieldsInside.some(f => f.id === selectedField.id)) {
          setSelectedField(null);
        }
      } else if (nearbyFields.fieldsNearby.length > 0) {
        // Outside but near fields
        setLocationStatus('outside');
        setSelectedField(null);
      } else {
        // No fields nearby
        setLocationStatus('invalid');
        setSelectedField(null);
      }
    } catch (error) {
      console.error('Location error:', error);
      setLocationStatus('invalid');
    }
  };

  const capturePhoto = async () => {
    // If field is NOT locked or NOT selected, check field selection
    if (!fieldLocked || !selectedField) {
      // Normal field selection logic
      if (locationStatus === 'multiple') {
        setShowFieldSelector(true);
        return;
      }

      if (locationStatus !== 'valid' || !selectedField) {
        if (locationStatus === 'outside' && fieldsNearby.length > 0) {
          setShowFieldSelector(true);
          return;
        }
        Alert.alert(t('camera.invalidLocation'), t('camera.noValidField'));
        return;
      }
    }

    // At this point, we have a valid selected field (either locked or auto-selected)
    if (!selectedField) {
      Alert.alert(t('common.error'), t('camera.noFieldSelected'));
      return;
    }

    // Check if field has capacity
    if (selectedField.plantedCount >= selectedField.capacity) {
      Alert.alert(t('common.error'), t('camera.fieldFull', { field: selectedField.name }));
      return;
    }

    // Check if selected species is allowed
    if (!selectedField.allowedSpecies.includes(selectedSpecies)) {
      Alert.alert(
        t('common.error'), 
        t('camera.speciesNotAllowed', { 
          species: t(`trees.${selectedSpecies}`),
          field: selectedField.name 
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
          fieldId: selectedField?.id,
          fieldName: selectedField?.name,
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

    if (!selectedField) {
      Alert.alert(t('common.error'), t('camera.noFieldSelected'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Get planter name from AsyncStorage
      const planterName = await AsyncStorage.getItem('userName') || 'Unknown Planter';

      // Prepare photos with location data
      const photosWithLocation = photos.map(photo => ({
        uri: photo.uri,
        location: photo.location,
      }));

      // Record plantings
      const plantingRecords = await simplePlantingService.recordPlantings(
        selectedField.id,
        selectedSpecies,
        photosWithLocation,
        planterName
      );

      const tokens = plantingRecords.length * 20; // 20 tokens per tree
      
      // Update the selectedField state to reflect new planted count
      const updatedField = await fieldService.getFieldById(selectedField.id);
      if (updatedField) {
        setSelectedField(updatedField);
      }

      Alert.alert(
        t('camera.success'),
        t('camera.submissionSuccess', {
          count: plantingRecords.length,
          species: t(`trees.${selectedSpecies}`),
          tokens,
        }),
        [{ text: 'OK', onPress: () => setPhotos([]) }]
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('camera.submissionError'));
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
      case 'multiple':
        return <MaterialIcons name="list" size={24} color="#2196F3" />;
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
    if (locationStatus === 'valid' && selectedField) {
      const remaining = selectedField.capacity - selectedField.plantedCount;
      return t('camera.inField', { field: selectedField.name, remaining });
    }
    if (locationStatus === 'multiple') {
      return t('camera.multipleFields', { count: fieldsInside.length });
    }
    if (locationStatus === 'outside' && fieldsNearby.length > 0) {
      const nearest = fieldsNearby[0];
      return t('camera.nearField', { field: nearest.field.name, distance: Math.round(nearest.distance) });
    }
    return t('camera.noFieldsNearby');
  };

  const formatCoordinate = (coord: number, isLat: boolean) => {
    const absolute = Math.abs(coord);
    const degrees = Math.floor(absolute);
    const minutes = (absolute - degrees) * 60;
    const direction = isLat ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    return `${degrees}°${minutes.toFixed(3)}'${direction}`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Location Status Card */}
      <View style={[
        styles.statusCard,
        locationStatus === 'valid' ? styles.validStatus : 
        locationStatus === 'multiple' ? styles.multipleStatus :
        locationStatus === 'outside' ? styles.warningStatus : 
        styles.invalidStatus
      ]}>
        <View style={styles.statusHeader}>
          {getLocationStatusIcon()}
          <Text style={styles.statusTitle}>{t('camera.locationStatus')}</Text>
          {(locationStatus === 'multiple' || (locationStatus === 'outside' && fieldsNearby.length > 0)) && (
            <TouchableOpacity
              style={styles.selectFieldButton}
              onPress={() => setShowFieldSelector(true)}
            >
              <Text style={styles.selectFieldText}>{t('camera.selectField')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.statusText}>{getLocationStatusText()}</Text>
        {currentLocation && currentLocation.accuracy && (
          <Text style={styles.accuracyText}>
            {t('camera.gpsAccuracy')}: {Math.round(currentLocation.accuracy)}m
          </Text>
        )}
        {/* GPS Debug Info */}
        {currentLocation && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              {formatCoordinate(currentLocation.latitude, true)} {formatCoordinate(currentLocation.longitude, false)}
            </Text>
            <Text style={styles.debugText}>
              Total fields available: {fieldsInside.length + fieldsNearby.length}
            </Text>
          </View>
        )}
      </View>

      {/* Field Info */}
      {selectedField && (locationStatus === 'valid' || fieldLocked) && (
        <View style={styles.fieldInfo}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldName}>{selectedField.name}</Text>
            <TouchableOpacity
              style={[styles.lockButton, fieldLocked && styles.lockButtonActive]}
              onPress={() => setFieldLocked(!fieldLocked)}
            >
              <Ionicons 
                name={fieldLocked ? "lock-closed" : "lock-open"} 
                size={20} 
                color={fieldLocked ? "#4CAF50" : "#666"} 
              />
            </TouchableOpacity>
          </View>
          <View style={styles.fieldStats}>
            <View style={styles.fieldStat}>
              <Text style={styles.fieldStatLabel}>{t('camera.capacity')}</Text>
              <Text style={styles.fieldStatValue}>
                {selectedField.plantedCount} / {selectedField.capacity}
              </Text>
            </View>
            <View style={styles.fieldStat}>
              <Text style={styles.fieldStatLabel}>{t('camera.allowedSpecies')}</Text>
              <View style={styles.speciesIcons}>
                {selectedField.allowedSpecies.map(species => {
                  const tree = treeSpecies.find(t => t.id === species);
                  return tree ? (
                    <Text key={species} style={styles.speciesIcon}>{tree.icon}</Text>
                  ) : null;
                })}
              </View>
            </View>
          </View>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(selectedField.plantedCount / selectedField.capacity) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round((selectedField.plantedCount / selectedField.capacity) * 100)}% {t('common.complete')}
            </Text>
          </View>
        </View>
      )}

      {/* Species Selection */}
      <Text style={styles.sectionTitle}>{t('camera.selectSpecies')}</Text>
      <View style={styles.speciesContainer}>
        {treeSpecies.map(species => {
          const isAllowed = !selectedField || selectedField.allowedSpecies.includes(species.id);
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
          (!fieldLocked && locationStatus !== 'valid' && locationStatus !== 'multiple' && locationStatus !== 'outside') && styles.disabledButton,
        ]}
        onPress={capturePhoto}
        disabled={!fieldLocked && locationStatus !== 'valid' && locationStatus !== 'multiple' && locationStatus !== 'outside'}
      >
        <Ionicons name="camera" size={24} color="white" />
        <Text style={styles.captureButtonText}>
          {(fieldLocked && selectedField) 
            ? t('camera.captureTree')
            : (locationStatus === 'multiple' || (locationStatus === 'outside' && fieldsNearby.length > 0)
              ? t('camera.selectFieldToCapture')
              : t('camera.captureTree'))}
        </Text>
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

      {/* Field Selector Modal */}
      <FieldSelector
        visible={showFieldSelector}
        fieldsInside={fieldsInside}
        fieldsNearby={fieldsNearby}
        selectedField={selectedField}
        onSelectField={(field) => {
          setSelectedField(field);
          setLocationStatus('valid');
          setFieldLocked(true); // Lock the field when manually selected
        }}
        onClose={() => setShowFieldSelector(false)}
      />
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
  multipleStatus: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  invalidStatus: {
    backgroundColor: '#ffebee',
    borderColor: '#F44336',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
    flex: 1,
  },
  selectFieldButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  selectFieldText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
  debugInfo: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
  progressContainer: {
    marginTop: 15,
  },
  progressBar: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 5,
    fontSize: 12,
    color: '#666',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  lockButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  lockButtonActive: {
    backgroundColor: '#e8f5e9',
  },
});