"use client";

import { createContext, useContext, useState, useEffect } from "react";
import en from "./locales/en.json";
import es from "./locales/es.json";
import de from "./locales/de.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";
import fr from "./locales/fr.json";
import ptBr from "./locales/pt-br.json";
import hi from "./locales/hi.json";

export type Language = "en" | "es" | "de" | "zh" | "ja" | "fr" | "pt-BR" | "hi";

const dictionaries = {
  en,
  es,
  de,
  zh,
  ja,
  fr,
  "pt-BR": ptBr,
  hi,
} as const;

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const SUPPORTED: Language[] = [
  "en",
  "es",
  "de",
  "zh",
  "ja",
  "fr",
  "pt-BR",
  "hi",
];
const STORAGE_KEY = "meta-vault-lang";

// Walks a nested JSON object using a dot-separated key (e.g. "metadataEditor.labelMake").
// Returns the key itself as a fallback so missing translations are visible in the UI.
function resolve(obj: unknown, key: string): string {
  const value = key
    .split(".")
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], obj);
  return typeof value === "string" ? value : key;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Start with "en" — this must match the static HTML generated at build time.
  // Reading localStorage here (synchronously during hydration) would produce a
  // different value than the server rendered, causing a React hydration error.
  const [language, setLang] = useState<Language>("en");

  // After hydration completes, silently update to the user's saved preference.
  // useEffect only runs on the client, so it never conflicts with the static HTML.
  // localStorage has no subscription API, so a direct setState is the only option —
  // the rule is suppressed here because this is a one-time post-hydration sync.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved && SUPPORTED.includes(saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLang(saved);
    }
  }, []);

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
  if (!ctx)
    throw new Error("useTranslation must be used within LanguageProvider");
  return ctx;
}
