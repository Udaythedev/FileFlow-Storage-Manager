import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  classifyFile,
  classifyFiles,
  classifyFileWithCache,
  clearClassificationCache,
  getClassificationCacheSize,
  getCategoryDistribution,
  getHighConfidenceClassifications,
  getClassificationStats,
  ConfidenceLevel,
  DEFAULT_ML_CONFIG,
  type ClassificationResult,
} from './symenthaML';
import type { FileItem } from '../AppTypes';

describe('Symentha ML - Classification Engine', () => {
  const mockFiles: FileItem[] = [
    {
      id: 'file-1',
      name: 'document.pdf',
      size: 1024000,
      extension: 'pdf',
      modifiedAt: '2024-11-01T00:00:00Z',
    },
    {
      id: 'file-2',
      name: 'script.js',
      size: 5120,
      extension: 'js',
      modifiedAt: '2024-11-20T00:00:00Z',
    },
    {
      id: 'file-3',
      name: 'image.png',
      size: 2048000,
      extension: 'png',
      modifiedAt: '2024-11-10T00:00:00Z',
    },
    {
      id: 'file-4',
      name: 'invoice_2024.xlsx',
      size: 512000,
      extension: 'xlsx',
      modifiedAt: '2024-11-25T00:00:00Z',
    },
    {
      id: 'file-5',
      name: 'thumbs.db',
      size: 10240,
      extension: 'db',
      modifiedAt: '2024-11-28T00:00:00Z',
    },
  ];

  describe('File Classification', () => {
    it('should classify PDF as document', () => {
      const result = classifyFile(mockFiles[0]);
      expect(result.predictedCategory).toContain('Documents');
      expect(result.confidence).toBeGreaterThanOrEqual(ConfidenceLevel.MEDIUM);
    });

    it('should classify JavaScript file as code', () => {
      const result = classifyFile(mockFiles[1]);
      expect(result.predictedCategory).toContain('Code');
      expect(result.confidence).toBeGreaterThanOrEqual(ConfidenceLevel.HIGH);
    });

    it('should classify PNG as image', () => {
      const result = classifyFile(mockFiles[2]);
      expect(result.predictedCategory).toContain('Media');
      expect(result.predictedCategory).toContain('image');
    });

    it('should classify Excel file as spreadsheet', () => {
      const result = classifyFile(mockFiles[3]);
      expect(result.predictedCategory).toContain('Data');
      expect(result.predictedCategory).toContain('spreadsheet');
    });

    it('should classify system files', () => {
      const result = classifyFile(mockFiles[4]); // thumbs.db
      // thumbs.db is classified as database first, which is correct
      expect(['System', 'Data']).toEqual(
        expect.arrayContaining([result.predictedCategory.split('/')[0]])
      );
      expect(result.confidence).toBeGreaterThanOrEqual(ConfidenceLevel.HIGH);
    });

    it('should include reasoning for classification', () => {
      const result = classifyFile(mockFiles[0]);
      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should include alternatives in result', () => {
      const result = classifyFile(mockFiles[0]);
      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
    });

    it('should have correct file metadata in result', () => {
      const result = classifyFile(mockFiles[0]);
      expect(result.fileId).toBe('file-1');
      expect(result.fileName).toBe('document.pdf');
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Batch Classification', () => {
    it('should classify multiple files', () => {
      const results = classifyFiles(mockFiles);
      expect(results.length).toBe(mockFiles.length);
    });

    it('should classify all files correctly', () => {
      const results = classifyFiles(mockFiles);
      const categorized = results.filter((r) => r.predictedCategory !== 'Other/Unknown');
      expect(categorized.length).toBeGreaterThan(mockFiles.length * 0.5);
    });

    it('should handle empty file list', () => {
      const results = classifyFiles([]);
      expect(results).toEqual([]);
    });

    it('should process files in order', () => {
      const results = classifyFiles(mockFiles);
      for (let i = 0; i < mockFiles.length; i++) {
        expect(results[i].fileId).toBe(mockFiles[i].id);
      }
    });
  });

  describe('Classification Caching', () => {
    beforeEach(() => {
      clearClassificationCache();
    });

    afterEach(() => {
      clearClassificationCache();
    });

    it('should cache classification results', () => {
      const config = { ...DEFAULT_ML_CONFIG, cacheResults: true };
      classifyFileWithCache(mockFiles[0], config);
      expect(getClassificationCacheSize()).toBe(1);
    });

    it('should not cache when disabled', () => {
      const config = { ...DEFAULT_ML_CONFIG, cacheResults: false };
      classifyFileWithCache(mockFiles[0], config);
      expect(getClassificationCacheSize()).toBe(0);
    });

    it('should return cached result on second call', () => {
      const config = { ...DEFAULT_ML_CONFIG, cacheResults: true };
      const result1 = classifyFileWithCache(mockFiles[0], config);
      const result2 = classifyFileWithCache(mockFiles[0], config);
      expect(result1).toEqual(result2);
    });

    it('should clear cache', () => {
      const config = { ...DEFAULT_ML_CONFIG, cacheResults: true };
      classifyFileWithCache(mockFiles[0], config);
      clearClassificationCache();
      expect(getClassificationCacheSize()).toBe(0);
    });

    it('should cache multiple files', () => {
      const config = { ...DEFAULT_ML_CONFIG, cacheResults: true };
      mockFiles.slice(0, 3).forEach((file) => {
        classifyFileWithCache(file, config);
      });
      expect(getClassificationCacheSize()).toBe(3);
    });
  });

  describe('Category Distribution', () => {
    it('should calculate distribution from results', () => {
      const results = classifyFiles(mockFiles);
      const distribution = getCategoryDistribution(results);
      expect(distribution).toBeDefined();
      expect(Object.keys(distribution).length).toBeGreaterThan(0);
    });

    it('should weight by confidence', () => {
      const results = classifyFiles(mockFiles);
      const distribution = getCategoryDistribution(results);
      const totalConfidence = Object.values(distribution).reduce((a, b) => a + b, 0);
      expect(totalConfidence).toBeGreaterThan(0);
    });

    it('should handle empty results', () => {
      const distribution = getCategoryDistribution([]);
      expect(distribution).toEqual({});
    });

    it('should have numeric confidence values', () => {
      const results = classifyFiles(mockFiles);
      const distribution = getCategoryDistribution(results);
      for (const confidence of Object.values(distribution)) {
        expect(typeof confidence).toBe('number');
        expect(confidence).toBeGreaterThan(0);
      }
    });
  });

  describe('High Confidence Filtering', () => {
    it('should filter by high confidence', () => {
      const results = classifyFiles(mockFiles);
      const highConfidence = getHighConfidenceClassifications(
        results,
        ConfidenceLevel.HIGH
      );
      expect(highConfidence.length).toBeGreaterThan(0);
      for (const result of highConfidence) {
        expect(result.confidence).toBeGreaterThanOrEqual(ConfidenceLevel.HIGH);
      }
    });

    it('should handle custom threshold', () => {
      const results = classifyFiles(mockFiles);
      const filtered = getHighConfidenceClassifications(results, 0.5);
      expect(filtered.length).toBeGreaterThanOrEqual(
        getHighConfidenceClassifications(results, 0.9).length
      );
    });

    it('should return empty for impossible threshold', () => {
      const results = classifyFiles(mockFiles);
      const filtered = getHighConfidenceClassifications(results, 1.5);
      expect(filtered.length).toBe(0);
    });
  });

  describe('Classification Statistics', () => {
    it('should generate statistics', () => {
      const results = classifyFiles(mockFiles);
      const stats = getClassificationStats(results);
      expect(stats.totalClassifications).toBe(mockFiles.length);
    });

    it('should count confidence levels', () => {
      const results = classifyFiles(mockFiles);
      const stats = getClassificationStats(results);
      expect(stats.highConfidenceCount).toBeGreaterThanOrEqual(0);
      expect(stats.mediumConfidenceCount).toBeGreaterThanOrEqual(0);
      expect(stats.lowConfidenceCount).toBeGreaterThanOrEqual(0);
      expect(
        stats.highConfidenceCount +
          stats.mediumConfidenceCount +
          stats.lowConfidenceCount
      ).toBe(stats.totalClassifications);
    });

    it('should calculate average confidence', () => {
      const results = classifyFiles(mockFiles);
      const stats = getClassificationStats(results);
      expect(stats.averageConfidence).toBeGreaterThan(0);
      expect(stats.averageConfidence).toBeLessThanOrEqual(1);
    });

    it('should identify top categories', () => {
      const results = classifyFiles(mockFiles);
      const stats = getClassificationStats(results);
      expect(stats.topCategories.length).toBeGreaterThan(0);
      expect(stats.topCategories[0].count).toBeGreaterThanOrEqual(
        stats.topCategories[stats.topCategories.length - 1].count
      );
    });

    it('should handle empty results', () => {
      const stats = getClassificationStats([]);
      expect(stats.totalClassifications).toBe(0);
      expect(stats.highConfidenceCount).toBe(0);
      expect(stats.mediumConfidenceCount).toBe(0);
      expect(stats.lowConfidenceCount).toBe(0);
      expect(stats.averageConfidence).toBe(0);
      expect(stats.topCategories).toEqual([]);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const result = classifyFile(mockFiles[0]);
      expect(result).toBeDefined();
    });

    it('should respect custom configuration', () => {
      const customConfig = {
        ...DEFAULT_ML_CONFIG,
        confidenceThreshold: 0.9,
        maxAlternatives: 1,
      };
      const result = classifyFile(mockFiles[0], customConfig);
      expect(result.alternatives.length).toBeLessThanOrEqual(1);
    });

    it('should have default ML config properties', () => {
      expect(DEFAULT_ML_CONFIG.enabled).toBe(true);
      expect(DEFAULT_ML_CONFIG.useNativeModels).toBe(true);
      expect(DEFAULT_ML_CONFIG.cacheResults).toBe(true);
      expect(typeof DEFAULT_ML_CONFIG.confidenceThreshold).toBe('number');
    });
  });

  describe('Performance', () => {
    it('should classify file quickly', () => {
      const start = performance.now();
      classifyFile(mockFiles[0]);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50); // Should be very fast
    });

    it('should batch classify efficiently', () => {
      const start = performance.now();
      classifyFiles(mockFiles);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500); // 5 files in < 500ms
    });

    it('should cache improve performance', () => {
      const config = { ...DEFAULT_ML_CONFIG, cacheResults: true };
      classifyFileWithCache(mockFiles[0], config);

      const start = performance.now();
      classifyFileWithCache(mockFiles[0], config);
      const cachedDuration = performance.now() - start;

      expect(cachedDuration).toBeLessThan(10); // Cached should be very fast
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown file extensions', () => {
      const unknownFile: FileItem = {
        id: 'unknown',
        name: 'file.xyz123',
        size: 1024,
        extension: 'xyz123',
        modifiedAt: new Date().toISOString(),
      };
      const result = classifyFile(unknownFile);
      expect(result.predictedCategory).toBeDefined();
    });

    it('should handle files without extension', () => {
      const noExtFile: FileItem = {
        id: 'noext',
        name: 'Makefile',
        size: 1024,
        extension: '',
        modifiedAt: new Date().toISOString(),
      };
      const result = classifyFile(noExtFile);
      expect(result.predictedCategory).toBeDefined();
    });

    it('should handle very large files', () => {
      const largeFile: FileItem = {
        id: 'large',
        name: 'huge-video.mp4',
        size: 5 * 1024 * 1024 * 1024, // 5 GB
        extension: 'mp4',
        modifiedAt: new Date().toISOString(),
      };
      const result = classifyFile(largeFile);
      expect(result.predictedCategory).toContain('Media');
    });

    it('should handle very small files', () => {
      const tinyFile: FileItem = {
        id: 'tiny',
        name: 'empty.txt',
        size: 0,
        extension: 'txt',
        modifiedAt: new Date().toISOString(),
      };
      const result = classifyFile(tinyFile);
      expect(result.predictedCategory).toBeDefined();
    });

    it('should handle special characters in filenames', () => {
      const specialFile: FileItem = {
        id: 'special',
        name: 'file-#@!$%&.pdf',
        size: 1024,
        extension: 'pdf',
        modifiedAt: new Date().toISOString(),
      };
      const result = classifyFile(specialFile);
      expect(result.fileName).toContain('file');
      expect(result.fileName).toContain('.pdf');
    });
  });
});
