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