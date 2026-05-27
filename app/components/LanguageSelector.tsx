"use client";

import { useTranslation, type Language } from "../i18n/LanguageContext";

const OPTIONS: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "de", label: "DE" },
  { code: "zh", label: "ZH" },
];

export default function LanguageSelector() {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="fixed top-3 left-3 z-50 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1">
      {OPTIONS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLanguage(code)}
          aria-pressed={language === code}
          aria-label={`Switch language to ${label}`}
          className={`text-base cursor-pointer font-semibold px-2 py-0.5 rounded-full transition-colors ${
            language === code
              ? "bg-green-500 text-black"
              : "text-white/70 hover:text-white"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
