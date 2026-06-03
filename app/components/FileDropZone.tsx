"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { useImageStore } from "../store/useImageStore";
import ExifReader from "exifreader";
import { useTranslation } from "../i18n/LanguageContext";
import { validateMagicBytes } from "../utils/validateMagicBytes";
import { toast } from "react-toastify";
import { Clock, MapPin, Sliders, Smartphone } from "lucide-react";

// Definimos los límites en constantes para facilitar su mantenimiento
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function FileDropZone() {
  const { setImage, setMetadata, setIsExtracting } = useImageStore();
  const { t } = useTranslation();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Función de éxito (OnDrop)
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setErrorMessage(null);

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];

        // Validación de magic bytes: asegura que el archivo es una imagen real
        const isValidImage = await validateMagicBytes(file);
        if (!isValidImage) {
          setErrorMessage(t("fileDropZone.errorInvalid"));
          toast.error(t("fileDropZone.errorInvalid"));
          return;
        }

        setImage(file);
        setIsExtracting(true);

        try {
          // Magia Client-side: Pasamos el archivo físico directamente a ExifReader
          // Usamos { expanded: true } para que nos devuelva el GPS en un formato súper fácil de leer
          const tags = await ExifReader.load(file, { expanded: true });

          // Armamos un objeto limpio y normalizado para nuestro estado
          const metadataFormateada = {
            // Datos básicos (buscamos en EXIF)
            Make: tags.exif?.Make?.description || "",
            Model: tags.exif?.Model?.description || "",
            DateTimeOriginal: tags.exif?.DateTimeOriginal?.description || "",

            // ¡El salvavidas para los Google Pixel! ExifReader formatea el GPS perfectamente
            latitude: tags.gps?.Latitude ? tags.gps.Latitude : "",
            longitude: tags.gps?.Longitude ? tags.gps.Longitude : "",

            // Guardamos todo el objeto crudo por si quieres renderizar los "Datos Avanzados"
            ...tags,
          };

          setMetadata(metadataFormateada);
          // console.log("Datos extraídos con ExifReader:", metadataFormateada);
        } catch (error) {
          console.error("Error leyendo imagen con ExifReader", error);
          setErrorMessage(t("fileDropZone.errorCorrupt"));
          toast.error(t("fileDropZone.errorCorrupt"))
        } finally {
          setIsExtracting(false);
        }
      }
    },
    [setImage, setMetadata, setIsExtracting, t],
  );

  // Función de error (OnDropRejected)
  const onDropRejected = useCallback(
    (fileRejections: FileRejection[]) => {
      // Tomamos el primer archivo rechazado para analizar por qué falló
      const rejection = fileRejections[0];
      const errorCodes = rejection.errors.map((error) => error.code);

      // Personalizamos el mensaje de error según el código de la librería
      if (errorCodes.includes("file-too-large")) {
        setErrorMessage(t("fileDropZone.errorSize", { max: MAX_FILE_SIZE_MB }));
        toast.error(t("fileDropZone.errorSize", { max: MAX_FILE_SIZE_MB }))
      } else if (errorCodes.includes("file-invalid-type")) {
        setErrorMessage(t("fileDropZone.errorFormat"));
        toast.error(t("fileDropZone.errorFormat"))
      } else {
        setErrorMessage(t("fileDropZone.errorUnknown"));
        toast.error(t("fileDropZone.errorUnknown"))
      }
    },
    [t],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected, // Conectamos nuestro manejador de errores
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    noClick: true,
    maxSize: MAX_FILE_SIZE_BYTES, // Límite estricto de 20MB
  });

  return (
    <div className="group absolute inset-0 z-10 h-screen w-full text-black overflow-hidden">
      <div className="absolute inset-0">
        {/* Zona de Dropzone o Visualización */}
        <div
          {...getRootProps()}
          className={`h-full w-full border-2 border-dashed rounded-xl transition-all duration-300
                  ${isDragActive ? "border-green-500 bg-black/10 scale-[0.99]" : "border-transparent bg-transparent scale-[1]"}
                  ${errorMessage ? "border-red-300" : ""}
                `}
        >
          <input {...getInputProps()} aria-label="drop area to images" />
        </div>
        <button
          type="button"
          onClick={open}
          aria-label={t("fileDropZone.ariaUpload")}
          className={`absolute top-[calc(50%-4rem)] left-1/2 -translate-1/2 flex flex-col justify-center items-center w-80 h-80 sm:w-96 sm:h-96 space-y-4 rounded-full bg-green-500/70 text-white cursor-pointer transition-all duration-300 hover:bg-green-500 ${isDragActive ? "-z-10" : "z-10"}`}
        >
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 24 24"
            className="size-16 sm:size-20"
          >
            <path
              d="M19 7v3h-2V7h-3V5h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5a2 2 0 00-2 2v12c0 1.1.9 2 2 2h12a2 2 0 002-2v-8h-3zM5 19l3-4 2 3 3-4 4 5H5z"
              fill="currentColor"
            />
          </svg>
          <p className="text-lg font-medium">
            {isDragActive
              ? t("fileDropZone.dropActive")
              : t("fileDropZone.dropIdle")}
          </p>
          <p className="text-sm">
            {t("fileDropZone.sizeLabel", { max: MAX_FILE_SIZE_MB })}
          </p>
        </button>
      </div>
      <div className="flex flex-col justify-between items-center h-full pt-10 sm:pt-20">
        <h1 className="flex items-center gap-4 text-2xl font-black">
          <Image
            src="/images/logo.svg"
            alt="Logo"
            width={50}
            height={50}
            priority
          />
          {t("fileDropZone.heading")}
        </h1>

        <div className="flex flex-col justify-center items-center gap-8 w-full h-60 bg-green-600 text-white">
          <p className="text-lg font-bold">{t("fileDropZone.subheading")}</p>
          <ul className="flex gap-4 text-xl">
            <li className="flex items-start gap-3"><MapPin className="w-5 h-5 shrink-0 mt-0.5" />{t("fileDropZone.features.0")}</li>
            <li className="flex items-start gap-3"><Smartphone className="w-5 h-5 shrink-0 mt-0.5" />{t("fileDropZone.features.1")}</li>
            <li className="flex items-start gap-3"><Clock className="w-5 h-5 shrink-0 mt-0.5" />{t("fileDropZone.features.2")}</li>
            <li className="flex items-start gap-3"><Sliders className="w-5 h-5 shrink-0 mt-0.5" />{t("fileDropZone.features.3")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
