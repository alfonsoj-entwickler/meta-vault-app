/**
 * Validates a file by reading its magic bytes (file signature).
 * Prevents maliciously renamed files from being processed.
 * Supports JPEG, PNG and WebP.
 */

import { MAGIC_BYTES, matchesMagicBytes } from "./magicBytes";

// Checks the binary file signature instead of trusting the MIME type, which is
// trivially spoofed by renaming a file. Only the first 12 bytes are read.
export async function validateMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Check JPEG signature
  if (matchesMagicBytes(bytes, MAGIC_BYTES.JPEG)) {
    return true;
  }

  // Check PNG signature
  if (matchesMagicBytes(bytes, MAGIC_BYTES.PNG)) {
    return true;
  }

  // Check WebP signature (RIFF at 0, WEBP at 8)
  if (
    matchesMagicBytes(bytes, MAGIC_BYTES.WEBP, 0) &&
    matchesMagicBytes(bytes, MAGIC_BYTES.WEBP.slice(4), 8)
  ) {
    return true;
  }

  return false;
}
