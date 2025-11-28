/**
 * Content-based file hashing using Web Crypto API
 * Provides SHA-256 hashing with chunked streaming to handle large files
 */

const CHUNK_SIZE = 64 * 1024; // 64 KB chunks to avoid memory issues

/**
 * Compute SHA-256 hash of a file using chunked streaming
 * Handles large files efficiently without loading entire file into memory
 */
export async function computeFileHash(fileHandle: FileSystemFileHandle): Promise<string> {
  try {
    const file = await fileHandle.getFile();
    
    // For small files, hash directly
    if (file.size < CHUNK_SIZE * 10) {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      return bufferToHex(hashBuffer);
    }

    // For large files, use chunked streaming
    return await computeChunkedHash(file);
  } catch (err) {
    console.error('Error computing file hash:', err);
    throw err;
  }
}

/**
 * Compute hash by reading file in chunks
 * More memory-efficient for large files
 */
async function computeChunkedHash(file: File): Promise<string> {
  const hasher = new SubtleCryptoHasher();
  
  let offset = 0;
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();
    hasher.update(buffer);
    offset += CHUNK_SIZE;
  }

  return hasher.digestHex();
}

/**
 * Wrapper around Web Crypto API for incremental hashing
 */
class SubtleCryptoHasher {
  private buffer: Uint8Array = new Uint8Array(0);
  private initialized = false;

  /**
   * Update hash with chunk of data
   */
  update(data: ArrayBuffer): void {
    const chunk = new Uint8Array(data);
    const newBuffer = new Uint8Array(this.buffer.length + chunk.length);
    newBuffer.set(this.buffer);
    newBuffer.set(chunk, this.buffer.length);
    this.buffer = newBuffer;
  }

  /**
   * Get final hash as hex string
   */
  async digestHex(): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(this.buffer));
    return bufferToHex(hashBuffer);
  }
}

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Quick hash for comparison (file size + modification date)
 * Used as a fast pre-check before computing full content hash
 */
export function computeQuickHash(file: File | { size: number; lastModified: number }): string {
  return `${file.size}_${file.lastModified}`;
}

/**
 * Hash a string directly (for metadata)
 */
export async function hashString(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Estimate hash computation time for a file
 * Useful for progress predictions
 */
export function estimateHashTime(fileSizeBytes: number): number {
  // Rough estimate: ~50MB per second on modern hardware
  const estimatedMs = (fileSizeBytes / (50 * 1024 * 1024)) * 1000;
  return Math.max(100, Math.min(estimatedMs, 30000)); // Between 100ms and 30s
}
