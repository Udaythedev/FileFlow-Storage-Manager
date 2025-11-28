/**
 * Symentha AI - ML Classification Engine
 * Document and file classification using pattern matching and heuristics
 * Future: TensorFlow.js integration for deep learning models
 */

import { FileItem } from '../AppTypes';

/**
 * Classification confidence levels
 */
export enum ConfidenceLevel {
  HIGH = 0.8,
  MEDIUM = 0.6,
  LOW = 0.4,
  VERY_LOW = 0.2,
}

/**
 * Classification result
 */
export interface ClassificationResult {
  fileId: string;
  fileName: string;
  predictedCategory: string;
  confidence: number;
  alternatives: Array<{ category: string; confidence: number }>;
  reasoning: string;
  timestamp: number;
}

/**
 * ML Model configuration
 */
export interface MLModelConfig {
  enabled: boolean;
  useNativeModels: boolean; // Use pattern-based models
  useTensorFlow: boolean; // Use TensorFlow.js when available
  confidenceThreshold: number;
  maxAlternatives: number;
  cacheResults: boolean;
}

/**
 * Pattern-based classifiers for different file types
 */
const DOCUMENT_PATTERNS = {
  legal: /\b(contract|agreement|license|terms|conditions|clause|liability)\b/i,
  financial: /\b(invoice|receipt|ledger|balance|account|transaction|statement)\b/i,
  medical: /\b(prescription|diagnosis|treatment|patient|medical|health|clinical)\b/i,
  technical: /\b(specification|documentation|api|protocol|standard|requirement)\b/i,
};

const CODE_PATTERNS = {
  javascript: /\.(js|jsx|ts|tsx|mjs)$/i,
  python: /\.py$/i,
  java: /\.java$/i,
  cpp: /\.(cpp|cc|cxx|h|hpp)$/i,
  csharp: /\.cs$/i,
  go: /\.go$/i,
  rust: /\.rs$/i,
};

const MEDIA_PATTERNS = {
  image: /\.(jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff)$/i,
  video: /\.(mp4|avi|mov|mkv|flv|wmv|webm|m3u8)$/i,
  audio: /\.(mp3|wav|flac|aac|ogg|wma|m4a)$/i,
};

const DATA_PATTERNS = {
  database: /\.(db|sqlite|mdb|accdb|sql)$/i,
  spreadsheet: /\.(xlsx|xls|csv|ods)$/i,
  archive: /\.(zip|rar|7z|tar|gz|bz2)$/i,
  json: /\.json$/i,
  xml: /\.xml$/i,
  yaml: /\.(yaml|yml)$/i,
};

/**
 * Classify a file using pattern matching
 */
function classifyByExtension(file: FileItem): {
  category: string;
  confidence: number;
  reasoning: string;
} | null {
  const ext = file.name.toLowerCase();

  // Check code files
  for (const [category, pattern] of Object.entries(CODE_PATTERNS)) {
    if (pattern.test(ext)) {
      return {
        category: `Code/${category}`,
        confidence: ConfidenceLevel.HIGH,
        reasoning: `File extension matches ${category} pattern`,
      };
    }
  }

  // Check media files
  for (const [category, pattern] of Object.entries(MEDIA_PATTERNS)) {
    if (pattern.test(ext)) {
      return {
        category: `Media/${category}`,
        confidence: ConfidenceLevel.HIGH,
        reasoning: `File extension matches ${category} pattern`,
      };
    }
  }

  // Check data files
  for (const [category, pattern] of Object.entries(DATA_PATTERNS)) {
    if (pattern.test(ext)) {
      return {
        category: `Data/${category}`,
        confidence: ConfidenceLevel.HIGH,
        reasoning: `File extension matches ${category} pattern`,
      };
    }
  }

  // Check document files
  if (/\.(pdf|docx?|doc|rtf|odt|txt)$/i.test(ext)) {
    return {
      category: 'Documents/Text',
      confidence: ConfidenceLevel.MEDIUM,
      reasoning: 'File is document-type based on extension',
    };
  }

  return null;
}

