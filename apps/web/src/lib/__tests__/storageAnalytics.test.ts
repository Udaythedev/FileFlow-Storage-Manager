import { describe, it, expect } from 'vitest';
import {
  calculateFileTypeStats,
  calculateCategoryStats,
  getLargestFiles,
  generateRecommendations,
  analyzeStorage,
} from '../storageAnalytics';
import type { FileItem, Folder } from '../../AppTypes';

const mockFileItem = (overrides?: Partial<FileItem>): FileItem => ({
  id: 'file_1',
  name: 'test.txt',
  size: 1024,
  extension: '.txt',
  modifiedAt: new Date().toISOString(),
  parentId: 'folder_1',
  ...overrides,
});

const mockFolder = (files: FileItem[] = []): Folder => ({
  id: 'folder_1',
  name: 'Test Folder',
  files,
  folders: [],
  handle: {} as any,
});

describe('storageAnalytics', () => {
  describe('calculateFileTypeStats', () => {
    it('should calculate file type statistics correctly', () => {
      const files = [
        mockFileItem({ id: 'f1', name: 'a.txt', extension: '.txt', size: 100 }),
        mockFileItem({ id: 'f2', name: 'b.txt', extension: '.txt', size: 200 }),
        mockFileItem({ id: 'f3', name: 'c.jpg', extension: '.jpg', size: 5000 }),
      ];

      const stats = calculateFileTypeStats(files);

      expect(stats).toHaveLength(2);
      expect(stats[0].type).toBe('.jpg'); // Largest first
      expect(stats[0].totalSize).toBe(5000);
      expect(stats[1].type).toBe('.txt');
      expect(stats[1].totalSize).toBe(300);
    });

    it('should calculate percentages correctly', () => {
      const files = [
        mockFileItem({ id: 'f1', extension: '.txt', size: 100 }),
        mockFileItem({ id: 'f2', extension: '.jpg', size: 300 }),
      ];

      const stats = calculateFileTypeStats(files);

      expect(stats[0].percentage).toBeCloseTo(75, 1); // 300/400 * 100
      expect(stats[1].percentage).toBeCloseTo(25, 1); // 100/400 * 100
    });

    it('should limit to top 10 file types', () => {
      const files = Array.from({ length: 15 }, (_, i) =>
        mockFileItem({
          id: `f${i}`,
          extension: `.ext${i}`,
          size: 1000 - i * 50,
        })
      );

      const stats = calculateFileTypeStats(files);

      expect(stats.length).toBeLessThanOrEqual(10);
    });

    it('should handle files without extension', () => {
      const files = [
        mockFileItem({ id: 'f1', extension: '', size: 100 }),
        mockFileItem({ id: 'f2', extension: '.txt', size: 200 }),
      ];

      const stats = calculateFileTypeStats(files);

      expect(stats.some((s) => s.type === 'no-ext')).toBe(true);
    });
  });

  describe('calculateCategoryStats', () => {
    it('should categorize files correctly', () => {
      const files = [
        mockFileItem({ id: 'f1', extension: '.jpg', size: 1000 }),
        mockFileItem({ id: 'f2', extension: '.txt', size: 500 }),
        mockFileItem({ id: 'f3', extension: '.mp4', size: 2000 }),
      ];

      const stats = calculateCategoryStats(files);

      const categories = stats.map((s) => s.category);
      expect(categories).toContain('Images');
      expect(categories).toContain('Documents');
      expect(categories).toContain('Videos');
    });

    it('should put unknown extensions in Other category', () => {
      const files = [mockFileItem({ id: 'f1', extension: '.xyz', size: 100 })];

      const stats = calculateCategoryStats(files);

      expect(stats.some((s) => s.category === 'Other')).toBe(true);
    });

    it('should calculate category percentages', () => {
      const files = [
        mockFileItem({ id: 'f1', extension: '.txt', size: 400 }),
        mockFileItem({ id: 'f2', extension: '.jpg', size: 600 }),
      ];

      const stats = calculateCategoryStats(files);

      const docStats = stats.find((s) => s.category === 'Documents')!;
      const imgStats = stats.find((s) => s.category === 'Images')!;

      expect(docStats.percentage).toBeCloseTo(40, 1);
      expect(imgStats.percentage).toBeCloseTo(60, 1);
    });

    it('should not include categories with zero files', () => {
      const files = [mockFileItem({ id: 'f1', extension: '.txt', size: 100 })];

      const stats = calculateCategoryStats(files);

      expect(stats.every((s) => s.files > 0)).toBe(true);
    });
  });

  describe('getLargestFiles', () => {
    it('should return files sorted by size (largest first)', () => {
      const files = [
        mockFileItem({ id: 'f1', size: 100 }),
        mockFileItem({ id: 'f2', size: 5000 }),
        mockFileItem({ id: 'f3', size: 500 }),
      ];

      const largest = getLargestFiles(files);

      expect(largest[0].id).toBe('f2');
      expect(largest[1].id).toBe('f3');
      expect(largest[2].id).toBe('f1');
    });

    it('should limit results to specified count', () => {
      const files = Array.from({ length: 20 }, (_, i) =>
        mockFileItem({ id: `f${i}`, size: 1000 - i * 10 })
      );

      const largest = getLargestFiles(files, 5);

      expect(largest).toHaveLength(5);
    });

    it('should handle fewer files than limit', () => {
      const files = [
        mockFileItem({ id: 'f1', size: 100 }),
        mockFileItem({ id: 'f2', size: 200 }),
      ];

      const largest = getLargestFiles(files, 10);

      expect(largest).toHaveLength(2);
    });
  });

  describe('generateRecommendations', () => {
    it('should recommend video compression for large media', () => {
      const files = Array.from({ length: 10 }, (_, i) =>
        mockFileItem({
          id: `f${i}`,
          extension: '.mp4',
          size: 1024 * 1024 * 1024 * 0.5, // 500MB each
        })
      );

      const recommendations = generateRecommendations(files);

      expect(recommendations.some((r) => r.id === 'large-media')).toBe(true);
    });

    it('should recommend cleanup for many similar files', () => {
      const files = Array.from({ length: 150 }, (_, i) =>
        mockFileItem({
          id: `f${i}`,
          extension: '.tmp',
          size: 100,
        })
      );

      const recommendations = generateRecommendations(files);

      expect(recommendations.some((r) => r.id === 'many-similar-files')).toBe(true);
    });

    it('should recommend archiving for very old files', () => {
      const oneYearAgo = new Date(new Date().getTime() - 400 * 24 * 60 * 60 * 1000);
      const files = Array.from({ length: 50 }, (_, i) =>
        mockFileItem({
          id: `f${i}`,
          size: 1000,
          modifiedAt: oneYearAgo.toISOString(),
        })
      );

      const recommendations = generateRecommendations(files);

      expect(recommendations.some((r) => r.id === 'old-files')).toBe(true);
    });

    it('should recommend cleanup for many small files', () => {
      const files = Array.from({ length: 100 }, (_, i) =>
        mockFileItem({
          id: `f${i}`,
          size: 100, // Small files
        })
      );

      const recommendations = generateRecommendations(files);

      expect(recommendations.some((r) => r.id === 'many-small-files')).toBe(true);
    });

    it('should sort recommendations by severity', () => {
      const largeMediaFiles = Array.from({ length: 10 }, (_, i) =>
        mockFileItem({
          id: `f${i}`,
          extension: '.mp4',
          size: 1024 * 1024 * 1024 * 0.5,
        })
      );

      const recommendations = generateRecommendations(largeMediaFiles);

      if (recommendations.length > 1) {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        for (let i = 0; i < recommendations.length - 1; i++) {
          expect(severityOrder[recommendations[i].severity]).toBeLessThanOrEqual(
            severityOrder[recommendations[i + 1].severity]
          );
        }
      }
    });
  });

  describe('analyzeStorage', () => {
    it('should generate comprehensive analytics', () => {
      const files = [
        mockFileItem({ id: 'f1', extension: '.txt', size: 100 }),
        mockFileItem({ id: 'f2', extension: '.jpg', size: 5000 }),
        mockFileItem({ id: 'f3', extension: '.mp4', size: 1000000 }),
      ];

      const folder = mockFolder(files);
      const analytics = analyzeStorage(folder);

      expect(analytics.totalFiles).toBe(3);
      expect(analytics.totalSize).toBe(1005100);
      expect(analytics.fileTypes.length).toBeGreaterThan(0);
      expect(analytics.categories.length).toBeGreaterThan(0);
      expect(analytics.largestFiles.length).toBeGreaterThan(0);
      expect(analytics.recommendations).toEqual(expect.any(Array));
    });

    it('should calculate average file size correctly', () => {
      const files = [
        mockFileItem({ id: 'f1', size: 100 }),
        mockFileItem({ id: 'f2', size: 200 }),
        mockFileItem({ id: 'f3', size: 300 }),
      ];

      const folder = mockFolder(files);
      const analytics = analyzeStorage(folder);

      expect(analytics.averageFileSize).toBeCloseTo(200, 1);
    });

    it('should handle empty folders', () => {
      const folder = mockFolder([]);
      const analytics = analyzeStorage(folder);

      expect(analytics.totalFiles).toBe(0);
      expect(analytics.totalSize).toBe(0);
      expect(analytics.averageFileSize).toBe(0);
    });
  });
});
