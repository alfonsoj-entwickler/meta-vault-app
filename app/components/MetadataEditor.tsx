"use client";
import React, { useState, useEffect } from "react";
import {
  Camera,
  User,
  MapPin,
  Trash2,
  Save,
  Download,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { useImageStore } from "../store/useImageStore";
// Importamos los componentes de React-Leaflet
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
// Importar estilos de Leaflet es obligatorio para que el mapa se vea bien
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import piexif from "piexifjs";
import extractChunks from "png-chunks-extract";
import encodeChunks from "png-chunks-encode";
import { safeDate } from "../utils/safeDate";
import { useTranslation } from "../i18n/LanguageContext";
import { generateReadableFileName } from "../utils/randonName";
import { decimalToDMS } from "../utils/formatData";

// Leaflet's default marker icons rely on webpack asset handling that Next.js
// does not provide, so we point directly to the CDN copies instead.
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const iconRetinaUrl =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const shadowUrl =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

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

export default function MetadataEditor() {
  const { metadata, setMetadata, imageFile } = useImageStore();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    Make: "",
    Model: "",
    Artist: "",
    Copyright: "",
    DateTimeOriginal: "",
    latitude: "",
    longitude: "",
  });

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

  useEffect(() => {
    if (metadata) {
      setFormData({
        Make: metadata.Make || "",
        Model: metadata.Model || "",
        Artist: metadata.Artist || "",
        Copyright: metadata.Copyright || "",
        DateTimeOriginal: metadata.DateTimeOriginal
          ? safeDate(metadata.DateTimeOriginal)
          : "",
        latitude: safeCoordinate(metadata.latitude),
        longitude: safeCoordinate(metadata.longitude),
      });
    }
  }, [metadata]);

  if (metadata) {
    // ExifReader agrupa los datos en estas categorías principales
    const grupos = ["exif", "file", "xmp", "iptc"];

    grupos.forEach((grupo) => {
      if (metadata[grupo]) {
        Object.entries(metadata[grupo]).forEach(([key, tag]: [string, any]) => {
          // Si está en la lista de excluidos, lo saltamos
          if (camposExcluidos.includes(key)) return;

          // ExifReader guarda el valor legible en .description o .value
          const displayValue = tag?.description ?? tag?.value;

          // Filtramos buffers binarios (como miniaturas) o datos vacíos
          if (
            displayValue !== undefined &&
            displayValue !== null &&
            !(displayValue instanceof Uint8Array) &&
            typeof displayValue !== "object"
          ) {
            datosExtra.push([key, String(displayValue)]);
          }
        });
      }
    });
  }

  // --- 4. LÓGICA DE EXPORTACIÓN (piexifjs) ---
  const handleDownload = async () => {
    if (!imageFile) return;

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

        // Convertir de nuevo a Blob y forzar descarga
        const byteString = atob(jpegData.split(",")[1]);
        const mimeString = jpegData.split(",")[0].split(":")[1].split(";")[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([ab], { type: mimeString });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        // const originalName = imageFile.name.replace(/\.[^/.]+$/, "");
        link.download = generateReadableFileName("jpg");

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error al procesar la imagen:", error);
        alert(
          "Hubo un error al modificar la imagen. Asegúrate de que el formato sea correcto.",
        );
      }
    };

    reader.readAsDataURL(imageFile);
  };

  // ExifReader returns GPS coordinates as plain numbers but the store may also
  // hold them as strings after manual edits, so we normalize to a fixed-precision
  // string and treat any non-numeric value as empty.
  const safeCoordinate = (val: any) => {
    if (val === undefined || val === null || val === "") return "";
    const num = Number(val);
    return isNaN(num) ? "" : num.toFixed(6);
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

  const isJpeg =
    imageFile?.type === "image/jpeg" || imageFile?.type === "image/jpg";

  // Variables para controlar la renderización del mapa
  const latNum = parseFloat(formData.latitude);
  const lngNum = parseFloat(formData.longitude);
  const hasValidCoordinates =
    !isNaN(latNum) &&
    !isNaN(lngNum) &&
    formData.latitude !== "" &&
    formData.longitude !== "";

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
                {hasValidCoordinates ? (
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
        {!isJpeg && (
          <p className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
            <AlertTriangle className="w-4 h-4" />
            La modificación de metadatos local solo está disponible para JPEGs.
          </p>
        )}
        <button
          onClick={handleDownload}
          disabled={!isJpeg}
          className={`flex justify-center items-center gap-2 px-6 py-3 rounded-lg font-medium shadow-sm cursor-pointer transition-all transform
            ${
              isJpeg
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
