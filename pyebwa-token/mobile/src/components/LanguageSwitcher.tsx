import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ht', name: 'Kreyòl', flag: '🇭🇹' },
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = React.useState(i18n.language);

  const changeLanguage = async (langCode: string) => {
    try {
      await i18n.changeLanguage(langCode);
      await AsyncStorage.setItem('userLanguage', langCode);
      setCurrentLang(langCode);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  return (
    <View style={styles.container}>
      {languages.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={[
            styles.langButton,
            currentLang === lang.code && styles.activeLang
          ]}
          onPress={() => changeLanguage(lang.code)}
        >
          <Text style={styles.flag}>{lang.flag}</Text>
          <Text style={[
            styles.langName,
            currentLang === lang.code && styles.activeLangText
          ]}>
            {lang.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeLang: {
    backgroundColor: '#e3f2fd',
    borderColor: '#00217D',
  },
  flag: {
    fontSize: 20,
    marginRight: 5,
  },
  langName: {
    fontSize: 14,
    color: '#666',
  },
  activeLangText: {
    color: '#00217D',
    fontWeight: 'bold',
  },
});