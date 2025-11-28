import { describe, it, expect } from 'vitest';
import { findDuplicates } from '../duplicates';

describe('findDuplicates', () => {
  it('groups files with same content hash', () => {
    const files = [
      { id: 'a', name: 'A.txt', size: 10, extension: '.txt', modifiedAt: '', contentHash: 'h1' },
      { id: 'b', name: 'B.txt', size: 10, extension: '.txt', modifiedAt: '', contentHash: 'h2' },
      { id: 'c', name: 'C.txt', size: 10, extension: '.txt', modifiedAt: '', contentHash: 'h1' },
    ];
    const groups = findDuplicates(files as any);
    expect(groups.length).toBe(1);
    expect(groups[0].map(f => f.id).sort()).toEqual(['a', 'c']);
  });

  it('falls back to name+size when content hash is missing', () => {
    const files = [
      { id: 'a', name: 'file.txt', size: 100, extension: '.txt', modifiedAt: '' },
      { id: 'b', name: 'file.txt', size: 100, extension: '.txt', modifiedAt: '' },
      { id: 'c', name: 'other.txt', size: 50, extension: '.txt', modifiedAt: '' },
    ];
    const groups = findDuplicates(files as any);
    expect(groups.length).toBe(1);
    expect(groups[0].map(f => f.id).sort()).toEqual(['a', 'b']);
  });

  it('prioritizes content hash over name+size', () => {
    const files = [
      { id: 'a', name: 'file.txt', size: 100, extension: '.txt', modifiedAt: '', contentHash: 'h1' },
      { id: 'b', name: 'file.txt', size: 100, extension: '.txt', modifiedAt: '', contentHash: 'h1' },
      { id: 'c', name: 'other.txt', size: 50, extension: '.txt', modifiedAt: '', contentHash: 'h2' },
      { id: 'd', name: 'other.txt', size: 50, extension: '.txt', modifiedAt: '', contentHash: 'h2' },
    ];
    const groups = findDuplicates(files as any);
    // Should find 2 groups: (a,b) with h1, and (c,d) with h2
    expect(groups.length).toBe(2);
    const groupIds = groups.map(g => g.map(f => f.id).sort()).sort();
    expect(groupIds).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('ignores single files', () => {
    const files = [
      { id: 'a', name: 'A.txt', size: 10, extension: '.txt', modifiedAt: '', contentHash: 'h1' },
      { id: 'b', name: 'B.txt', size: 10, extension: '.txt', modifiedAt: '', contentHash: 'h2' },
    ];
    const groups = findDuplicates(files as any);
    expect(groups.length).toBe(0);
  });
});
