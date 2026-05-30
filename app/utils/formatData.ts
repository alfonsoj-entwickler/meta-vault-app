import type { DMSTuple } from "../types/exif";

export const decimalToDMS = (decimal: string | number): DMSTuple | null => {
  const dec = typeof decimal === "string" ? parseFloat(decimal) : decimal;
  if (isNaN(dec)) return null;

  const abs = Math.abs(dec);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const secondsFloat = (minutesFloat - minutes) * 60;

  // Return the array of arrays [numerator, denominator]
  return [
    [degrees, 1],
    [minutes, 1],
    [Math.round(secondsFloat * 1000000), 1000000], // Multiply high to avoid losing precision in seconds
  ] as DMSTuple;
};

// ExifReader returns GPS coordinates as plain numbers but the store may also
// hold them as strings after manual edits, so we normalize to a fixed-precision
// string and treat any non-numeric value as empty.
export const safeCoordinate = (val: string | number | null | undefined): string => {
  if (val === undefined || val === null || val === "") return "";
  const num = Number(val);
  return isNaN(num) ? "" : num.toFixed(6);
};

export const hasValidCoordinates = (latitude: string, longitude: string) => {
  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  return {
    latNum: latNum,
    lngNum: lngNum,
    validCoordinates:
      !isNaN(latNum) && !isNaN(lngNum) && latitude !== "" && longitude !== "",
  };
};
