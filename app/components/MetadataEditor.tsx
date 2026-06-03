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
import {
  decimalToDMS,
  hasValidCoordinates,
  safeCoordinate,
} from "../utils/formatData";
import {
  descargarBlob,
  forzarDescargaBrowser,
  supportedImage,
} from "../utils/fileImages";

// Leaflet's default marker icons rely on webpack asset handling that Next.js
// does not provide, so we point directly to the CDN copies instead.
const iconUrl = "/images/leaflet/marker-icon.png";
const iconRetinaUrl =
  "/images/leaflet//marker-icon-2x.png";
const shadowUrl =
  "/images/leaflet/marker-shadow.png";

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
        const isScrubbed =
          !formData.Make &&
          !formData.Model &&
          !formData.Artist &&
          !formData.Copyright &&
          !formData.latitude &&
          !formData.longitude &&
          !formData.DateTimeOriginal;

        if (isScrubbed) {
          jpegData = piexif.remove(jpegData); // Total wipe / removal
        } else {
          let exifObj;
          try {
            exifObj = piexif.load(jpegData);
          } catch (err) {
            exifObj = { "0th": {}, Exif: {}, GPS: {}, "1st": {} };
            console.error(`Error: ${err} - ${exifObj}`);
          }

          // Injection of edited fields
          if (exifObj["0th"]) {
            if (formData.Make)
              exifObj["0th"][piexif.ImageIFD.Make] = formData.Make;
            else delete exifObj["0th"][piexif.ImageIFD.Make];

            if (formData.Model)
              exifObj["0th"][piexif.ImageIFD.Model] = formData.Model;
            else delete exifObj["0th"][piexif.ImageIFD.Model];

            if (formData.Artist)
              exifObj["0th"][piexif.ImageIFD.Artist] = formData.Artist;
            else delete exifObj["0th"][piexif.ImageIFD.Artist];

            if (formData.Copyright)
              exifObj["0th"][piexif.ImageIFD.Copyright] = formData.Copyright;
            else delete exifObj["0th"][piexif.ImageIFD.Copyright];
          }

          if (exifObj["Exif"]) {
            if (formData.DateTimeOriginal) {
              exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] =
                formData.DateTimeOriginal.replace(/-/g, ":").replace("T", " ");
            } else {
              delete exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal];
            }
          }
          // GPS INJECTION LOGIC
          const latNum = parseFloat(formData.latitude);
          const lngNum = parseFloat(formData.longitude);

          if (
            !isNaN(latNum) &&
            !isNaN(lngNum) &&
            formData.latitude !== "" &&
            formData.longitude !== ""
          ) {
            // Ensure the GPS dictionary exists
            if (!exifObj["GPS"]) exifObj["GPS"] = {};

            // 1. Inject Latitude and its Reference
            exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] =
              latNum < 0 ? "S" : "N";
            exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = decimalToDMS(latNum);

            // 2. Inject Longitude and its Reference
            exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] =
              lngNum < 0 ? "W" : "E";
            exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = decimalToDMS(lngNum);

            // 3. Add the GPS version (Required by the EXIF standard)
            exifObj["GPS"][piexif.GPSIFD.GPSVersionID] = [2, 2, 0, 0];
          } else {
            // If the user cleared the fields or entered invalid data, we delete the entire GPS folder
            exifObj["GPS"] = {};
          }

          const exifBytes = piexif.dump(exifObj);
          jpegData = piexif.insert(exifBytes, jpegData);
        }

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

      // Evaluate whether we just wanted to wipe everything or if we need to rewrite
      const isScrubbed =
        !formData.Make &&
        !formData.Model &&
        !formData.Artist &&
        !formData.Copyright &&
        !formData.latitude &&
        !formData.longitude &&
        !formData.DateTimeOriginal;

      if (!isScrubbed) {
        // --- NEW EXIF CONSTRUCTION ---
        // Create an empty EXIF structure
        const exifObj: Record<string, Record<number, unknown>> = {
          "0th": {},
          Exif: {},
          GPS: {},
          "1st": {},
        };

        // Fill the object with form data (Same as in JPEG)
        if (formData.Make) exifObj["0th"][piexif.ImageIFD.Make] = formData.Make;
        if (formData.Model)
          exifObj["0th"][piexif.ImageIFD.Model] = formData.Model;
        if (formData.Artist)
          exifObj["0th"][piexif.ImageIFD.Artist] = formData.Artist;
        if (formData.Copyright)
          exifObj["0th"][piexif.ImageIFD.Copyright] = formData.Copyright;
        if (formData.DateTimeOriginal)
          exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] =
            formData.DateTimeOriginal.replace(/-/g, ":").replace("T", " ");

        const latNum = parseFloat(formData.latitude);
        const lngNum = parseFloat(formData.longitude);
        if (
          !isNaN(latNum) &&
          !isNaN(lngNum) &&
          formData.latitude !== "" &&
          formData.longitude !== ""
        ) {
          exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = latNum < 0 ? "S" : "N";
          exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = decimalToDMS(latNum);
          exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] =
            lngNum < 0 ? "W" : "E";
          exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = decimalToDMS(lngNum);
          exifObj["GPS"][piexif.GPSIFD.GPSVersionID] = [2, 2, 0, 0];
        }

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
      const arrayBuffer = await imageFile!.arrayBuffer();
      const dataView = new DataView(arrayBuffer);

      // 1. Validate that it is a real RIFF WEBP container
      if (
        dataView.getUint32(0, false) !== 0x52494646 ||
        dataView.getUint32(8, false) !== 0x57454250
      ) {
        toast.error(t("metadataEditor.errorInvalidWebp"));
        return;
      }

      // 2. Extract all chunks
      let chunks: { id: string; size: number; payload: Uint8Array }[] = [];
      let offset = 12; // Skip header "RIFF" (4) + size (4) + "WEBP" (4)

      while (offset < arrayBuffer.byteLength) {
        // Read chunk ID (e.g. 'VP8X', 'EXIF', 'XMP ')
        const id = String.fromCharCode(
          dataView.getUint8(offset),
          dataView.getUint8(offset + 1),
          dataView.getUint8(offset + 2),
          dataView.getUint8(offset + 3),
        );

        // Read size (WebP uses Little Endian)
        const size = dataView.getUint32(offset + 4, true);
        const paddedSize = size + (size % 2); // If size is odd, WebP adds a 1-byte padding

        // Extract raw payload
        const payload = new Uint8Array(arrayBuffer, offset + 8, size);
        chunks.push({ id, size, payload });

        offset += 8 + paddedSize;
      }

      // 3. CLEANUP: Filter and remove old metadata
      chunks = chunks.filter((c) => c.id !== "EXIF" && c.id !== "XMP ");

      // 4. EVALUATE MODIFICATION OR WIPING
      const isScrubbed =
        !formData.Make &&
        !formData.Model &&
        !formData.Artist &&
        !formData.Copyright &&
        !formData.latitude &&
        !formData.longitude &&
        !formData.DateTimeOriginal;

      if (!isScrubbed) {
        // Build the new EXIF object
        const exifObj: any = { "0th": {}, Exif: {}, GPS: {}, "1st": {} };

        if (formData.Make) exifObj["0th"][piexif.ImageIFD.Make] = formData.Make;
        if (formData.Model)
          exifObj["0th"][piexif.ImageIFD.Model] = formData.Model;
        if (formData.Artist)
          exifObj["0th"][piexif.ImageIFD.Artist] = formData.Artist;
        if (formData.Copyright)
          exifObj["0th"][piexif.ImageIFD.Copyright] = formData.Copyright;
        if (formData.DateTimeOriginal)
          exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] =
            formData.DateTimeOriginal.replace(/-/g, ":").replace("T", " ");

        const latNum = parseFloat(formData.latitude);
        const lngNum = parseFloat(formData.longitude);
        if (
          !isNaN(latNum) &&
          !isNaN(lngNum) &&
          formData.latitude !== "" &&
          formData.longitude !== ""
        ) {
          exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = latNum < 0 ? "S" : "N";
          exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = decimalToDMS(latNum);
          exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] =
            lngNum < 0 ? "W" : "E";
          exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = decimalToDMS(lngNum);
          exifObj["GPS"][piexif.GPSIFD.GPSVersionID] = [2, 2, 0, 0];
        }

        // Generate bytes. Just like in PNG, we remove "Exif\0\0" to comply with the standard
        const exifBytesString = piexif.dump(exifObj);
        const cleanExifString = exifBytesString.substring(6);

        const exifData = new Uint8Array(cleanExifString.length);
        for (let i = 0; i < cleanExifString.length; i++) {
          exifData[i] = cleanExifString.charCodeAt(i);
        }

        // Inject the new EXIF chunk at the end
        chunks.push({ id: "EXIF", size: exifData.length, payload: exifData });

        // Expert Adjustment: If VP8X chunk (Extended WebP) exists, we must set the "EXIF Bit"
        if (chunks[0].id === "VP8X") {
          chunks[0].payload[0] |= 0x08; // The 4th bit indicates EXIF presence
        }
      } else {
        // If we wipe everything and there is a VP8X, we unset the "EXIF Bit" for a clean file
        if (chunks.length > 0 && chunks[0].id === "VP8X") {
          chunks[0].payload[0] &= ~0x08;
        }
      }

      // 5. REBUILD THE WEBP FILE
      let totalSize = 4; // Count the 4 bytes of the word "WEBP"
      chunks.forEach((c) => {
        totalSize += 8 + c.size + (c.size % 2);
      });

      const newBuffer = new ArrayBuffer(8 + totalSize);
      const newDataView = new DataView(newBuffer);
      const newUint8Array = new Uint8Array(newBuffer);

      // Write the main header
      newDataView.setUint32(0, 0x52494646, false); // "RIFF"
      newDataView.setUint32(4, totalSize, true); // Total size (Little Endian)
      newDataView.setUint32(8, 0x57454250, false); // "WEBP"

      // Reassemble the chunks
      let currentOffset = 12;
      chunks.forEach((c) => {
        // Chunk ID
        for (let i = 0; i < 4; i++)
          newUint8Array[currentOffset + i] = c.id.charCodeAt(i);
        // Size
        newDataView.setUint32(currentOffset + 4, c.size, true);
        // Payload
        newUint8Array.set(c.payload, currentOffset + 8);

        currentOffset += 8 + c.size;
        // If odd, the buffer has zeros by default; we just increment offset by 1
        if (c.size % 2 !== 0) {
          currentOffset++;
        }
      });

      // 6. Download final file
      const blob = new Blob([newBuffer], { type: "image/webp" });
      forzarDescargaBrowser(blob, "webp");
    } catch (error) {
      console.error("Error procesando WebP:", error);
      toast.error(t("metadataEditor.errorModifyWebp"));
    }
  };

  const handleDownload = async () => {
    if (!imageFile) return;

    const extension = imageFile.type.split("/")[1];

    if (extension === "jpeg" || extension === "jpg") {
      await exportarJpeg();
    } else if (extension === "png") {
      await exportarPng();
    } else if (extension === 'webp') {
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
    <div className="absolute bottom-4 right-4 flex flex-col w-full max-w-md mx-auto h-160 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 z-20">
      {/* Header */}
      <div className="bg-gray-200 border-b border-gray-200 px-6 py-4 shrink-0 flex flex-col items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            {t("metadataEditor.title")}
          </h2>
          <p className="text-sm text-gray-500">
            {hasMetadata
              ? t("metadataEditor.subtitle")
              : t("metadataEditor.noExif")}
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={handleClearAll}
            disabled={!hasMetadata}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 cursor-pointer bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 aria-hidden="true" className="w-4 h-4" />
            <span className="font-medium">{t("metadataEditor.clearAll")}</span>
          </button>
        </div>
      </div>
      {/* Content */}
      <div className="p-6 h-full overflow-auto">
        {!hasMetadata && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg flex items-start gap-3">
            <AlertTriangle
              aria-hidden="true"
              className="w-5 h-5 shrink-0 mt-0.5"
            />
            <p className="text-sm">{t("metadataEditor.alreadyClean")}</p>
          </div>
        )}
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
      <div className="shrink-0 bg-gray-200 border-t border-gray-200 px-6 py-4 flex flex-col gap-3 z-10 relative">
        {!isSupported && (
          <p className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
            <AlertTriangle className="w-4 h-4" />
            Solo se soporta la modificación de imágenes JPG, PNG y WebP.
          </p>
        )}
        <button
          onClick={handleDownload}
          disabled={!isSupported}
          className={`flex justify-center items-center gap-2 px-6 py-3 rounded-lg font-medium shadow-sm cursor-pointer transition-all transform
            ${isSupported
              ? "bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }
          `}
        >
          <Save className="w-5 h-5" />
          {t("metadataEditor.btnDownload")}
        </button>
      </div>
    </div>
  );
}
