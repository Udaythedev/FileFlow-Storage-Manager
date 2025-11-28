/**
 * Symentha AI - Content Search & Tagging Engine
 * Provides content-based search, automatic tagging, and metadata extraction
 */

import { FileItem } from '../AppTypes';

/**
 * Tag types and hierarchy
 */
export type TagType = 'auto' | 'manual' | 'system';

export interface Tag {
  id: string;
  name: string;
  type: TagType;
  frequency: number; // How often this tag appears
  color?: string;
}

export interface FileMetadata {
  fileId: string;
  tags: Tag[];
  keywords: string[];
  summary?: string;
  extractedDate?: string; // From content (e.g., invoice date)
  extractedAuthor?: string; // From document properties
  language?: string; // Detected language
  confidence: number; // 0-100, confidence of metadata
  lastUpdated: string; // ISO date
}

export interface SearchResult {
  file: FileItem;
  metadata: FileMetadata;
  relevance: number; // 0-100 match score
  matchedIn: 'filename' | 'content' | 'tags' | 'metadata';
  snippet?: string; // Preview of matched content
}

export interface SearchIndex {
  fileId: string;
  filename: string;
  content: string; // Indexed content (truncated for large files)
  tags: string[];
  keywords: string[];
  extracted: {
    dates: string[];
    emails: string[];
    urls: string[];
    numbers: string[];
  };
}

/**
 * Content text extraction patterns for different file types
 */
const PATTERN_RULES = {
  // Common date patterns (ISO, US, EU formats)
  DATE: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/g,
  
  // Email addresses
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // URLs
  URL: /(https?:\/\/[^\s]+|www\.[^\s]+)/g,
  
  // Numbers with currency
  CURRENCY: /[$£€¥₹]\s?[\d,]+(\.\d{2})?/g,
  
  // Phone numbers
  PHONE: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
};

/**
 * Auto-tagging rules based on content and filename
 */
const AUTO_TAGGING_RULES = [
  // Financial documents
  {
    keywords: ['invoice', 'receipt', 'bill', 'payment', 'transaction'],
    tag: 'Invoice',
    confidence: 0.95,
  },
  {
    keywords: ['tax', 'w2', '1099', 'deduction', 'refund'],
    tag: 'Tax Document',
    confidence: 0.92,
  },
  {
    keywords: ['contract', 'agreement', 'terms', 'conditions', 'ndca'],
    tag: 'Legal',
    confidence: 0.90,
  },
  
  // Travel
  {
    keywords: ['flight', 'hotel', 'booking', 'reservation', 'itinerary', 'ticket'],
    tag: 'Travel',
    confidence: 0.88,
  },
  
  // Medical
  {
    keywords: ['prescription', 'medical', 'doctor', 'hospital', 'diagnosis', 'patient'],
    tag: 'Medical',
    confidence: 0.90,
  },
  
  // Education
  {
    keywords: ['certificate', 'diploma', 'degree', 'transcript', 'course', 'grade'],
    tag: 'Education',
    confidence: 0.85,
  },
  
  // Personal documents
  {
    keywords: ['passport', 'license', 'id', 'ssn', 'birth', 'marriage'],
    tag: 'Personal ID',
    confidence: 0.93,
  },
  
  // Meeting/Project related
  {
    keywords: ['meeting', 'notes', 'agenda', 'minutes', 'summary', 'action items'],
    tag: 'Meeting Notes',
    confidence: 0.80,
  },
];

/**
 * Extract searchable content from file based on extension
 * Note: For actual implementation, would use libraries like:
 * - pdf-parse for PDFs
 * - xlsx for Excel files
 * - docx for Word documents
 * - node-html-parser for HTML
 */
export async function extractFileContent(
  file: FileItem,
  handle?: FileSystemFileHandle
): Promise<string> {
  const ext = file.extension.toLowerCase();
  
  // For binary formats, we'd normally parse them
  // For now, returning mock content - in production:
  // - Use pdf-parse for .pdf
  // - Use xlsx/exceljs for .xlsx/.xls
  // - Use docx for .docx
  // - Use node-html-parser for .html
  
  if (!handle) {
    return `${file.name} - ${ext} file`;
  }

  try {
    if (['txt', 'md', 'json', 'xml', 'csv', 'html'].includes(ext)) {
      // Text-based files - can read directly
      const f = await handle.getFile();
      const text = await f.text();
      // Return first 5000 chars to avoid memory issues
      return text.substring(0, 5000);
    }
  } catch (error) {
    console.warn(`Failed to extract content from ${file.name}:`, error);
  }

  return '';
}

/**
 * Extract metadata from file content
 */
