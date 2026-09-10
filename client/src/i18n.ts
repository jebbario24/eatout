import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import RestaurantTranslationsBackend from './lib/restaurantBackend';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ar from './locales/ar.json';
import he from './locales/he.json';
import fa from './locales/fa.json';
import ur from './locales/ur.json';
import pt from './locales/pt.json';
import it from './locales/it.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';

const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

i18n
  .use(RestaurantTranslationsBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en, restaurant: {} },
      es: { translation: es, restaurant: {} },
      fr: { translation: fr, restaurant: {} },
      de: { translation: de, restaurant: {} },
      ar: { translation: ar, restaurant: {} },
      he: { translation: he, restaurant: {} },
      fa: { translation: fa, restaurant: {} },
      ur: { translation: ur, restaurant: {} },
      pt: { translation: pt, restaurant: {} },
      it: { translation: it, restaurant: {} },
      zh: { translation: zh, restaurant: {} },
      ja: { translation: ja, restaurant: {} },
    },
    ns: ['translation', 'restaurant'],
    defaultNS: 'translation',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    backend: {
      restaurantSlug: null,
    },
  });

i18n.on('languageChanged', (lng) => {
  const dir = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
});

const currentLang = i18n.language || 'en';
const dir = RTL_LANGUAGES.includes(currentLang) ? 'rtl' : 'ltr';
document.documentElement.setAttribute('dir', dir);
document.documentElement.setAttribute('lang', currentLang);

export default i18n;
