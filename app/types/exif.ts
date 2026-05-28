import type ExifReader from "exifreader";

/**
 * Represents a single metadata tag as returned by ExifReader.
 * Tags have a human-readable `description` and a raw `value`.
 */
export interface ExifTag {
  description?: string | number;
  value?: string | number | number[] | Uint8Array;
}

/**
 * ExifReader's grouped output — keys are metadata field names, values are ExifTag objects.
 */
export type ExifReaderResult = ExifReader.ExpandedTags;

/**
 * The metadata object stored in Zustand.
 * Merges ExifReader's raw output with the editable fields extracted from it.
 * The index signature allows dynamic string-key access (e.g. metadata["exif"]).
 */
export interface ImageMetadata extends ExifReader.ExpandedTags {
  Make?: string;
  Model?: string;
  Artist?: string;
  Copyright?: string;
  DateTimeOriginal?: string;
  latitude?: number | string;
  longitude?: number | string;
  [key: string]: unknown;
}

/**
 * piexifjs DMS (Degrees Minutes Seconds) rational tuple format.
 * Each element is [numerator, denominator].
 */
export type DMSTuple = [[number, number], [number, number], [number, number]];
