import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { de, type TranslationKey } from './de';
import { en } from './en';

export type Language = 'de' | 'en';

const LANGUAGE_KEY = 'edw_language';

const translations: Record<Language, Record<TranslationKey, string>> = {
  de,
  en,
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function loadLanguage(): Language {
  const v = localStorage.getItem(LANGUAGE_KEY);
  if (v === 'en' || v === 'de') return v;
  return 'de';
}

export function saveLanguage(lang: Language): void {
  localStorage.setItem(LANGUAGE_KEY, lang);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(loadLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    saveLanguage(lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.de;
    let template = dict[key] || de[key] || key;
    if (params) {
      Object.entries(params).forEach(([pKey, pVal]) => {
        template = template.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      });
    }
    return template;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return ctx;
}
