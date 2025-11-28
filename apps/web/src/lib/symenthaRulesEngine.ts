/**
 * Symentha AI - Rules Engine
 * Smart file categorization based on patterns, metadata, and user feedback
 */

import type { FileItem } from '../AppTypes';

export interface CategorizationRule {
  id: string;
  name: string;
  description: string;
  pattern: RegExp | ((file: FileItem) => boolean);
  targetFolder: string;
  priority: number; // Lower = higher priority
  enabled: boolean;
  accuracy: number; // 0-100, user feedback based
}

export interface CategorizeResult {
  fileId: string;
  fileName: string;
  currentLocation: string;
  suggestedFolder: string;
  matchedRule: CategorizationRule;
  confidence: number; // 0-100
  reasoning: string;
}

export interface UserFeedback {
  fileId: string;
  ruleId: string;
  accepted: boolean;
  timestamp: number;
  userChose?: string; // Alternative folder user selected
}

export interface RulesEngineState {
  rules: CategorizationRule[];
  feedback: UserFeedback[];
  categoryStats: Map<string, { accepted: number; rejected: number }>;
}

// Default categorization rules
export const DEFAULT_RULES: CategorizationRule[] = [
  {
    id: 'rule-pdf-documents',
    name: 'PDF Documents',
    description: 'Move PDF files to Documents folder',
    pattern: /\.pdf$/i,
    targetFolder: 'Documents/PDFs',
    priority: 1,
    enabled: true,
    accuracy: 98,
  },
  {
    id: 'rule-word-docs',
    name: 'Word Documents',
    description: 'Move .doc/.docx files to Documents',
    pattern: /\.(doc|docx)$/i,
    targetFolder: 'Documents/Word',
    priority: 1,
    enabled: true,
    accuracy: 98,
  },
  {
    id: 'rule-excel-sheets',
    name: 'Excel Spreadsheets',
    description: 'Move Excel files to Finance/Spreadsheets',
    pattern: /\.(xls|xlsx|csv)$/i,
    targetFolder: 'Finance/Spreadsheets',
    priority: 2,
    enabled: true,
    accuracy: 97,
  },
  {
    id: 'rule-invoices',
    name: 'Invoice Detection',
    description: 'Files with "invoice", "bill", or "receipt" in name',
    pattern: /(invoice|bill|receipt)/i,
    targetFolder: 'Finance/Invoices',
    priority: 5,
    enabled: true,
    accuracy: 85,
  },
  {
    id: 'rule-recent-photos',
    name: 'Recent Photos',
    description: 'Photos from this month/year to dedicated folder',
    pattern: (file) => {
      const ext = file.extension?.toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext || '')) return false;
      const fileDate = new Date(file.modifiedAt);
      const now = new Date();
      const sameYear = fileDate.getFullYear() === now.getFullYear();
      const sameMonth = fileDate.getMonth() === now.getMonth();
      return sameYear && sameMonth;
    },
    targetFolder: 'Photos/Recent',
    priority: 3,
    enabled: true,
    accuracy: 92,
  },
  {
    id: 'rule-old-photos',
    name: 'Archived Photos',
    description: 'Photos older than 2 years',
    pattern: (file) => {
      const ext = file.extension?.toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext || '')) return false;
      const fileDate = new Date(file.modifiedAt);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      return fileDate < twoYearsAgo;
    },
    targetFolder: 'Photos/Archive',
    priority: 4,
    enabled: true,
    accuracy: 90,
  },
  {
    id: 'rule-code-projects',
    name: 'Code Files',
    description: 'Move source code files to Development',
    pattern: /\.(js|ts|jsx|tsx|py|java|cpp|c|rb|go|rs)$/i,
    targetFolder: 'Development/Code',
    priority: 2,
    enabled: true,
    accuracy: 99,
  },
  {
    id: 'rule-config-files',
    name: 'Configuration Files',
    description: 'Move config files to Development/Config',
    pattern: /\.(json|yaml|yml|toml|ini|xml|conf)$/i,
    targetFolder: 'Development/Config',
    priority: 3,
    enabled: true,
    accuracy: 95,
  },
  {
    id: 'rule-videos',
    name: 'Video Files',
    description: 'Move video files to Media/Videos',
    pattern: /\.(mp4|avi|mkv|mov|flv|wmv|webm)$/i,
    targetFolder: 'Media/Videos',
    priority: 2,
    enabled: true,
    accuracy: 99,
  },
  {
    id: 'rule-music',
    name: 'Audio Files',
    description: 'Move audio files to Media/Music',
    pattern: /\.(mp3|wav|flac|aac|m4a|wma|ogg)$/i,
    targetFolder: 'Media/Music',
    priority: 2,
    enabled: true,
    accuracy: 99,
  },
  {
    id: 'rule-archives',
    name: 'Archive Files',
    description: 'Move archives to Archive folder',
    pattern: /\.(zip|rar|7z|tar|gz|bz2)$/i,
    targetFolder: 'Archive',
    priority: 1,
    enabled: true,
    accuracy: 99,
  },
];

