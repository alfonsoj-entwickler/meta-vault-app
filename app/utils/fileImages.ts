import { generateReadableFileName } from "./randonName";

// Supported image formats (O(1) lookup with Set)
const SUPPORTED_FORMATS = new Set(["jpeg", "jpg", "png", "webp"]);

// Helper function to download reconstructed JPEGs
export const descargarBlob = (base64Data: string, mimeType: string) => {
  const byteString = atob(base64Data.split(",")[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++)
    ia[i] = byteString.charCodeAt(i);
  const blob = new Blob([ab], { type: mimeType });
  forzarDescargaBrowser(blob, "jpg");
};

// The visual trigger for the download in the browser
export const forzarDescargaBrowser = (blob: Blob, extension: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = generateReadableFileName(extension);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Checks if a file is a supported image format (JPEG, PNG, or WebP).
 * Uses O(1) Set lookup for efficiency.
 * @param typeImg The image file or null
 * @returns True if the file is a supported image format
 */
export const supportedImage = (typeImg: File | null): boolean => {
  if (!typeImg) return false;
  const format = typeImg.type.split("/")[1]?.toLowerCase();
  return SUPPORTED_FORMATS.has(format);
};

