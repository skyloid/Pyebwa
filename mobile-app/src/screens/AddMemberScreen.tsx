import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Avatar,
  Menu,
  useTheme,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

interface MemberFormData {
  firstName: string;
  lastName: string;
  relationship: string;
  birthDate: string;
  birthPlace: string;
  deathDate: string;
  occupation: string;
  biography: string;
  photo: string | null;
}

const relationships = [
  'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister',
  'Grandfather', 'Grandmother', 'Grandson', 'Granddaughter',
  'Uncle', 'Aunt', 'Nephew', 'Niece', 'Cousin',
  'Husband', 'Wife', 'Partner',
];

export default function AddMemberScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(false);
  const [relationshipMenuVisible, setRelationshipMenuVisible] = useState(false);
  const [formData, setFormData] = useState<MemberFormData>({
    firstName: '',
    lastName: '',
    relationship: '',
    birthDate: '',
    birthPlace: '',
    deathDate: '',
    occupation: '',
    biography: '',
    photo: null,
  });

  const updateFormData = (field: keyof MemberFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateFormData('photo', result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateFormData('photo', result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName || !formData.relationship) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Persist the new member through the active mobile data layer here
      console.log('Saving member:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Success',
        'Family member added successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add family member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView}>
          {/* Photo Section */}
          <Card style={styles.photoCard}>
            <Card.Content style={styles.photoContent}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Photo
              </Text>
              <View style={styles.photoContainer}>
                {formData.photo ? (
                  <Avatar.Image size={120} source={{ uri: formData.photo }} />
                ) : (
                  <Avatar.Icon 
                    size={120} 
                    icon="camera-plus" 
                    style={{ backgroundColor: theme.colors.surfaceVariant }}
                  />
                )}
                <Button 
                  mode="outlined" 
                  onPress={showImageOptions}
                  style={styles.photoButton}
                >
                  {formData.photo ? 'Change Photo' : 'Add Photo'}
                </Button>
              </View>
            </Card.Content>
          </Card>

          {/* Basic Information */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Basic Information
              </Text>
              
              <TextInput
                label="First Name *"
                value={formData.firstName}
                onChangeText={(text) => updateFormData('firstName', text)}
                mode="outlined"
                style={styles.input}
                autoCapitalize="words"
              />

              <TextInput
                label="Last Name *"
                value={formData.lastName}
                onChangeText={(text) => updateFormData('lastName', text)}
                mode="outlined"
                style={styles.input}
                autoCapitalize="words"
              />

              <Menu
                visible={relationshipMenuVisible}
                onDismiss={() => setRelationshipMenuVisible(false)}
                anchor={
                  <TextInput
                    label="Relationship *"
                    value={formData.relationship}
                    mode="outlined"
                    style={styles.input}
                    editable={false}
                    right={
                      <TextInput.Icon
                        icon="chevron-down"
                        onPress={() => setRelationshipMenuVisible(true)}
                      />
                    }
                    onPressIn={() => setRelationshipMenuVisible(true)}
                  />
                }
              >
                {relationships.map((relationship) => (
                  <Menu.Item
                    key={relationship}
                    onPress={() => {
                      updateFormData('relationship', relationship);
                      setRelationshipMenuVisible(false);
                    }}
                    title={relationship}
                  />
                ))}
              </Menu>
            </Card.Content>
          </Card>

          {/* Life Details */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Life Details
              </Text>
              
              <TextInput
                label="Birth Date"
                value={formData.birthDate}
                onChangeText={(text) => updateFormData('birthDate', text)}
                mode="outlined"
                style={styles.input}
                placeholder="MM/DD/YYYY"
                keyboardType="numeric"
              />

              <TextInput
                label="Birth Place"
                value={formData.birthPlace}
                onChangeText={(text) => updateFormData('birthPlace', text)}
                mode="outlined"
                style={styles.input}
                autoCapitalize="words"
              />

              <TextInput
                label="Death Date (if applicable)"
                value={formData.deathDate}
                onChangeText={(text) => updateFormData('deathDate', text)}
                mode="outlined"
                style={styles.input}
                placeholder="MM/DD/YYYY"
                keyboardType="numeric"
              />

              <TextInput
                label="Occupation"
                value={formData.occupation}
                onChangeText={(text) => updateFormData('occupation', text)}
                mode="outlined"
                style={styles.input}
                autoCapitalize="words"
              />
            </Card.Content>
          </Card>

          {/* Biography */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Biography
              </Text>
              
              <TextInput
                label="Tell their story..."
                value={formData.biography}
                onChangeText={(text) => updateFormData('biography', text)}
                mode="outlined"
                style={styles.biographyInput}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </Card.Content>
          </Card>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={[styles.button, { flex: 1, marginRight: 8 }]}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={[styles.button, { flex: 1, marginLeft: 8 }]}
              loading={loading}
              disabled={loading}
            >
              Save Member
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  photoCard: {
    marginBottom: 16,
  },
  photoContent: {
    alignItems: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  photoButton: {
    marginTop: 16,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  biographyInput: {
    marginBottom: 8,
    minHeight: 120,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 32,
  },
  button: {
    paddingVertical: 4,
  },
});
