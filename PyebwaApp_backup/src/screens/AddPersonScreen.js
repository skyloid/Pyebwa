import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Surface,
  Title,
  useTheme,
  IconButton,
  Chip,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';

const AddPersonScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [biography, setBiography] = useState('');
  const [birthDate, setBirthDate] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSelectDate = () => {
    Alert.alert(
      t('selectDate'),
      'Date picker functionality will be implemented here',
      [
        {
          text: 'OK',
          onPress: () => {
            const today = new Date();
            setBirthDate(today.toLocaleDateString());
          },
        },
      ]
    );
  };

  const handleSaveMember = async () => {
    if (!firstName || !lastName) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    setLoading(true);

    const personData = {
      firstName,
      lastName,
      biography,
      birthDate,
      createdAt: new Date().toISOString(),
    };

    Alert.alert(
      'Member to be saved',
      JSON.stringify(personData, null, 2),
      [
        {
          text: 'OK',
          onPress: () => {
            setLoading(false);
            setFirstName('');
            setLastName('');
            setBiography('');
            setBirthDate(null);
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={styles.surface} elevation={2}>
          <Title style={[styles.title, { color: theme.colors.primary }]}>
            {t('addFamilyMember')}
          </Title>

          <TextInput
            label={t('firstName')}
            value={firstName}
            onChangeText={setFirstName}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />

          <TextInput
            label={t('lastName')}
            value={lastName}
            onChangeText={setLastName}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account-outline" />}
          />

          <View style={styles.dateContainer}>
            <TextInput
              label={t('birthDate')}
              value={birthDate || ''}
              mode="outlined"
              style={styles.dateInput}
              editable={false}
              left={<TextInput.Icon icon="calendar" />}
            />
            <IconButton
              icon="calendar-month"
              mode="contained"
              containerColor={theme.colors.tertiary}
              iconColor={theme.colors.onTertiary}
              size={28}
              onPress={handleSelectDate}
              style={styles.dateButton}
            />
          </View>

          {birthDate && (
            <Chip
              icon="calendar-check"
              onClose={() => setBirthDate(null)}
              style={styles.dateChip}
            >
              {birthDate}
            </Chip>
          )}

          <TextInput
            label={t('biography')}
            value={biography}
            onChangeText={setBiography}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={[styles.input, styles.biographyInput]}
            left={<TextInput.Icon icon="text" />}
          />

          <Button
            mode="contained"
            onPress={handleSaveMember}
            loading={loading}
            disabled={loading}
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            contentStyle={styles.buttonContent}
            icon="content-save"
          >
            {t('saveMember')}
          </Button>
        </Surface>
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
    flexGrow: 1,
    padding: 20,
  },
  surface: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  biographyInput: {
    minHeight: 100,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateInput: {
    flex: 1,
    marginRight: 8,
  },
  dateButton: {
    marginTop: 8,
  },
  dateChip: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  button: {
    marginTop: 24,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

export default AddPersonScreen;