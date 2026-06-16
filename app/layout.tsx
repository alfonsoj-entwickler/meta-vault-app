import type { Metadata } from "next";
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
export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000/"),
  title: { default: "Meta Vault", template: "%s | Meta Vault" },
  description: en.seo.description,
  keywords: en.seo.keywords,
  alternates: {
    canonical: "http://localhost:3000/", // The main or default URL
    languages: {
      "es-ES": "http://localhost:3000/",
      "en-US": "http://localhost:3000/",
      "x-default": "http://localhost:3000/",
    },
  },
  openGraph: {
    title: "Meta Vault",
    description: en.seo.description,
    url: "http://localhost:3000/",
    siteName: "Meta Vault",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: en.seo.ogImageAlt,
      },
    ],
    type: "website",
    locale: en.seo.ogLocale,
  },
  twitter: {
    card: "summary_large_image",
    title: "Meta Vault",
    description: en.seo.description,
    images: ["/images/og-image.jpg"],
    creator: "@tu_usuario_twitter",
  },
  // 4. Icons and Manifest (PWA / Browsers)
  icons: {
    icon: "/favicon.ico",
    shortcut: "/images/favicon-32x32.png",
    apple: "/images/apple-touch-icon.png",
  },
  manifest: "/manifest.json",

  // 5. Robots and detailed Indexing
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
        <link
          rel="icon"
          href="/images/favicon.svg"
          type="image/svg+xml"
          sizes="48x48"
        />
        <link rel="canonical" href="http://localhost:3000/" key="canonical" />
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
