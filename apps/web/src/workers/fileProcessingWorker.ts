/**
 * File Processing Web Worker
 * Runs heavy computations in a background thread to avoid blocking the UI
 * Handles: file scanning, hashing, indexing, search operations
 */

import { FileItem } from '../AppTypes';

/**
 * Message types for worker communication
 */
export type WorkerMessageType =
  | 'HASH_FILES'
  | 'SCAN_DIRECTORY'
  | 'INDEX_FILES'
  | 'CALCULATE_STATS'
  | 'FILTER_FILES'
  | 'ABORT';

/**
 * Request message sent to worker
 */
export interface WorkerRequest {
  type: WorkerMessageType;
  id: string;
  payload?: any;
  progressInterval?: number; // How often to report progress (ms)
}

/**
 * Response message from worker
 */
export interface WorkerResponse {
  type: 'progress' | 'complete' | 'error';
  id: string;
  progress?: number; // 0-100
  data?: any;
  error?: string;
}

/**
 * File hashing task payload
 */
export interface HashFilesPayload {
  files: FileItem[];
  algorithm?: 'SHA-256' | 'SHA-1' | 'MD5';
  chunkSize?: number;
}

/**
 * Index building task payload
 */
export interface IndexFilesPayload {
  files: FileItem[];
  extractContent?: boolean;
  maxContentLength?: number;
}

/**
 * Stats calculation payload
 */
export interface StatsPayload {
  files: FileItem[];
  categories?: string[];
}

/**
 * File filter payload
 */
export interface FilterPayload {
  files: FileItem[];
  filters: {
    extensions?: string[];
    minSize?: number;
    maxSize?: number;
    dateRange?: { start: string; end: string };
  };
}

// Store for abort controllers
const abortControllers = new Map<string, AbortController>();

/**
 * Main worker message handler
 */
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type, id, payload, progressInterval = 100 } = event.data;

  try {
    // Check if operation was aborted
    if (abortControllers.has(id)) {
      const controller = abortControllers.get(id);
      if (controller?.signal.aborted) {
        send('error', id, 'Operation aborted', null);
        return;
      }
    }

    switch (type) {
      case 'HASH_FILES':
        await hashFiles(id, payload, progressInterval);
        break;
      case 'INDEX_FILES':
        await indexFiles(id, payload, progressInterval);
        break;
      case 'CALCULATE_STATS':
        await calculateStats(id, payload, progressInterval);
        break;
      case 'FILTER_FILES':
        filterFiles(id, payload);
        break;
      case 'ABORT':
        abortOperation(id);
        break;
      default:
        send('error', id, `Unknown task type: ${type}`, null);
    }
  } catch (error) {
    send('error', id, String(error), null);
  }
};

/**
 * Hash files using Web Crypto API
 */
async function hashFiles(
  id: string,
  payload: HashFilesPayload,
  progressInterval: number
): Promise<void> {
  const { files, algorithm = 'SHA-256', chunkSize = 65536 } = payload;
  const hashes: Record<string, string> = {};
  let lastProgress = 0;
  let lastReportTime = Date.now();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Report progress at intervals
    const now = Date.now();
    if (now - lastReportTime > progressInterval) {
      const progress = Math.round((i / files.length) * 100);
      if (progress !== lastProgress) {
        send('progress', id, null, { progress, processed: i, total: files.length });
        lastProgress = progress;
        lastReportTime = now;
      }
    }

    // In production, would read file handle and compute hash
    // For now, simulate with file properties
    try {
      const hash = await simulateFileHash(file, algorithm, chunkSize);
      hashes[file.id] = hash;
    } catch (error) {
      console.warn(`Failed to hash ${file.name}:`, error);
      hashes[file.id] = '';
    }
  }

  send('complete', id, null, {
    hashes,
    total: files.length,
    processed: files.length,
  });
}

/**
 * Index files for search
 */
async function indexFiles(
  id: string,
  payload: IndexFilesPayload,
  progressInterval: number
): Promise<void> {
  const { files, extractContent = false, maxContentLength = 5000 } = payload;
  const index: any[] = [];
  let lastProgress = 0;
  let lastReportTime = Date.now();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    const now = Date.now();
    if (now - lastReportTime > progressInterval) {
      const progress = Math.round((i / files.length) * 100);
      if (progress !== lastProgress) {
        send('progress', id, null, { progress, indexed: i, total: files.length });
        lastProgress = progress;
        lastReportTime = now;
      }
    }

    // Build search index
    const indexEntry = {
      fileId: file.id,
      filename: file.name,
      extension: file.extension,
      size: file.size,
      modifiedAt: file.modifiedAt,
      keywords: extractKeywords(file.name),
    };

    index.push(indexEntry);
  }

  send('complete', id, null, {
    index,
    total: files.length,
    indexed: files.length,
  });
}

