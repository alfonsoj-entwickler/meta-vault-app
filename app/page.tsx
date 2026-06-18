"use client";

import dynamic from "next/dynamic";
import ImageMetaData from "@/components/ImageMetaData";
import FileDropZone from "@/components/FileDropZone";
import { useImageStore } from "@/store/useImageStore";
import ContentFeatures from "./components/ContentFeatures";
import Footer from "./components/Footer";

// MetadataEditor imports Leaflet, which accesses `window` at module evaluation time.
// ssr: false prevents Next.js from attempting to prerender it on the server.
const MetadataEditor = dynamic(() => import("@/components/MetadataEditor"), {
  ssr: false,
  loading: () => null,
});

// tsparticles also touches `window` on import, so it needs the same treatment.
const ParticlesBg = dynamic(() => import("@/components/ParticlesBg"), {
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
              <MetadataEditor />
            </>
          ) : (
            <>
              <ParticlesBg />
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
