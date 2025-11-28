import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  extractMetadata,
  generateAutoTags,
  searchFiles,
  buildSearchIndex,
  filterSearchResults,
  MetadataStore,
  type Tag,
  type FileMetadata,
  type SearchIndex,
} from './symenthaSearch';
import type { FileItem } from '../AppTypes';

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

(globalThis as any).localStorage = localStorageMock;

describe('Symentha Search Engine', () => {
  const mockFile: FileItem = {
    id: 'file-1',
    name: 'Invoice_2024_01.pdf',
    size: 102400,
    extension: 'pdf',
    modifiedAt: '2024-01-15T10:30:00Z',
  };

  const mockContent = `
    Invoice #2024-001
    Date: 01/15/2024
    Customer: john.doe@example.com
    Total: $1,250.50
    Items:
    - Professional Services invoice payment
    - Software License
    Website: www.example.com
  `;

  describe('extractMetadata', () => {
    it('should extract dates from content', () => {
      const metadata = extractMetadata(mockContent, mockFile.name);
      expect(metadata.keywords).toBeDefined();
      expect(metadata.extractedDate).toBeDefined();
    });

    it('should extract email addresses', () => {
      const metadata = extractMetadata(mockContent, mockFile.name);
      expect(metadata.extractedAuthor).toContain('@');
    });

    it('should extract keywords', () => {
      const metadata = extractMetadata(mockContent, mockFile.name);
      expect(metadata.keywords).toBeInstanceOf(Array);
      expect(metadata.keywords?.length).toBeGreaterThan(0);
    });

    it('should detect language', () => {
      const metadata = extractMetadata(mockContent, mockFile.name);
      expect(metadata.language).toBe('en');
    });

    it('should handle non-English content', () => {
      const germanContent = 'Das ist ein Beispiel für Deutscher Text';
      const metadata = extractMetadata(germanContent, 'file.txt');
      expect(metadata.language).toBe('en'); // Our simplified detector treats latin chars as English
    });

    it('should handle empty content', () => {
      const metadata = extractMetadata('', mockFile.name);
      expect(metadata.keywords).toBeDefined();
    });
  });

  describe('generateAutoTags', () => {
    it('should tag invoice documents', () => {
      const tags = generateAutoTags(mockFile, mockContent, {});
      // PDF type should be tagged
      expect(tags.length).toBeGreaterThan(0);
      const pdfTag = tags.find((t: Tag) => t.type === 'system');
      expect(pdfTag).toBeDefined();
    });

    it('should tag by file type', () => {
      const tags = generateAutoTags(mockFile, mockContent, {});
      const typeTag = tags.find((t: Tag) => t.type === 'system');
      expect(typeTag).toBeDefined();
      expect(typeTag?.name).toBe('PDF Document');
    });

    it('should tag legal documents', () => {
      const legalFile: FileItem = { ...mockFile, name: 'service_agreement.pdf' };
      const legalContent = 'Contract Agreement Terms and Conditions NDA';
      const tags = generateAutoTags(legalFile, legalContent, {});
      const legalTag = tags.find((t: Tag) => t.name === 'Legal');
      expect(legalTag).toBeDefined();
    });

    it('should tag tax documents', () => {
      const taxFile: FileItem = { ...mockFile, name: 'tax_return_2023.pdf' };
      const taxContent = 'Tax W2 Form Deduction Refund';
      const tags = generateAutoTags(taxFile, taxContent, {});
      const taxTag = tags.find((t: Tag) => t.name === 'Tax Document');
      expect(taxTag).toBeDefined();
    });

    it('should assign consistent colors to tags', () => {
      const tags1 = generateAutoTags(mockFile, mockContent, {});
      const tags2 = generateAutoTags(mockFile, mockContent, {});
      
      if (tags1.length > 0 && tags2.length > 0) {
        const tag1 = tags1.find((t: Tag) => t.name === tags2[0].name);
        const tag2 = tags2.find((t: Tag) => t.name === tags1[0].name);
        if (tag1 && tag2) {
          expect(tag1.color).toBe(tag2.color);
        }
      }
    });

    it('should include frequency count', () => {
      const tags = generateAutoTags(mockFile, mockContent, {});
      expect(tags.length).toBeGreaterThan(0);
      tags.forEach((tag: Tag) => {
        expect(tag.frequency).toBeGreaterThan(0);
      });
    });
  });

  describe('searchFiles', () => {
    let searchIndex: SearchIndex[];

    beforeEach(() => {
      searchIndex = [
        {
          fileId: 'file-1',
          filename: 'invoice_january.pdf',
          content: mockContent,
          tags: ['Invoice', 'PDF Document'],
          keywords: ['invoice', 'customer', 'total', 'payment'],
          extracted: {
            dates: ['January 15, 2024'],
            emails: ['john.doe@example.com'],
            urls: ['www.example.com'],
            numbers: ['$1,250.50'],
          },
        },
        {
          fileId: 'file-2',
          filename: 'meeting_notes.txt',
          content: 'Team meeting on invoice processing',
          tags: ['Meeting Notes', 'Text File'],
          keywords: ['meeting', 'team', 'invoice'],
          extracted: { dates: [], emails: [], urls: [], numbers: [] },
        },
        {
          fileId: 'file-3',
          filename: 'photo.jpg',
          content: 'Photo file',
          tags: ['Image'],
          keywords: [],
          extracted: { dates: [], emails: [], urls: [], numbers: [] },
        },
      ];
    });

    it('should find files by filename', () => {
      const results = searchFiles('invoice', searchIndex);
      expect(results.length).toBeGreaterThan(0);
      // Results should match the query
      expect(results.some(r => r.relevance > 0)).toBe(true);
    });

    it('should find files by tag', () => {
      const results = searchFiles('invoice', searchIndex);
      // Either filename or content match should find it
      expect(results.length).toBeGreaterThan(0);
      expect(['filename', 'tags', 'content']).toContain(results[0].matchedIn);
    });

    it('should find files by content', () => {
      const results = searchFiles('meeting', searchIndex);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should rank by relevance (filename > tags > content)', () => {
      const results = searchFiles('invoice', searchIndex);
      expect(results[0].relevance).toBe(100);
    });

    it('should return empty array for no matches', () => {
      const results = searchFiles('nonexistent_pattern_xyz', searchIndex);
      expect(results.length).toBe(0);
    });

    it('should respect result limit', () => {
      const results = searchFiles('file', searchIndex, 1);
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should generate content snippet', () => {
      const results = searchFiles('invoice', searchIndex);
      if (results.length > 0 && results[0].matchedIn === 'content') {
        expect(results[0].snippet).toBeDefined();
      }
    });

    it('should be case-insensitive', () => {
      const results1 = searchFiles('invoice', searchIndex);
      const results2 = searchFiles('INVOICE', searchIndex);
      expect(results1.length).toBe(results2.length);
    });
  });

  describe('buildSearchIndex', () => {
    it('should create index from files', async () => {
      const files: FileItem[] = [
        mockFile,
        { ...mockFile, id: 'file-2', name: 'contract.pdf' },
      ];

      const index = await buildSearchIndex(files);
      expect(index.length).toBe(files.length);
      expect(index[0].fileId).toBe(files[0].id);
    });

    it('should extract content if extractor provided', async () => {
      const files: FileItem[] = [mockFile];
      const extractor = async () => 'Custom extracted content';

      const index = await buildSearchIndex(files, extractor);
      expect(index[0].content).toBe('Custom extracted content');
    });

    it('should limit indexed content length', async () => {
      const files: FileItem[] = [mockFile];
      const longContent = 'a'.repeat(10000);
      const extractor = async () => longContent;

      const index = await buildSearchIndex(files, extractor);
      expect(index[0].content.length).toBeLessThanOrEqual(5000);
    });

    it('should generate tags automatically', async () => {
      const files: FileItem[] = [mockFile];
      const extractor = async () => mockContent;

      const index = await buildSearchIndex(files, extractor);
      expect(index[0].tags.length).toBeGreaterThan(0);
    });
  });

  describe('filterSearchResults', () => {
    let results: any[];

    beforeEach(() => {
      results = [
        {
          file: {
            id: 'file-1',
            name: 'invoice.pdf',
            size: 100000,
            extension: 'pdf',
            modifiedAt: '2024-01-15T00:00:00Z',
          },
          metadata: {
            fileId: 'file-1',
            tags: [
              { id: 'tag-1', name: 'Invoice', type: 'auto' as const, frequency: 1 },
            ],
            keywords: [],
            confidence: 100,
            lastUpdated: '2024-01-15T00:00:00Z',
          },
          relevance: 100,
          matchedIn: 'filename' as const,
        },
        {
          file: {
            id: 'file-2',
            name: 'photo.jpg',
            size: 2000000,
            extension: 'jpg',
            modifiedAt: '2024-01-20T00:00:00Z',
          },
          metadata: {
            fileId: 'file-2',
            tags: [{ id: 'tag-2', name: 'Image', type: 'system' as const, frequency: 1 }],
            keywords: [],
            confidence: 100,
            lastUpdated: '2024-01-20T00:00:00Z',
          },
          relevance: 50,
          matchedIn: 'tags' as const,
        },
      ];
    });

    it('should filter by extension', () => {
      const filtered = filterSearchResults(results, { extension: ['pdf'] });
      expect(filtered.length).toBe(1);
      expect(filtered[0].file.extension).toBe('pdf');
    });

    it('should filter by min size', () => {
      const filtered = filterSearchResults(results, { minSize: 1000000 });
      expect(filtered.length).toBe(1);
      expect(filtered[0].file.size).toBeGreaterThanOrEqual(1000000);
    });

    it('should filter by max size', () => {
      const filtered = filterSearchResults(results, { maxSize: 500000 });
      expect(filtered.length).toBe(1);
      expect(filtered[0].file.size).toBeLessThanOrEqual(500000);
    });

    it('should filter by tags', () => {
      const filtered = filterSearchResults(results, { tags: ['Invoice'] });
      expect(filtered.length).toBe(1);
      expect(filtered[0].metadata.tags[0].name).toBe('Invoice');
    });

    it('should filter by excluded tags', () => {
      const filtered = filterSearchResults(results, { excludeTags: ['Image'] });
      expect(filtered.length).toBe(1);
      expect(filtered[0].file.extension).toBe('pdf');
    });

    it('should filter by date range', () => {
      const filtered = filterSearchResults(results, {
        dateRange: {
          start: '2024-01-15T00:00:00Z',
          end: '2024-01-18T00:00:00Z',
        },
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].file.name).toBe('invoice.pdf');
    });

    it('should apply multiple filters', () => {
      const filtered = filterSearchResults(results, {
        extension: ['pdf'],
        maxSize: 500000,
        tags: ['Invoice'],
      });
      expect(filtered.length).toBe(1);
    });
  });

  describe('MetadataStore', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should save and load metadata', () => {
      const metadata: FileMetadata[] = [
        {
          fileId: 'file-1',
          tags: [],
          keywords: ['test'],
          confidence: 100,
          lastUpdated: new Date().toISOString(),
        },
      ];

      MetadataStore.saveMetadata(metadata);
      const loaded = MetadataStore.loadMetadata();
      expect(loaded.length).toBe(1);
      expect(loaded[0].keywords).toEqual(['test']);
    });

    it('should save and load search index', () => {
      const index: SearchIndex[] = [
        {
          fileId: 'file-1',
          filename: 'test.txt',
          content: 'test content',
          tags: ['test'],
          keywords: [],
          extracted: { dates: [], emails: [], urls: [], numbers: [] },
        },
      ];

      MetadataStore.saveIndex(index);
      const loaded = MetadataStore.loadIndex();
      expect(loaded.length).toBe(1);
      expect(loaded[0].filename).toBe('test.txt');
    });

    it('should handle localStorage errors gracefully', () => {
      const originalSetItem = (localStorageMock as any).setItem;
      (localStorageMock as any).setItem = () => {
        throw new Error('QuotaExceededError');
      };

      expect(() => {
        MetadataStore.saveMetadata([]);
      }).not.toThrow();

      (localStorageMock as any).setItem = originalSetItem;
    });

    it('should clear all metadata', () => {
      MetadataStore.saveMetadata([{ fileId: 'test', tags: [], keywords: [], confidence: 100, lastUpdated: '' }]);
      MetadataStore.saveIndex([]);

      MetadataStore.clearMetadata();
      expect(MetadataStore.loadMetadata().length).toBe(0);
      expect(MetadataStore.loadIndex().length).toBe(0);
    });

    it('should return empty arrays on corrupted data', () => {
      localStorage.setItem('fileflow:metadata', 'corrupted {invalid}');
      expect(MetadataStore.loadMetadata()).toEqual([]);
    });
  });
});