/**
 * Calculate file statistics
 */
async function calculateStats(
  id: string,
  payload: StatsPayload,
  progressInterval: number
): Promise<void> {
  const { files, categories = [] } = payload;
  const stats = {
    totalSize: 0,
    totalFiles: files.length,
    byExtension: {} as Record<string, { count: number; size: number }>,
    byCategory: {} as Record<string, { count: number; size: number }>,
    largestFiles: [] as Array<{ name: string; size: number }>,
    oldestFile: null as { name: string; date: string } | null,
    newestFile: null as { name: string; date: string } | null,
  };

  let lastProgress = 0;
  let lastReportTime = Date.now();
  const largestFilesTemp: Array<{ name: string; size: number; id: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    const now = Date.now();
    if (now - lastReportTime > progressInterval) {
      const progress = Math.round((i / files.length) * 100);
      if (progress !== lastProgress) {
        send('progress', id, null, { progress, processed: i, total: files.length });
        lastProgress = progress;
        lastReportTime = now;
      }
    }

    // Update totals
    stats.totalSize += file.size;

    // Track by extension
    const ext = file.extension.toLowerCase();
    if (!stats.byExtension[ext]) {
      stats.byExtension[ext] = { count: 0, size: 0 };
    }
    stats.byExtension[ext].count += 1;
    stats.byExtension[ext].size += file.size;

    // Track largest files
    largestFilesTemp.push({ name: file.name, size: file.size, id: file.id });

    // Track date bounds
    const fileDate = new Date(file.modifiedAt);
    if (!stats.oldestFile || fileDate < new Date(stats.oldestFile.date)) {
      stats.oldestFile = { name: file.name, date: file.modifiedAt };
    }
    if (!stats.newestFile || fileDate > new Date(stats.newestFile.date)) {
      stats.newestFile = { name: file.name, date: file.modifiedAt };
    }
  }

  // Get top 10 largest files
  stats.largestFiles = largestFilesTemp
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
    .map(({ name, size }) => ({ name, size }));

  send('complete', id, null, stats);
}

/**
 * Filter files synchronously
 */
function filterFiles(id: string, payload: FilterPayload): void {
  const { files, filters } = payload;
  let filtered = [...files];

  // Extension filter
  if (filters.extensions && filters.extensions.length > 0) {
    filtered = filtered.filter(f =>
      filters.extensions!.includes(f.extension.toLowerCase())
    );
  }

  // Size filters
  if (filters.minSize !== undefined) {
    filtered = filtered.filter(f => f.size >= filters.minSize!);
  }
  if (filters.maxSize !== undefined) {
    filtered = filtered.filter(f => f.size <= filters.maxSize!);
  }

  // Date range filter
  if (filters.dateRange) {
    const startTime = new Date(filters.dateRange.start).getTime();
    const endTime = new Date(filters.dateRange.end).getTime();
    filtered = filtered.filter(f => {
      const fileTime = new Date(f.modifiedAt).getTime();
      return fileTime >= startTime && fileTime <= endTime;
    });
  }

  send('complete', id, null, {
    filtered,
    total: files.length,
    matched: filtered.length,
  });
}

/**
 * Simulate file hashing (for demo)
 * In production, would use Web Crypto API on actual file content
 */
async function simulateFileHash(
  file: FileItem,
  algorithm: string,
  chunkSize: number
): Promise<string> {
  // Create a simple hash from file properties
  // In production: await fileHandle.getFile() then compute actual hash
  const hashData = `${file.name}-${file.size}-${file.extension}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(hashData);

  try {
    const hashBuffer = await (self as any).crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    // Fallback simple hash
    return btoa(hashData);
  }
}

/**
 * Extract keywords from filename
 */
function extractKeywords(filename: string): string[] {
  return filename
    .toLowerCase()
    .split(/[\s\-_.()[\]{}]+/)
    .filter(w => w.length > 2 && !/^\d+$/.test(w));
}

/**
 * Send response to main thread
 */
function send(
  type: 'progress' | 'complete' | 'error',
  id: string,
  error: string | null,
  data: any
): void {
  self.postMessage({
    type,
    id,
    error,
    data,
  } as WorkerResponse);
}

/**
 * Abort operation
 */
function abortOperation(id: string): void {
  const controller = abortControllers.get(id);
  if (controller) {
    controller.abort();
    abortControllers.delete(id);
  }
}
