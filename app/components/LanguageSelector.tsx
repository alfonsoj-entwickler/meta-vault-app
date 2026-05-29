"use client";
import Image from "next/image";
import { useTranslation, type Language } from "../i18n/LanguageContext";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const OPTIONS: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "de", label: "DE" },
  { code: "zh", label: "ZH" },
];

export default function LanguageSelector() {
  const { language, setLanguage } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-3 left-3 z-50 px-2 py-1">
      <ul
        className={`relative flex items-center flex-col gap-2 pr-3 overflow-hidden transition-all duration-300 ${open ? "delay-0 h-38" : "delay-150 h-7.5"}`}
      >
        {OPTIONS.map(({ code, label }) => (
          <li
            key={code}
            className={`${language === code ? "order-1" : "order-2"}`}
          >
            <button
              type="button"
              onClick={() => {
                if (language !== code) setLanguage(code);
                setOpen((open) => !open);
              }}
              aria-pressed={language === code}
              aria-label={`Switch language to ${label}`}
              className={`flex text-base font-semibold px-2 py-0.5 text-black cursor-pointer`}
            >
              <Image
                src={`images/lang/${code}.svg`}
                alt={`language ${label}`}
                width="30"
                height="20"
              />
              <span className="hidden">{label}</span>
              {language === code && (
                <ChevronDown
                  className={`absolute top-1 right-0 size-4 transform-3d transition-transform duration-300 ${open ? "rotate-180" : "rotate-0"}`}
                />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
