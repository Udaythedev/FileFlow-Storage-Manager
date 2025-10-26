// File category detection and classification

export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'code' | 'other';

const categoryMap: Record<string, FileCategory> = {
  // Images
  '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image',
  '.webp': 'image', '.svg': 'image', '.bmp': 'image', '.ico': 'image',
  '.tiff': 'image', '.tif': 'image', '.heic': 'image', '.heif': 'image',
  '.raw': 'image', '.cr2': 'image', '.nef': 'image', '.arw': 'image',

  // Videos
  '.mp4': 'video', '.mov': 'video', '.avi': 'video', '.mkv': 'video',
  '.webm': 'video', '.flv': 'video', '.wmv': 'video', '.m4v': 'video',
  '.mpg': 'video', '.mpeg': 'video', '.3gp': 'video', '.ogv': 'video',

  // Audio
  '.mp3': 'audio', '.wav': 'audio', '.flac': 'audio', '.aac': 'audio',
  '.ogg': 'audio', '.wma': 'audio', '.m4a': 'audio', '.opus': 'audio',
  '.ape': 'audio', '.alac': 'audio',

  // Documents
  '.pdf': 'document', '.doc': 'document', '.docx': 'document',
  '.xls': 'document', '.xlsx': 'document', '.ppt': 'document', '.pptx': 'document',
  '.txt': 'document', '.rtf': 'document', '.odt': 'document', '.ods': 'document',
  '.odp': 'document', '.csv': 'document', '.epub': 'document', '.mobi': 'document',

  // Archives
  '.zip': 'archive', '.rar': 'archive', '.7z': 'archive', '.tar': 'archive',
  '.gz': 'archive', '.bz2': 'archive', '.xz': 'archive', '.iso': 'archive',
  '.dmg': 'archive', '.pkg': 'archive',

  // Code
  '.js': 'code', '.ts': 'code', '.jsx': 'code', '.tsx': 'code',
  '.py': 'code', '.java': 'code', '.cpp': 'code', '.c': 'code',
  '.h': 'code', '.cs': 'code', '.go': 'code', '.rs': 'code',
  '.php': 'code', '.rb': 'code', '.swift': 'code', '.kt': 'code',
  '.html': 'code', '.css': 'code', '.scss': 'code', '.json': 'code',
  '.xml': 'code', '.yaml': 'code', '.yml': 'code', '.sh': 'code',
  '.sql': 'code', '.md': 'code',
};

export function getFileCategory(extension: string): FileCategory {
  return categoryMap[extension.toLowerCase()] ?? 'other';
}

export function getCategoryLabel(category: FileCategory): string {
  const labels: Record<FileCategory, string> = {
    image: 'Photos',
    video: 'Videos',
    audio: 'Audio',
    document: 'Documents',
    archive: 'Archives',
    code: 'Code',
    other: 'Other',
  };
  return labels[category];
}

export function getCategoryIcon(category: FileCategory): string {
  const icons: Record<FileCategory, string> = {
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    document: '📄',
    archive: '📦',
    code: '💻',
    other: '📁',
  };
  return icons[category];
}

export function getFileTypeIcon(extension: string): string {
  const category = getFileCategory(extension);
  
  // Specific icons for common types
  const specificIcons: Record<string, string> = {
    '.pdf': '📕',
    '.doc': '📘', '.docx': '📘',
    '.xls': '📗', '.xlsx': '📗',
    '.ppt': '📙', '.pptx': '📙',
    '.zip': '🗜️', '.rar': '🗜️', '.7z': '🗜️',
    '.txt': '📝',
    '.json': '{ }',
    '.html': '</>',
    '.css': '🎨',
  };

  return specificIcons[extension.toLowerCase()] ?? getCategoryIcon(category);
}

export const ALL_CATEGORIES: FileCategory[] = ['image', 'video', 'audio', 'document', 'archive', 'code', 'other'];