/**
 * Categorize a single file based on active rules
 */
export function categorizeFile(file: FileItem, rules: CategorizationRule[]): CategorizeResult | null {
  const enabledRules = rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);

  for (const rule of enabledRules) {
    let matches = false;
    if (rule.pattern instanceof RegExp) {
      matches = rule.pattern.test(file.name);
    } else if (typeof rule.pattern === 'function') {
      matches = rule.pattern(file);
    }

    if (matches) {
      return {
        fileId: file.id,
        fileName: file.name,
        currentLocation: '', // Will be populated by caller
        suggestedFolder: rule.targetFolder,
        matchedRule: rule,
        confidence: rule.accuracy,
        reasoning: `Matched rule: "${rule.name}" - ${rule.description}`,
      };
    }
  }

  return null;
}

/**
 * Categorize multiple files
 */
export function categorizeFiles(files: FileItem[], rules: CategorizationRule[]): CategorizeResult[] {
  return files
    .map((file) => categorizeFile(file, rules))
    .filter((result): result is CategorizeResult => result !== null);
}

/**
 * Update rule accuracy based on user feedback
 */
export function updateRuleAccuracy(
  rules: CategorizationRule[],
  feedback: UserFeedback[],
  ruleId: string
): number {
  const ruleFeedback = feedback.filter((f) => f.ruleId === ruleId);
  if (ruleFeedback.length === 0) return 0;

  const accepted = ruleFeedback.filter((f) => f.accepted).length;
  return Math.round((accepted / ruleFeedback.length) * 100);
}

/**
 * Learn from user feedback and adjust rule priorities
 */
export function applyUserFeedback(
  rules: CategorizationRule[],
  feedback: UserFeedback[]
): CategorizationRule[] {
  const updatedRules = [...rules];

  for (const rule of updatedRules) {
    const newAccuracy = updateRuleAccuracy(rules, feedback, rule.id);
    if (newAccuracy > 0) {
      rule.accuracy = newAccuracy;
    }

    // Decrease priority (lower = higher) if frequently rejected
    const recentFeedback = feedback.filter(
      (f) => f.ruleId === rule.id && Date.now() - f.timestamp < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );
    const recentRejections = recentFeedback.filter((f) => !f.accepted).length;
    const recentAcceptance = recentFeedback.length > 0 ? (recentRejections / recentFeedback.length) * 100 : 0;

    if (recentAcceptance > 50) {
      rule.priority = Math.min(rule.priority + 1, 10); // Lower priority (less likely to match)
    }
  }

  return updatedRules;
}

/**
 * Get category statistics from feedback
 */
export function getCategoryStats(feedback: UserFeedback[]): Map<string, { accepted: number; rejected: number }> {
  const stats = new Map<string, { accepted: number; rejected: number }>();

  for (const f of feedback) {
    const current = stats.get(f.ruleId) || { accepted: 0, rejected: 0 };
    if (f.accepted) {
      current.accepted++;
    } else {
      current.rejected++;
    }
    stats.set(f.ruleId, current);
  }

  return stats;
}

/**
 * Persist rules engine state to localStorage
 */
export function saveRulesState(state: RulesEngineState): void {
  try {
    localStorage.setItem(
      'fileflow_rules_state',
      JSON.stringify({
        rules: state.rules,
        feedback: state.feedback,
      })
    );
  } catch (err) {
    console.warn('Failed to save rules state:', err);
  }
}

/**
 * Load rules engine state from localStorage
 */
export function loadRulesState(): RulesEngineState {
  try {
    const stored = localStorage.getItem('fileflow_rules_state');
    if (stored) {
      const { rules, feedback } = JSON.parse(stored);
      return {
        rules: rules || DEFAULT_RULES,
        feedback: feedback || [],
        categoryStats: getCategoryStats(feedback || []),
      };
    }
  } catch (err) {
    console.warn('Failed to load rules state:', err);
  }

  return {
    rules: DEFAULT_RULES,
    feedback: [],
    categoryStats: new Map(),
  };
}

/**
 * Reset rules to defaults
 */
export function resetRulesToDefaults(): void {
  saveRulesState({
    rules: DEFAULT_RULES,
    feedback: [],
    categoryStats: new Map(),
  });
}
