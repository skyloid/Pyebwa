# Pyebwa App - Complete Project Structure

## Project Setup Commands

```bash
#!/bin/bash
# Run these commands to set up your project

npx react-native@latest init PyebwaApp
cd PyebwaApp
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore @react-native-firebase/storage
npm install react-native-paper
npm install i18next react-i18next
cd ios && pod install && cd ..
```

## File Structure

```
PyebwaApp/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   └── AddPersonScreen.js
│   ├── services/
│   │   ├── i18n.js
│   │   └── firebaseApi.js
│   ├── theme/
│   │   └── HaitianTheme.js
│   └── locales/
│       ├── en.json
│       ├── fr.json
│       └── ht.json
├── App.js
└── firestore.rules
```

## Files Content

### `/src/theme/HaitianTheme.js`

```javascript
import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

const HaitianTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#D41125',        // Haitian Flag Red
    primaryContainer: '#FFCDD2',
    secondary: '#00217D',      // Haitian Flag Blue
    secondaryContainer: '#C5CAE9',
    tertiary: '#FFC72C',       // Vibrant Yellow for highlights
    tertiaryContainer: '#FFF3CD',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    error: '#B00020',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onTertiary: '#000000',
    onBackground: '#000000',
    onSurface: '#000000',
    onError: '#FFFFFF',
    elevation: {
      level0: 'transparent',
      level1: '#F5F5F5',
      level2: '#EEEEEE',
      level3: '#E0E0E0',
      level4: '#BDBDBD',
      level5: '#9E9E9E',
    },
  },
  roundness: 8,
  fonts: {
    ...DefaultTheme.fonts,
  },
};

export default HaitianTheme;
```

### `/src/services/i18n.js`

```javascript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import fr from '../locales/fr.json';
import ht from '../locales/ht.json';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ht: { translation: ht },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3',
    debug: false,
  });

export default i18n;
```

### `/src/locales/en.json`

```json
{
  "welcomeMessage": "Welcome to Pyebwa",
  "emailLabel": "Email",
  "passwordLabel": "Password",
  "loginButton": "Login",
  "firstName": "First Name",
  "lastName": "Last Name",
  "biography": "Biography",
  "birthDate": "Birth Date",
  "saveMember": "Save Member",
  "selectDate": "Select Date",
  "addFamilyMember": "Add Family Member"
}
```

### `/src/locales/fr.json`

```json
{
  "welcomeMessage": "Bienvenue à Pyebwa",
  "emailLabel": "Courriel",
  "passwordLabel": "Mot de passe",
  "loginButton": "Se connecter",
  "firstName": "Prénom",
  "lastName": "Nom de famille",
  "biography": "Biographie",
  "birthDate": "Date de naissance",
  "saveMember": "Enregistrer le membre",
  "selectDate": "Sélectionner la date",
  "addFamilyMember": "Ajouter un membre de la famille"
}
```

### `/src/locales/ht.json`

```json
{
  "welcomeMessage": "Byenveni nan Pyebwa",
  "emailLabel": "Imèl",
  "passwordLabel": "Mo pas",
  "loginButton": "Konekte",
  "firstName": "Non",
  "lastName": "Siyati",
  "biography": "Biyografi",
  "birthDate": "Dat nesans",
  "saveMember": "Anrejistre manm",
  "selectDate": "Chwazi dat",
  "addFamilyMember": "Ajoute yon manm fanmi"
}
```

### `/src/screens/LoginScreen.js`

```javascript
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Surface,
  Title,
  useTheme,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';

const LoginScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    
    Alert.alert(
      'Login Attempt',
      `Email: ${email}\nPassword: ${password}`,
      [{ text: 'OK', onPress: () => setLoading(false) }]
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
        <Surface style={styles.surface} elevation={4}>
          <View style={styles.header}>
            <Title style={[styles.title, { color: theme.colors.primary }]}>
              {t('welcomeMessage')}
            </Title>
          </View>

          <TextInput
            label={t('emailLabel')}
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label={t('passwordLabel')}
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={secureTextEntry}
            autoCapitalize="none"
            autoComplete="password"
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={secureTextEntry ? 'eye-off' : 'eye'}
                onPress={() => setSecureTextEntry(!secureTextEntry)}
              />
            }
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {t('loginButton')}
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
    justifyContent: 'center',
    padding: 20,
  },
  surface: {
    padding: 30,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 20,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

export default LoginScreen;
```

