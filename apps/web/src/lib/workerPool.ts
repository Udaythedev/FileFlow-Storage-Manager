/**
 * Web Worker Pool Manager
 * Manages multiple worker instances for parallel processing
 * Enables multi-core utilization and task queuing
 */

import type { WorkerRequest, WorkerResponse } from '../workers/fileProcessingWorker';

/**
 * Task pending execution
 */
interface PendingTask {
  id: string;
  request: WorkerRequest;
  resolve: (data: any) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number) => void;
  timeout?: ReturnType<typeof setTimeout>;
}

/**
 * Worker pool configuration
 */
export interface WorkerPoolConfig {
  workerCount?: number; // Default: navigator.hardwareConcurrency || 4
  taskTimeout?: number; // Default: 5 minutes
  workerScript?: string; // Path to worker script
}

/**
 * Manager for worker pool and task queue
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: PendingTask[] = [];
  private pendingTasks = new Map<string, PendingTask>();
  private workerBusy = new Set<number>();
  private config: Required<WorkerPoolConfig>;
  private initialized = false;

  constructor(config: WorkerPoolConfig = {}) {
    this.config = {
      workerCount:
        config.workerCount ||
        (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) ||
        4,
      taskTimeout: config.taskTimeout || 5 * 60 * 1000, // 5 minutes
      workerScript: config.workerScript || 'fileProcessingWorker.js',
    };
  }

  /**
   * Initialize worker pool
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      for (let i = 0; i < this.config.workerCount; i++) {
        const worker = new Worker(
          new URL('./fileProcessingWorker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          this.handleWorkerMessage(event.data, i);
        };

        worker.onerror = (error: ErrorEvent) => {
          console.error(`Worker ${i} error:`, error);
          this.handleWorkerError(error, i);
        };

        this.workers.push(worker);
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize worker pool:', error);
      throw error;
    }
  }

  /**
   * Execute task on available worker
   */
  async execute<T>(
    request: WorkerRequest,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    if (!this.initialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const task: PendingTask = {
        id: request.id,
        request,
        resolve,
        reject,
        onProgress,
      };

      // Set timeout
      task.timeout = setTimeout(() => {
        this.pendingTasks.delete(task.id);
        this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);
        reject(new Error(`Task ${task.id} timed out after ${this.config.taskTimeout}ms`));
      }, this.config.taskTimeout);

      this.pendingTasks.set(task.id, task);
      this.enqueueTask(task);
    });
  }

  /**
   * Enqueue task and process if workers available
   */
  private enqueueTask(task: PendingTask): void {
    this.taskQueue.push(task);
    this.processQueue();
  }

  /**
   * Process queued tasks
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0) {
      // Find available worker
      let availableWorkerIndex = -1;
      for (let i = 0; i < this.workers.length; i++) {
        if (!this.workerBusy.has(i)) {
          availableWorkerIndex = i;
          break;
        }
      }

      if (availableWorkerIndex === -1) {
        // No available workers
        break;
      }

      const task = this.taskQueue.shift()!;
      this.workerBusy.add(availableWorkerIndex);

      try {
        this.workers[availableWorkerIndex].postMessage(task.request);
      } catch (error) {
        task.reject(error as Error);
        this.workerBusy.delete(availableWorkerIndex);
      }
    }
  }

  /**
   * Handle message from worker
   */
  private handleWorkerMessage(response: WorkerResponse, workerIndex: number): void {
    const task = this.pendingTasks.get(response.id);

    if (!task) {
      console.warn(`Received message for unknown task ${response.id}`);
      return;
    }

    switch (response.type) {
      case 'progress':
        if (task.onProgress && response.progress !== undefined) {
          task.onProgress(response.progress);
        }
        break;

      case 'complete':
        if (task.timeout) clearTimeout(task.timeout);
        this.pendingTasks.delete(response.id);
        this.workerBusy.delete(workerIndex);
        task.resolve(response.data);
        this.processQueue();
        break;

      case 'error':
        if (task.timeout) clearTimeout(task.timeout);
        this.pendingTasks.delete(response.id);
        this.workerBusy.delete(workerIndex);
        task.reject(new Error(response.error || 'Worker error'));
        this.processQueue();
        break;
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(error: ErrorEvent, workerIndex: number): void {
    console.error(`Worker ${workerIndex} encountered an error:`, error.message);

    // Reject all pending tasks for this worker
    const tasksToReject: string[] = [];
    this.pendingTasks.forEach((task, id) => {
      tasksToReject.push(id);
    });

    tasksToReject.forEach(id => {
      const task = this.pendingTasks.get(id);
      if (task) {
        if (task.timeout) clearTimeout(task.timeout);
        this.pendingTasks.delete(id);
        task.reject(new Error(`Worker ${workerIndex} error: ${error.message}`));
      }
    });

    // Restart worker
    try {
      this.workers[workerIndex] = new Worker(
        new URL('./fileProcessingWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.workers[workerIndex].onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(event.data, workerIndex);
      };

      this.workers[workerIndex].onerror = (error: ErrorEvent) => {
        this.handleWorkerError(error, workerIndex);
      };

      this.workerBusy.delete(workerIndex);
      this.processQueue();
    } catch (error) {
      console.error(`Failed to restart worker ${workerIndex}:`, error);
    }
  }

  /**
   * Terminate all workers
   */
  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.pendingTasks.clear();
    this.workerBusy.clear();
    this.initialized = false;
  }

  /**
   * Get pool stats
   */
  getStats(): {
    totalWorkers: number;
    busyWorkers: number;
    queuedTasks: number;
    pendingTasks: number;
  } {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workerBusy.size,
      queuedTasks: this.taskQueue.length,
      pendingTasks: this.pendingTasks.size,
    };
  }
}

/**
 * Global worker pool singleton
 */
let globalPool: WorkerPool | null = null;

/**
 * Get or create global worker pool
 */
export function getWorkerPool(config?: WorkerPoolConfig): WorkerPool {
  if (!globalPool) {
    globalPool = new WorkerPool(config);
  }
  return globalPool;
}

/**
 * Terminate global worker pool
 */
export function terminateWorkerPool(): void {
  if (globalPool) {
    globalPool.terminate();
    globalPool = null;
  }
}
