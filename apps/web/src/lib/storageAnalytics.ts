/**
 * Storage Analytics - Compute statistics and insights from file data
 */

import type { FileItem, Folder } from '../AppTypes';

export interface FileTypeStats {
  type: string;
  count: number;
  totalSize: number;
  percentage: number;
}

export interface CategoryStats {
  category: string;
  files: number;
  size: number;
  percentage: number;
}

export interface StorageAnalytics {
  totalFiles: number;
  totalSize: number;
  fileTypes: FileTypeStats[];
  categories: CategoryStats[];
  largestFiles: FileItem[];
  recommendations: StorageRecommendation[];
  averageFileSize: number;
}

export interface StorageRecommendation {
  id: string;
  title: string;
  description: string;
  potentialSavings: number;
  severity: 'low' | 'medium' | 'high';
  action: () => void;
}

const CATEGORIES: Record<string, string[]> = {
  Images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.tiff'],
  Videos: ['.mp4', '.avi', '.mkv', '.mov', '.flv', '.wmv', '.webm', '.m4v'],
  Audio: ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.wma', '.ogg', '.opus'],
  Documents: ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx'],
  Archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.iso'],
  Code: ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.rb', '.go', '.rs'],
  Executables: ['.exe', '.msi', '.dmg', '.app', '.deb', '.rpm'],
  Other: [],
};

/**
 * Calculate file type statistics from files
 */
export function calculateFileTypeStats(files: FileItem[]): FileTypeStats[] {
  const typeMap = new Map<string, { count: number; size: number }>();

  for (const file of files) {
    const ext = file.extension?.toLowerCase() || 'no-ext';
    const current = typeMap.get(ext) || { count: 0, size: 0 };
    current.count++;
    current.size += file.size;
    typeMap.set(ext, current);
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const stats: FileTypeStats[] = Array.from(typeMap.entries())
    .map(([type, data]) => ({
      type,
      count: data.count,
      totalSize: data.size,
      percentage: totalSize > 0 ? (data.size / totalSize) * 100 : 0,
    }))
    .sort((a, b) => b.totalSize - a.totalSize)
    .slice(0, 10); // Top 10 file types

  return stats;
}

/**
 * Calculate category statistics (Images, Videos, Documents, etc.)
 */
export function calculateCategoryStats(files: FileItem[]): CategoryStats[] {
  const categoryMap = new Map<string, { files: number; size: number }>();

  for (const category in CATEGORIES) {
    categoryMap.set(category, { files: 0, size: 0 });
  }

  for (const file of files) {
    const ext = file.extension?.toLowerCase();
    let found = false;

    for (const [category, extensions] of Object.entries(CATEGORIES)) {
      if (extensions.includes(ext || '')) {
        const current = categoryMap.get(category)!;
        current.files++;
        current.size += file.size;
        found = true;
        break;
      }
    }

    if (!found) {
      const current = categoryMap.get('Other')!;
      current.files++;
      current.size += file.size;
    }
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const stats: CategoryStats[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      files: data.files,
      size: data.size,
      percentage: totalSize > 0 ? (data.size / totalSize) * 100 : 0,
    }))
    .filter((s) => s.files > 0)
    .sort((a, b) => b.size - a.size);

  return stats;
}

/**
 * Get top 10 largest files
 */
export function getLargestFiles(files: FileItem[], limit = 10): FileItem[] {
  return [...files].sort((a, b) => b.size - a.size).slice(0, limit);
}

/**
 * Generate storage recommendations based on file analysis
 */
export function generateRecommendations(files: FileItem[]): StorageRecommendation[] {
  const recommendations: StorageRecommendation[] = [];
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  // Check for large media files
  const mediaFiles = files.filter((f) =>
    ['.mp4', '.avi', '.mkv', '.mov', '.iso'].includes(f.extension?.toLowerCase() || '')
  );
  const mediaSize = mediaFiles.reduce((sum, f) => sum + f.size, 0);

  if (mediaSize > totalSize * 0.3) {
    recommendations.push({
      id: 'large-media',
      title: 'Compress or Archive Video Files',
      description: `Videos consume ${(mediaSize / (1024 * 1024 * 1024)).toFixed(1)}GB (${((mediaSize / totalSize) * 100).toFixed(0)}% of storage). Consider archiving or compressing to save space.`,
      potentialSavings: Math.floor(mediaSize * 0.3),
      severity: 'high',
      action: () => console.log('Video compression recommended'),
    });
  }

  // Check for duplicate file extensions
  const extCounts = new Map<string, number>();
  for (const file of files) {
    const ext = file.extension?.toLowerCase() || 'no-ext';
    extCounts.set(ext, (extCounts.get(ext) || 0) + 1);
  }

  const duplicateExts = Array.from(extCounts.entries())
    .filter(([_, count]) => count > 100)
    .map(([ext, count]) => ({ ext, count }))
    .sort((a, b) => b.count - a.count);

  if (duplicateExts.length > 0) {
    const topExt = duplicateExts[0];
    recommendations.push({
      id: 'many-similar-files',
      title: `${topExt.count} ${topExt.ext} Files Found`,
      description: `You have ${topExt.count} files with extension "${topExt.ext}". Check for duplicates or obsolete files that can be removed.`,
      potentialSavings: 0,
      severity: 'medium',
      action: () => console.log('Similar files analysis recommended'),
    });
  }

  // Check for very old files (potential cleanup candidates)
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const oldFiles = files.filter((f) => new Date(f.modifiedAt) < oneYearAgo);
  const oldFileSize = oldFiles.reduce((sum, f) => sum + f.size, 0);

  if (oldFiles.length > files.length * 0.1 && oldFileSize > 0) {
    recommendations.push({
      id: 'old-files',
      title: `Archive ${oldFiles.length} Files Older Than 1 Year`,
      description: `${oldFiles.length} files haven't been modified in over a year, taking up ${(oldFileSize / (1024 * 1024 * 1024)).toFixed(1)}GB. Consider archiving them.`,
      potentialSavings: Math.floor(oldFileSize * 0.5),
      severity: 'low',
      action: () => console.log('Old files archival recommended'),
    });
  }

  // Check for many small files
  const smallFiles = files.filter((f) => f.size < 1024);
  if (smallFiles.length > files.length * 0.5) {
    recommendations.push({
      id: 'many-small-files',
      title: `${smallFiles.length} Files Under 1KB`,
      description: `${smallFiles.length} files are under 1KB. These may be system or temporary files. Review and clean up if necessary.`,
      potentialSavings: smallFiles.reduce((sum, f) => sum + f.size, 0),
      severity: 'low',
      action: () => console.log('Small files cleanup recommended'),
    });
  }

  return recommendations.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Generate comprehensive storage analytics
 */
export function analyzeStorage(folder: Folder): StorageAnalytics {
  const allFiles = collectAllFiles(folder);

  const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);
  const averageFileSize = allFiles.length > 0 ? totalSize / allFiles.length : 0;

  return {
    totalFiles: allFiles.length,
    totalSize,
    fileTypes: calculateFileTypeStats(allFiles),
    categories: calculateCategoryStats(allFiles),
    largestFiles: getLargestFiles(allFiles, 10),
    recommendations: generateRecommendations(allFiles),
    averageFileSize,
  };
}

/**
 * Collect all files from folder structure recursively
 */
function collectAllFiles(folder: Folder): FileItem[] {
  const files = [...folder.files];
  for (const subfolder of folder.folders) {
    files.push(...collectAllFiles(subfolder));
  }
  return files;
}
