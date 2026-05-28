"use client";

import { createContext, useContext, useState } from "react";
import en from "./locales/en.json";
import es from "./locales/es.json";
import de from "./locales/de.json";
import zh from "./locales/zh.json";

export type Language = "en" | "es" | "de" | "zh";

const dictionaries = { en, es, de, zh } as const;

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const SUPPORTED: Language[] = ["en", "es", "de", "zh"];
const STORAGE_KEY = "meta-vault-lang";

function detectBrowserLanguage(): Language {
  // navigator.language returns tags like "es-ES" or "zh-CN" — we only need the base code
  const lang = (typeof navigator !== "undefined" ? navigator.language : "en")
    .split("-")[0];
  return SUPPORTED.includes(lang as Language) ? (lang as Language) : "en";
}

// Walks a nested JSON object using a dot-separated key (e.g. "metadataEditor.labelMake").
// Returns the key itself as a fallback so missing translations are visible in the UI.
function resolve(obj: unknown, key: string): string {
  const value = key
    .split(".")
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], obj);
  return typeof value === "string" ? value : key;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer: runs only on the client (typeof window guard makes it SSR-safe).
  // Priority: user's saved preference → browser language → "en"
  const [language, setLang] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    return saved && SUPPORTED.includes(saved) ? saved : detectBrowserLanguage();
  });

  const setLanguage = (lang: Language) => {
    setLang(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  const t = (key: string, vars?: Record<string, string | number>): string => {
    let str = resolve(dictionaries[language], key);
    // Fall back to English if the current locale is missing the key
    if (str === key) str = resolve(dictionaries.en, key);
    // Replace {{var}} placeholders with the provided values
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{{${k}}}`, String(v));
      });
    }
    return str;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within LanguageProvider");
  return ctx;
}
