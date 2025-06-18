import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HeritageItem {
  id: string;
  uri: string;
  title: string;
  description: string;
  date: string;
  category: string;
  uploadedAt: Date;
}

export const HeritageUploadScreen: React.FC = () => {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('photo');
  const [isUploading, setIsUploading] = useState(false);
  const [heritageItems, setHeritageItems] = useState<HeritageItem[]>([]);

  React.useEffect(() => {
    loadHeritageItems();
  }, []);

  const loadHeritageItems = async () => {
    try {
      const stored = await AsyncStorage.getItem('heritageItems');
      if (stored) {
        setHeritageItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading heritage items:', error);
    }
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      let result;
      
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('common.error'), t('heritage.cameraPermissionDenied'));
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('common.error'), t('heritage.libraryPermissionDenied'));
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), t('heritage.imagePickError'));
    }
  };

  const uploadHeritage = async () => {
    if (!selectedImage || !title) {
      Alert.alert(t('common.error'), t('heritage.requiredFields'));
      return;
    }

    setIsUploading(true);
    try {
      // Create heritage item
      const newItem: HeritageItem = {
        id: `heritage_${Date.now()}`,
        uri: selectedImage,
        title,
        description,
        date,
        category,
        uploadedAt: new Date(),
      };

      // Save to local storage (in production, upload to server)
      const updatedItems = [...heritageItems, newItem];
      await AsyncStorage.setItem('heritageItems', JSON.stringify(updatedItems));
      setHeritageItems(updatedItems);

      // Reset form
      setSelectedImage(null);
      setTitle('');
      setDescription('');
      setDate('');
      setCategory('photo');

      Alert.alert(
        t('common.success'),
        t('heritage.uploadSuccess'),
        [{ text: 'OK', onPress: () => {} }]
      );
    } catch (error) {
      console.error('Error uploading heritage:', error);
      Alert.alert(t('common.error'), t('heritage.uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  const categories = [
    { id: 'photo', name: t('heritage.categories.photo'), icon: '📷' },
    { id: 'document', name: t('heritage.categories.document'), icon: '📄' },
    { id: 'story', name: t('heritage.categories.story'), icon: '📖' },
    { id: 'artifact', name: t('heritage.categories.artifact'), icon: '🏺' },
  ];

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Upload Section */}
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>{t('heritage.addNewHeritage')}</Text>
          
          {/* Image Selection */}
          {selectedImage ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close-circle" size={30} color="#D41125" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePickerContainer}>
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={() => pickImage('camera')}
              >
                <Ionicons name="camera" size={40} color="#00217D" />
                <Text style={styles.imagePickerText}>{t('heritage.takePhoto')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={() => pickImage('library')}
              >
                <Ionicons name="images" size={40} color="#00217D" />
                <Text style={styles.imagePickerText}>{t('heritage.chooseFromLibrary')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Category Selection */}
          <Text style={styles.label}>{t('heritage.category')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryButton,
                  category === cat.id && styles.selectedCategory
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[
                  styles.categoryName,
                  category === cat.id && styles.selectedCategoryText
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Title Input */}
          <Text style={styles.label}>{t('heritage.title')} *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('heritage.titlePlaceholder')}
            placeholderTextColor="#999"
          />

          {/* Date Input */}
          <Text style={styles.label}>{t('heritage.date')}</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder={t('heritage.datePlaceholder')}
            placeholderTextColor="#999"
          />

          {/* Description Input */}
          <Text style={styles.label}>{t('heritage.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('heritage.descriptionPlaceholder')}
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
          />

          {/* Upload Button */}
          <TouchableOpacity
            style={[styles.uploadButton, isUploading && styles.uploadingButton]}
            onPress={uploadHeritage}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={24} color="white" />
                <Text style={styles.uploadButtonText}>{t('heritage.upload')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Heritage Items List */}
        {heritageItems.length > 0 && (
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>{t('heritage.yourHeritage')}</Text>
            {heritageItems.map(item => (
              <View key={item.id} style={styles.heritageItem}>
                <Image source={{ uri: item.uri }} style={styles.itemThumbnail} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemDate}>{item.date || 'No date'}</Text>
                  <Text style={styles.itemCategory}>
                    {categories.find(c => c.id === item.category)?.icon} {' '}
                    {categories.find(c => c.id === item.category)?.name}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  uploadSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00217D',
    marginBottom: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedImage: {
    width: '100%',
    height: 250,
    borderRadius: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  imagePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  imagePickerButton: {
    alignItems: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#00217D',
    borderRadius: 10,
    borderStyle: 'dashed',
    width: '45%',
  },
  imagePickerText: {
    marginTop: 10,
    color: '#00217D',
    textAlign: 'center',
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
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categorySelector: {
    marginBottom: 10,
  },
  categoryButton: {
    alignItems: 'center',
    marginRight: 15,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    minWidth: 80,
  },
  selectedCategory: {
    backgroundColor: '#00217D',
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryName: {
    marginTop: 5,
    fontSize: 12,
    color: '#333',
  },
  selectedCategoryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#00217D',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 10,
  },
  uploadingButton: {
    opacity: 0.7,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemsSection: {
    backgroundColor: 'white',
    padding: 20,
  },
  heritageItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  itemCategory: {
    fontSize: 14,
    color: '#999',
  },
});