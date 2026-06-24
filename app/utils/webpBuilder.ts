/**
 * WebP chunk manipulation utilities.
 * Handles extraction, modification, and reconstruction of WebP RIFF containers.
 */

export interface WebPChunk {
  id: string;
  size: number;
  payload: Uint8Array;
}

/**
 * Extracts all chunks from a WebP RIFF container.
 * @param arrayBuffer The WebP file as ArrayBuffer
 * @returns Array of WebP chunks with id, size, and payload
 * @throws Error if the buffer is not a valid RIFF WEBP container
 */
export function extractWebPChunks(arrayBuffer: ArrayBuffer): WebPChunk[] {
  const dataView = new DataView(arrayBuffer);

  // Validate RIFF WEBP header
  if (
    dataView.getUint32(0, false) !== 0x52494646 || // "RIFF"
    dataView.getUint32(8, false) !== 0x57454250 // "WEBP"
  ) {
    throw new Error("Invalid RIFF WEBP container");
  }

  const chunks: WebPChunk[] = [];
  let offset = 12; // Skip "RIFF" (4) + size (4) + "WEBP" (4)

  while (offset < arrayBuffer.byteLength) {
    // Read chunk ID (4 bytes, e.g., 'VP8X', 'EXIF', 'XMP ')
    const id = String.fromCharCode(
      dataView.getUint8(offset),
      dataView.getUint8(offset + 1),
      dataView.getUint8(offset + 2),
      dataView.getUint8(offset + 3),
    );

    // Read chunk size (4 bytes, Little Endian)
    const size = dataView.getUint32(offset + 4, true);

    // WebP adds 1-byte padding if size is odd
    const paddedSize = size + (size % 2);

    // Extract payload (the actual chunk data, not including padding)
    const payload = new Uint8Array(arrayBuffer, offset + 8, size);
    chunks.push({ id, size, payload });

    offset += 8 + paddedSize;
  }

  return chunks;
}

/**
 * Rebuilds a WebP RIFF container from chunks.
 * @param chunks Array of WebP chunks to rebuild
 * @returns New ArrayBuffer containing the complete WebP file
 */
export function rebuildWebP(chunks: WebPChunk[]): ArrayBuffer {
  // Calculate total size: 4 bytes for "WEBP" + all chunks
  let totalSize = 4;
  chunks.forEach((c) => {
    totalSize += 8 + c.size + (c.size % 2); // 8 bytes for id+size + payload + padding
  });

  const newBuffer = new ArrayBuffer(8 + totalSize);
  const newDataView = new DataView(newBuffer);
  const newUint8Array = new Uint8Array(newBuffer);

  // Write RIFF header
  newDataView.setUint32(0, 0x52494646, false); // "RIFF"
  newDataView.setUint32(4, totalSize, true); // Total size (Little Endian)
  newDataView.setUint32(8, 0x57454250, false); // "WEBP"

  // Write all chunks
  let currentOffset = 12;
  chunks.forEach((c) => {
    // Write chunk ID (4 bytes)
    for (let i = 0; i < 4; i++) {
      newUint8Array[currentOffset + i] = c.id.charCodeAt(i);
    }

    // Write chunk size (4 bytes, Little Endian)
    newDataView.setUint32(currentOffset + 4, c.size, true);

    // Write chunk payload
    newUint8Array.set(c.payload, currentOffset + 8);

    currentOffset += 8 + c.size;

    // Add padding if size is odd (buffer is zero-filled by default)
    if (c.size % 2 !== 0) {
      currentOffset++;
    }
  });

  return newBuffer;
}

/**
 * Injects or removes EXIF data from WebP chunks.
 * Removes old EXIF/XMP chunks and optionally adds new EXIF chunk.
 * Updates VP8X flags if present.
 * @param chunks The WebP chunks to modify
 * @param exifData The EXIF data to inject (null to remove only)
 * @returns Modified chunk array
 */
export function injectWebPExif(
  chunks: WebPChunk[],
  exifData: Uint8Array | null,
): WebPChunk[] {
  // Filter out old EXIF and XMP chunks
  const modifiedChunks = chunks.filter(
    (c) => c.id !== "EXIF" && c.id !== "XMP ",
  );

  if (exifData && exifData.length > 0) {
    // Create new EXIF chunk
    const exifChunk: WebPChunk = {
      id: "EXIF",
      size: exifData.length,
      payload: exifData,
    };

    // Inject at the end
    modifiedChunks.push(exifChunk);

    // Update VP8X flags if it exists
    if (modifiedChunks.length > 0 && modifiedChunks[0].id === "VP8X") {
      modifiedChunks[0].payload[0] |= 0x08; // Set EXIF bit
    }
  } else {
    // If no EXIF data and VP8X exists, unset the EXIF bit
    if (modifiedChunks.length > 0 && modifiedChunks[0].id === "VP8X") {
      modifiedChunks[0].payload[0] &= ~0x08; // Clear EXIF bit
    }
  }

  return modifiedChunks;
}
