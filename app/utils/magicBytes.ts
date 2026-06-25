/**
 * Magic bytes (file signatures) for supported image formats.
 * Used to validate file types by their binary content rather than MIME type.
 */

export const MAGIC_BYTES = {
  JPEG: new Uint8Array([0xFF, 0xD8, 0xFF]),
  PNG: new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  WEBP: new Uint8Array([0x52, 0x49, 0x46, 0x46]), // "RIFF"
} as const;

/**
 * Checks if a byte sequence matches a magic byte signature.
 * @param bytes The byte array to check
 * @param magic The magic byte signature to match
 * @param offset The offset to start checking (default: 0)
 * @returns True if bytes match the magic signature
 */
export function matchesMagicBytes(
  bytes: Uint8Array,
  magic: Uint8Array,
  offset: number = 0,
): boolean {
  if (bytes.length < offset + magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[offset + i] !== magic[i]) return false;
  }
  return true;
}
