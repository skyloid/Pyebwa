import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PlantingField } from '../types';

interface FieldSelectorProps {
  visible: boolean;
  fieldsInside: PlantingField[];
  fieldsNearby: Array<{ field: PlantingField; distance: number }>;
  selectedField: PlantingField | null;
  onSelectField: (field: PlantingField) => void;
  onClose: () => void;
}

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  visible,
  fieldsInside,
  fieldsNearby,
  selectedField,
  onSelectField,
  onClose,
}) => {
  const { t } = useTranslation();

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const formatArea = (area: number): string => {
    if (area < 10000) {
      return `${Math.round(area)} m²`;
    }
    return `${(area / 10000).toFixed(2)} ha`;
  };

  const getUtilizationColor = (planted: number, capacity: number): string => {
    const utilization = planted / capacity;
    if (utilization >= 0.9) return '#F44336';
    if (utilization >= 0.7) return '#FF9800';
    return '#4CAF50';
  };

  const treeSpecies = [
    { id: 'mango', name: t('trees.mango'), icon: '🥭' },
    { id: 'moringa', name: t('trees.moringa'), icon: '🌿' },
    { id: 'cedar', name: t('trees.cedar'), icon: '🌲' },
    { id: 'bamboo', name: t('trees.bamboo'), icon: '🎋' },
  ];

  const renderFieldCard = (field: PlantingField, distance?: number, isInside = false) => {
    const isSelected = selectedField?.id === field.id;
    const remaining = field.capacity - field.plantedCount;
    const isFull = remaining <= 0;

    return (
      <TouchableOpacity
        key={field.id}
        style={[
          styles.fieldCard,
          isSelected && styles.selectedFieldCard,
          isFull && styles.fullFieldCard,
        ]}
        onPress={() => !isFull && onSelectField(field)}
        disabled={isFull}
      >
        <View style={styles.fieldHeader}>
          <View style={styles.fieldTitleRow}>
            <Text style={[styles.fieldName, isFull && styles.disabledText]}>
              {field.name}
            </Text>
            {isInside && (
              <View style={styles.insideIndicator}>
                <Ionicons name="location" size={16} color="white" />
                <Text style={styles.insideText}>{t('fieldSelector.inside')}</Text>
              </View>
            )}
            {distance !== undefined && (
              <View style={styles.distanceIndicator}>
                <MaterialIcons name="straighten" size={16} color="#666" />
                <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.fieldInfo}>
            <Text style={[styles.fieldArea, isFull && styles.disabledText]}>
              {formatArea(field.area)}
            </Text>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </View>
        </View>

        {/* Capacity Bar */}
        <View style={styles.capacityContainer}>
          <View style={styles.capacityHeader}>
            <Text style={[styles.capacityLabel, isFull && styles.disabledText]}>
              {t('fieldSelector.capacity')}
            </Text>
            <Text style={[
              styles.capacityText,
              isFull && styles.disabledText,
              { color: getUtilizationColor(field.plantedCount, field.capacity) }
            ]}>
              {field.plantedCount} / {field.capacity}
            </Text>
          </View>
          <View style={styles.capacityBar}>
            <View
              style={[
                styles.capacityFill,
                {
                  width: `${Math.min((field.plantedCount / field.capacity) * 100, 100)}%`,
                  backgroundColor: getUtilizationColor(field.plantedCount, field.capacity),
                },
              ]}
            />
          </View>
          {!isFull && (
            <Text style={styles.remainingText}>
              {t('fieldSelector.remaining', { count: remaining })}
            </Text>
          )}
          {isFull && (
            <Text style={styles.fullText}>
              {t('fieldSelector.fieldFull')}
            </Text>
          )}
        </View>

        {/* Species Icons */}
        <View style={styles.speciesContainer}>
          <Text style={[styles.speciesLabel, isFull && styles.disabledText]}>
            {t('fieldSelector.allowedSpecies')}:
          </Text>
          <View style={styles.speciesIcons}>
            {field.allowedSpecies.map(species => {
              const tree = treeSpecies.find(t => t.id === species);
              return tree ? (
                <Text key={species} style={[styles.speciesIcon, isFull && styles.disabledIcon]}>
                  {tree.icon}
                </Text>
              ) : null;
            })}
          </View>
        </View>

        {field.description && (
          <Text style={[styles.fieldDescription, isFull && styles.disabledText]}>
            {field.description}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('fieldSelector.selectField')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.fieldList}>
            {/* Fields You're Inside */}
            {fieldsInside.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('fieldSelector.fieldsInside')} ({fieldsInside.length})
                </Text>
                {fieldsInside.map(field => renderFieldCard(field, undefined, true))}
              </View>
            )}

            {/* Nearby Fields */}
            {fieldsNearby.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('fieldSelector.fieldsNearby')} ({fieldsNearby.length})
                </Text>
                {fieldsNearby.map(({ field, distance }) => 
                  renderFieldCard(field, distance, false)
                )}
              </View>
            )}

            {/* No Fields Available */}
            {fieldsInside.length === 0 && fieldsNearby.length === 0 && (
              <View style={styles.noFieldsContainer}>
                <Ionicons name="location-outline" size={64} color="#ccc" />
                <Text style={styles.noFieldsTitle}>{t('fieldSelector.noFields')}</Text>
                <Text style={styles.noFieldsText}>{t('fieldSelector.noFieldsMessage')}</Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            
            {selectedField && (
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={onClose}
              >
                <Text style={styles.confirmButtonText}>
                  {t('fieldSelector.plantIn', { field: selectedField.name })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  fieldList: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00217D',
    marginBottom: 10,
  },
  fieldCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedFieldCard: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  fullFieldCard: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },
  fieldHeader: {
    marginBottom: 12,
  },
  fieldTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  fieldName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  fieldInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldArea: {
    fontSize: 14,
    color: '#666',
  },
  insideIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  insideText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  distanceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  distanceText: {
    color: '#666',
    fontSize: 12,
    marginLeft: 4,
  },
  capacityContainer: {
    marginBottom: 12,
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
  },
  capacityBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  capacityFill: {
    height: '100%',
    borderRadius: 4,
  },
  remainingText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  fullText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
  },
  speciesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  speciesLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  speciesIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  speciesIcon: {
    fontSize: 16,
  },
  fieldDescription: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  disabledText: {
    color: '#ccc',
  },
  disabledIcon: {
    opacity: 0.5,
  },
  noFieldsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noFieldsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
    marginBottom: 10,
  },
  noFieldsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
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
  confirmButton: {
    backgroundColor: '#00217D',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});