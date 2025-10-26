import { describe, it, expect, beforeEach } from 'vitest';
import { getPreferredAppForExt, setPreferredAppForExt, getSuggestedApps } from '../fileOpener';

describe('preferred app storage', () => {
  beforeEach(() => {
    // Reset the in-memory store used when localStorage is not available
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('sets and gets preferred app for an extension and sorts suggestions', () => {
    const ext = '.pdf';
    setPreferredAppForExt(ext, 'Adobe Acrobat');
    expect(getPreferredAppForExt(ext)).toBe('Adobe Acrobat');

    const suggestions = getSuggestedApps(ext);
    expect(suggestions[0]).toBe('Adobe Acrobat');
  });
});