export function extractMetadata(content: string, filename: string): Partial<FileMetadata> {
  const keywords: string[] = [];
  const extracted = {
    dates: [] as string[],
    emails: [] as string[],
    urls: [] as string[],
    numbers: [] as string[],
  };

  // Extract dates
  const dateMatches = content.match(PATTERN_RULES.DATE);
  if (dateMatches) {
    extracted.dates = [...new Set(dateMatches)].slice(0, 10);
  }

  // Extract emails
  const emailMatches = content.match(PATTERN_RULES.EMAIL);
  if (emailMatches) {
    extracted.emails = [...new Set(emailMatches)].slice(0, 10);
  }

  // Extract URLs
  const urlMatches = content.match(PATTERN_RULES.URL);
  if (urlMatches) {
    extracted.urls = [...new Set(urlMatches)].slice(0, 10);
  }

  // Extract currency amounts
  const currencyMatches = content.match(PATTERN_RULES.CURRENCY);
  if (currencyMatches) {
    extracted.numbers = [...new Set(currencyMatches)].slice(0, 10);
  }

  // Extract keywords (words > 4 chars, excluding common words)
  const commonWords = new Set([
    'the', 'and', 'that', 'this', 'with', 'from', 'have', 'were', 'been', 'their',
    'which', 'would', 'should', 'could', 'about', 'document', 'file', 'attachment',
  ]);

  const words = content
    .toLowerCase()
    .split(/[\s\-_.()[\]{}]+/)
    .filter(w => w.length > 4 && !commonWords.has(w) && !/^\d+$/.test(w));

  // Count word frequency
  const wordFreq = new Map<string, number>();
  words.forEach(w => {
    wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
  });

  // Get top 20 keywords by frequency
  keywords.push(
    ...Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word)
  );

  return {
    keywords,
    extractedDate: extracted.dates[0],
    extractedAuthor: extracted.emails[0],
    language: detectLanguage(content),
  };
}

/**
 * Detect language of content (simplified)
 */
function detectLanguage(content: string): string {
  // Simplified - in production use: detect-language or similar library
  // For now, just return English if has latin chars
  return /[a-zA-Z]/.test(content) ? 'en' : 'unknown';
}

/**
 * Generate automatic tags based on content
 */
export function generateAutoTags(
  file: FileItem,
  content: string,
  metadata: Partial<FileMetadata>
): Tag[] {
  const tags: Tag[] = [];
  const searchText = `${file.name} ${content}`.toLowerCase();

  // Apply auto-tagging rules
  AUTO_TAGGING_RULES.forEach(rule => {
    const matchCount = rule.keywords.filter(kw => searchText.includes(kw)).length;
    const matchRatio = matchCount / rule.keywords.length;

    // Tag if 50%+ of keywords match
    if (matchRatio >= 0.5) {
      tags.push({
        id: `auto-${rule.tag.toLowerCase().replace(/\s+/g, '-')}`,
        name: rule.tag,
        type: 'auto',
        frequency: matchCount,
        color: getTagColor(rule.tag),
      });
    }
  });

  // Tag by file extension
  const ext = file.extension.toLowerCase();
  const typeTag = getTypeTag(ext);
  if (typeTag) {
    tags.push({
      id: `type-${ext}`,
      name: typeTag,
      type: 'system',
      frequency: 1,
      color: '#9CA3AF',
    });
  }

  return tags;
}

/**
 * Get content type tag from extension
 */
function getTypeTag(extension: string): string | null {
  const typeMap: Record<string, string> = {
    'pdf': 'PDF Document',
    'doc': 'Word Document',
    'docx': 'Word Document',
    'xls': 'Spreadsheet',
    'xlsx': 'Spreadsheet',
    'ppt': 'Presentation',
    'pptx': 'Presentation',
    'txt': 'Text File',
    'jpg': 'Image',
    'png': 'Image',
    'gif': 'Image',
    'mp4': 'Video',
    'mp3': 'Audio',
  };

  return typeMap[extension] || null;
}

/**
 * Assign a color to a tag for UI display
 */
function getTagColor(tagName: string): string {
  // Use hash of tag name to consistently color same tags
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = ((hash << 5) - hash) + tagName.charCodeAt(i);
    hash = hash & hash;
  }

  const colors = [
    '#EC4899', // pink
    '#F59E0B', // amber
    '#10B981', // emerald
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#06B6D4', // cyan
    '#EF4444', // red
    '#14B8A6', // teal
  ];

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Search files by query
 */
