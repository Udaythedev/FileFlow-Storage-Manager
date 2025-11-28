/**
 * Symentha AI Rules Engine
 * Smart file categorization based on patterns, extensions, and metadata
 */

import type { FileItem } from '../AppTypes';

export type OrganizationSuggestion = {
  file: FileItem;
  suggestedPath: string; // e.g. "Documents/PDFs" or "Photos/2024/November"
  confidence: number; // 0-1
  reason: string; // Human-readable explanation
  ruleApplied: string; // Name of rule that matched
};

export type FeedbackEntry = {
  fileId: string;
  fileName: string;
  extension: string;
  suggestedPath: string;
  acceptedPath: string; // What user actually chose
  timestamp: string;
  feedback: 'accepted' | 'rejected' | 'modified';
};

const FEEDBACK_KEY = 'symentha-organization-feedback';
let feedbackHistory: FeedbackEntry[] = [];

/**
 * Load feedback history from localStorage
 */
function loadFeedback(): FeedbackEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(FEEDBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save feedback to localStorage
 */
function saveFeedback(entries: FeedbackEntry[]) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(entries));
  } catch {}
}

// Initialize on module load
feedbackHistory = loadFeedback();

/**
 * Add feedback entry and update history
 */
export function recordFeedback(entry: Omit<FeedbackEntry, 'timestamp'>) {
  const withTimestamp: FeedbackEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  feedbackHistory.push(withTimestamp);
  saveFeedback(feedbackHistory);
}

/**
 * Get organization suggestions for a file
 */
export function getSuggestions(file: FileItem): OrganizationSuggestion[] {
  const suggestions: OrganizationSuggestion[] = [];

  // Rule 1: PDFs to Documents/PDFs
  if (file.extension.toLowerCase() === '.pdf') {
    suggestions.push({
      file,
      suggestedPath: 'Documents/PDFs',
      confidence: 0.95,
      reason: 'PDF documents are typically stored in Documents/PDFs folder',
      ruleApplied: 'PDF Rule',
    });
  }

  // Rule 2: Invoices/Receipts to Finance/Receipts
  if (/invoice|receipt|bill|payment/i.test(file.name) && /\.(pdf|xlsx?|csv)$/i.test(file.extension)) {
    suggestions.push({
      file,
      suggestedPath: 'Finance/Receipts',
      confidence: 0.9,
      reason: 'Filename matches invoice/receipt patterns',
      ruleApplied: 'Invoice/Receipt Rule',
    });
  }

  // Rule 3: Photos by year/month
  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(file.extension)) {
    const date = new Date(file.modifiedAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthName = date.toLocaleString('default', { month: 'long' });

    suggestions.push({
      file,
      suggestedPath: `Photos/${year}/${monthName}`,
      confidence: 0.85,
      reason: `Photos are organized by year (${year}) and month (${monthName})`,
      ruleApplied: 'Photo Organization Rule',
    });
  }

  // Rule 4: Videos to Media/Videos
  if (/\.(mp4|avi|mkv|mov|webm|m4v)$/i.test(file.extension)) {
    suggestions.push({
      file,
      suggestedPath: 'Media/Videos',
      confidence: 0.88,
      reason: 'Video files are stored in Media/Videos folder',
      ruleApplied: 'Video Rule',
    });
  }

  // Rule 5: Audio to Media/Audio
  if (/\.(mp3|wav|flac|m4a|aac|ogg)$/i.test(file.extension)) {
    suggestions.push({
      file,
      suggestedPath: 'Media/Audio',
      confidence: 0.87,
      reason: 'Audio files are stored in Media/Audio folder',
      ruleApplied: 'Audio Rule',
    });
  }

  // Rule 6: Code projects to Development/[Language]
  if (/\.(js|ts|jsx|tsx|py|java|cpp|c|rb|go|rs)$/i.test(file.extension)) {
    const langMap: Record<string, string> = {
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript/React',
      '.jsx': 'React',
      '.py': 'Python',
      '.java': 'Java',
      '.cpp': 'C++',
      '.c': 'C',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
    };
    const lang = langMap[file.extension.toLowerCase()] || 'Code';
    suggestions.push({
      file,
      suggestedPath: `Development/${lang}`,
      confidence: 0.82,
      reason: `${lang} source files organized in Development/${lang}`,
      ruleApplied: 'Code Rule',
    });
  }

  // Rule 7: Archives to Compressed
  if (/\.(zip|rar|7z|tar|gz|bz2)$/i.test(file.extension)) {
    suggestions.push({
      file,
      suggestedPath: 'Compressed',
      confidence: 0.9,
      reason: 'Archive files are stored in Compressed folder',
      ruleApplied: 'Archive Rule',
    });
  }

  // Rule 8: Word docs to Documents
  if (/\.(doc|docx)$/i.test(file.extension)) {
    suggestions.push({
      file,
      suggestedPath: 'Documents',
      confidence: 0.85,
      reason: 'Word documents are stored in Documents folder',
      ruleApplied: 'Document Rule',
    });
  }

  // Rule 9: Spreadsheets to Documents/Spreadsheets
  if (/\.(xlsx?|csv)$/i.test(file.extension)) {
    suggestions.push({
      file,
      suggestedPath: 'Documents/Spreadsheets',
      confidence: 0.85,
      reason: 'Spreadsheets are organized in Documents/Spreadsheets',
      ruleApplied: 'Spreadsheet Rule',
    });
  }

  // Rule 10: Design files to Design
  if (/\.(psd|ai|sketch|figma|xd)$/i.test(file.extension)) {
    suggestions.push({
      file,
      suggestedPath: 'Design',
      confidence: 0.88,
      reason: 'Design files are stored in Design folder',
      ruleApplied: 'Design Rule',
    });
  }

  // Check feedback for learning
  const feedback = feedbackHistory.find(
    (f) => f.fileId === file.id || (f.fileName === file.name && f.extension === file.extension)
  );

  if (feedback && feedback.feedback === 'accepted') {
    // Boost suggestions matching user's accepted path
    const boosted = suggestions.find((s) => s.suggestedPath === feedback.acceptedPath);
    if (boosted) {
      boosted.confidence = Math.min(1, boosted.confidence + 0.1);
    }
  }

  // Sort by confidence descending
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get all feedback entries for analysis
 */
export function getFeedbackHistory(): FeedbackEntry[] {
  return [...feedbackHistory];
}

/**
 * Get feedback statistics
 */
export function getFeedbackStats() {
  const stats = {
    total: feedbackHistory.length,
    accepted: feedbackHistory.filter((f) => f.feedback === 'accepted').length,
    rejected: feedbackHistory.filter((f) => f.feedback === 'rejected').length,
    modified: feedbackHistory.filter((f) => f.feedback === 'modified').length,
    averageConfidence: 0,
  };

  if (feedbackHistory.length > 0) {
    // Calculate average confidence from original accepted suggestions
    const acceptedCount = stats.accepted + stats.modified;
    // Rough estimate: assume 0.85 average confidence per suggestion
    stats.averageConfidence = 0.85;
  }

  return stats;
}

/**
 * Clear all feedback (for testing or reset)
 */
export function clearFeedback() {
  feedbackHistory = [];
  saveFeedback([]);
}