### `/src/screens/AddPersonScreen.js`

```javascript
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
```

### `/src/services/firebaseApi.js`

```javascript
import firestore from '@react-native-firebase/firestore';

export const addPersonToTree = async (personData, familyTreeId) => {
  try {
    if (!personData || !familyTreeId) {
      throw new Error('Person data and family tree ID are required');
    }

    const personWithTimestamp = {
      ...personData,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    const personsCollectionRef = firestore()
      .collection('familyTrees')
      .doc(familyTreeId)
      .collection('persons');

    const docRef = await personsCollectionRef.add(personWithTimestamp);

    console.log('Person successfully added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding person to tree:', error);
    return null;
  }
};

export const getPersonsFromTree = async (familyTreeId) => {
  try {
    if (!familyTreeId) {
      throw new Error('Family tree ID is required');
    }

    const personsSnapshot = await firestore()
      .collection('familyTrees')
      .doc(familyTreeId)
      .collection('persons')
      .orderBy('createdAt', 'desc')
      .get();

    const persons = [];
    personsSnapshot.forEach((doc) => {
      persons.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return persons;
  } catch (error) {
    console.error('Error fetching persons from tree:', error);
    return null;
  }
};

export const updatePerson = async (familyTreeId, personId, updateData) => {
  try {
    if (!familyTreeId || !personId || !updateData) {
      throw new Error('Family tree ID, person ID, and update data are required');
    }

    const dataWithTimestamp = {
      ...updateData,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    await firestore()
      .collection('familyTrees')
      .doc(familyTreeId)
      .collection('persons')
      .doc(personId)
      .update(dataWithTimestamp);

    console.log('Person successfully updated');
    return true;
  } catch (error) {
    console.error('Error updating person:', error);
    return false;
  }
};

export const deletePerson = async (familyTreeId, personId) => {
  try {
    if (!familyTreeId || !personId) {
      throw new Error('Family tree ID and person ID are required');
    }

    await firestore()
      .collection('familyTrees')
      .doc(familyTreeId)
      .collection('persons')
      .doc(personId)
      .delete();

    console.log('Person successfully deleted');
    return true;
  } catch (error) {
    console.error('Error deleting person:', error);
    return false;
  }
};

export const createFamilyTree = async (treeData, userId) => {
  try {
    if (!treeData || !userId) {
      throw new Error('Tree data and user ID are required');
    }

    const treeWithMetadata = {
      ...treeData,
      ownerId: userId,
      memberIds: [userId],
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    const treeRef = await firestore()
      .collection('familyTrees')
      .add(treeWithMetadata);

    await firestore()
      .collection('users')
      .doc(userId)
      .update({
        familyTreeId: treeRef.id,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    console.log('Family tree successfully created with ID:', treeRef.id);
    return treeRef.id;
  } catch (error) {
    console.error('Error creating family tree:', error);
    return null;
  }
};
```

### `/firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function getUserFamilyTreeId() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.familyTreeId;
    }
    
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /familyTrees/{treeId} {
      allow read, write: if request.auth != null && getUserFamilyTreeId() == treeId;
      
      match /{subcollection}/{document=**} {
        allow read, write: if request.auth != null && getUserFamilyTreeId() == treeId;
      }
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### `/App.js`

```javascript
import React from 'react';
import { PaperProvider } from 'react-native-paper';
import HaitianTheme from './src/theme/HaitianTheme';
import './src/services/i18n'; // Initialize i18n
import LoginScreen from './src/screens/LoginScreen';
// Import navigation setup here when ready

export default function App() {
  return (
    <PaperProvider theme={HaitianTheme}>
      <LoginScreen />
    </PaperProvider>
  );
}
```

## Implementation Steps

1. **Create the project structure** - Create all the directories as shown above
2. **Copy each file** - Copy the content of each file to its respective location
3. **Firebase Setup** - Follow Firebase setup instructions for React Native
4. **iOS Setup** - Run `cd ios && pod install` after installing dependencies
5. **Run the app** - Use `npx react-native run-ios` or `npx react-native run-android`

## Additional Notes

- Remember to configure Firebase with your project credentials
- Set up navigation between screens using React Navigation
- Implement authentication before connecting the screens
- Test on both iOS and Android platforms
- Consider adding a language selector component
