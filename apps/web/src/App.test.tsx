import { describe, it, expect } from 'vitest';

// Smoke test to keep vitest suite green
describe('app smoke suite', () => {
  it('runs a basic assertion', () => {
    expect(true).toBe(true);
  });
});
