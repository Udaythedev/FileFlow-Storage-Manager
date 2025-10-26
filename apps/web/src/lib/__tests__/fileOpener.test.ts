import { describe, it, expect } from 'vitest';
import { canPreviewInBrowser, getMimeType, getSuggestedApps } from '../fileOpener';

describe('fileOpener utilities', () => {
  it('canPreviewInBrowser returns true for common web-previewable types', () => {
    expect(canPreviewInBrowser('.jpg')).toBe(true);
    expect(canPreviewInBrowser('.png')).toBe(true);
    expect(canPreviewInBrowser('.mp4')).toBe(true);
    expect(canPreviewInBrowser('.webm')).toBe(true);
    expect(canPreviewInBrowser('.pdf')).toBe(true);
    expect(canPreviewInBrowser('.txt')).toBe(true);
    expect(canPreviewInBrowser('.json')).toBe(true);
  });

  it('canPreviewInBrowser returns false for non-preview types', () => {
    expect(canPreviewInBrowser('.psd')).toBe(false);
    expect(canPreviewInBrowser('.zip')).toBe(false);
    expect(canPreviewInBrowser('.rar')).toBe(false);
    expect(canPreviewInBrowser('.7z')).toBe(false);
  });

  it('getMimeType returns expected mime types', () => {
    expect(getMimeType('.jpg')).toBe('image/jpeg');
    expect(getMimeType('.png')).toBe('image/png');
    expect(getMimeType('.mp4')).toBe('video/mp4');
    expect(getMimeType('.pdf')).toBe('application/pdf');
    expect(getMimeType('.json')).toBe('application/json');
    expect(getMimeType('.unknown-ext')).toBe('application/octet-stream');
  });

  it('getSuggestedApps returns suggestions for known types', () => {
    const pdfApps = getSuggestedApps('.pdf');
    expect(Array.isArray(pdfApps)).toBe(true);
    expect(pdfApps.length).toBeGreaterThan(0);

    const pyApps = getSuggestedApps('.py');
    expect(pyApps.some(a => /VS Code|PyCharm/i.test(a))).toBe(true);
  });

  it('getSuggestedApps falls back for unknown types', () => {
    const apps = getSuggestedApps('.unknown-ext');
    expect(apps).toEqual(['Default Application']);
  });
});
