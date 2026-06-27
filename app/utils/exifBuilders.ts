import piexif from "piexifjs";
import { decimalToDMS } from "./formatData";

/**
 * EXIF object structure expected by piexif.
 * Contains IFD dictionaries (0th, Exif, GPS, 1st).
 */
export interface ExifObject {
  "0th": Record<string | number, unknown>;
  Exif: Record<string | number, unknown>;
  GPS: Record<string | number, unknown>;
  "1st": Record<string | number, unknown>;
}

/**
 * Form data containing editable EXIF fields.
 */
export interface ExifFormData {
  Make: string;
  Model: string;
  Artist: string;
  Copyright: string;
  DateTimeOriginal: string;
  latitude: string;
  longitude: string;
}

/**
 * Determines if all editable EXIF fields are empty (scrub mode).
 * Returns true if user wants to completely remove metadata.
 */
function isScrubMode(formData: ExifFormData): boolean {
  return (
    !formData.Make &&
    !formData.Model &&
    !formData.Artist &&
    !formData.Copyright &&
    !formData.latitude &&
    !formData.longitude &&
    !formData.DateTimeOriginal
  );
}

/**
 * Builds a complete EXIF object with injected form data.
 * Returns null if all fields are empty (scrub mode).
 * Otherwise builds and returns complete EXIF object with injected values.
 * Handles GPS DMS conversion and DateTime formatting.
 *
 * @param formData - Editable EXIF fields from the form
 * @returns EXIF object ready for piexif.dump() or null for scrub mode
 */
export function buildExifObject(formData: ExifFormData): ExifObject | null {
  // If user cleared all fields, return null to signal scrub mode
  if (isScrubMode(formData)) {
    return null;
  }

  // Build empty EXIF structure
  const exifObj: ExifObject = {
    "0th": {},
    Exif: {},
    GPS: {},
    "1st": {},
  };

  // Inject editable fields into 0th (main image IFD)
  if (formData.Make) {
    exifObj["0th"][piexif.ImageIFD.Make] = formData.Make;
  }

  if (formData.Model) {
    exifObj["0th"][piexif.ImageIFD.Model] = formData.Model;
  }

  if (formData.Artist) {
    exifObj["0th"][piexif.ImageIFD.Artist] = formData.Artist;
  }

  if (formData.Copyright) {
    exifObj["0th"][piexif.ImageIFD.Copyright] = formData.Copyright;
  }

  // Inject DateTime into Exif IFD
  if (formData.DateTimeOriginal) {
    // Convert from HTML5 format (2026-06-22T10:30) to EXIF format (2026:06:22 10:30)
    exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] =
      formData.DateTimeOriginal.replace(/-/g, ":").replace("T", " ");
  }

  // Inject GPS coordinates and reference directions
  const latNum = parseFloat(formData.latitude);
  const lngNum = parseFloat(formData.longitude);

  if (
    !isNaN(latNum) &&
    !isNaN(lngNum) &&
    formData.latitude !== "" &&
    formData.longitude !== ""
  ) {
    // Inject Latitude and its Reference
    exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = latNum < 0 ? "S" : "N";
    const latDMS = decimalToDMS(latNum);
    if (latDMS) {
      exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = latDMS;
    }

    // Inject Longitude and its Reference
    exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] = lngNum < 0 ? "W" : "E";
    const lngDMS = decimalToDMS(lngNum);
    if (lngDMS) {
      exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = lngDMS;
    }

    // Add GPS version (Required by EXIF standard)
    exifObj["GPS"][piexif.GPSIFD.GPSVersionID] = [2, 2, 0, 0];
  }

  return exifObj;
}

/**
 * Injects EXIF data into a JPEG image (base64 data URL).
 * If exifObj is null (scrub mode), removes all existing EXIF.
 * Otherwise, injects the provided EXIF object.
 *
 * @param jpegData - Base64-encoded JPEG data URL
 * @param exifObj - EXIF object from buildExifObject() or null for scrub mode
 * @returns Modified JPEG data URL with updated EXIF
 */
export function injectJpegExif(jpegData: string, exifObj: ExifObject | null): string {
  if (exifObj === null) {
    // Scrub mode: completely remove all EXIF metadata
    return piexif.remove(jpegData);
  }

  // Inject the EXIF object into the JPEG
  const exifBytes = piexif.dump(exifObj);
  return piexif.insert(exifBytes, jpegData);
}
