"use client";

import { useCallback, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { useImageStore } from "../store/useImageStore";
import { X } from "lucide-react";
import { useTranslation } from "../i18n/LanguageContext";
import { validateMagicBytes } from "../utils/validateMagicBytes";
import ExifReader from "exifreader";

// Definimos los límites en constantes para facilitar su mantenimiento
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function ImageMetaData() {
  const {
    imageFile,
    previewUrl,
    setMetadata,
    setImage,
    clearImage,
    setIsExtracting,
  } = useImageStore();
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
        } finally {
          setIsExtracting(false);
        }
      }
    },
    [setImage, setMetadata, setIsExtracting],
  );

  // Función de error (OnDropRejected)
  const onDropRejected = useCallback(
    (fileRejections: FileRejection[]) => {
      // Tomamos el primer archivo rechazado para analizar por qué falló
      const rejection = fileRejections[0];
      const errorCodes = rejection.errors.map((error) => error.code);

      // Personalizamos el mensaje de error según el código de la librería
      if (errorCodes.includes("file-too-large")) {
        setErrorMessage(
          t("imageMetaData.errorSize", { max: MAX_FILE_SIZE_MB }),
        );
      } else if (errorCodes.includes("file-invalid-type")) {
        setErrorMessage(t("imageMetaData.errorFormat"));
      } else {
        setErrorMessage(t("imageMetaData.errorUnknown"));
      }
    },
    [t],
  );

  // Función para limpiar todo el estado
  const handleClear = () => {
    clearImage();
    setErrorMessage(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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
    <div className="w-full h-full flex flex-col gap-4 bg-black/40">
      {/* Zona de Dropzone o Visualización */}
      <h1 className="hidden">{t("imageMetaData.heading")}</h1>

      <div className="group absolute inset-0 z-10 h-screen w-full text-black overflow-hidden">
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
      </div>
      <div className="relative flex justify-center items-center h-full overflow-hidden p-2">
        <button
          onClick={handleClear}
          className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 transition-colors z-10 shadow-md"
          aria-label={t("imageMetaData.ariaRemove")}
        >
          <X aria-hidden="true" className="h-8 w-8" />
        </button>

        {previewUrl && (
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-auto max-h-125 object-contain rounded-lg"
          />
        )}

        {imageFile && (
          <div className="absolute bottom-4 left-4 bg-black/75 text-white px-3 py-1.5 rounded-md text-sm backdrop-blur-sm font-medium shadow-lg">
            {imageFile?.name}{" "}
            <span className="text-gray-300 ml-1">
              ({(imageFile?.size / (1024 * 1024)).toFixed(2)} MB)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