/**
 * Classify by file name patterns
 */
function classifyByFileName(file: FileItem): {
  category: string;
  confidence: number;
  reasoning: string;
} | null {
  const name = file.name.toLowerCase();

  // System files
  if (/^(thumbs\.db|\.ds_store|desktop\.ini|pagefile\.sys)$/i.test(name)) {
    return {
      category: 'System/Cache',
      confidence: ConfidenceLevel.HIGH,
      reasoning: 'System file detected by name',
    };
  }

  // Backup files
  if (/\.(bak|backup|old|tmp|temp|~)$/i.test(name)) {
    return {
      category: 'Archives/Backup',
      confidence: ConfidenceLevel.HIGH,
      reasoning: 'Backup file detected by extension',
    };
  }

  // Log files
  if (/\.(log|trace|debug)$/i.test(name)) {
    return {
      category: 'System/Logs',
      confidence: ConfidenceLevel.HIGH,
      reasoning: 'Log file detected by extension',
    };
  }

  // Configuration files
  if (/\.(conf|config|cfg|ini|env)$/i.test(name)) {
    return {
      category: 'System/Configuration',
      confidence: ConfidenceLevel.HIGH,
      reasoning: 'Configuration file detected by extension',
    };
  }

  // Screenshot patterns
  if (/screenshot|screen shot|capture|snap/i.test(name)) {
    return {
      category: 'Media/Screenshots',
      confidence: ConfidenceLevel.MEDIUM,
      reasoning: 'Screenshot detected by filename pattern',
    };
  }

  return null;
}

/**
 * Classify by file size heuristics
 */
function classifyBySize(file: FileItem): string | null {
  // Very small files (< 1 KB) often config or system files
  if (file.size < 1024) {
    return 'System/Configuration';
  }

  // Very large files (> 1 GB) often media or archives
  if (file.size > 1024 * 1024 * 1024) {
    return 'Media/Large';
  }

  return null;
}

/**
 * Get alternative classifications for a file
 */
