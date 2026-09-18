import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "./i18n/LanguageContext";
import LanguageSelector from "./components/LanguageSelector";
import en from "./i18n/locales/en.json";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// This is a static export (output: "export") — there is no runtime server.
// Metadata is generated once at build time, so we always use English here.
// The client-side LanguageProvider handles the user's actual language preference.
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://meta-vault.app";
const twitterHandle = process.env.NEXT_PUBLIC_TWITTER_HANDLE || "@MetaVaultApp";
const siteTitle = "Meta Vault – Privacy-First Image Metadata & EXIF Editor";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#16a34a" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: siteTitle,
    template: "%s | Meta Vault",
  },
  description: en.seo.description,
  keywords: en.seo.keywords,
  alternates: {
    canonical: baseUrl,
    languages: {
      "es-ES": `${baseUrl}/`,
      "en-US": `${baseUrl}/`,
      "x-default": `${baseUrl}/`,
    },
  },
  openGraph: {
    title: siteTitle,
    description: en.seo.description,
    url: baseUrl,
    siteName: "Meta Vault",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1376,
        height: 768,
        alt: en.seo.ogImageAlt,
        type: "image/jpeg",
      },
      {
        url: "/og-image.jpg",
        width: 1376,
        height: 768,
        alt: en.seo.ogImageAlt,
        type: "image/jpeg",
      },
    ],
    type: "website",
    locale: en.seo.ogLocale,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: en.seo.description,
    images: ["/images/og-image.jpg"],
    site: twitterHandle,
    creator: twitterHandle,
  },
  // Icons and Manifest (PWA / Browsers)
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/images/logo.png", type: "image/png", sizes: "any" },
    ],
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",

  // Robots and detailed Indexing
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${baseUrl}/#webapp`,
      name: "Meta Vault",
      alternateName: "MetaVault",
      url: baseUrl,
      description: en.seo.description,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "All",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "100% Client-Side Privacy",
        "Zero Server Uploads",
        "EXIF, IPTC, XMP, and GPS Metadata Viewer & Editor",
        "Strip and Scrub Photo Metadata",
        "Interactive GPS Map",
        "Supports JPEG, PNG, and WebP",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      url: baseUrl,
      name: "Meta Vault",
      description: en.seo.description,
      publisher: {
        "@type": "Organization",
        name: "Meta Vault",
        url: baseUrl,
        logo: {
          "@type": "ImageObject",
          url: `${baseUrl}/images/logo.png`,
        },
      },
    },
  ],
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // lang="en" matches the static HTML. LanguageProvider updates the UI language
  // client-side after hydration — no server-side detection needed for a static export.
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#16a34a" />
        <meta name="twitter:site" content={twitterHandle} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
          <ToastContainer position="top-right" autoClose={4000} />
        </LanguageProvider>
      </body>
    </html>
  );
}
