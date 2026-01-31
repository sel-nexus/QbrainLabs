import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Supported languages
export const supportedLanguages = ['en', 'es', 'fr', 'de'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

// Language metadata
export const languageInfo: Record<SupportedLanguage, {
    name: string;
    nativeName: string;
    flag: string;
    dir: 'ltr' | 'rtl';
}> = {
    en: { name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr' },
    es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
    fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
    de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
};

i18n
    // Load translation using HTTP backend
    // Translations are loaded from /public/locales/{lng}/translation.json
    .use(Backend)
    // Detect user language from browser settings, localStorage, etc.
    .use(LanguageDetector)
    // Pass the i18n instance to react-i18next
    .use(initReactI18next)
    // Initialize i18next
    .init({
        // Fallback language when translation is not available
        fallbackLng: 'en',

        // Supported languages
        supportedLngs: supportedLanguages,

        // Ensure region codes like en-US resolve to en for loading
        load: 'languageOnly',

        // Accept and match non-explicit language codes
        nonExplicitSupportedLngs: true,

        // Normalize detected language codes
        cleanCode: true,

        // Debug mode (disable in production)
        debug: import.meta.env.DEV,

        // Interpolation options
        interpolation: {
            escapeValue: false, // React already escapes by default
        },

        // Backend options for loading translations
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },

        // Language detection options
        detection: {
            // Order of language detection strategies
            order: ['localStorage', 'navigator', 'htmlTag'],
            // Key used in localStorage
            lookupLocalStorage: 'preferredLanguage',
            // Cache user language
            caches: ['localStorage'],
        },

        // React options
        react: {
            useSuspense: true,
        },
    });

// Export i18n instance
export default i18n;

// Helper function to get current language
export const getCurrentLanguage = (): SupportedLanguage => {
    const lang = i18n.language;
    // Handle language codes like 'en-US' -> 'en'
    const shortLang = lang.split('-')[0] as SupportedLanguage;
    return supportedLanguages.includes(shortLang) ? shortLang : 'en';
};

// Helper function to change language
export const changeLanguage = (lng: SupportedLanguage): Promise<void> => {
    return i18n.changeLanguage(lng).then(() => {
        localStorage.setItem('preferredLanguage', lng);
        // Update document direction for RTL languages (future support)
        const langInfo = languageInfo[lng];
        if (langInfo) {
            document.documentElement.dir = langInfo.dir;
            document.documentElement.lang = lng;
        }
    });
};
