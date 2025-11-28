import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getSuggestions,
  recordFeedback,
  getFeedbackHistory,
  getFeedbackStats,
  clearFeedback,
} from '../lib/symenthaRules';
import type { FileItem } from '../AppTypes';

const mockFile = (name: string, size: number = 1000): FileItem => ({
  id: `file-${Date.now()}-${Math.random()}`,
  name,
  size,
  extension: name.substring(name.lastIndexOf('.')),
  modifiedAt: new Date().toISOString(),
});

describe('Symentha Rules Engine', () => {
  beforeEach(() => {
    clearFeedback();
  });

  afterEach(() => {
    clearFeedback();
  });

  describe('getSuggestions', () => {
    it('suggests Documents/PDFs for PDF files', () => {
      const file = mockFile('report.pdf');
      const suggestions = getSuggestions(file);

      expect(suggestions.length).toBeGreaterThan(0);
      const pdfSuggestion = suggestions.find((s) => s.suggestedPath === 'Documents/PDFs');
      expect(pdfSuggestion).toBeDefined();
      expect(pdfSuggestion?.confidence).toBeGreaterThan(0.9);
      expect(pdfSuggestion?.ruleApplied).toBe('PDF Rule');
    });

    it('suggests Finance/Receipts for invoices', () => {
      const file = mockFile('invoice_2024.pdf');
      const suggestions = getSuggestions(file);

      const receipt = suggestions.find((s) => s.suggestedPath === 'Finance/Receipts');
      expect(receipt).toBeDefined();
      expect(receipt?.ruleApplied).toBe('Invoice/Receipt Rule');
    });

    it('suggests Photos folder organized by year/month for images', () => {
      const now = new Date();
      const year = now.getFullYear();
      const monthName = now.toLocaleString('default', { month: 'long' });

      const file = mockFile('vacation.jpg');
      const suggestions = getSuggestions(file);

      const photoSuggestion = suggestions.find(
        (s) => s.suggestedPath.startsWith(`Photos/${year}/`)
      );
      expect(photoSuggestion).toBeDefined();
      expect(photoSuggestion?.ruleApplied).toBe('Photo Organization Rule');
    });

    it('suggests Media/Videos for video files', () => {
      const file = mockFile('movie.mp4');
      const suggestions = getSuggestions(file);

      const videoSuggestion = suggestions.find((s) => s.suggestedPath === 'Media/Videos');
      expect(videoSuggestion).toBeDefined();
      expect(videoSuggestion?.confidence).toBeGreaterThan(0.8);
    });

    it('suggests Media/Audio for audio files', () => {
      const file = mockFile('song.mp3');
      const suggestions = getSuggestions(file);

      const audioSuggestion = suggestions.find((s) => s.suggestedPath === 'Media/Audio');
      expect(audioSuggestion).toBeDefined();
    });

    it('suggests Development/[Language] for code files', () => {
      const file = mockFile('main.ts');
      const suggestions = getSuggestions(file);

      const codeSuggestion = suggestions.find((s) =>
        s.suggestedPath.includes('Development')
      );
      expect(codeSuggestion).toBeDefined();
      expect(codeSuggestion?.ruleApplied).toBe('Code Rule');
    });

    it('suggests Compressed for archive files', () => {
      const file = mockFile('backup.zip');
      const suggestions = getSuggestions(file);

      const archiveSuggestion = suggestions.find((s) => s.suggestedPath === 'Compressed');
      expect(archiveSuggestion).toBeDefined();
      expect(archiveSuggestion?.confidence).toBeGreaterThan(0.85);
    });

    it('returns sorted suggestions by confidence', () => {
      const file = mockFile('document.pdf');
      const suggestions = getSuggestions(file);

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
      }
    });
  });

  describe('recordFeedback', () => {
    it('records accepted feedback', () => {
      const entry = {
        fileId: 'file1',
        fileName: 'test.pdf',
        extension: '.pdf',
        suggestedPath: 'Documents/PDFs',
        acceptedPath: 'Documents/PDFs',
        feedback: 'accepted' as const,
      };

      recordFeedback(entry);
      const history = getFeedbackHistory();

      expect(history.length).toBe(1);
      expect(history[0].feedback).toBe('accepted');
      expect(history[0].timestamp).toBeDefined();
    });

    it('records modified feedback', () => {
      const entry = {
        fileId: 'file1',
        fileName: 'test.pdf',
        extension: '.pdf',
        suggestedPath: 'Documents/PDFs',
        acceptedPath: 'CustomFolder/PDFs',
        feedback: 'modified' as const,
      };

      recordFeedback(entry);
      const history = getFeedbackHistory();

      expect(history.length).toBe(1);
      expect(history[0].feedback).toBe('modified');
    });

    it('records rejected feedback', () => {
      const entry = {
        fileId: 'file1',
        fileName: 'test.txt',
        extension: '.txt',
        suggestedPath: 'Documents',
        acceptedPath: '',
        feedback: 'rejected' as const,
      };

      recordFeedback(entry);
      const history = getFeedbackHistory();

      expect(history.length).toBe(1);
      expect(history[0].feedback).toBe('rejected');
    });

    it('maintains multiple feedback entries', () => {
      recordFeedback({
        fileId: 'file1',
        fileName: 'test1.pdf',
        extension: '.pdf',
        suggestedPath: 'Documents/PDFs',
        acceptedPath: 'Documents/PDFs',
        feedback: 'accepted',
      });

      recordFeedback({
        fileId: 'file2',
        fileName: 'test2.mp4',
        extension: '.mp4',
        suggestedPath: 'Media/Videos',
        acceptedPath: 'Media/Videos',
        feedback: 'accepted',
      });

      const history = getFeedbackHistory();
      expect(history.length).toBe(2);
    });
  });

  describe('getFeedbackStats', () => {
    it('returns zero stats for no feedback', () => {
      const stats = getFeedbackStats();

      expect(stats.total).toBe(0);
      expect(stats.accepted).toBe(0);
      expect(stats.rejected).toBe(0);
      expect(stats.modified).toBe(0);
    });

    it('counts accepted feedback correctly', () => {
      recordFeedback({
        fileId: 'f1',
        fileName: 'test1.pdf',
        extension: '.pdf',
        suggestedPath: 'Documents/PDFs',
        acceptedPath: 'Documents/PDFs',
        feedback: 'accepted',
      });

      recordFeedback({
        fileId: 'f2',
        fileName: 'test2.pdf',
        extension: '.pdf',
        suggestedPath: 'Documents/PDFs',
        acceptedPath: 'Documents/PDFs',
        feedback: 'accepted',
      });

      const stats = getFeedbackStats();
      expect(stats.accepted).toBe(2);
      expect(stats.total).toBe(2);
    });

    it('separates different feedback types', () => {
      recordFeedback({
        fileId: 'f1',
        fileName: 'test1.pdf',
        extension: '.pdf',
        suggestedPath: 'Documents/PDFs',
        acceptedPath: 'Documents/PDFs',
        feedback: 'accepted',
      });

      recordFeedback({
        fileId: 'f2',
        fileName: 'test2.txt',
        extension: '.txt',
        suggestedPath: 'Documents',
        acceptedPath: '',
        feedback: 'rejected',
      });

      recordFeedback({
        fileId: 'f3',
        fileName: 'test3.mp4',
        extension: '.mp4',
        suggestedPath: 'Media/Videos',
        acceptedPath: 'CustomVideos',
        feedback: 'modified',
      });

      const stats = getFeedbackStats();
      expect(stats.total).toBe(3);
      expect(stats.accepted).toBe(1);
      expect(stats.rejected).toBe(1);
      expect(stats.modified).toBe(1);
    });
  });

  describe('clearFeedback', () => {
    it('clears all feedback', () => {
      recordFeedback({
        fileId: 'f1',
        fileName: 'test.pdf',
        extension: '.pdf',
        suggestedPath: 'Documents/PDFs',
        acceptedPath: 'Documents/PDFs',
        feedback: 'accepted',
      });

      let history = getFeedbackHistory();
      expect(history.length).toBe(1);

      clearFeedback();
      history = getFeedbackHistory();
      expect(history.length).toBe(0);
    });
  });
});
