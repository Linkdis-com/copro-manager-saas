import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import des traductions
import translationFR from './locales/fr.json';
import translationNL from './locales/nl.json';
import translationEN from './locales/en.json';

const resources = {
  fr: { translation: translationFR },
  nl: { translation: translationNL },
  en: { translation: translationEN }
};

i18n
  .use(LanguageDetector) // Détecte la langue du navigateur
  .use(initReactI18next) // Passe i18n à react-i18next
  .init({
    resources,
    fallbackLng: 'fr', // Langue par défaut
    supportedLngs: ['fr', 'nl', 'en'],
    debug: false,
    interpolation: {
      escapeValue: false // React échappe déjà les valeurs
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;