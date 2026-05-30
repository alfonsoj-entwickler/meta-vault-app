import { generateReadableFileName } from "./randonName";

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

export const supportedImage = (typeImg: File | null) => typeImg?.type === 'image/jpeg' ||
  typeImg?.type === 'image/jpg' ||
  typeImg?.type === 'image/png' ||
  typeImg?.type === 'image/webp';

