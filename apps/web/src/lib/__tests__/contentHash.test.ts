import { describe, it, expect, vi } from 'vitest';
import { computeFileHash, hashString, computeQuickHash, estimateHashTime } from '../contentHash';

describe('contentHash', () => {
  it('should hash a string correctly', async () => {
    const hash1 = await hashString('hello');
    const hash2 = await hashString('hello');
    const hash3 = await hashString('world');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).toHaveLength(64); // SHA-256 hex string length
  });

  it('should generate consistent SHA-256 hashes', async () => {
    const testString = 'The quick brown fox jumps over the lazy dog';
    const hash = await hashString(testString);

    // SHA-256 hash of this string (known value)
    const expectedPrefix = 'd7a8fb';
    expect(hash.startsWith(expectedPrefix)).toBe(true);
  });

  it('should compute different hashes for different strings', async () => {
    const hash1 = await hashString('test1');
    const hash2 = await hashString('test2');

    expect(hash1).not.toBe(hash2);
  });

  it('should compute quick hash from file-like objects', () => {
    const file1 = { size: 1024, lastModified: 1000000 };
    const file2 = { size: 1024, lastModified: 1000000 };
    const file3 = { size: 2048, lastModified: 1000000 };

    const quickHash1 = computeQuickHash(file1);
    const quickHash2 = computeQuickHash(file2);
    const quickHash3 = computeQuickHash(file3);

    expect(quickHash1).toBe(quickHash2);
    expect(quickHash1).not.toBe(quickHash3);
  });

  it('should estimate hash computation time reasonably', () => {
    const smallFileTime = estimateHashTime(1024); // 1 KB
    const largeFileTime = estimateHashTime(100 * 1024 * 1024); // 100 MB

    expect(smallFileTime).toBeGreaterThanOrEqual(100);
    expect(smallFileTime).toBeLessThanOrEqual(30000);

    expect(largeFileTime).toBeGreaterThanOrEqual(100);
    expect(largeFileTime).toBeLessThanOrEqual(30000);

    // Larger files should take more time
    expect(largeFileTime).toBeGreaterThan(smallFileTime);
  });

  it('should handle empty strings', async () => {
    const hash = await hashString('');
    expect(hash).toHaveLength(64); // SHA-256 always produces 64-char hex string
  });

  it('should be case-sensitive', async () => {
    const hashLower = await hashString('test');
    const hashUpper = await hashString('TEST');

    expect(hashLower).not.toBe(hashUpper);
  });
});
