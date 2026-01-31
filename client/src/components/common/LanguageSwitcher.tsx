import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { changeLanguage, type SupportedLanguage } from '../../i18n';

interface Language {
    code: string;
    name: string;
    nativeName: string;
    flag: string;
}

const languages: Language[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
];

export const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLanguage = languages.find(lang =>
        i18n.language.startsWith(lang.code)
    ) || languages[0];

    const handleChangeLanguage = async (lng: SupportedLanguage) => {
        await changeLanguage(lng);
        setIsOpen(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load saved language preference on mount
    useEffect(() => {
        const savedLang = localStorage.getItem('preferredLanguage');
        const nextLang = (savedLang?.split('-')[0] || '') as SupportedLanguage;
        if (nextLang && nextLang !== i18n.language) {
            changeLanguage(nextLang);
        }
    }, [i18n]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${theme === 'light'
                        ? 'hover:bg-gray-100 text-gray-700'
                        : 'hover:bg-white/10 text-gray-300'
                    }`}
                aria-label="Select language"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{currentLanguage.flag}</span>
                <span className="hidden md:inline">{currentLanguage.code.toUpperCase()}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    className={`absolute right-0 top-full mt-1 w-44 rounded-xl shadow-xl border overflow-hidden z-50 ${theme === 'light'
                            ? 'bg-white border-gray-200'
                            : 'bg-surface-800 border-white/10'
                        }`}
                    role="listbox"
                    aria-label="Available languages"
                >
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleChangeLanguage(lang.code as SupportedLanguage)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${currentLanguage.code === lang.code
                                    ? theme === 'light'
                                        ? 'bg-brand-violet/10 text-brand-violet'
                                        : 'bg-brand-violet/20 text-brand-violet'
                                    : theme === 'light'
                                        ? 'hover:bg-gray-100 text-gray-700'
                                        : 'hover:bg-white/5 text-gray-300'
                                }`}
                            role="option"
                            aria-selected={currentLanguage.code === lang.code}
                        >
                            <span className="text-lg">{lang.flag}</span>
                            <div className="flex flex-col items-start">
                                <span className="font-medium">{lang.nativeName}</span>
                                <span className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                    }`}>
                                    {lang.name}
                                </span>
                            </div>
                            {currentLanguage.code === lang.code && (
                                <span className="ml-auto text-brand-violet">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
