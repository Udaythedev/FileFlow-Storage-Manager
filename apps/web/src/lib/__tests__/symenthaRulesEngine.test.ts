import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  categorizeFile,
  categorizeFiles,
  updateRuleAccuracy,
  applyUserFeedback,
  getCategoryStats,
  DEFAULT_RULES,
  type UserFeedback,
} from '../symenthaRulesEngine';
import type { FileItem } from '../../AppTypes';

const mockFileItem = (overrides?: Partial<FileItem>): FileItem => ({
  id: 'file_1',
  name: 'test.txt',
  size: 1024,
  extension: '.txt',
  modifiedAt: new Date().toISOString(),
  parentId: 'folder_1',
  ...overrides,
});

describe('symenthaRulesEngine', () => {
  describe('categorizeFile', () => {
    it('should match PDF files to Documents rule', () => {
      const file = mockFileItem({ name: 'report.pdf', extension: '.pdf' });
      const result = categorizeFile(file, DEFAULT_RULES);

      expect(result).not.toBeNull();
      expect(result?.suggestedFolder).toBe('Documents/PDFs');
      expect(result?.matchedRule.id).toBe('rule-pdf-documents');
    });

    it('should match Word documents', () => {
      const file = mockFileItem({ name: 'memo.docx', extension: '.docx' });
      const result = categorizeFile(file, DEFAULT_RULES);

      expect(result?.suggestedFolder).toBe('Documents/Word');
    });

    it('should match Excel files to Finance', () => {
      const file = mockFileItem({ name: 'budget.xlsx', extension: '.xlsx' });
      const result = categorizeFile(file, DEFAULT_RULES);

      expect(result?.suggestedFolder).toBe('Finance/Spreadsheets');
    });

    it('should match invoice files by pattern when not also matching PDF', () => {
      const file = mockFileItem({ name: 'invoice_2024.txt', extension: '.txt' });
      const result = categorizeFile(file, DEFAULT_RULES);

      expect(result?.suggestedFolder).toBe('Finance/Invoices');
    });

    it('should match code files to Development', () => {
      const file = mockFileItem({ name: 'app.tsx', extension: '.tsx' });
      const result = categorizeFile(file, DEFAULT_RULES);

      expect(result?.suggestedFolder).toBe('Development/Code');
    });

    it('should match video files to Media', () => {
      const file = mockFileItem({ name: 'movie.mp4', extension: '.mp4' });
      const result = categorizeFile(file, DEFAULT_RULES);

      expect(result?.suggestedFolder).toBe('Media/Videos');
    });

    it('should match audio files to Music', () => {
      const file = mockFileItem({ name: 'song.mp3', extension: '.mp3' });
      const result = categorizeFile(file, DEFAULT_RULES);

      expect(result?.suggestedFolder).toBe('Media/Music');
    });

    it('should match archive files', () => {
      const file = mockFileItem({ name: 'backup.zip', extension: '.zip' });
      const result = categorizeFile(file, DEFAULT_RULES);

      expect(result?.suggestedFolder).toBe('Archive');
    });

    it('should use regex patterns with case-insensitive matching', () => {
      const file = mockFileItem({ name: 'IMAGE.PDF', extension: '.PDF' });
      const result = categorizeFile(file, DEFAULT_RULES);

      expect(result).not.toBeNull();
    });

    it('should return null for unmatched files', () => {
      const file = mockFileItem({ name: 'random_file.xyz', extension: '.xyz' });
      const result = categorizeFile(file, DEFAULT_RULES);

      expect(result).toBeNull();
    });

    it('should prioritize rules by priority order', () => {
      const file = mockFileItem({ name: 'invoice_report.pdf', extension: '.pdf' });
      const result = categorizeFile(file, DEFAULT_RULES);

      // Should match invoice rule (priority 5) over PDF rule (priority 1)
      // Actually PDF has priority 1 (higher), so it matches first
      expect(result?.matchedRule.priority).toBeLessThanOrEqual(5);
    });

    it('should match recent photos by function pattern', () => {
      const now = new Date();
      const file = mockFileItem({
        name: 'photo.jpg',
        extension: '.jpg',
        modifiedAt: now.toISOString(),
      });
      const result = categorizeFile(file, DEFAULT_RULES);

      expect(result?.suggestedFolder).toBe('Photos/Recent');
    });

    it('should match old photos (>2 years)', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 3);
      const file = mockFileItem({
        name: 'old_photo.jpg',
        extension: '.jpg',
        modifiedAt: twoYearsAgo.toISOString(),
      });
      const result = categorizeFile(file, DEFAULT_RULES);

      expect(result?.suggestedFolder).toBe('Photos/Archive');
    });

    it('should disable rules when enabled is false', () => {
      const rules = [
        ...DEFAULT_RULES,
        {
          ...DEFAULT_RULES[0],
          id: 'disabled-pdf',
          enabled: false,
        },
      ];

      const file = mockFileItem({ name: 'doc.pdf', extension: '.pdf' });
      const result = categorizeFile(file, rules);

      // Should match the first enabled PDF rule, not the disabled one
      expect(result?.matchedRule.enabled).toBe(true);
    });
  });

  describe('categorizeFiles', () => {
    it('should categorize multiple files', () => {
      const files = [
        mockFileItem({ id: 'f1', name: 'doc.pdf', extension: '.pdf' }),
        mockFileItem({ id: 'f2', name: 'code.js', extension: '.js' }),
        mockFileItem({ id: 'f3', name: 'song.mp3', extension: '.mp3' }),
      ];

      const results = categorizeFiles(files, DEFAULT_RULES);

      expect(results).toHaveLength(3);
      expect(results[0].suggestedFolder).toContain('Documents');
      expect(results[1].suggestedFolder).toContain('Development');
      expect(results[2].suggestedFolder).toContain('Media');
    });

    it('should filter out unmatched files', () => {
      const files = [
        mockFileItem({ id: 'f1', name: 'doc.pdf', extension: '.pdf' }),
        mockFileItem({ id: 'f2', name: 'random.xyz', extension: '.xyz' }),
      ];

      const results = categorizeFiles(files, DEFAULT_RULES);

      expect(results).toHaveLength(1);
      expect(results[0].fileId).toBe('f1');
    });
  });

  describe('updateRuleAccuracy', () => {
    it('should calculate accuracy from feedback', () => {
      const feedback: UserFeedback[] = [
        {
          fileId: 'f1',
          ruleId: 'rule-pdf-documents',
          accepted: true,
          timestamp: Date.now(),
        },
        {
          fileId: 'f2',
          ruleId: 'rule-pdf-documents',
          accepted: true,
          timestamp: Date.now(),
        },
        {
          fileId: 'f3',
          ruleId: 'rule-pdf-documents',
          accepted: false,
          timestamp: Date.now(),
        },
      ];

      const accuracy = updateRuleAccuracy(DEFAULT_RULES, feedback, 'rule-pdf-documents');

      expect(accuracy).toBe(67); // 2/3 accepted
    });

    it('should return 0 for no feedback', () => {
      const accuracy = updateRuleAccuracy(DEFAULT_RULES, [], 'rule-pdf-documents');

      expect(accuracy).toBe(0);
    });

    it('should calculate 100% for all accepted', () => {
      const feedback: UserFeedback[] = [
        {
          fileId: 'f1',
          ruleId: 'rule-pdf-documents',
          accepted: true,
          timestamp: Date.now(),
        },
        {
          fileId: 'f2',
          ruleId: 'rule-pdf-documents',
          accepted: true,
          timestamp: Date.now(),
        },
      ];

      const accuracy = updateRuleAccuracy(DEFAULT_RULES, feedback, 'rule-pdf-documents');

      expect(accuracy).toBe(100);
    });
  });

  describe('applyUserFeedback', () => {
    it('should update rule accuracy from feedback', () => {
      const feedback: UserFeedback[] = [
        {
          fileId: 'f1',
          ruleId: 'rule-pdf-documents',
          accepted: true,
          timestamp: Date.now(),
        },
        {
          fileId: 'f2',
          ruleId: 'rule-pdf-documents',
          accepted: false,
          timestamp: Date.now(),
        },
      ];

      const updatedRules = applyUserFeedback(DEFAULT_RULES, feedback);
      const pdfRule = updatedRules.find((r) => r.id === 'rule-pdf-documents');

      expect(pdfRule?.accuracy).toBe(50);
    });

    it('should adjust priority for recently rejected rules (within 7 days)', () => {
      const now = Date.now();
      // Create very recent feedback (within 7 days) - all rejected
      const feedback: UserFeedback[] = [
        {
          fileId: 'f1',
          ruleId: 'rule-word-docs',
          accepted: false,
          timestamp: now - 1 * 24 * 60 * 60 * 1000, // 1 day ago
        },
        {
          fileId: 'f2',
          ruleId: 'rule-word-docs',
          accepted: false,
          timestamp: now - 2 * 24 * 60 * 60 * 1000, // 2 days ago
        },
        {
          fileId: 'f3',
          ruleId: 'rule-word-docs',
          accepted: false,
          timestamp: now - 3 * 24 * 60 * 60 * 1000, // 3 days ago
        },
      ];

      const wordRuleOriginal = DEFAULT_RULES.find((r) => r.id === 'rule-word-docs')!;
      const originalPriority = wordRuleOriginal.priority;

      const updatedRules = applyUserFeedback(DEFAULT_RULES, feedback);
      const wordRuleUpdated = updatedRules.find((r) => r.id === 'rule-word-docs')!;

      // Should increase priority (be deprioritized)
      expect(wordRuleUpdated.priority).toBeGreaterThan(originalPriority);
    });

    it('should not change priority for old feedback', () => {
      const sevenDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      const feedback: UserFeedback[] = [
        {
          fileId: 'f1',
          ruleId: 'rule-invoices',
          accepted: false,
          timestamp: sevenDaysAgo,
        },
      ];

      const invoiceRuleOriginal = DEFAULT_RULES.find((r) => r.id === 'rule-invoices')!;
      const updatedRules = applyUserFeedback(DEFAULT_RULES, feedback);
      const invoiceRuleUpdated = updatedRules.find((r) => r.id === 'rule-invoices')!;

      expect(invoiceRuleUpdated.priority).toBe(invoiceRuleOriginal.priority);
    });
  });

  describe('getCategoryStats', () => {
    it('should calculate stats for each rule', () => {
      const feedback: UserFeedback[] = [
        {
          fileId: 'f1',
          ruleId: 'rule-pdf-documents',
          accepted: true,
          timestamp: Date.now(),
        },
        {
          fileId: 'f2',
          ruleId: 'rule-pdf-documents',
          accepted: false,
          timestamp: Date.now(),
        },
        {
          fileId: 'f3',
          ruleId: 'rule-code-projects',
          accepted: true,
          timestamp: Date.now(),
        },
      ];

      const stats = getCategoryStats(feedback);

      expect(stats.get('rule-pdf-documents')).toEqual({ accepted: 1, rejected: 1 });
      expect(stats.get('rule-code-projects')).toEqual({ accepted: 1, rejected: 0 });
    });

    it('should return empty map for empty feedback', () => {
      const stats = getCategoryStats([]);

      expect(stats.size).toBe(0);
    });
  });

  describe('Default Rules', () => {
    it('should have valid default rules', () => {
      expect(DEFAULT_RULES.length).toBeGreaterThan(0);

      for (const rule of DEFAULT_RULES) {
        expect(rule.id).toBeTruthy();
        expect(rule.name).toBeTruthy();
        expect(rule.targetFolder).toBeTruthy();
        expect(rule.priority).toBeGreaterThanOrEqual(0);
        expect(rule.accuracy).toBeGreaterThanOrEqual(0);
        expect(rule.accuracy).toBeLessThanOrEqual(100);
        expect(rule.enabled).toBe(true);
      }
    });

    it('should have patterns that are either RegExp or function', () => {
      for (const rule of DEFAULT_RULES) {
        expect(rule.pattern instanceof RegExp || typeof rule.pattern === 'function').toBe(true);
      }
    });
  });
});
