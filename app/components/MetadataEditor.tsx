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

// Componente auxiliar para actualizar el centro del mapa si cambian las coordenadas
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
    "Altitude", // Nombres que usa ExifReader
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
    // ExifReader agrupa los datos en estas categorías principales
    const grupos = ["exif", "file", "xmp", "iptc"];

    const metaAsRecord = metadata as Record<string, unknown>;
    grupos.forEach((grupo) => {
      if (metaAsRecord[grupo]) {
        Object.entries(metaAsRecord[grupo] as Record<string, unknown>).forEach(
          ([key, tag]) => {
            // Si está en la lista de excluidos, lo saltamos
            if (camposExcluidos.includes(key)) return;

            // ExifReader guarda el valor legible en .description o .value
            const rawTag = tag as { description?: unknown; value?: unknown };
            const displayValue = rawTag?.description ?? rawTag?.value;

            // Filtramos buffers binarios (como miniaturas) o datos vacíos
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
          jpegData = piexif.remove(jpegData); // Borrado total
        } else {
          let exifObj;
          try {
            exifObj = piexif.load(jpegData);
          } catch (err) {
            exifObj = { "0th": {}, Exif: {}, GPS: {}, "1st": {} };
            console.error(`Error: ${err} - ${exifObj}`);
          }

          // Inyección de campos editados
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
          // LÓGICA DE INYECCIÓN GPS
          const latNum = parseFloat(formData.latitude);
          const lngNum = parseFloat(formData.longitude);

          if (
            !isNaN(latNum) &&
            !isNaN(lngNum) &&
            formData.latitude !== "" &&
            formData.longitude !== ""
          ) {
            // Asegurarnos de que existe el diccionario GPS
            if (!exifObj["GPS"]) exifObj["GPS"] = {};

            // 1. Inyectar Latitud y su Referencia
            exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] =
              latNum < 0 ? "S" : "N";
            exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = decimalToDMS(latNum);

            // 2. Inyectar Longitud y su Referencia
            exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] =
              lngNum < 0 ? "W" : "E";
            exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = decimalToDMS(lngNum);

            // 3. Añadir la versión del GPS (Exigido por el estándar EXIF)
            exifObj["GPS"][piexif.GPSIFD.GPSVersionID] = [2, 2, 0, 0];
          } else {
            // Si el usuario borró los campos o puso datos inválidos, eliminamos toda la carpeta GPS
            exifObj["GPS"] = {};
          }

          const exifBytes = piexif.dump(exifObj);
          jpegData = piexif.insert(exifBytes, jpegData);
        }

        // Descargar
        descargarBlob(jpegData, "image/jpeg");
      } catch (error) {
        console.error("Error al procesar la imagen:", error);
        toast.error("Hubo un error al modificar la imagen. Asegúrate de que el formato sea correcto.",)
      }
    };

    reader.readAsDataURL(imageFile);
  };

  const exportarPng = async () => {
    if (!imageFile) return; // imageFile is File | null — nothing to export if null
    try {
      // 1. Leer el archivo directamente a la memoria RAM (ArrayBuffer)
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // 2. Extraer todos los fragmentos (chunks) de la imagen
      let chunks = extractChunks(buffer);

      // 3. LIMPIEZA MÁXIMA: Identificamos los fragmentos que suelen llevar metadatos y los filtramos
      const chunksNoDeseados = ["tEXt", "zTXt", "iTXt", "eXIf"];
      chunks = chunks.filter(
        (chunk: { name: string; data: Uint8Array }) =>
          !chunksNoDeseados.includes(chunk.name),
      );

      // Evaluamos si solo queríamos borrar todo o si hay que reescribir
      const isScrubbed =
        !formData.Make &&
        !formData.Model &&
        !formData.Artist &&
        !formData.Copyright &&
        !formData.latitude &&
        !formData.longitude &&
        !formData.DateTimeOriginal;

      if (!isScrubbed) {
        // --- CONSTRUCCIÓN DEL NUEVO EXIF ---
        // Creamos una estructura EXIF vacía
        const exifObj: Record<string, Record<number, unknown>> = {
          "0th": {},
          Exif: {},
          GPS: {},
          "1st": {},
        };

        // Llenamos el objeto con los datos del formulario (Igual que en el JPEG)
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

        // 4. EL TRUCO DEL EXPERTO: Ajustar la cabecera para el estándar PNG
        // piexif.dump() crea la cadena binaria, pero añade la cabecera "Exif\0\0" propia de JPEG
        const exifBytesString = piexif.dump(exifObj);

        // El estándar PNG eXIf dice que NO debe llevar esa cabecera, debe empezar directo en la cabecera TIFF ("II" o "MM").
        // Así que recortamos los primeros 6 caracteres ("E", "x", "i", "f", "\0", "\0")
        const cleanExifString = exifBytesString.substring(6);

        // Convertir la cadena binaria a un arreglo de bytes reales
        const exifData = new Uint8Array(cleanExifString.length);
        for (let i = 0; i < cleanExifString.length; i++) {
          exifData[i] = cleanExifString.charCodeAt(i);
        }

        // Crear el nuevo fragmento oficial de PNG
        const newExifChunk = {
          name: "eXIf",
          data: exifData,
        };

        // 5. Inyectar: El estándar recomienda poner el eXIf justo antes de los píxeles (IDAT)
        const idatIndex = chunks.findIndex(
          (c: { name: string; data: Uint8Array }) => c.name === "IDAT",
        );
        chunks.splice(idatIndex !== -1 ? idatIndex : 1, 0, newExifChunk);
      }

      // 6. Reconstruir el archivo PNG uniendo los pedazos
      const newBuffer = encodeChunks(chunks);

      // 7. Forzar la descarga
      const blob = new Blob([newBuffer.buffer as ArrayBuffer], {
        type: "image/png",
      });
      forzarDescargaBrowser(blob, "png");
    } catch (error) {
      console.error("Error procesando PNG:", error);
      toast.error("Hubo un error al modificar la imagen PNG.");
    }
  };

  const exportarWebp = async () => {
    if (!imageFile) return;
    try {
      const arrayBuffer = await imageFile!.arrayBuffer();
      const dataView = new DataView(arrayBuffer);

      // 1. Validar que sea un contenedor RIFF WEBP real
      if (
        dataView.getUint32(0, false) !== 0x52494646 ||
        dataView.getUint32(8, false) !== 0x57454250
      ) {
        toast.error("El archivo no es un WebP válido.");
        return;
      }

      // 2. Extraer todos los fragmentos (Chunks)
      let chunks: { id: string; size: number; payload: Uint8Array }[] = [];
      let offset = 12; // Saltamos la cabecera "RIFF" (4) + tamaño (4) + "WEBP" (4)

      while (offset < arrayBuffer.byteLength) {
        // Leer el ID del fragmento (ej. 'VP8X', 'EXIF', 'XMP ')
        const id = String.fromCharCode(
          dataView.getUint8(offset),
          dataView.getUint8(offset + 1),
          dataView.getUint8(offset + 2),
          dataView.getUint8(offset + 3),
        );

        // Leer el tamaño (WebP usa Little Endian)
        const size = dataView.getUint32(offset + 4, true);
        const paddedSize = size + (size % 2); // Si el tamaño es impar, WebP añade 1 byte de relleno

        // Extraer los datos puros
        const payload = new Uint8Array(arrayBuffer, offset + 8, size);
        chunks.push({ id, size, payload });

        offset += 8 + paddedSize;
      }

      // 3. LIMPIEZA: Filtramos y borramos los metadatos antiguos
      chunks = chunks.filter((c) => c.id !== "EXIF" && c.id !== "XMP ");

      // 4. EVALUAR MODIFICACIÓN O BORRADO
      const isScrubbed =
        !formData.Make &&
        !formData.Model &&
        !formData.Artist &&
        !formData.Copyright &&
        !formData.latitude &&
        !formData.longitude &&
        !formData.DateTimeOriginal;

      if (!isScrubbed) {
        // Construimos el nuevo objeto EXIF
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

        // Generamos los bytes. Igual que en PNG, quitamos "Exif\0\0" para ajustarnos al estándar
        const exifBytesString = piexif.dump(exifObj);
        const cleanExifString = exifBytesString.substring(6);

        const exifData = new Uint8Array(cleanExifString.length);
        for (let i = 0; i < cleanExifString.length; i++) {
          exifData[i] = cleanExifString.charCodeAt(i);
        }

        // Inyectar el nuevo fragmento EXIF al final
        chunks.push({ id: "EXIF", size: exifData.length, payload: exifData });

        // Ajuste Experto: Si existe el fragmento VP8X (Extended WebP), debemos encender el "Bit EXIF"
        if (chunks[0].id === "VP8X") {
          chunks[0].payload[0] |= 0x08; // El 4to bit indica presencia de EXIF
        }
      } else {
        // Si borramos todo y hay un VP8X, apagamos el "Bit EXIF" para que sea un archivo perfecto
        if (chunks.length > 0 && chunks[0].id === "VP8X") {
          chunks[0].payload[0] &= ~0x08;
        }
      }

      // 5. RECONSTRUIR EL ARCHIVO WEBP
      let totalSize = 4; // Contamos los 4 bytes de la palabra "WEBP"
      chunks.forEach((c) => {
        totalSize += 8 + c.size + (c.size % 2);
      });

      const newBuffer = new ArrayBuffer(8 + totalSize);
      const newDataView = new DataView(newBuffer);
      const newUint8Array = new Uint8Array(newBuffer);

      // Escribimos la cabecera principal
      newDataView.setUint32(0, 0x52494646, false); // "RIFF"
      newDataView.setUint32(4, totalSize, true); // Tamaño total (Little Endian)
      newDataView.setUint32(8, 0x57454250, false); // "WEBP"

      // Volvemos a pegar los vagones (fragmentos)
      let currentOffset = 12;
      chunks.forEach((c) => {
        // ID del fragmento
        for (let i = 0; i < 4; i++)
          newUint8Array[currentOffset + i] = c.id.charCodeAt(i);
        // Tamaño
        newDataView.setUint32(currentOffset + 4, c.size, true);
        // Datos
        newUint8Array.set(c.payload, currentOffset + 8);

        currentOffset += 8 + c.size;
        // Si es impar, el buffer ya tiene ceros por defecto, solo sumamos 1 al offset
        if (c.size % 2 !== 0) {
          currentOffset++;
        }
      });

      // 6. Descargar el archivo final
      const blob = new Blob([newBuffer], { type: "image/webp" });
      forzarDescargaBrowser(blob, "webp");
    } catch (error) {
      console.error("Error procesando WebP:", error);
      toast.error("Hubo un error al modificar la imagen WebP.");
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
      toast.error("La modificación para este formato está en desarrollo.");
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

  // Variables para controlar la renderización del mapa
  const { latNum, lngNum, validCoordinates } = hasValidCoordinates(
    formData.latitude,
    formData.longitude,
  );

  return (
    <div className="absolute bottom-4 right-4 flex flex-col w-full max-w-md mx-auto h-160 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 z-20">
      {/* Cabecera */}
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
      {/* Contenido */}
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
          {/* Categoría: Cámara */}
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
          {/* Categoría: Autoría */}
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
          {/* Categoría: Ubicación */}
          <div className="space-y-4">
            {/* lg:col-span-3 hace que la ubicación ocupe todo el ancho en pantallas grandes para que el mapa se vea mejor */}
            <div className="flex items-center gap-2 text-gray-700 border-b pb-2">
              <MapPin aria-hidden="true" className="w-5 h-5 text-purple-500" />
              <h3 className="font-medium">{t("metadataEditor.sectionGps")}</h3>
            </div>
            <div className="flex flex-col gap-6">
              {/* Inputs de coordenadas */}
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
                    type="text"
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
                    type="text"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                    placeholder={t("metadataEditor.placeholderLng")}
                  />
                </div>
              </div>
              {/* El Mapa interactivo */}
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
          {/* SECCIÓN DE DATOS EXTRA (Colapsable) */}
          {datosExtra.length > 0 && (
            <div className="">
              <details className="group rounded-lg border border-gray-200">
                <summary className="flex flex-col justify-between space-y-2 cursor-pointer p-4 font-semibold text-gray-700 select-none">
                  <p className="flex items-center justify-between gap-2">
                    {/* Puedes importar el icono Info o FileText de lucide-react */}
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
                      // Formateamos el valor para que se vea bien
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
