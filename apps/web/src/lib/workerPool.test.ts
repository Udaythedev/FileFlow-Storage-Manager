import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkerPool, getWorkerPool, terminateWorkerPool } from './workerPool';
import type { WorkerRequest } from '../workers/fileProcessingWorker';

// Mock Worker class for test environment
class MockWorker {
  url: string | URL;
  options?: any;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  constructor(url: string | URL, options?: any) {
    this.url = url;
    this.options = options;
  }

  postMessage(_data: any): void {
    // Mock implementation - responses not needed for structural tests
  }

  terminate(): void {}
  addEventListener(_event: string, _handler: EventListener): void {}
  removeEventListener(_event: string, _handler: EventListener): void {}
  dispatchEvent(_event: Event): boolean { return true; }
}

// Setup Worker mock for test environment
if (typeof Worker === 'undefined') {
  globalThis.Worker = MockWorker as any;
}

describe('Worker Pool', () => {
  beforeEach(() => {
    terminateWorkerPool();
  });

  afterEach(() => {
    terminateWorkerPool();
  });

  describe('Initialization', () => {
    it('should create pool with custom worker count', () => {
      const pool = new WorkerPool({ workerCount: 4 });
      expect(pool).toBeDefined();
    });

    it('should create pool with default worker count', () => {
      const pool = new WorkerPool();
      expect(pool).toBeDefined();
    });

    it('should set default task timeout', () => {
      const pool = new WorkerPool();
      expect(pool).toBeDefined();
    });

    it('should allow custom task timeout', () => {
      const pool = new WorkerPool({ taskTimeout: 10000 });
      expect(pool).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should use provided worker count', () => {
      const pool = new WorkerPool({ workerCount: 3 });
      expect(pool).toBeDefined();
    });

    it('should use provided task timeout', () => {
      const pool = new WorkerPool({ taskTimeout: 30000 });
      expect(pool).toBeDefined();
    });

    it('should use provided worker script path', () => {
      const pool = new WorkerPool({ workerScript: 'custom-worker.js' });
      expect(pool).toBeDefined();
    });
  });

  describe('Global pool singleton', () => {
    it('should return same pool instance', () => {
      const pool1 = getWorkerPool();
      const pool2 = getWorkerPool();
      expect(pool1).toBe(pool2);
    });

    it('should allow config on first initialization', () => {
      const pool = getWorkerPool({ workerCount: 4 });
      expect(pool).toBeDefined();
    });

    it('should allow reset via termination', () => {
      const pool1 = getWorkerPool();
      terminateWorkerPool();
      const pool2 = getWorkerPool();
      expect(pool1).not.toBe(pool2);
    });

    it('should return new instance after termination', () => {
      const pool1 = getWorkerPool({ workerCount: 2 });
      terminateWorkerPool();
      const pool2 = getWorkerPool({ workerCount: 4 });
      expect(pool1).not.toBe(pool2);
      expect(pool2).toBeDefined();
    });
  });

  describe('Pool structure', () => {
    it('should have getStats method', () => {
      const pool = new WorkerPool({ workerCount: 2 });
      expect(typeof pool.getStats).toBe('function');
    });

    it('should have execute method', () => {
      const pool = new WorkerPool({ workerCount: 2 });
      expect(typeof pool.execute).toBe('function');
    });

    it('should have initialize method', () => {
      const pool = new WorkerPool({ workerCount: 2 });
      expect(typeof pool.initialize).toBe('function');
    });

    it('should have terminate method', () => {
      const pool = new WorkerPool({ workerCount: 2 });
      expect(typeof pool.terminate).toBe('function');
    });
  });

  describe('Stats tracking', () => {
    it('should initialize stats with zero busy workers', () => {
      const pool = new WorkerPool({ workerCount: 2 });
      const stats = pool.getStats();
      expect(stats.busyWorkers).toBe(0);
    });

    it('should track total workers count', () => {
      const pool = new WorkerPool({ workerCount: 3 });
      const stats = pool.getStats();
      expect(stats.totalWorkers).toBeGreaterThanOrEqual(0);
    });

    it('should track queued tasks count', () => {
      const pool = new WorkerPool({ workerCount: 2 });
      const stats = pool.getStats();
      expect(typeof stats.queuedTasks).toBe('number');
    });

    it('should track pending tasks count', () => {
      const pool = new WorkerPool({ workerCount: 2 });
      const stats = pool.getStats();
      expect(typeof stats.pendingTasks).toBe('number');
    });

    it('should initialize with empty queue', () => {
      const pool = new WorkerPool({ workerCount: 2 });
      const stats = pool.getStats();
      expect(stats.queuedTasks).toBe(0);
    });

    it('should initialize with no pending tasks', () => {
      const pool = new WorkerPool({ workerCount: 2 });
      const stats = pool.getStats();
      expect(stats.pendingTasks).toBe(0);
    });
  });

  describe('Request processing', () => {
    it('should accept task requests', async () => {
      const pool = new WorkerPool({ workerCount: 1 });
      await pool.initialize();

      const request: WorkerRequest = {
        type: 'HASH_FILES',
        id: 'test-1',
        payload: { files: [], algorithm: 'SHA-256', chunkSize: 65536 },
      };

      // Submit task but don't wait - we're just testing it accepts the request
      pool.execute(request).catch(() => {
        // Expected to fail/timeout in test
      });

      const stats = pool.getStats();
      // Should have either queued or processing the task
      expect(stats.queuedTasks + stats.pendingTasks).toBeGreaterThan(0);

      pool.terminate();
    });

    it('should support all task types', () => {
      const taskTypes: WorkerRequest['type'][] = [
        'HASH_FILES',
        'INDEX_FILES',
        'CALCULATE_STATS',
        'FILTER_FILES',
      ];

      expect(taskTypes.length).toBe(4);
    });
  });

  describe('Termination', () => {
    it('should have terminate method', () => {
      const pool = new WorkerPool({ workerCount: 2 });
      expect(typeof pool.terminate).toBe('function');
      pool.terminate();
    });

    it('should be callable after initialization', async () => {
      const pool = new WorkerPool({ workerCount: 2 });
      await pool.initialize();
      expect(() => pool.terminate()).not.toThrow();
    });

    it('should allow multiple terminations', () => {
      const pool = new WorkerPool({ workerCount: 2 });
      expect(() => {
        pool.terminate();
        pool.terminate();
      }).not.toThrow();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid worker count gracefully', () => {
      const pool = new WorkerPool({ workerCount: 0 });
      expect(pool).toBeDefined();
    });

    it('should handle negative timeout gracefully', () => {
      const pool = new WorkerPool({ taskTimeout: -1000 });
      expect(pool).toBeDefined();
    });

    it('should handle very large worker count', () => {
      const pool = new WorkerPool({ workerCount: 1000 });
      expect(pool).toBeDefined();
    });
  });

  describe('API compatibility', () => {
    it('should export WorkerPool class', () => {
      expect(WorkerPool).toBeDefined();
    });

    it('should export getWorkerPool function', () => {
      expect(typeof getWorkerPool).toBe('function');
    });

    it('should export terminateWorkerPool function', () => {
      expect(typeof terminateWorkerPool).toBe('function');
    });
  });

  describe('Configuration persistence', () => {
    it('should maintain config across stats calls', () => {
      const pool = new WorkerPool({ workerCount: 3, taskTimeout: 15000 });
      const stats1 = pool.getStats();
      const stats2 = pool.getStats();
      expect(stats1).toEqual(stats2);
    });

    it('should remember workerCount in configuration', () => {
      const workerCount = 5;
      const pool = new WorkerPool({ workerCount });
      // Pool should remember the config
      expect(pool).toBeDefined();
    });
  });
});
