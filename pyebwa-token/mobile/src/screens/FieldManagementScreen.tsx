import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FieldMappingService } from '../services/FieldMappingService';
import { PlantingField } from '../types';

const { width: screenWidth } = Dimensions.get('window');

export const FieldManagementScreen: React.FC = () => {
  const { t } = useTranslation();
  const [fields, setFields] = useState<PlantingField[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedField, setSelectedField] = useState<PlantingField | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCapacity, setEditCapacity] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSpecies, setEditSpecies] = useState<string[]>([]);

  const fieldService = FieldMappingService.getInstance();

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    setLoading(true);
    try {
      const allFields = await fieldService.getAllFields();
      setFields(allFields);
    } catch (error) {
      console.error('Error loading fields:', error);
      Alert.alert(t('common.error'), t('fieldManagement.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (field: PlantingField) => {
    setSelectedField(field);
    setEditName(field.name);
    setEditCapacity(field.capacity.toString());
    setEditDescription(field.description || '');
    setEditSpecies(field.allowedSpecies);
    setShowEditModal(true);
  };

  const openDetailsModal = (field: PlantingField) => {
    setSelectedField(field);
    setShowDetailsModal(true);
  };

  const saveFieldEdits = async () => {
    if (!selectedField) return;

    if (!editName || !editCapacity) {
      Alert.alert(t('common.error'), t('fieldMapper.fillRequiredFields'));
      return;
    }

    try {
      const updatedField: PlantingField = {
        ...selectedField,
        name: editName,
        capacity: parseInt(editCapacity),
        description: editDescription,
        allowedSpecies: editSpecies,
        updatedAt: new Date(),
      };

      await fieldService.updateField(updatedField);
      await loadFields();
      setShowEditModal(false);
      Alert.alert(t('common.success'), t('fieldManagement.updateSuccess'));
    } catch (error) {
      Alert.alert(t('common.error'), t('fieldManagement.updateError'));
    }
  };

  const toggleFieldStatus = async (field: PlantingField) => {
    const newStatus = field.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? t('fieldManagement.activate') : t('fieldManagement.deactivate');
    
    Alert.alert(
      t('fieldManagement.confirmStatusChange'),
      t('fieldManagement.confirmStatusMessage', { action, field: field.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              const updatedField: PlantingField = {
                ...field,
                status: newStatus,
                updatedAt: new Date(),
              };
              await fieldService.updateField(updatedField);
              await loadFields();
              Alert.alert(t('common.success'), t('fieldManagement.statusChangeSuccess'));
            } catch (error) {
              Alert.alert(t('common.error'), t('fieldManagement.statusChangeError'));
            }
          },
        },
      ]
    );
  };

  const exportFieldData = async () => {
    try {
      const csvData = fields.map(field => ({
        Name: field.name,
        Area: `${Math.round(field.area)} m²`,
        Capacity: field.capacity,
        Planted: field.plantedCount,
        Status: field.status,
        Created: new Date(field.createdAt).toLocaleDateString(),
        Species: field.allowedSpecies.join(', '),
      }));

      // In a real app, this would create and save a CSV file
      Alert.alert(
        t('fieldManagement.exportSuccess'),
        t('fieldManagement.exportMessage', { count: fields.length })
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('fieldManagement.exportError'));
    }
  };

  const getUtilizationColor = (planted: number, capacity: number): string => {
    const utilization = planted / capacity;
    if (utilization >= 0.9) return '#F44336';
    if (utilization >= 0.7) return '#FF9800';
    return '#4CAF50';
  };

  const formatArea = (area: number): string => {
    if (area < 10000) {
      return `${Math.round(area)} m²`;
    }
    return `${(area / 10000).toFixed(2)} ha`;
  };

  const treeSpecies = [
    { id: 'mango', name: t('trees.mango'), icon: '🥭' },
    { id: 'moringa', name: t('trees.moringa'), icon: '🌿' },
    { id: 'cedar', name: t('trees.cedar'), icon: '🌲' },
    { id: 'bamboo', name: t('trees.bamboo'), icon: '🎋' },
  ];

  const toggleSpecies = (species: string) => {
    setEditSpecies(prev =>
      prev.includes(species)
        ? prev.filter(s => s !== species)
        : [...prev, species]
    );
  };

  // Simple map visualization for field
  const renderFieldMap = (field: PlantingField) => {
    const points = field.polygon;
    if (points.length < 3) return null;

    const minLat = Math.min(...points.map(p => p.latitude));
    const maxLat = Math.max(...points.map(p => p.latitude));
    const minLng = Math.min(...points.map(p => p.longitude));
    const maxLng = Math.max(...points.map(p => p.longitude));
    
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;
    const mapSize = screenWidth - 80;

    return (
      <View style={[styles.miniMap, { width: mapSize, height: mapSize / 2 }]}>
        {points.map((point, index) => {
          if (index === 0) return null;
          const prevPoint = points[index - 1];
          
          const x1 = ((prevPoint.longitude - minLng) / lngRange) * mapSize;
          const y1 = (mapSize / 2) - ((prevPoint.latitude - minLat) / latRange) * (mapSize / 2);
          const x2 = ((point.longitude - minLng) / lngRange) * mapSize;
          const y2 = (mapSize / 2) - ((point.latitude - minLat) / latRange) * (mapSize / 2);
          
          const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
          const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          
          return (
            <View
              key={index}
              style={[
                styles.mapLine,
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
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00217D" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{fields.length}</Text>
            <Text style={styles.summaryLabel}>{t('fieldManagement.totalFields')}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {formatArea(fields.reduce((sum, f) => sum + f.area, 0))}
            </Text>
            <Text style={styles.summaryLabel}>{t('fieldManagement.totalArea')}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {fields.reduce((sum, f) => sum + f.plantedCount, 0)}
            </Text>
            <Text style={styles.summaryLabel}>{t('fieldManagement.totalTrees')}</Text>
          </View>
        </View>

        {/* Export Button */}
        <TouchableOpacity style={styles.exportButton} onPress={exportFieldData}>
          <Ionicons name="download-outline" size={20} color="#00217D" />
          <Text style={styles.exportButtonText}>{t('fieldManagement.exportData')}</Text>
        </TouchableOpacity>

        {/* Field List */}
        {fields.map((field) => (
          <TouchableOpacity
            key={field.id}
            style={[
              styles.fieldCard,
              field.status === 'inactive' && styles.inactiveField,
            ]}
            onPress={() => openDetailsModal(field)}
          >
            <View style={styles.fieldHeader}>
              <View>
                <Text style={styles.fieldName}>{field.name}</Text>
                <Text style={styles.fieldArea}>{formatArea(field.area)}</Text>
              </View>
              <View style={styles.fieldActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    openEditModal(field);
                  }}
                >
                  <Ionicons name="pencil" size={20} color="#00217D" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleFieldStatus(field);
                  }}
                >
                  <Ionicons
                    name={field.status === 'active' ? 'eye-off' : 'eye'}
                    size={20}
                    color={field.status === 'active' ? '#F44336' : '#4CAF50'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Capacity Bar */}
            <View style={styles.capacityContainer}>
              <View style={styles.capacityHeader}>
                <Text style={styles.capacityLabel}>{t('fieldManagement.capacity')}</Text>
                <Text style={styles.capacityText}>
                  {field.plantedCount} / {field.capacity}
                </Text>
              </View>
              <View style={styles.capacityBar}>
                <View
                  style={[
                    styles.capacityFill,
                    {
                      width: `${(field.plantedCount / field.capacity) * 100}%`,
                      backgroundColor: getUtilizationColor(field.plantedCount, field.capacity),
                    },
                  ]}
                />
              </View>
            </View>

            {/* Species Icons */}
            <View style={styles.speciesContainer}>
              {field.allowedSpecies.map(species => {
                const tree = treeSpecies.find(t => t.id === species);
                return tree ? (
                  <Text key={species} style={styles.speciesIcon}>{tree.icon}</Text>
                ) : null;
              })}
            </View>

            {/* Status Badge */}
            <View style={[
              styles.statusBadge,
              field.status === 'active' ? styles.activeBadge : styles.inactiveBadge,
            ]}>
              <Text style={styles.statusText}>
                {t(`fieldManagement.status.${field.status}`)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('fieldManagement.editField')}</Text>

            <Text style={styles.inputLabel}>{t('fieldMapper.fieldName')}</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder={t('fieldMapper.fieldNamePlaceholder')}
            />

            <Text style={styles.inputLabel}>{t('fieldMapper.capacity')}</Text>
            <TextInput
              style={styles.input}
              value={editCapacity}
              onChangeText={setEditCapacity}
              placeholder={t('fieldMapper.capacityPlaceholder')}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>{t('fieldMapper.allowedSpecies')}</Text>
            <View style={styles.speciesGrid}>
              {treeSpecies.map(species => (
                <TouchableOpacity
                  key={species.id}
                  style={[
                    styles.speciesButton,
                    editSpecies.includes(species.id) && styles.selectedSpecies,
                  ]}
                  onPress={() => toggleSpecies(species.id)}
                >
                  <Text style={styles.speciesButtonIcon}>{species.icon}</Text>
                  <Text style={[
                    styles.speciesButtonText,
                    editSpecies.includes(species.id) && styles.selectedSpeciesText,
                  ]}>
                    {species.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>{t('fieldMapper.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder={t('fieldMapper.descriptionPlaceholder')}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveFieldEdits}
              >
                <Text style={styles.saveButtonText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal visible={showDetailsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {selectedField && (
                <>
                  <Text style={styles.modalTitle}>{selectedField.name}</Text>
                  
                  {renderFieldMap(selectedField)}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('fieldManagement.area')}:</Text>
                    <Text style={styles.detailValue}>{formatArea(selectedField.area)}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('fieldManagement.planted')}:</Text>
                    <Text style={styles.detailValue}>
                      {selectedField.plantedCount} / {selectedField.capacity} {t('trees.trees')}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('fieldManagement.created')}:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedField.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('fieldManagement.status')}:</Text>
                    <Text style={[
                      styles.detailValue,
                      { color: selectedField.status === 'active' ? '#4CAF50' : '#F44336' }
                    ]}>
                      {t(`fieldManagement.status.${selectedField.status}`)}
                    </Text>
                  </View>

                  {selectedField.description && (
                    <View style={styles.descriptionContainer}>
                      <Text style={styles.detailLabel}>{t('fieldManagement.description')}:</Text>
                      <Text style={styles.descriptionText}>{selectedField.description}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, styles.closeButton]}
              onPress={() => setShowDetailsModal(false)}
            >
              <Text style={styles.closeButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00217D',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  exportButton: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#00217D',
  },
  exportButtonText: {
    fontSize: 16,
    color: '#00217D',
    fontWeight: '600',
  },
  fieldCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inactiveField: {
    opacity: 0.6,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  fieldName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  fieldArea: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  fieldActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  capacityContainer: {
    marginBottom: 10,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  capacityLabel: {
    fontSize: 14,
    color: '#666',
  },
  capacityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  capacityBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 4,
  },
  speciesContainer: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 10,
  },
  speciesIcon: {
    fontSize: 20,
  },
  statusBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  activeBadge: {
    backgroundColor: '#e8f5e9',
  },
  inactiveBadge: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00217D',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
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
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  speciesGrid: {
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
    minWidth: 70,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSpecies: {
    backgroundColor: '#e3f2fd',
    borderColor: '#00217D',
  },
  speciesButtonIcon: {
    fontSize: 24,
  },
  speciesButtonText: {
    marginTop: 5,
    fontSize: 12,
    color: '#333',
  },
  selectedSpeciesText: {
    color: '#00217D',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
  },
  modalButton: {
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
  saveButton: {
    backgroundColor: '#00217D',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#00217D',
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  miniMap: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    marginVertical: 15,
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mapLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#00217D',
    transformOrigin: 'left center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  descriptionContainer: {
    marginTop: 15,
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
    lineHeight: 20,
  },
});