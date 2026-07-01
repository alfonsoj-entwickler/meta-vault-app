"use client";
import React, { useState, useEffect } from "react";
import {
  Camera,
  User,
  MapPin,
  Trash2,
  Save,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { useImageStore } from "../store/useImageStore";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import piexif from "piexifjs";
import extractChunks from "png-chunks-extract";
import encodeChunks from "png-chunks-encode";
import { toast } from "react-toastify";
import { safeDate } from "../utils/safeDate";
import { useTranslation } from "../i18n/LanguageContext";
import { hasValidCoordinates, safeCoordinate } from "../utils/formatData";
import {
  descargarBlob,
  forzarDescargaBrowser,
  supportedImage,
} from "../utils/fileImages";
import {
  buildExifObject,
  injectJpegExif,
  type ExifFormData,
} from "../utils/exifBuilders";
import {
  extractWebPChunks,
  rebuildWebP,
  injectWebPExif,
} from "../utils/webpBuilder";

// Leaflet's default marker icons rely on webpack asset handling that Next.js
// does not provide, so we point directly to the CDN copies instead.
const iconUrl = "/images/leaflet/marker-icon.png";
const iconRetinaUrl = "/images/leaflet//marker-icon-2x.png";
const shadowUrl = "/images/leaflet/marker-shadow.png";

const customIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Helper component to update the map center if coordinates change
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

// Module-level helper: builds the controlled-form object from a metadata snapshot.
// Lives outside the component so it is a stable reference (no re-creation on
// each render) and never needs to appear in useCallback / useEffect dep arrays.
type MetaSnapshot = ReturnType<typeof useImageStore.getState>["metadata"];
function buildFormData(meta: MetaSnapshot) {
  return {
    Make: meta?.Make || "",
    Model: meta?.Model || "",
    Artist: meta?.Artist || "",
    Copyright: meta?.Copyright || "",
    DateTimeOriginal: meta?.DateTimeOriginal
      ? safeDate(meta.DateTimeOriginal)
      : "",
    latitude: safeCoordinate(meta?.latitude),
    longitude: safeCoordinate(meta?.longitude),
  };
}

export default function MetadataEditor() {
  const { metadata, setMetadata, imageFile } = useImageStore();
  const { t } = useTranslation();

  // Lazy initializer reads the current store snapshot at mount time.
  // This handles the case where metadata was already set before this
  // component mounts (avoids the extra render that useEffect would cause).
  const [formData, setFormData] = useState(() =>
    buildFormData(useImageStore.getState().metadata),
  );

  const camposExcluidos = [
    "Make",
    "Model",
    "Artist",
    "Copyright",
    "DateTimeOriginal",
    "Latitude",
    "Longitude",
    "Altitude", // Names used by ExifReader
  ];

  // Flatten ExifReader's grouped output (exif/file/xmp/iptc) into a single
  // [key, value] list, skipping fields already shown in the editable form.
  const datosExtra: [string, string][] = [];

  // Subscribe to store changes so form fields update whenever a new image is
  // loaded. Using a Zustand subscription (callback form) instead of a
  // synchronous setState inside useEffect satisfies react-hooks/set-state-in-effect.
  // The lazy useState initializer above already covers the initial render, so
  // this only needs to fire for subsequent metadata changes.
  useEffect(() => {
    return useImageStore.subscribe((state) => {
      if (state.metadata) {
        setFormData(buildFormData(state.metadata));
      }
    });
  }, []);

  if (metadata) {
    // ExifReader groups the data into these main categories
    const grupos = ["exif", "file", "xmp", "iptc"];

    const metaAsRecord = metadata as Record<string, unknown>;
    grupos.forEach((grupo) => {
      if (metaAsRecord[grupo]) {
        Object.entries(metaAsRecord[grupo] as Record<string, unknown>).forEach(
          ([key, tag]) => {
            // If it is in the excluded list, we skip it
            if (camposExcluidos.includes(key)) return;

            // ExifReader stores the readable value in .description or .value
            const rawTag = tag as { description?: unknown; value?: unknown };
            const displayValue = rawTag?.description ?? rawTag?.value;

            // We filter binary buffers (like thumbnails) or empty data
            if (
              displayValue !== undefined &&
              displayValue !== null &&
              !(displayValue instanceof Uint8Array) &&
              typeof displayValue !== "object"
            ) {
              datosExtra.push([key, String(displayValue)]);
            }
          },
        );
      }
    });
  }

  const exportarJpeg = async () => {
    if (!imageFile) return; // imageFile is File | null — nothing to export if null
    const reader = new FileReader();
    reader.onload = function (e) {
      if (!e.target?.result) return;
      let jpegData = e.target.result as string;

      try {
        const exifObj = buildExifObject(formData as ExifFormData);
        jpegData = injectJpegExif(jpegData, exifObj);

        // Download
        descargarBlob(jpegData, "image/jpeg");
      } catch (error) {
        console.error("Error al procesar la imagen:", error);
        toast.error(t("metadataEditor.errorModify"));
      }
    };

    reader.readAsDataURL(imageFile);
  };

  const exportarPng = async () => {
    if (!imageFile) return; // imageFile is File | null — nothing to export if null
    try {
      // 1. Read the file directly into RAM (ArrayBuffer)
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // 2. Extract all chunks from the image
      let chunks = extractChunks(buffer);

      // 3. MAXIMUM CLEANUP: Identify chunks that usually carry metadata and filter them
      const chunksNoDeseados = ["tEXt", "zTXt", "iTXt", "eXIf"];
      chunks = chunks.filter(
        (chunk: { name: string; data: Uint8Array }) =>
          !chunksNoDeseados.includes(chunk.name),
      );

      // Build EXIF object (returns null if all fields are empty/scrubbed)
      const exifObj = buildExifObject(formData as ExifFormData);

      if (exifObj !== null) {
        // 4. EXPERT TRICK: Adjust the header for the PNG standard
        // piexif.dump() creates the binary string, but adds the JPEG-specific "Exif\0\0" header
        const exifBytesString = piexif.dump(exifObj);

        // The PNG eXIf standard specifies it must NOT carry that header; it must start directly at the TIFF header ("II" or "MM").
        // So we slice off the first 6 characters ("E", "x", "i", "f", "\0", "\0")
        const cleanExifString = exifBytesString.substring(6);

        // Convert the binary string to a real byte array
        const exifData = new Uint8Array(cleanExifString.length);
        for (let i = 0; i < cleanExifString.length; i++) {
          exifData[i] = cleanExifString.charCodeAt(i);
        }

        // Create the new official PNG chunk
        const newExifChunk = {
          name: "eXIf",
          data: exifData,
        };

        // 5. Inject: The standard recommends placing eXIf right before pixels (IDAT)
        const idatIndex = chunks.findIndex(
          (c: { name: string; data: Uint8Array }) => c.name === "IDAT",
        );
        chunks.splice(idatIndex !== -1 ? idatIndex : 1, 0, newExifChunk);
      }

      // 6. Rebuild the PNG file by joining the pieces
      const newBuffer = encodeChunks(chunks);

      // 7. Force the download
      const blob = new Blob([newBuffer.buffer as ArrayBuffer], {
        type: "image/png",
      });
      forzarDescargaBrowser(blob, "png");
    } catch (error) {
      console.error("Error procesando PNG:", error);
      toast.error(t("metadataEditor.errorModifyPng"));
    }
  };

  const exportarWebp = async () => {
    if (!imageFile) return;
    try {
      const arrayBuffer = await imageFile.arrayBuffer();

      // 1. Extract WebP chunks (validates RIFF WEBP header)
      let chunks = extractWebPChunks(arrayBuffer);

      // 2. Build EXIF object (returns null if all fields are empty/scrubbed)
      const exifObj = buildExifObject(formData as ExifFormData);

      // 3. Convert EXIF object to bytes (removing "Exif\0\0" header for WebP standard)
      let exifData: Uint8Array | null = null;
      if (exifObj !== null) {
        const exifBytesString = piexif.dump(exifObj);
        const cleanExifString = exifBytesString.substring(6);
        exifData = new Uint8Array(cleanExifString.length);
        for (let i = 0; i < cleanExifString.length; i++) {
          exifData[i] = cleanExifString.charCodeAt(i);
        }
      }

      // 4. Inject or remove EXIF using utility (handles VP8X flags)
      chunks = injectWebPExif(chunks, exifData);

      // 5. Rebuild and download
      const newBuffer = rebuildWebP(chunks);
      const blob = new Blob([newBuffer], { type: "image/webp" });
      forzarDescargaBrowser(blob, "webp");
    } catch (error) {
      console.error("Error procesando WebP:", error);
      toast.error(t("metadataEditor.errorModifyWebp"));
    }
  };

  const handleDownload = async () => {
    if (!imageFile) return;

    // Guard: Check if metadata is in sync with current imageFile
    // If imageFile changed but metadata hasn't updated yet, warn and prevent download
    const currentImageFile = useImageStore.getState().imageFile;
    const currentMetadata = useImageStore.getState().metadata;

    if (currentImageFile !== imageFile) {
      toast.error(t("metadataEditor.errorImageChanged"));
      return;
    }

    if (!currentMetadata) {
      toast.error(t("metadataEditor.errorMetadataNotLoaded"));
      return;
    }

    const extension = imageFile.type.split("/")[1];

    if (extension === "jpeg" || extension === "jpg") {
      await exportarJpeg();
    } else if (extension === "png") {
      await exportarPng();
    } else if (extension === "webp") {
      await exportarWebp();
    } else {
      toast.error(t("metadataEditor.errorFormatUnsupported"));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearAll = () => {
    if (window.confirm(t("metadataEditor.confirmClear"))) {
      const emptyData = {
        Make: "",
        Model: "",
        Artist: "",
        Copyright: "",
        DateTimeOriginal: "",
        latitude: "",
        longitude: "",
      };
      setFormData(emptyData);
      setMetadata({});
    }
  };

  if (!metadata) return null;

  const hasMetadata = Object.keys(metadata).length > 0;

  const isSupported = supportedImage(imageFile);

  // Variables to control map rendering
  const { latNum, lngNum, validCoordinates } = hasValidCoordinates(
    formData.latitude,
    formData.longitude,
  );

  return (
    <div className="absolute bottom-16 sm:bottom-4 right-4 flex flex-col w-11/12 sm:w-full max-w-md sm:mx-auto h-96 sm:h-160 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 z-20">
      {/* Header */}
      <div className="bg-gray-200 border-b border-gray-200 px-3 sm:px-6 py-4 flex flex-col items-start justify-between sm:gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            {t("metadataEditor.title")}
          </h2>
          <p className="text-sm text-gray-500">
            {t("metadataEditor.subtitle")}
          </p>
        </div>
         {/* If image is completely clean (no metadata), show compact message instead of full editor */}
        {!hasMetadata ? (
          <div className="flex flex-col w-11/12 sm:w-full max-w-md sm:mx-auto">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">
                  {t("metadataEditor.imageClean")}
                </h2>
                <p className="text-sm text-gray-600">
                  {t("metadataEditor.noMetadataToEdit")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={handleClearAll}
              disabled={!hasMetadata}
              className="hidden flex-1 sm:flex-none sm:flex items-center justify-center gap-2 px-4 py-2 cursor-pointer bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 aria-hidden="true" className="w-5 h-5 shrink-0" />
              <span className="font-medium">
                {t("metadataEditor.clearAll")}
              </span>
            </button>
          </div>
        )}
      </div>
      {/* Content */}
      <div className="p-3 sm:p-6 h-full overflow-auto">
        <div className="grid grid-cols-1 gap-8">
          {/* Category: Camera */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-700 border-b pb-2">
              <Camera aria-hidden="true" className="w-5 h-5 text-blue-500" />
              <h3 className="font-medium">
                {t("metadataEditor.sectionCamera")}
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="field-Make"
                  className="block text-xs font-medium text-gray-500 mb-1"
                >
                  {t("metadataEditor.labelMake")}
                </label>
                <input
                  id="field-Make"
                  type="text"
                  name="Make"
                  value={formData.Make}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder={t("metadataEditor.placeholderMake")}
                />
              </div>
              <div>
                <label
                  htmlFor="field-Model"
                  className="block text-xs font-medium text-gray-500 mb-1"
                >
                  {t("metadataEditor.labelModel")}
                </label>
                <input
                  id="field-Model"
                  type="text"
                  name="Model"
                  value={formData.Model}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder={t("metadataEditor.placeholderModel")}
                />
              </div>
              <div>
                <label
                  htmlFor="field-DateTimeOriginal"
                  className="block text-xs font-medium text-gray-500 mb-1"
                >
                  {t("metadataEditor.labelDate")}
                </label>
                <input
                  id="field-DateTimeOriginal"
                  type="datetime-local"
                  name="DateTimeOriginal"
                  value={formData.DateTimeOriginal}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="YYYY-MM-DD HH:MM:SS"
                />
              </div>
            </div>
          </div>
          {/* Category: Authorship */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-700 border-b pb-2">
              <User aria-hidden="true" className="w-5 h-5 text-green-500" />
              <h3 className="font-medium">
                {t("metadataEditor.sectionAuthorship")}
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="field-Artist"
                  className="block text-xs font-medium text-gray-500 mb-1"
                >
                  {t("metadataEditor.labelArtist")}
                </label>
                <input
                  id="field-Artist"
                  type="text"
                  name="Artist"
                  value={formData.Artist}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm"
                  placeholder={t("metadataEditor.placeholderArtist")}
                />
              </div>
              <div>
                <label
                  htmlFor="field-Copyright"
                  className="block text-xs font-medium text-gray-500 mb-1"
                >
                  {t("metadataEditor.labelCopyright")}
                </label>
                <input
                  id="field-Copyright"
                  type="text"
                  name="Copyright"
                  value={formData.Copyright}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm"
                  placeholder={t("metadataEditor.placeholderCopyright")}
                />
              </div>
            </div>
          </div>
          {/* Category: Location */}
          <div className="space-y-4">
            {/* lg:col-span-3 makes location take full width on large screens for a better map view */}
            <div className="flex items-center gap-2 text-gray-700 border-b pb-2">
              <MapPin aria-hidden="true" className="w-5 h-5 text-purple-500" />
              <h3 className="font-medium">{t("metadataEditor.sectionGps")}</h3>
            </div>
            <div className="flex flex-col gap-6">
              {/* Coordinate inputs */}
              <div className="w-full space-y-3">
                <div>
                  <label
                    htmlFor="field-latitude"
                    className="block text-xs font-medium text-gray-500 mb-1"
                  >
                    {t("metadataEditor.labelLat")}
                  </label>
                  <input
                    id="field-latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                    placeholder={t("metadataEditor.placeholderLat")}
                  />
                </div>
                <div>
                  <label
                    htmlFor="field-longitude"
                    className="block text-xs font-medium text-gray-500 mb-1"
                  >
                    {t("metadataEditor.labelLng")}
                  </label>
                  <input
                    id="field-longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                    placeholder={t("metadataEditor.placeholderLng")}
                  />
                </div>
              </div>
              {/* Interactive Map */}
              <div className="w-full h-48 bg-gray-100 rounded-lg border border-gray-300 overflow-hidden relative z-0">
                {validCoordinates ? (
                  <MapContainer
                    center={[latNum, lngNum]}
                    zoom={13}
                    scrollWheelZoom={false}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[latNum, lngNum]} icon={customIcon}>
                      <Popup>{t("metadataEditor.mapPopup")}</Popup>
                    </Marker>
                    <ChangeView center={[latNum, lngNum]} />
                  </MapContainer>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-gray-500 p-4 text-center">
                    <MapPin
                      aria-hidden="true"
                      className="w-8 h-8 mb-2 text-gray-400 opacity-50"
                    />
                    <p className="text-sm font-medium">
                      {t("metadataEditor.noGps")}
                    </p>
                    <p className="text-xs">{t("metadataEditor.noGpsDetail")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* EXTRA DATA SECTION (Collapsible) */}
          {datosExtra.length > 0 && (
            <div className="">
              <details className="group rounded-lg border border-gray-200">
                <summary className="flex flex-col justify-between space-y-2 cursor-pointer p-4 font-semibold text-gray-700 select-none">
                  <p className="flex items-center justify-between gap-2">
                    {/* You can import Info or FileText icon from lucide-react */}
                    {t("metadataEditor.advancedData")}
                    <ChevronDown
                      aria-hidden="true"
                      className="size-5 rotate-0 transform-3d transition-transform duration-300 group-open:rotate-180"
                    />
                  </p>
                  <p className="self-start bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                    {t("metadataEditor.fieldCount", {
                      count: datosExtra.length,
                    })}
                  </p>
                </summary>

                <div className="p-4 border-t border-gray-200">
                  <div className="grid gap-x-4 gap-y-2">
                    {datosExtra.map(([key, value], index) => {
                      // Format the value for proper display
                      const displayValue = value;

                      return (
                        <div
                          key={index}
                          className="flex flex-col py-2.5 space-y-1 border-b border-gray-200 last:border-0 overflow-hidden"
                        >
                          <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                            {key}
                          </p>
                          <p className="text-sm text-gray-800 wrap-break-word font-mono line-clamp-3">
                            {displayValue || "-"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
      {/* Footer */}
      <div className="shrink-0 bg-gray-200 border-t border-gray-200 px-3 sm:px-6 py-4 flex flex-col gap-3 z-10 relative">
        {!isSupported && (
          <p className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
            <AlertTriangle className="w-4 h-4" />
            {t("metadataEditor.unsupportedFormat")}
          </p>
        )}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleClearAll}
            disabled={!hasMetadata}
            className="flex flex-1 flex-col sm:flex-row sm:hidden items-center justify-center gap-2 p-1.5 sm:px-6 sm:py-3 cursor-pointer bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 aria-hidden="true" className="w-5 h-5 shrink-0" />
            <span className="text-xs sm:text-base font-medium">
              {t("metadataEditor.clearAll")}
            </span>
          </button>
          <button
            onClick={handleDownload}
            disabled={!isSupported}
            className={`flex-1 flex flex-col sm:flex-row justify-center items-center gap-2 p-1.5 sm:px-6 sm:py-3 rounded-lg font-medium shadow-sm cursor-pointer transition-all transform
            ${
              isSupported
                ? "bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }
          `}
          >
            <Save className="w-5 h-5 shrink-0" />
            <span className="text-xs sm:text-base font-medium">
              {t("metadataEditor.btnDownload")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
