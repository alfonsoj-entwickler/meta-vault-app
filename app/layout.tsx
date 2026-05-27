import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "./i18n/LanguageContext";
import LanguageSelector from "./components/LanguageSelector";
import en from "./i18n/locales/en.json";
import es from "./i18n/locales/es.json";
import de from "./i18n/locales/de.json";
import zh from "./i18n/locales/zh.json";

const seoLocales = { en, es, de, zh };
type SeoLang = keyof typeof seoLocales;
const SUPPORTED_LANGS: SeoLang[] = ["en", "es", "de", "zh"];

// Reads the HTTP Accept-Language header and returns the best supported language.
function detectLangFromHeader(acceptLanguage: string | null): SeoLang {
  if (!acceptLanguage) return "en";
  const lang = acceptLanguage.split(",")[0].split("-")[0].trim();
  return SUPPORTED_LANGS.includes(lang as SeoLang) ? (lang as SeoLang) : "en";
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const lang = detectLangFromHeader((await headers()).get("accept-language"));
  const { seo } = seoLocales[lang];

  return {
    metadataBase: new URL("https://meta-vault.app"),
    title: { default: "Meta Vault", template: "%s | Meta Vault" },
    description: seo.description,
    keywords: seo.keywords,
    openGraph: {
      title: "Meta Vault",
      description: seo.description,
      url: "https://meta-vault.app",
      siteName: "Meta Vault",
      images: [
        {
          url: "/images/logo_1024.png",
          width: 1024,
          height: 1024,
          alt: seo.ogImageAlt,
        },
      ],
      type: "website",
      locale: seo.ogLocale,
    },
    twitter: {
      card: "summary_large_image",
      title: "Meta Vault",
      description: seo.description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = detectLangFromHeader((await headers()).get("accept-language"));
  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="icon"
          href="/images/favicon.svg"
          type="image/svg+xml"
          sizes="48x48"
        />
        <link rel="canonical" href="https://meta-vault.app" key="canonical" />
      </head>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <LanguageSelector />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded focus:shadow-lg focus:outline-none"
          >
            Skip to main content
          </a>
          <main id="main-content">{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}