export function searchFiles(
  query: string,
  files: SearchIndex[],
  limit: number = 50
): SearchResult[] {
  const lowerQuery = query.toLowerCase();
  const results: Array<SearchResult & { score: number }> = [];

  files.forEach(fileIndex => {
    let score = 0;
    let matchedIn: SearchResult['matchedIn'] = 'filename';

    // Exact filename match (highest priority)
    if (fileIndex.filename.toLowerCase().includes(lowerQuery)) {
      score += 100;
      matchedIn = 'filename';
    }

    // Tag match (high priority)
    const tagMatch = fileIndex.tags.find(tag => tag.toLowerCase().includes(lowerQuery));
    if (tagMatch) {
      score += 80;
      matchedIn = 'tags';
    }

    // Keyword match (medium priority)
    const keywordMatch = fileIndex.keywords.find(kw => kw.toLowerCase().includes(lowerQuery));
    if (keywordMatch) {
      score += 60;
      matchedIn = 'tags';
    }

    // Content match (lower priority, but still valuable)
    if (fileIndex.content.toLowerCase().includes(lowerQuery)) {
      score += 40;
      matchedIn = 'content';
    }

    // Extracted metadata match
    const extractedMatch = Object.values(fileIndex.extracted).some(arr =>
      arr.some(item => item.toLowerCase().includes(lowerQuery))
    );
    if (extractedMatch) {
      score += 30;
      matchedIn = 'metadata';
    }

    if (score > 0) {
      // Generate snippet from content
      const contentStart = fileIndex.content.toLowerCase().indexOf(lowerQuery);
      let snippet: string | undefined;
      if (contentStart !== -1) {
        const start = Math.max(0, contentStart - 40);
        const end = Math.min(fileIndex.content.length, contentStart + query.length + 40);
        snippet = `...${fileIndex.content.substring(start, end)}...`;
      }

      results.push({
        file: {} as FileItem, // Would be populated from fileIndex
        metadata: {} as FileMetadata,
        relevance: Math.min(score, 100),
        matchedIn,
        snippet,
        score, // For sorting
      });
    }
  });

  // Sort by score (descending) and return top results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...result }) => result);
}

/**
 * Build search index from files
 */
export async function buildSearchIndex(
  files: FileItem[],
  contentExtractor?: (file: FileItem) => Promise<string>
): Promise<SearchIndex[]> {
  return Promise.all(
    files.map(async file => {
      const content = contentExtractor
        ? await contentExtractor(file)
        : `${file.name} ${file.extension}`;

      const metadata = extractMetadata(content, file.name);
      const autoTags = generateAutoTags(file, content, metadata);

      return {
        fileId: file.id,
        filename: file.name,
        content: content.substring(0, 5000), // Limit indexed content
        tags: autoTags.map(t => t.name),
        keywords: metadata.keywords || [],
        extracted: {
          dates: [],
          emails: [],
          urls: [],
          numbers: [],
        },
      };
    })
  );
}

/**
 * Store and retrieve file metadata from localStorage
 */
export class MetadataStore {
  private static readonly STORAGE_KEY = 'fileflow:metadata';
  private static readonly INDEX_KEY = 'fileflow:searchindex';

  static saveMetadata(metadata: FileMetadata[]): void {
    try {
      const data = JSON.stringify(metadata);
      localStorage.setItem(this.STORAGE_KEY, data);
    } catch (error) {
      console.warn('Failed to save metadata to localStorage:', error);
    }
  }

  static loadMetadata(): FileMetadata[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('Failed to load metadata from localStorage:', error);
      return [];
    }
  }

  static saveIndex(index: SearchIndex[]): void {
    try {
      const data = JSON.stringify(index);
      localStorage.setItem(this.INDEX_KEY, data);
    } catch (error) {
      console.warn('Failed to save search index to localStorage:', error);
    }
  }

  static loadIndex(): SearchIndex[] {
    try {
      const data = localStorage.getItem(this.INDEX_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('Failed to load search index from localStorage:', error);
      return [];
    }
  }

  static clearMetadata(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.INDEX_KEY);
  }
}

/**
 * Advanced search with filters
 */
export interface SearchFilters {
  extension?: string[];
  minSize?: number;
  maxSize?: number;
  dateRange?: { start: string; end: string };
  tags?: string[];
  excludeTags?: string[];
}

export function filterSearchResults(
  results: SearchResult[],
  filters: SearchFilters
): SearchResult[] {
  return results.filter(result => {
    const file = result.file;

    // Extension filter
    if (filters.extension && !filters.extension.includes(file.extension)) {
      return false;
    }

    // Size filters
    if (filters.minSize && file.size < filters.minSize) {
      return false;
    }
    if (filters.maxSize && file.size > filters.maxSize) {
      return false;
    }

    // Date range filter
    if (filters.dateRange) {
      const modDate = new Date(file.modifiedAt).getTime();
      const startTime = new Date(filters.dateRange.start).getTime();
      const endTime = new Date(filters.dateRange.end).getTime();
      if (modDate < startTime || modDate > endTime) {
        return false;
      }
    }

    // Tag filters
    if (filters.tags && filters.tags.length > 0) {
      const hasTags = filters.tags.some(tag =>
        result.metadata.tags.some(t => t.name === tag)
      );
      if (!hasTags) {
        return false;
      }
    }

    // Exclude tags
    if (filters.excludeTags && filters.excludeTags.length > 0) {
      const hasExcludedTag = filters.excludeTags.some(tag =>
        result.metadata.tags.some(t => t.name === tag)
      );
      if (hasExcludedTag) {
        return false;
      }
    }

    return true;
  });
}
