import { describe, it, expect } from 'vitest';
import { findDuplicates } from '../duplicates';

describe('findDuplicates', () => {
  it('groups files with same hash', () => {
    const files = [
      { id: 'a', name: 'A.txt', size: 10, extension: '.txt', modifiedAt: '', contentHash: 'h1' },
      { id: 'b', name: 'B.txt', size: 10, extension: '.txt', modifiedAt: '', contentHash: 'h2' },
      { id: 'c', name: 'C.txt', size: 10, extension: '.txt', modifiedAt: '', contentHash: 'h1' },
    ];
    const groups = findDuplicates(files as any);
    expect(groups.length).toBe(1);
    expect(groups[0].map(f => f.id).sort()).toEqual(['a','c']);
  });
});