function getAlternativeClassifications(
  file: FileItem
): Array<{ category: string; confidence: number }> {
  const alternatives: Map<string, number> = new Map();

  // Try multiple classification methods
  const byExt = classifyByExtension(file);
  if (byExt) {
    alternatives.set(byExt.category, byExt.confidence);
  }

  const byName = classifyByFileName(file);
  if (byName && byName.category !== byExt?.category) {
    alternatives.set(byName.category, byName.confidence * 0.8); // Slightly lower confidence
  }

  const bySize = classifyBySize(file);
  if (bySize && !alternatives.has(bySize)) {
    alternatives.set(bySize, ConfidenceLevel.LOW);
  }

  // Sort by confidence descending
  return Array.from(alternatives.entries())
    .map(([category, confidence]) => ({ category, confidence }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

/**
 * Classify a single file
 */
export function classifyFile(
  file: FileItem,
  config: MLModelConfig = DEFAULT_ML_CONFIG
): ClassificationResult {
  const startTime = performance.now();

  // Try different classification methods
  let primaryClassification = classifyByExtension(file);

  if (!primaryClassification) {
    primaryClassification = classifyByFileName(file);
  }

  if (!primaryClassification) {
    const sizeCategory = classifyBySize(file);
    if (sizeCategory) {
      primaryClassification = {
        category: sizeCategory,
        confidence: ConfidenceLevel.LOW,
        reasoning: 'Classified by file size heuristics',
      };
    }
  }

  // Default fallback
  if (!primaryClassification) {
    primaryClassification = {
      category: 'Other/Unknown',
      confidence: ConfidenceLevel.VERY_LOW,
      reasoning: 'Could not determine file category',
    };
  }

  const alternatives = getAlternativeClassifications(file);

  const result: ClassificationResult = {
    fileId: file.id,
    fileName: file.name,
    predictedCategory: primaryClassification.category,
    confidence: primaryClassification.confidence,
    alternatives: alternatives.filter(
      (alt) => alt.category !== primaryClassification!.category
    ),
    reasoning: primaryClassification.reasoning,
    timestamp: Date.now(),
  };

  console.debug(
    `Classification completed in ${(performance.now() - startTime).toFixed(2)}ms`
  );

  return result;
}

/**
 * Classify multiple files (batched)
 */
export function classifyFiles(
  files: FileItem[],
  config: MLModelConfig = DEFAULT_ML_CONFIG
): ClassificationResult[] {
  return files.map((file) => classifyFile(file, config));
}

/**
 * Cache for classification results
 */
const classificationCache = new Map<string, ClassificationResult>();

/**
 * Classify with caching
 */
export function classifyFileWithCache(
  file: FileItem,
  config: MLModelConfig = DEFAULT_ML_CONFIG
): ClassificationResult {
  const cacheKey = `${file.id}-${file.name}`;

  if (config.cacheResults && classificationCache.has(cacheKey)) {
    return classificationCache.get(cacheKey)!;
  }

  const result = classifyFile(file, config);

  if (config.cacheResults) {
    classificationCache.set(cacheKey, result);
  }

  return result;
}

/**
 * Clear classification cache
 */
export function clearClassificationCache(): void {
  classificationCache.clear();
}

/**
 * Get cache size
 */
export function getClassificationCacheSize(): number {
  return classificationCache.size;
}

/**
 * Default ML configuration
 */
export const DEFAULT_ML_CONFIG: MLModelConfig = {
  enabled: true,
  useNativeModels: true,
  useTensorFlow: false, // TensorFlow.js not loaded by default
  confidenceThreshold: ConfidenceLevel.MEDIUM,
  maxAlternatives: 3,
  cacheResults: true,
};

/**
 * Calculate confidence-weighted category distribution
 */
export function getCategoryDistribution(
  results: ClassificationResult[]
): Record<string, number> {
  const distribution: Record<string, number> = {};

  for (const result of results) {
    const category = result.predictedCategory;
    distribution[category] = (distribution[category] || 0) + result.confidence;
  }

  return distribution;
}

/**
 * Get high-confidence classifications only
 */
export function getHighConfidenceClassifications(
  results: ClassificationResult[],
  threshold: number = ConfidenceLevel.HIGH
): ClassificationResult[] {
  return results.filter((result) => result.confidence >= threshold);
}

/**
 * Get statistics about classifications
 */
export interface ClassificationStats {
  totalClassifications: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  averageConfidence: number;
  topCategories: Array<{ category: string; count: number }>;
}

export function getClassificationStats(
  results: ClassificationResult[]
): ClassificationStats {
  if (results.length === 0) {
    return {
      totalClassifications: 0,
      highConfidenceCount: 0,
      mediumConfidenceCount: 0,
      lowConfidenceCount: 0,
      averageConfidence: 0,
      topCategories: [],
    };
  }

  const highConfidence = results.filter(
    (r) => r.confidence >= ConfidenceLevel.HIGH
  );
  const mediumConfidence = results.filter(
    (r) =>
      r.confidence >= ConfidenceLevel.MEDIUM &&
      r.confidence < ConfidenceLevel.HIGH
  );
  const lowConfidence = results.filter(
    (r) => r.confidence < ConfidenceLevel.MEDIUM
  );

  const categories = new Map<string, number>();
  for (const result of results) {
    categories.set(
      result.predictedCategory,
      (categories.get(result.predictedCategory) || 0) + 1
    );
  }

  const topCategories = Array.from(categories.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const averageConfidence =
    results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  return {
    totalClassifications: results.length,
    highConfidenceCount: highConfidence.length,
    mediumConfidenceCount: mediumConfidence.length,
    lowConfidenceCount: lowConfidence.length,
    averageConfidence,
    topCategories,
  };
}
