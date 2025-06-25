import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FieldMappingService } from '../services/FieldMappingService';
import { Coordinate, MappingSession } from '../types';
import firebaseFieldService from '../services/firebaseFieldService';
import offlineSync from '../services/offlineSync';
import authService from '../services/authService';
import { ManualFieldMapper } from '../components/ManualFieldMapper';
import { GPSStepFieldMapper } from '../components/GPSStepFieldMapper';
import { ContinuousFieldMapper } from '../components/ContinuousFieldMapper';

const { width: screenWidth } = Dimensions.get('window');

export const FieldMapperScreen: React.FC = () => {
  const { t } = useTranslation();
  const [isMapping, setIsMapping] = useState(false);
  const [currentSession, setCurrentSession] = useState<MappingSession | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  
  // Form fields
  const [fieldName, setFieldName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>(['mango']);
  const [description, setDescription] = useState('');
  const [isCreatingField, setIsCreatingField] = useState(false);
  const [showManualMode, setShowManualMode] = useState(false);
  const [showGPSStepMode, setShowGPSStepMode] = useState(false);
  const [showContinuousMode, setShowContinuousMode] = useState(false);
  
  const mappingService = useRef(FieldMappingService.getInstance());

  useEffect(() => {
    checkForExistingSession();
  }, []);

  const checkForExistingSession = async () => {
    const session = await mappingService.current.resumeSession();
    if (session && !session.isComplete) {
      Alert.alert(
        t('fieldMapper.resumeSession'),
        t('fieldMapper.resumeSessionMessage'),
        [
          { text: t('common.cancel'), onPress: () => {} },
          { text: t('fieldMapper.resume'), onPress: () => resumeMapping(session) },
        ]
      );
    }
  };

  const startMapping = async () => {
    try {
      setIsMapping(true);
      const session = await mappingService.current.startMapping((location) => {
        setCurrentLocation(location);
        setCurrentSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            points: [...prev.points, location],
            totalDistance: mappingService.current.calculateDistance(
              prev.points[prev.points.length - 1] || location,
              location
            ) + (prev.totalDistance || 0),
          };
        });
      });
      setCurrentSession(session);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
      setIsMapping(false);
    }
  };

  const resumeMapping = async (session: MappingSession) => {
    setCurrentSession(session);
    setIsMapping(true);
    // Resume location tracking
    await mappingService.current.startMapping((location) => {
      setCurrentLocation(location);
    });
  };

  const stopMapping = async () => {
    const session = await mappingService.current.stopMapping();
    setIsMapping(false);
    
    if (session && session.points.length >= 4) {
      setShowCompleteForm(true);
    } else {
      Alert.alert(
        t('fieldMapper.insufficientPoints'),
        t('fieldMapper.needMorePoints')
      );
    }
  };

  const completeFieldMapping = async () => {
    if (!fieldName || !capacity) {
      Alert.alert(t('common.error'), t('fieldMapper.fillRequiredFields'));
      return;
    }

    // Check if user is authenticated and is a validator
    // First check AsyncStorage for demo users
    const asyncUserType = await AsyncStorage.getItem('userType');
    const asyncIsLoggedIn = await AsyncStorage.getItem('isLoggedIn');
    
    // Check Firebase auth
    const user = authService.getCurrentUser();
    const userProfile = authService.getUserProfile();
    
    // Allow demo validators or Firebase authenticated validators
    const isDemoValidator = asyncIsLoggedIn === 'true' && asyncUserType === 'validator';
    const isFirebaseValidator = user && userProfile && userProfile.userType === 'validator';
    
    if (!isDemoValidator && !isFirebaseValidator) {
      if (!asyncIsLoggedIn && !user) {
        Alert.alert(t('common.error'), t('auth.pleaseLogin'));
      } else {
        Alert.alert(t('common.error'), t('fieldMapper.validatorsOnly'));
      }
      return;
    }

    if (!currentSession || currentSession.points.length < 4) {
      Alert.alert(t('common.error'), t('fieldMapper.insufficientPoints'));
      return;
    }

    setIsCreatingField(true);

    try {
      // Create field using FieldMappingService to ensure it's saved locally
      const field = await mappingService.current.completeFieldMapping(
        fieldName,
        parseInt(capacity),
        selectedSpecies,
        description
      );

      // Also queue for Firebase sync
      await offlineSync.createField(
        fieldName,
        currentSession.points,
        parseInt(capacity),
        selectedSpecies,
        description
      );

      // Calculate area for display
      const area = field.area;

      Alert.alert(
        t('common.success'),
        t('fieldMapper.fieldCreated', { 
          name: fieldName, 
          area: Math.round(area) 
        }),
        [{ text: 'OK', onPress: resetForm }]
      );

      // Don't call stopMapping again as completeFieldMapping already handles cleanup
      
    } catch (error: any) {
      console.error('Error creating field:', error);
      Alert.alert(t('common.error'), error.message || t('fieldMapper.createFieldError'));
    } finally {
      setIsCreatingField(false);
    }
  };

  const resetForm = () => {
    setCurrentSession(null);
    setShowCompleteForm(false);
    setFieldName('');
    setCapacity('');
    setSelectedSpecies(['mango']);
    setDescription('');
    setCurrentLocation(null);
  };

  const handleManualComplete = (points: Coordinate[], totalDistance: number) => {
    // Create a session from manual data
    const manualSession: MappingSession = {
      id: `session_${Date.now()}`,
      points: points,
      startTime: new Date(),
      endTime: new Date(),
      totalDistance: totalDistance,
      isComplete: true,
    };
    
    setCurrentSession(manualSession);
    setShowManualMode(false);
    setShowCompleteForm(true);
  };

  const toggleSpecies = (species: string) => {
    setSelectedSpecies(prev => 
      prev.includes(species)
        ? prev.filter(s => s !== species)
        : [...prev, species]
    );
  };

  const treeSpecies = [
    { id: 'mango', name: t('trees.mango'), icon: '🥭' },
    { id: 'moringa', name: t('trees.moringa'), icon: '🌿' },
    { id: 'cedar', name: t('trees.cedar'), icon: '🌲' },
    { id: 'bamboo', name: t('trees.bamboo'), icon: '🎋' },
  ];

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const formatDuration = (start: Date): string => {
    const diff = new Date().getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Render simple map visualization
  const renderMap = () => {
    if (!currentSession || currentSession.points.length === 0) {
      return (
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={80} color="#ccc" />
          <Text style={styles.mapPlaceholderText}>{t('fieldMapper.startWalking')}</Text>
        </View>
      );
    }

    // Simple visualization of the path
    const points = currentSession.points;
    const minLat = Math.min(...points.map(p => p.latitude));
    const maxLat = Math.max(...points.map(p => p.latitude));
    const minLng = Math.min(...points.map(p => p.longitude));
    const maxLng = Math.max(...points.map(p => p.longitude));
    
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;
    const mapSize = screenWidth - 40;

    return (
      <View style={[styles.map, { width: mapSize, height: mapSize }]}>
        {/* Draw path */}
        {points.map((point, index) => {
          if (index === 0) return null;
          const prevPoint = points[index - 1];
          
          const x1 = ((prevPoint.longitude - minLng) / lngRange) * mapSize;
          const y1 = mapSize - ((prevPoint.latitude - minLat) / latRange) * mapSize;
          const x2 = ((point.longitude - minLng) / lngRange) * mapSize;
          const y2 = mapSize - ((point.latitude - minLat) / latRange) * mapSize;
          
          const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
          const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          
          return (
            <View
              key={index}
              style={[
                styles.pathSegment,
                {
                  left: x1,
                  top: y1,
                  width: length,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}
        
        {/* Draw points */}
        {points.map((point, index) => {
          const x = ((point.longitude - minLng) / lngRange) * mapSize;
          const y = mapSize - ((point.latitude - minLat) / latRange) * mapSize;
          
          return (
            <View
              key={index}
              style={[
                styles.mapPoint,
                {
                  left: x - 5,
                  top: y - 5,
                  backgroundColor: index === 0 ? '#4CAF50' : '#00217D',
                },
              ]}
            />
          );
        })}
        
        {/* Current location */}
        {currentLocation && (
          <View
            style={[
              styles.currentLocationMarker,
              {
                left: ((currentLocation.longitude - minLng) / lngRange) * mapSize - 10,
                top: mapSize - ((currentLocation.latitude - minLat) / latRange) * mapSize - 10,
              },
            ]}
          />
        )}
      </View>
    );
  };

  if (showCompleteForm) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>{t('fieldMapper.completeMapping')}</Text>
          
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('fieldMapper.totalDistance')}</Text>
            <Text style={styles.statusValue}>
              {formatDistance(currentSession?.totalDistance || 0)}
            </Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('fieldMapper.pointsCaptured')}</Text>
            <Text style={styles.statusValue}>{currentSession?.points.length || 0}</Text>
          </View>
          
          <Text style={styles.label}>{t('fieldMapper.fieldName')} *</Text>
          <TextInput
            style={styles.input}
            value={fieldName}
            onChangeText={setFieldName}
            placeholder={t('fieldMapper.fieldNamePlaceholder')}
          />
          
          <Text style={styles.label}>{t('fieldMapper.capacity')} *</Text>
          <TextInput
            style={styles.input}
            value={capacity}
            onChangeText={setCapacity}
            placeholder={t('fieldMapper.capacityPlaceholder')}
            keyboardType="numeric"
          />
          
          <Text style={styles.label}>{t('fieldMapper.allowedSpecies')}</Text>
          <View style={styles.speciesContainer}>
            {treeSpecies.map(species => (
              <TouchableOpacity
                key={species.id}
                style={[
                  styles.speciesButton,
                  selectedSpecies.includes(species.id) && styles.selectedSpecies
                ]}
                onPress={() => toggleSpecies(species.id)}
              >
                <Text style={styles.speciesIcon}>{species.icon}</Text>
                <Text style={[
                  styles.speciesName,
                  selectedSpecies.includes(species.id) && styles.selectedSpeciesText
                ]}>
                  {species.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.label}>{t('fieldMapper.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('fieldMapper.descriptionPlaceholder')}
            multiline
            numberOfLines={4}
          />
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={resetForm}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.completeButton]}
              onPress={completeFieldMapping}
            >
              <Text style={styles.buttonText}>{t('fieldMapper.createField')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map visualization */}
      <View style={styles.mapContainer}>
        {renderMap()}
      </View>
      
      {/* Status panel */}
      <View style={styles.statusPanel}>
        {isMapping && currentSession && (
          <>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>{t('fieldMapper.duration')}</Text>
                <Text style={styles.statusValue}>
                  {formatDuration(currentSession.startTime)}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>{t('fieldMapper.distance')}</Text>
                <Text style={styles.statusValue}>
                  {formatDistance(currentSession.totalDistance)}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>{t('fieldMapper.points')}</Text>
                <Text style={styles.statusValue}>{currentSession.points.length}</Text>
              </View>
            </View>
            
            {currentLocation && currentLocation.accuracy && (
              <View style={styles.accuracyBar}>
                <Ionicons 
                  name="location" 
                  size={16} 
                  color={currentLocation.accuracy < 10 ? '#4CAF50' : currentLocation.accuracy < 20 ? '#FF9800' : '#F44336'} 
                />
                <Text style={[
                  styles.accuracyText,
                  { color: currentLocation.accuracy < 10 ? '#4CAF50' : currentLocation.accuracy < 20 ? '#FF9800' : '#F44336' }
                ]}>
                  {t('fieldMapper.accuracy')}: {Math.round(currentLocation.accuracy)}m
                  {currentLocation.accuracy > 10 && ' (Waiting for better GPS...)'}
                </Text>
              </View>
            )}
          </>
        )}
        
        {/* Control buttons */}
        {!isMapping ? (
          <>
            <TouchableOpacity style={styles.startButton} onPress={startMapping}>
              <Ionicons name="play" size={24} color="white" />
              <Text style={styles.buttonText}>{t('fieldMapper.startMapping')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.manualButton]} 
              onPress={() => setShowManualMode(true)}
            >
              <Ionicons name="hand-left" size={24} color="white" />
              <Text style={styles.buttonText}>Manual GPS Marking</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.hybridButton]} 
              onPress={() => setShowGPSStepMode(true)}
            >
              <Ionicons name="footsteps" size={24} color="white" />
              <Text style={styles.buttonText}>GPS + Step Counter</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.continuousButton]} 
              onPress={() => setShowContinuousMode(true)}
            >
              <Ionicons name="radio-button-on" size={24} color="white" />
              <Text style={styles.buttonText}>Continuous Tracking</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            style={[styles.stopButton, currentSession && currentSession.points.length < 4 && styles.disabledButton]} 
            onPress={stopMapping}
          >
            <Ionicons name="stop" size={24} color="white" />
            <Text style={styles.buttonText}>{t('fieldMapper.stopMapping')}</Text>
          </TouchableOpacity>
        )}
        
        <Text style={styles.instructionText}>
          {isMapping 
            ? t('fieldMapper.walkInstructions')
            : t('fieldMapper.startInstructions')}
        </Text>
      </View>
      
      {/* Manual Mode Modal */}
      <Modal
        visible={showManualMode}
        animationType="slide"
        onRequestClose={() => setShowManualMode(false)}
      >
        <ManualFieldMapper
          onComplete={handleManualComplete}
          onCancel={() => setShowManualMode(false)}
        />
      </Modal>
      
      {/* GPS + Step Mode Modal */}
      <Modal
        visible={showGPSStepMode}
        animationType="slide"
        onRequestClose={() => setShowGPSStepMode(false)}
      >
        <GPSStepFieldMapper
          onComplete={(points, distance) => {
            handleManualComplete(points, distance);
            setShowGPSStepMode(false);
          }}
          onCancel={() => setShowGPSStepMode(false)}
        />
      </Modal>
      
      {/* Continuous Mode Modal */}
      <Modal
        visible={showContinuousMode}
        animationType="slide"
        onRequestClose={() => setShowContinuousMode(false)}
      >
        <ContinuousFieldMapper
          onComplete={(points, distance) => {
            handleManualComplete(points, distance);
            setShowContinuousMode(false);
          }}
          onCancel={() => setShowContinuousMode(false)}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mapContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    marginTop: 20,
    fontSize: 16,
    color: '#999',
  },
  map: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  pathSegment: {
    position: 'absolute',
    height: 3,
    backgroundColor: '#00217D',
    transformOrigin: 'left center',
  },
  mapPoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'white',
  },
  currentLocationMarker: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D41125',
    borderWidth: 3,
    borderColor: 'white',
  },
  statusPanel: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00217D',
  },
  accuracyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 15,
  },
  accuracyText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  manualButton: {
    backgroundColor: '#2196F3',
  },
  hybridButton: {
    backgroundColor: '#9C27B0',
  },
  continuousButton: {
    backgroundColor: '#FF5722',
  },
  stopButton: {
    flexDirection: 'row',
    backgroundColor: '#D41125',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructionText: {
    textAlign: 'center',
    marginTop: 15,
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
  },
  formContainer: {
    padding: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00217D',
    marginBottom: 20,
    textAlign: 'center',
  },
  statCard: {
    backgroundColor: '#f0f5ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  speciesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  speciesButton: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    minWidth: 80,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSpecies: {
    backgroundColor: '#e3f2fd',
    borderColor: '#00217D',
  },
  speciesIcon: {
    fontSize: 24,
  },
  speciesName: {
    marginTop: 5,
    fontSize: 12,
    color: '#333',
  },
  selectedSpeciesText: {
    color: '#00217D',
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 30,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#00217D',
  },
});