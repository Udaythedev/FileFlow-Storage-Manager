/**
 * Worker-based file processing API
 * High-level interface for offloading heavy computations to Web Workers
 */

import { FileItem } from '../AppTypes';
import { getWorkerPool } from './workerPool';
import type {
  WorkerRequest,
  HashFilesPayload,
  IndexFilesPayload,
  StatsPayload,
  FilterPayload,
} from '../workers/fileProcessingWorker';

/**
 * Generate unique task ID
 */
function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hash files using Web Worker
 */
export async function hashFilesInWorker(
  files: FileItem[],
  options?: {
    algorithm?: 'SHA-256' | 'SHA-1' | 'MD5';
    chunkSize?: number;
    onProgress?: (progress: number) => void;
  }
): Promise<Record<string, string>> {
  const pool = getWorkerPool();
  const taskId = generateTaskId();

  const payload: HashFilesPayload = {
    files,
    algorithm: options?.algorithm || 'SHA-256',
    chunkSize: options?.chunkSize || 65536,
  };

  const request: WorkerRequest = {
    type: 'HASH_FILES',
    id: taskId,
    payload,
    progressInterval: 100,
  };

  const result = await pool.execute(request, options?.onProgress);
  return (result as any).hashes;
}

/**
 * Index files using Web Worker
 */
export async function indexFilesInWorker(
  files: FileItem[],
  options?: {
    extractContent?: boolean;
    maxContentLength?: number;
    onProgress?: (progress: number) => void;
  }
): Promise<any[]> {
  const pool = getWorkerPool();
  const taskId = generateTaskId();

  const payload: IndexFilesPayload = {
    files,
    extractContent: options?.extractContent || false,
    maxContentLength: options?.maxContentLength || 5000,
  };

  const request: WorkerRequest = {
    type: 'INDEX_FILES',
    id: taskId,
    payload,
    progressInterval: 100,
  };

  const result = await pool.execute(request, options?.onProgress);
  return (result as any).index;
}

/**
 * Calculate file statistics using Web Worker
 */
export async function calculateStatsInWorker(
  files: FileItem[],
  options?: {
    categories?: string[];
    onProgress?: (progress: number) => void;
  }
): Promise<{
  totalSize: number;
  totalFiles: number;
  byExtension: Record<string, { count: number; size: number }>;
  largestFiles: Array<{ name: string; size: number }>;
  oldestFile: { name: string; date: string } | null;
  newestFile: { name: string; date: string } | null;
}> {
  const pool = getWorkerPool();
  const taskId = generateTaskId();

  const payload: StatsPayload = {
    files,
    categories: options?.categories,
  };

  const request: WorkerRequest = {
    type: 'CALCULATE_STATS',
    id: taskId,
    payload,
    progressInterval: 100,
  };

  return pool.execute(request, options?.onProgress);
}

/**
 * Filter files using Web Worker
 */
export async function filterFilesInWorker(
  files: FileItem[],
  filters: {
    extensions?: string[];
    minSize?: number;
    maxSize?: number;
    dateRange?: { start: string; end: string };
  }
): Promise<FileItem[]> {
  const pool = getWorkerPool();
  const taskId = generateTaskId();

  const payload: FilterPayload = {
    files,
    filters,
  };

  const request: WorkerRequest = {
    type: 'FILTER_FILES',
    id: taskId,
    payload,
  };

  const result = await pool.execute(request);
  return (result as any).filtered;
}

/**
 * Batch process files with progress tracking
 */
export async function batchProcessFilesInWorker(
  files: FileItem[],
  tasks: Array<{
    type: 'HASH_FILES' | 'INDEX_FILES' | 'CALCULATE_STATS';
    options?: any;
  }>,
  onProgress?: (current: number, total: number) => void
): Promise<any[]> {
  const results: any[] = [];
  const totalTasks = tasks.length;

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    try {
      let result: any;

      switch (task.type) {
        case 'HASH_FILES':
          result = await hashFilesInWorker(files, {
            ...task.options,
            onProgress: (p) => {
              const overallProgress = ((i + p / 100) / totalTasks) * 100;
              onProgress?.(i + 1, totalTasks);
            },
          });
          break;

        case 'INDEX_FILES':
          result = await indexFilesInWorker(files, {
            ...task.options,
            onProgress: (p) => {
              const overallProgress = ((i + p / 100) / totalTasks) * 100;
              onProgress?.(i + 1, totalTasks);
            },
          });
          break;

        case 'CALCULATE_STATS':
          result = await calculateStatsInWorker(files, {
            ...task.options,
            onProgress: (p) => {
              const overallProgress = ((i + p / 100) / totalTasks) * 100;
              onProgress?.(i + 1, totalTasks);
            },
          });
          break;
      }

      results.push(result);
    } catch (error) {
      console.error(`Task ${i} failed:`, error);
      results.push(null);
    }
  }

  return results;
}

/**
 * Performance comparison: sync vs worker
 */
export async function benchmarkWorkerPerformance(
  files: FileItem[]
): Promise<{
  syncTime: number;
  workerTime: number;
  speedup: number;
}> {
  const startSync = performance.now();

  // Simulate synchronous processing
  let syncCounter = 0;
  for (const file of files) {
    syncCounter += file.name.length + file.size;
  }

  const syncTime = performance.now() - startSync;

  const startWorker = performance.now();
  await calculateStatsInWorker(files);
  const workerTime = performance.now() - startWorker;

  return {
    syncTime,
    workerTime,
    speedup: syncTime / workerTime,
  };
}

/**
 * Worker pool status monitoring
 */
export function getWorkerPoolStatus(): {
  totalWorkers: number;
  busyWorkers: number;
  queuedTasks: number;
  pendingTasks: number;
  utilizationPercent: number;
} {
  const pool = getWorkerPool();
  const stats = pool.getStats();

  return {
    ...stats,
    utilizationPercent: Math.round((stats.busyWorkers / stats.totalWorkers) * 100),
  };
}

/**
 * Cleanup worker pool on app shutdown
 */
export function cleanupWorkers(): void {
  const pool = getWorkerPool();
  pool.terminate();
}
