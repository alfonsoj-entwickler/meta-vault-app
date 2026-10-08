"use client";

import dynamic from "next/dynamic";
import ImageMetaData from "@/components/ImageMetaData";
import FileDropZone from "@/components/FileDropZone";
import { useImageStore } from "@/store/useImageStore";
import ContentFeatures from "./components/ContentFeatures";
import Footer from "./components/Footer";
import { ErrorBoundary } from "./components/ErrorBoundary";

// MetadataEditor imports Leaflet, which accesses `window` at module evaluation time.
// ssr: false prevents Next.js from attempting to prerender it on the server.
const MetadataEditor = dynamic(() => import("@/components/MetadataEditor"), {
  ssr: false,
  loading: () => null,
});

// MetaballsCanvas relies on canvas and browser APIs, rendered client-side only
const MetaballsCanvas = dynamic(() => import("@/components/MetaballsCanvas"), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  const { previewUrl } = useImageStore();
  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans">
      <main className="w-full">
        <div className="relative w-full h-screen">
          {previewUrl ? (
            <>
              <ImageMetaData />
              <ErrorBoundary componentName="MetadataEditor">
                <MetadataEditor />
              </ErrorBoundary>
            </>
          ) : (
            <>
              <ErrorBoundary componentName="MetaballsCanvas">
                <MetaballsCanvas />
              </ErrorBoundary>
              <FileDropZone />
            </>
          )}
        </div>
        {!previewUrl && (
          <>
            <ContentFeatures />
            <Footer />
          </>
        )}
      </main>
    </div>
  );
}
